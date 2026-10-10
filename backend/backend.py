# -*- coding: utf-8 -*-

import base64
import binascii
import math
import os
from datetime import datetime

import gridfs
import requests
from bson import ObjectId
from bson.errors import InvalidId
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from pymongo import DESCENDING, MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
MODELO_URL = os.environ.get("MODELO_URL", "http://localhost:5001/predict")

TARIFA_MINUTO = 50       # pesos por minuto
ANTI_REBOTE_SEG = 30     # evita que la misma foto enviada dos veces registre entrada y salida

app = Flask(__name__)
CORS(app)

cliente = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
try:
    cliente.admin.command("ping")
except Exception as e:
    raise SystemExit(f"No pude conectar a MongoDB en {MONGO_URI}: {e}")

db = cliente["parqueadero"]
fs = gridfs.GridFS(db)
db.registros.create_index("placa")

def iso(fecha):
    return fecha.isoformat(timespec="seconds") if fecha else None


def decodificar_imagen(texto):
    """base64 (puro o con prefijo 'data:image/...;base64,') -> (bytes, content_type)."""
    if "," in texto[:100]:
        texto = texto.split(",", 1)[1]
    datos = base64.b64decode("".join(texto.split()), validate=True)
    if datos[:3] == b"\xff\xd8\xff":
        return datos, "image/jpeg"
    if datos[:8] == b"\x89PNG\r\n\x1a\n":
        return datos, "image/png"
    if datos[:4] == b"RIFF" and datos[8:12] == b"WEBP":
        return datos, "image/webp"
    raise ValueError("El contenido no es una imagen JPEG, PNG o WEBP")


def serializar(r):
    salida = r.get("hora_salida")
    out = dict(
        id=str(r["_id"]),
        placa=r["placa"],
        hora_entrada=iso(r["hora_entrada"]),
        hora_salida=iso(salida),
        minutos=r.get("minutos"),
        valor_a_pagar=r.get("valor_a_pagar"),
        imagen_entrada_id=str(r["imagen_entrada_id"]) if r.get("imagen_entrada_id") else None,
        imagen_salida_id=str(r["imagen_salida_id"]) if r.get("imagen_salida_id") else None,
    )
    if salida is None:
        out["minutos_transcurridos"] = int((datetime.now() - r["hora_entrada"]).total_seconds() // 60)
    return out


# Registro
def registrar(placa, imagen_id, confianza):
    """Si la placa no está dentro -> entrada. Si ya está dentro -> salida con cobro."""
    ahora = datetime.now()
    abierto = db.registros.find_one({"placa": placa, "hora_salida": None})

    if abierto is None:
        db.registros.insert_one(dict(
            placa=placa, hora_entrada=ahora, hora_salida=None,
            imagen_entrada_id=imagen_id, confianza_entrada=confianza))
        return dict(estado="entrada", placa=placa, mensaje="Entrada registrada",
                    hora_entrada=iso(ahora), imagen_id=str(imagen_id), confianza=confianza)

    segundos = (ahora - abierto["hora_entrada"]).total_seconds()
    if segundos < ANTI_REBOTE_SEG:
        return dict(estado="ya_registrado", placa=placa,
                    mensaje="Esta placa acaba de registrar su entrada",
                    hora_entrada=iso(abierto["hora_entrada"]),
                    imagen_id=str(imagen_id), confianza=confianza)

    minutos = max(1, math.ceil(segundos / 60))
    valor = minutos * TARIFA_MINUTO
    db.registros.update_one(
        {"_id": abierto["_id"], "hora_salida": None},
        {"$set": dict(hora_salida=ahora, minutos=minutos, valor_a_pagar=valor,
                      imagen_salida_id=imagen_id, confianza_salida=confianza)})
    return dict(estado="salida", placa=placa, mensaje="Salida registrada",
                hora_entrada=iso(abierto["hora_entrada"]), hora_salida=iso(ahora),
                minutos=minutos, valor_a_pagar=valor,
                imagen_id=str(imagen_id), confianza=confianza)


@app.get("/health")
def health():
    return jsonify(estado="ok", servicio="backend")


@app.post("/api/procesar")
def procesar():
    cuerpo = request.get_json(silent=True)
    if not cuerpo or "image" not in cuerpo:
        return jsonify(error="Falta el campo 'image' (base64) en el JSON"), 400
    metadata = cuerpo.get("metadata") or {}

    try:
        datos, tipo = decodificar_imagen(cuerpo["image"])
    except (ValueError, binascii.Error) as e:
        return jsonify(error=f"Imagen inválida: {e}"), 400

    # 1. Guardar la imagen en GridFS
    imagen_id = fs.put(datos, filename=f"captura_{datetime.now():%Y%m%d_%H%M%S}",
                       content_type=tipo, origen=metadata.get("origen", "desconocido"))

    # 2. Pedirle la placa al servicio del modelo
    try:
        r = requests.post(MODELO_URL, json={"image": cuerpo["image"]}, timeout=30)
        r.raise_for_status()
        lectura = r.json()
    except requests.RequestException:
        return jsonify(estado="error_modelo", imagen_id=str(imagen_id),
                       mensaje="El servicio del modelo no responde"), 503

    placa = lectura.get("placa")
    confianza = lectura.get("confianza", 0.0)

    # 3. Decidir qué hacer con la lectura
    if not placa:
        resultado = dict(estado="sin_placa", placa=None, imagen_id=str(imagen_id),
                         mensaje="No se encontró una placa en la imagen")
    elif not lectura.get("confiable"):
        resultado = dict(estado="lectura_dudosa", placa=placa, confianza=confianza,
                         imagen_id=str(imagen_id),
                         mensaje="No pude leer la placa con seguridad. Toma otra foto")
    else:
        resultado = registrar(placa, imagen_id, confianza)

    # 4. Bitácora de cada lectura
    db.lecturas.insert_one(dict(
        fecha=datetime.now(), imagen_id=imagen_id, placa=placa, confianza=confianza,
        estado=resultado["estado"], origen=metadata.get("origen", "desconocido")))

    resultado["metadata"] = metadata
    return jsonify(resultado)


@app.get("/api/registros/activos")
def activos():
    filas = db.registros.find({"hora_salida": None}).sort("hora_entrada", DESCENDING)
    return jsonify([serializar(r) for r in filas])


@app.get("/api/registros/historial")
def historial():
    limite = min(request.args.get("limit", default=50, type=int), 500)
    filas = db.registros.find({"hora_salida": {"$ne": None}}) \
                        .sort("hora_salida", DESCENDING).limit(limite)
    return jsonify([serializar(r) for r in filas])


@app.get("/api/imagenes/<imagen_id>")
def imagen(imagen_id):
    try:
        archivo = fs.get(ObjectId(imagen_id))
    except (InvalidId, gridfs.errors.NoFile):
        return jsonify(error="Imagen no encontrada"), 404
    return Response(archivo.read(), mimetype=archivo.content_type or "image/jpeg")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
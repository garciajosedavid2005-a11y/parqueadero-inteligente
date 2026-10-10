# -*- coding: utf-8 -*-

import base64
import binascii
import time

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

import modelo.placa as placa  #Carga el modelo

app = Flask(__name__)
CORS(app)  # Llamado del cliente web

UMBRAL_CONFIANZA = 0.70 


def decodificar_base64(texto):
    """Acepta base64 puro o con prefijo 'data:image/jpeg;base64,' (como envía el navegador)."""
    if "," in texto[:100]:
        texto = texto.split(",", 1)[1]
    datos = base64.b64decode(texto, validate=False)
    img = cv2.imdecode(np.frombuffer(datos, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("La imagen no se pudo decodificar")
    return img


@app.get("/health")
def health():
    return jsonify(estado="ok", modelo="model.keras")


@app.post("/predict")
def predict():
    cuerpo = request.get_json(silent=True)
    if not cuerpo or "image" not in cuerpo:
        return jsonify(error="Falta el campo 'image' (base64) en el JSON"), 400

    try:
        img = decodificar_base64(cuerpo["image"])
    except (ValueError, binascii.Error):
        return jsonify(error="Imagen inválida: no es base64 de una imagen legible"), 400

    inicio = time.time()
    r = placa.leer_imagen(img)
    ms = int((time.time() - inicio) * 1000)

    confiable = bool(r["valida"] and r["confianza"] >= UMBRAL_CONFIANZA)
    return jsonify(
        placa=r["texto"] or None,
        confianza=round(r["confianza"], 4),
        valida=r["valida"],
        confiable=confiable,
        n_caracteres=r["n_chars"],
        metadata=cuerpo.get("metadata", {}),   #Retorna en .json
        tiempo_ms=ms,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
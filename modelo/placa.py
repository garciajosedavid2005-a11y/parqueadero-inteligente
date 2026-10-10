# -*- coding: utf-8 -*-
import glob
import os
import re
import sys

import cv2
import keras
import numpy as np

CLASES = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
IDX_NUM = [i for i, c in enumerate(CLASES) if c.isdigit()]
IDX_LET = [i for i, c in enumerate(CLASES) if c.isalpha()]
REGEX_PLACA = re.compile(r"^[A-Z]{3}[0-9]{3}$|^[A-Z]{3}[0-9]{2}[A-Z]$")

# Rutas relativas a ESTE archivo
AQUI = os.path.dirname(os.path.abspath(__file__))
RUTA_MODELO = os.path.join(AQUI, "model.keras")
CARPETA_SALIDA = os.path.join(AQUI, "salida")
CARPETA_FOTOS = os.path.join(AQUI, "..", "entrenamiento", "fotos")

modelo = keras.saving.load_model(RUTA_MODELO)  # Cargar modelo


# UBICAR
def candidatas(img):
    """Devuelve rectángulos (x, y, w, h) que podrían ser la placa."""
    alto, ancho = img.shape[:2]
    area_img = alto * ancho
    cajas = []

    # Por color
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mascara = cv2.inRange(hsv, (15, 90, 100), (35, 255, 255))
    mascara = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    cnts, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    color = [cv2.boundingRect(c) for c in cnts]

    # Por bordes
    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gris = cv2.bilateralFilter(gris, 11, 17, 17)
    bordes = cv2.Canny(gris, 50, 150)
    bordes = cv2.dilate(bordes, np.ones((3, 3), np.uint8))
    cnts, _ = cv2.findContours(bordes, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    bordes_c = [cv2.boundingRect(c) for c in cnts]

    def filtrar(lista):
        validas = []
        for x, y, w, h in lista:
            if h == 0:
                continue
            if 1.2 <= w / h <= 5 and 0.003 * area_img <= w * h <= 0.95 * area_img:
                validas.append((x, y, w, h))
        validas.sort(key=lambda r: -r[2] * r[3])   # las más grandes primero
        return validas

    return filtrar(color)[:8] + filtrar(bordes_c)[:10]


# SEGMENTAR
def normalizar(recorte):
    """Carácter binario -> 32x32 blanco sobre negro (igual que el entrenamiento)."""
    h, w = recorte.shape
    alto = 28
    ancho = min(30, max(4, int(w * alto / h)))
    r = cv2.resize(recorte, (ancho, alto), interpolation=cv2.INTER_AREA)
    lienzo = np.zeros((32, 32), dtype=np.uint8)
    y0, x0 = (32 - alto) // 2, (32 - ancho) // 2
    lienzo[y0:y0 + alto, x0:x0 + ancho] = r
    return lienzo


def _binarizaciones(placa):
    """Varias formas de pasar a blanco/negro: una sola falla con fondos de colores."""
    gris = cv2.GaussianBlur(cv2.cvtColor(placa, cv2.COLOR_BGR2GRAY), (3, 3), 0)
    valor = cv2.GaussianBlur(cv2.cvtColor(placa, cv2.COLOR_BGR2HSV)[:, :, 2], (3, 3), 0)
    t, otsu = cv2.threshold(gris, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    _, estricto = cv2.threshold(gris, 0.6 * t, 255, cv2.THRESH_BINARY_INV)  
    adaptativa = cv2.adaptiveThreshold(gris, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY_INV, 31, 12)
    _, oscuro = cv2.threshold(valor, 70, 255, cv2.THRESH_BINARY_INV)
    return [otsu, estricto, adaptativa, oscuro]


def _extraer_cajas(binaria):
    """Busca contornos que parezcan caracteres (o 2-3 caracteres pegados)."""
    b = binaria.copy()
    H, W = b.shape
    # Anular los bordes
    mv, mh = int(0.08 * H), int(0.04 * W)
    b[:mv, :] = 0
    b[H - mv:, :] = 0
    b[:, :mh] = 0
    b[:, W - mh:] = 0
    cnts, _ = cv2.findContours(b, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cajas = []
    for c in cnts:
        x, y, w, h = cv2.boundingRect(c)
        relleno = cv2.contourArea(c) / (w * h) if w * h > 0 else 0
        if (0.3 * H <= h <= 0.95 * H and 0.08 <= w / h <= 3.5
                and x > 0 and x + w < W and relleno >= 0.2):  
            cajas.append((x, y, w, h))
    if len(cajas) >= 3:  
        med = np.median([c[3] for c in cajas])
        cajas = [c for c in cajas if 0.75 * med <= c[3] <= 1.25 * med]
    return cajas, b


def _dividir(binaria, caja, n):
    """Parte una caja en n piezas, cortando donde hay menos tinta."""
    x, y, w, h = caja
    proy = binaria[y:y + h, x:x + w].sum(axis=0).astype(float)
    cortes = [0]
    for k in range(1, n):
        centro = int(w * k / n)
        rango = max(2, int(0.25 * w / n))
        a, b = max(cortes[-1] + 1, centro - rango), min(w - 1, centro + rango)
        cortes.append(a + int(np.argmin(proy[a:b])) if a < b else centro)
    cortes.append(w)
    return [(x + c0, y, c1 - c0, h) for c0, c1 in zip(cortes, cortes[1:]) if c1 - c0 >= 3]


def _separar_pegados(binaria, cajas):
    """Si hay menos de 6 cajas, divide las que son demasiado anchas (caracteres pegados)."""
    cajas = sorted(cajas, key=lambda c: c[0])
    estrechas = [c[2] for c in cajas if c[2] / c[3] <= 0.9]
    ref = np.median(estrechas) if estrechas else 0.5 * np.median([c[3] for c in cajas])
    nuevas = []
    for caja in cajas:
        n = min(4, max(1, int(round(caja[2] / ref)))) if caja[2] > 1.5 * ref else 1
        nuevas += _dividir(binaria, caja, n) if n > 1 else [caja]
    return nuevas if len(nuevas) <= 6 else cajas


def segmentar(placa_bgr):
    """Devuelve (caracteres_32x32, cajas, binaria, placa_redimensionada)."""
    esc = 100 / placa_bgr.shape[0]
    placa = cv2.resize(placa_bgr, None, fx=esc, fy=esc)

    mejor = None
    for binaria in _binarizaciones(placa):          # prueba cada método
        cajas, b = _extraer_cajas(binaria)
        if 2 <= len(cajas) < 6:
            cajas = _separar_pegados(b, cajas)
        if mejor is None or abs(len(cajas) - 6) < abs(len(mejor[0]) - 6):
            mejor = (cajas, b)
        if len(cajas) == 6:
            break

    cajas, binaria = mejor
    cajas = sorted(cajas, key=lambda c: c[0])
    chars = [normalizar(binaria[y:y + h, x:x + w]) for x, y, w, h in cajas]
    return chars, cajas, binaria, placa


# LEER
def clasificar(chars, es_carro=True):
    x = np.array(chars, dtype="float32")[..., None] / 255
    probs = modelo.predict(x, verbose=0)
    texto, confs = "", []
    for i, p in enumerate(probs):
        if len(chars) == 6 and i < 3:
            permitidos = IDX_LET             
        elif len(chars) == 6 and (i < 5 or es_carro):
            permitidos = IDX_NUM             
        else:
            permitidos = range(len(CLASES))  
        j = max(permitidos, key=lambda k: p[k])
        texto += CLASES[j]
        confs.append(float(p[j]))
    return texto, confs


def redimensionar(img):
    if img.shape[1] > 1000:                 
        f = 1000 / img.shape[1]
        img = cv2.resize(img, None, fx=f, fy=f)
    return img


def cargar(ruta):
    img = cv2.imread(ruta)
    if img is None:
        raise FileNotFoundError(ruta)
    return redimensionar(img)


def buscar_placa(img):
    """Prueba las candidatas y devuelve la mejor segmentación (o None)."""
    mejor = None
    for (x, y, w, h) in candidatas(img):
        px, py = int(0.02 * w), int(0.04 * h)
        recorte = img[max(0, y - py):y + h + py, max(0, x - px):x + w + px]
        chars, cajas, binaria, placa = segmentar(recorte)
        intento = dict(rect=(x, y, w, h), chars=chars, cajas=cajas,
                       binaria=binaria, placa=placa)
        if mejor is None or abs(len(chars) - 6) < abs(len(mejor["chars"]) - 6):
            mejor = intento
        if len(chars) == 6:
            break
    return mejor


def leer_placa(ruta, guardar_debug=True):
    nombre = os.path.splitext(os.path.basename(ruta))[0]
    return leer_imagen(cargar(ruta), guardar_debug, nombre)


def leer_imagen(img, guardar_debug=False, nombre="imagen"):
    """Lee la placa de una imagen BGR que ya está en memoria."""
    img = redimensionar(img)
    mejor = buscar_placa(img)

    if mejor is None or len(mejor["chars"]) == 0:
        return dict(texto="", confianza=0.0, valida=False, n_chars=0)

    _, _, rw, rh = mejor["rect"]
    es_carro = rw / rh >= 1.6              
    texto, confs = clasificar(mejor["chars"], es_carro)
    resultado = dict(texto=texto, confianza=float(np.mean(confs)),
                     valida=bool(REGEX_PLACA.match(texto)), n_chars=len(mejor["chars"]))

    if guardar_debug:
        os.makedirs(CARPETA_SALIDA, exist_ok=True)
        x, y, w, h = mejor["rect"]
        marcada = img.copy()
        cv2.rectangle(marcada, (x, y), (x + w, y + h), (0, 255, 0), 3)
        cv2.imwrite(os.path.join(CARPETA_SALIDA, f"{nombre}_1_ubicacion.jpg"), marcada)
        vista = mejor["placa"].copy()
        for bx, by, bw, bh in mejor["cajas"]:
            cv2.rectangle(vista, (bx, by), (bx + bw, by + bh), (0, 0, 255), 2)
        cv2.imwrite(os.path.join(CARPETA_SALIDA, f"{nombre}_2_caracteres.jpg"), vista)
        cv2.imwrite(os.path.join(CARPETA_SALIDA, f"{nombre}_3_binaria.jpg"), mejor["binaria"])
    return resultado


if __name__ == "__main__":
    rutas = sys.argv[1:] or sorted(
        glob.glob(os.path.join(CARPETA_FOTOS, "*.jp*g")) + glob.glob(os.path.join(CARPETA_FOTOS, "*.png")))
    if not rutas:
        sys.exit("No encontré fotos en la carpeta 'fotos'.")
    for r in rutas:
        res = leer_placa(r)
        print(f"{os.path.basename(r):20s} -> {res['texto'] or '(nada)':8s} "
              f"| caracteres: {res['n_chars']} | confianza: {res['confianza']:.0%} "
              f"| formato válido: {res['valida']}")
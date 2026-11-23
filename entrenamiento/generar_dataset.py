# -*- coding: utf-8 -*-
"""Genera el dataset sintético de caracteres (32x32, blanco sobre negro)
imitando lo que modelo/placa.py lee en placas reales: fondo amarillo
texturizado, relevo, sombras, reflejos, ángulo, proporción angosta,
perspectiva leve, trazo grueso, trazos partidos, huecos rellenos, suciedad,
desenfoques (gaussiano y de movimiento), ruido, compresión JPEG y defectos de
binarización. La cadena binarización replica _binarizaciones() de
modelo/placa.py (Otsu inverso, estricto, adaptativa y 'oscuro') y el crop
replica normalizar() de placa.py.
"""
import glob
import os
import random
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

CLASES = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
SIZE = 32
MUESTRAS_POR_CLASE = 2500

FUENTES_COMUNES = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/verdanab.ttf",
    "C:/Windows/Fonts/calibrib.ttf",
    "C:/Windows/Fonts/segoeuib.ttf",
    "C:/Windows/Fonts/seguibl.ttf",
    "C:/Windows/Fonts/impact.ttf",
    "C:/Windows/Fonts/framd.ttf",
    "C:/Windows/Fonts/arialnb.ttf",
    "C:/Windows/Fonts/ariblk.ttf",
    "C:/Windows/Fonts/corbelb.ttf",
    "C:/Windows/Fonts/candarab.ttf",
    "C:/Windows/Fonts/bahnschrift.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]

AQUI = os.path.dirname(os.path.abspath(__file__))
EXTRA_FUENTES = os.path.join(AQUI, "fuentes")


def buscar_fuentes():
    fuentes = sys.argv[1:]
    if not fuentes and os.path.isdir(EXTRA_FUENTES):
        # acepta fuentes extra .ttf desde entrenamiento/fuentes/ si existe
        fuentes = sorted(glob.glob(os.path.join(EXTRA_FUENTES, "*.ttf")))
    fuentes = fuentes or FUENTES_COMUNES
    fuentes = [f for f in fuentes if os.path.exists(f)]
    if not fuentes:
        sys.exit("No encontré fuentes. Pasa la ruta de un .ttf como argumente "
                 "o crea 'entrenamiento/fuentes'.")
    print("Fuentes usadas:", fuentes)
    return fuentes


def _fondo_amarillo(H, W):
    """Fondo de placa colombiana: amarillo texturizado (tonos del HSV que
    busca modelo/placa.py: H 15-35, S 90-255, V 95-130)."""
    bg = np.zeros((H, W, 3), np.float32)
    bg[..., 0] = random.randint(14, 30)      # tono amarillo
    bg[..., 1] = random.randint(200, 255)    # saturación
    bg[..., 2] = random.randint(190, 255)    # brillo (placa aún amarilla, más clara)
    bg += np.random.normal(0, [6, 12, 8], (H, W, 3))
    bg = np.clip(bg, 0, 255).astype(np.uint8)
    return cv2.cvtColor(bg, cv2.COLOR_HSV2BGR)


def _normalizar(recorte, alto, ancho):
    """Recorte binario -> 32x32 blanco sobre negro, igual que normalizar()
    de modelo/placa.py."""
    r = cv2.resize(recorte, (ancho, alto), interpolation=cv2.INTER_AREA)
    lienzo = np.zeros((SIZE, SIZE), dtype=np.uint8)
    y0, x0 = (SIZE - alto) // 2, (SIZE - ancho) // 2
    lienzo[y0:y0 + alto, x0:x0 + ancho] = r
    return lienzo


def _binarizar_como_placa(arr):
    """Replica _binarizaciones() de modelo/placa.py sobre la imagen generada
    y devuelve una variante al azar (Otsu inverso, estricto, adaptativa y
    'oscuro')."""
    arr8 = np.clip(arr, 0, 255).astype(np.uint8)
    gris = cv2.GaussianBlur(cv2.cvtColor(arr8, cv2.COLOR_BGR2GRAY), (3, 3), 0)
    valor = cv2.GaussianBlur(cv2.cvtColor(arr8, cv2.COLOR_BGR2HSV)[:, :, 2], (3, 3), 0)
    t, otsu = cv2.threshold(gris, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    _, estricto = cv2.threshold(gris, 0.6 * t, 255, cv2.THRESH_BINARY_INV)
    adaptativa = cv2.adaptiveThreshold(gris, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY_INV, 31, 12)
    _, oscuro = cv2.threshold(valor, 70, 255, cv2.THRESH_BINARY_INV)
    variantes = [otsu, estricto, adaptativa, oscuro]
    seleccion = random.choices(variantes, weights=[5, 2, 4, 9])[0]
    # protege contra variantes degeneradas (casi vacías o casi llenas)
    def _sana(v):
        return 0.03 < float((v > 0).mean()) < 0.97
    if not _sana(seleccion):
        sanas = [v for v in variantes if _sana(v)]
        seleccion = random.choice(sanas) if sanas else otsu
    return seleccion


def render(ch, ruta_fuente):
    """Genera un carácter 32x32 uint8 blanco-sobre-negro imitando lo que
    modelo/placa.py lee en placas reales (fondo amarillo texturizado, relevo
    y sombras, trazo grueso, trazos partidos, huecos rellenos, reflejo
    parcial, ángulo ±10°, proporción angosta, perspective leve, degradado de
    iluminación, desenfoque gaussiano y de movimiento, ruido, compresión JPEG
    y suciedad). La cadena binarización replica _binarizaciones() de
    placa.py; el crop replica normalizar()."""
    # --- 1. Fondo de placa colombiana (amarillo texturizado) ---
    H = random.choice([56, 68, 80, 92, 104])
    W = H + random.randint(0, 36)
    bgr = _fondo_amarillo(H, W)
    base = bgr.astype(np.float32)
    arr = base.copy()

    # --- 2. Dibujar el carácter oscuro sobre el amarillo ---
    fuente = ImageFont.truetype(ruta_fuente, random.randint(26, 66))
    lienzo = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), "RGB")
    d = ImageDraw.Draw(lienzo)
    g = random.randint(26, 100)           # carácter oscuro sobre el amarillo
    d.text((W // 2, H // 2), ch, font=fuente, fill=(g, g, g),
           stroke_width=random.randint(2, 7), stroke_fill=(g, g, g), anchor="mm")

    # --- 2b. Reflejo parcial de la placa (líneas claras) ---
    if random.random() < 0.25:
        for _ in range(random.randint(1, 3)):
            d.line(((random.randint(0, W - 1), random.randint(0, H // 2)),
                    (random.randint(0, W - 1), random.randint(H // 2, H - 1))),
                   fill=(245, 245, 245), width=random.randint(1, 2))

    arr = np.array(lienzo).astype(np.float32)
    mask = ((base.mean(axis=2) - arr.mean(axis=2)) > 22).astype(np.uint8) * 255

    # --- 3. Efectos de placa ---
    # a) Relevo y sombras
    if np.any(mask):
        if random.random() < 0.8:
            dil = cv2.dilate(mask, np.ones((3, 3), np.uint8))
            glow = (dil > 0) & (mask == 0)
            arr[glow] = np.clip(arr[glow] + random.uniform(12, 45), 0, 255)
            arr[mask > 0] = np.clip(arr[mask > 0] - random.uniform(5, 25), 0, 255)
        if random.random() < 0.5:
            m_ero = cv2.erode(mask, np.ones((3, 3), np.uint8))
            shadow = (m_ero == 0) & (mask > 0)
            arr[shadow] = np.clip(arr[shadow] - random.uniform(8, 30), 0, 255)

    # b) Trazo grueso: dilatar la máscara sobre el fondo
    if np.any(mask) and random.random() < 0.5:
        dil = cv2.dilate(mask, np.ones((3, 3), np.uint8))
        fb = (dil > 0) & (mask == 0)
        arr[fb] = np.clip(arr[fb] + random.uniform(8, 35), 0, 255)

    # c) Trazos partidos: ranuras pintadas con el color del fondo
    if np.any(mask) and random.random() < 0.35:
        for _ in range(random.randint(1, 3)):
            x0 = random.randint(0, W - 8); y0 = random.randint(0, H - 8)
            x1 = random.randint(x0 + 2, min(W, x0 + 8))
            y1 = random.randint(y0 + 2, min(H, y0 + 8))
            reg = mask[y0:y1, x0:x1] > 0
            arr[y0:y1, x0:x1] = np.where(reg[..., None], base[y0:y1, x0:x1],
                                         arr[y0:y1, x0:x1])

    # d) Huecos rellenos (cierre morfológico de los trazos)
    if np.any(mask) and random.random() < 0.3:
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

    # e) Degradado de iluminación
    grad = np.linspace(random.uniform(0.85, 1.05), random.uniform(1.0, 1.25),
                       W, dtype=np.float32)
    arr *= grad[None, :, None]
    if random.random() < 0.5:
        gv = np.linspace(random.uniform(0.85, 1.05), random.uniform(1.0, 1.3),
                         H, dtype=np.float32)
        arr *= gv[:, None, None]
    arr = np.clip(arr, 0, 255)

    # f) Perspectiva leve (cv2.warpPerspective)
    if random.random() < 0.5:
        dx, dy = random.uniform(-3, 3), random.uniform(-3, 3)
        src = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
        dst = np.float32([[dx, dy], [W, dy], [W, H + dy], [0, H + dy]])
        arr = cv2.warpPerspective(arr, cv2.getPerspectiveTransform(src, dst),
                                  (W, H), flags=cv2.INTER_LINEAR,
                                  borderValue=(210, 210, 210))

    # g) Rotación ±10° (cv2.warpAffine)
    if random.random() < 0.9:
        ang = random.uniform(-10, 10)
        arr = cv2.warpAffine(arr, cv2.getRotationMatrix2D((W / 2, H / 2), ang, 1.0),
                             (W, H), flags=cv2.INTER_LINEAR,
                             borderValue=(210, 210, 210))

    # h) Desenfoque gaussiano y de movimiento
    if random.random() < 0.35:
        arr = cv2.GaussianBlur(arr, (3, 3), 0)
    if random.random() < 0.25:
        k = np.zeros((3, 5), np.float32)
        k[1, :] = 1.0                     # línea de movimiento
        if random.random() < 0.5:
            k = k.T
        k /= k.sum()
        arr = cv2.filter2D(arr, -1, k)

    # i) Ruido
    arr += np.random.normal(0, random.uniform(0, 14), arr.shape)
    arr = np.clip(arr, 0, 255)

    # j) Compresión JPEG (calidad 30-90)
    q = random.randint(30, 90)
    ok, buf = cv2.imencode(".jpg", np.clip(arr, 0, 255).astype(np.uint8),
                           [cv2.IMWRITE_JPEG_QUALITY, q])
    if ok:
        arr = cv2.imdecode(buf, cv2.IMREAD_UNCHANGED).astype(np.float32)
    arr = np.clip(arr, 0, 255)

    # k) Suciedad
    if random.random() < 0.4:
        for _ in range(random.randint(1, 5)):
            x, y = random.randint(0, W - 1), random.randint(0, H - 1)
            r = random.randint(1, 2)
            arr[y - r:y + r, x - r:x + r] = random.choice([0, 128, 255])
    arr = np.clip(arr, 0, 255)

    # --- 4. Binarizar como la cadena de placa.py ---
    final = _binarizar_como_placa(arr)

    # --- 5. Recorte y normalización igual que normalizar() de placa.py ---
    # "a veces 1-2 px del carácter vecino o del marco pegados al bbox"
    if random.random() < 0.25:
        strip = random.randint(1, 2)
        val = random.choice([0, 255])
        side = random.choice(["t", "b", "l", "r"])
        if side == "t":
            final[:strip, :] = val
        elif side == "b":
            final[-strip:, :] = val
        elif side == "l":
            final[:, :strip] = val
        else:
            final[:, -strip:] = val

    ys, xs = np.where(final > 0)
    if ys.size == 0:
        crop = final[H // 4:3 * H // 4, W // 4:3 * W // 4]
        if crop.size == 0:
            crop = final
    else:
        x, y = int(xs.min()), int(ys.min())
        w, h = int(xs.max() - x + 1), int(ys.max() - y + 1)
        crop = final[y:y + h, x:x + w]
    if crop.size == 0:
        crop = final[H // 4:3 * H // 4, W // 4:3 * W // 4]
    if crop.size == 0:
        crop = final

    alto = random.randint(24, 30)
    ancho = min(30, max(4, int(crop.shape[1] * alto / max(1, crop.shape[0])
                                * random.uniform(0.5, 1.25))))
    return _normalizar(crop, alto, ancho)


def main():
    fuentes = buscar_fuentes()
    xs, ys = [], []
    for idx, ch in enumerate(CLASES):
        n = 0
        while n < MUESTRAS_POR_CLASE:
            img = render(ch, random.choice(fuentes))
            if img is not None:
                xs.append(img)
                ys.append(idx)
                n += 1
        print(f"Clase {ch} lista")

    x = np.array(xs, dtype=np.uint8)
    y = np.array(ys, dtype=np.int64)
    p = np.random.permutation(len(x))
    ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset_caracteres.npz")
    np.savez_compressed(ruta, x=x[p], y=y[p])
    print("Guardado", ruta, x.shape)


if __name__ == "__main__":
    main()

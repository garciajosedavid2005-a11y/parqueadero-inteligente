# -*- coding: utf-8 -*-

import os
import random
import sys

import numpy as np
import keras
from PIL import Image

from generar_dataset import CLASES, render  # reutiliza el generador

RUTA_MODELO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "modelo", "model.keras")
modelo = keras.saving.load_model(RUTA_MODELO)

# Fuentes distintas a las del entrenamiento (Arial, Verdana, Calibri)
FUENTES_NUEVAS = [
    "C:/Windows/Fonts/consolab.ttf",
    "C:/Windows/Fonts/tahomabd.ttf",
    "C:/Windows/Fonts/timesbd.ttf",
    "C:/Windows/Fonts/couribd.ttf",
    "C:/Windows/Fonts/trebucbd.ttf",
]


def predecir(img32):
    x = img32.astype("float32") / 255
    x = x.reshape(1, 32, 32, 1)
    p = modelo.predict(x, verbose=0)[0]
    top = np.argsort(p)[::-1][:3]
    return [(CLASES[i], float(p[i])) for i in top]


def preparar_imagen(ruta):
    """Imagen de un carácter -> 32x32, blanco sobre negro, ajustado y centrado."""
    img = np.array(Image.open(ruta).convert("L"), dtype=np.float32)
    if img.mean() > 127:          # texto oscuro sobre fondo claro -> invertir
        img = 255 - img
    img = (img - img.min()) / max(1e-6, img.max() - img.min()) * 255

    ys, xs = np.where(img > 100)  # recortar al carácter
    if len(ys) == 0:
        sys.exit("No encontré ningún carácter en la imagen.")
    img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

    alto = 28
    ancho = min(30, max(4, int(img.shape[1] * alto / img.shape[0])))
    img = np.array(Image.fromarray(img.astype(np.uint8)).resize((ancho, alto)))
    lienzo = np.zeros((32, 32), dtype=np.uint8)
    y0, x0 = (32 - alto) // 2, (32 - ancho) // 2
    lienzo[y0:y0 + alto, x0:x0 + ancho] = img
    return lienzo


def modo_fuentes_nuevas():
    fuentes = [f for f in FUENTES_NUEVAS if os.path.exists(f)]
    if not fuentes:
        sys.exit("No encontré fuentes nuevas para probar.")
    print("Fuentes de prueba:", [os.path.basename(f) for f in fuentes])

    aciertos, total, errores = 0, 0, {}
    for ch in CLASES:
        for _ in range(30):
            img = render(ch, random.choice(fuentes))
            if img is None:
                continue
            pred = predecir(img)[0][0]
            total += 1
            if pred == ch:
                aciertos += 1
            else:
                errores[(ch, pred)] = errores.get((ch, pred), 0) + 1

    print(f"\nAccuracy con fuentes nuevas: {aciertos / total:.2%}")
    if errores:
        print("Confusiones más frecuentes (real -> predicho):")
        for (real, pred), n in sorted(errores.items(), key=lambda t: -t[1])[:10]:
            print(f"  {real} -> {pred}: {n} veces")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        for letra, prob in predecir(preparar_imagen(sys.argv[1])):
            print(f"{letra}: {prob:.1%}")
    else:
        modo_fuentes_nuevas()
# -*- coding: utf-8 -*-
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

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


def buscar_fuentes():
    fuentes = sys.argv[1:] or FUENTES_COMUNES
    fuentes = [f for f in fuentes if os.path.exists(f)]
    if not fuentes:
        sys.exit("No encontré fuentes. Pasa la ruta de un .ttf como argumento.")
    print("Fuentes usadas:", fuentes)
    return fuentes


def render(ch, ruta_fuente):
    tam = random.randint(40, 56)
    fuente = ImageFont.truetype(ruta_fuente, tam)
    lienzo = Image.new("L", (96, 96), 0)
    d = ImageDraw.Draw(lienzo)
    d.text((48, 48), ch, font=fuente, fill=255, anchor="mm",
           stroke_width=random.choice([0, 0, 1, 2, 3]), stroke_fill=255)

    # rotación y deformación
    lienzo = lienzo.rotate(random.uniform(-8, 8), resample=Image.BILINEAR)
    sh = random.uniform(-0.2, 0.2)
    lienzo = lienzo.transform(lienzo.size, Image.AFFINE,
                              (1, sh, -sh * 48, 0, 1, 0), resample=Image.BILINEAR)

    caja = lienzo.getbbox()
    if caja is None:
        return None
    c = lienzo.crop(caja)

    # recorte ajustado
    alto = random.randint(24, 30)
    # deformar proporciones
    ancho = min(30, max(4, int(c.width * alto / c.height * random.uniform(0.6, 1.15))))
    c = c.resize((ancho, alto), Image.BILINEAR)
    out = Image.new("L", (SIZE, SIZE), 0)
    out.paste(c, ((SIZE - ancho) // 2 + random.randint(-1, 1),
                  (SIZE - alto) // 2 + random.randint(-1, 1)))

    # degradaciones
    r = random.random()
    if r < 0.15:
        out = out.filter(ImageFilter.MaxFilter(3))   
    elif r < 0.30:
        out = out.filter(ImageFilter.MinFilter(3))  
    if random.random() < 0.6:
        out = out.filter(ImageFilter.GaussianBlur(random.uniform(0.2, 1.2)))

    arr = np.array(out, dtype=np.float32)
    arr *= random.uniform(0.6, 1.0)              
    arr += np.random.normal(0, random.uniform(0, 20), arr.shape)
    return np.clip(arr, 0, 255).astype(np.uint8)


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
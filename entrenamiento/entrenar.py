# -*- coding: utf-8 -*-
import glob
import os
import random

import cv2
import numpy as np
import keras
from keras import layers

# Rutas relativas
AQUI = os.path.dirname(os.path.abspath(__file__))
RUTA_DATASET = os.path.join(AQUI, "dataset_caracteres.npz")
CARPETA_REAL = os.path.join(AQUI, "real")
RUTA_MODELO = os.path.join(AQUI, "..", "modelo", "model.keras") 

CLASES = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
num_classes = len(CLASES)
input_shape = (32, 32, 1)
COPIAS_POR_CARACTER_REAL = 300  


def cargar_reales():
    xs, ys = [], []
    for idx, ch in enumerate(CLASES):
        for ruta in glob.glob(os.path.join(CARPETA_REAL, ch, "*.png")):
            img = cv2.imread(ruta, cv2.IMREAD_GRAYSCALE)
            if img is not None and img.shape == (32, 32):
                xs.append(img)
                ys.append(idx)
    return xs, ys


def aumentar(img):
    """Deforma un carácter real: giro, escala, desplazamiento, grosor, desenfoque, ruido."""
    ang, esc = random.uniform(-7, 7), random.uniform(0.85, 1.1)
    M = cv2.getRotationMatrix2D((16, 16), ang, esc)
    M[:, 2] += (random.uniform(-2, 2), random.uniform(-2, 2))
    out = cv2.warpAffine(img, M, (32, 32), flags=cv2.INTER_LINEAR, borderValue=0)
    r = random.random()
    if r < 0.2:
        out = cv2.dilate(out, np.ones((2, 2), np.uint8))
    elif r < 0.4:
        out = cv2.erode(out, np.ones((2, 2), np.uint8))
    if random.random() < 0.5:
        out = cv2.GaussianBlur(out, (3, 3), random.uniform(0.3, 1.0))
    out = out.astype(np.float32) * random.uniform(0.7, 1.0)
    out += np.random.normal(0, random.uniform(0, 12), out.shape)
    return np.clip(out, 0, 255).astype(np.uint8)


# Datos
d = np.load(RUTA_DATASET)
x, y = d["x"], d["y"]

rx, ry = cargar_reales()
if rx:
    ax = [aumentar(img) for img in rx for _ in range(COPIAS_POR_CARACTER_REAL)]
    ay = [lbl for lbl in ry for _ in range(COPIAS_POR_CARACTER_REAL)]
    x = np.concatenate([x, np.array(ax, dtype=np.uint8)])
    y = np.concatenate([y, np.array(ay, dtype=np.int64)])
    p = np.random.permutation(len(x))
    x, y = x[p], y[p]
    print(f"Caracteres reales: {len(rx)} -> {len(ax)} muestras aumentadas añadidas")
else:
    print("No hay carpeta real/: se entrena solo con datos sintéticos")

x = np.expand_dims(x.astype("float32") / 255, -1)
y = keras.utils.to_categorical(y, num_classes)

corte = int(len(x) * 0.9)
x_train, y_train = x[:corte], y[:corte]
x_test, y_test = x[corte:], y[corte:]
print("train:", x_train.shape, "test:", x_test.shape)

# Modelo
model = keras.Sequential([
    keras.Input(shape=input_shape),
    layers.Conv2D(32, (3, 3), activation="relu"),
    layers.MaxPooling2D((2, 2)),
    layers.Conv2D(64, (3, 3), activation="relu"),
    layers.MaxPooling2D((2, 2)),
    layers.Conv2D(128, (3, 3), activation="relu"),
    layers.Flatten(),
    layers.Dropout(0.5),
    layers.Dense(num_classes, activation="softmax"),
])
model.summary()

model.compile(loss="categorical_crossentropy", optimizer="adam", metrics=["accuracy"])

model.fit(
    x_train, y_train,
    batch_size=128,
    epochs=20,
    validation_split=0.1,
    callbacks=[keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True)],
)

score = model.evaluate(x_test, y_test, verbose=0)
print("Test loss:", score[0])
print("Test accuracy:", score[1])

model.save(RUTA_MODELO)
print("Modelo guardado en", os.path.normpath(RUTA_MODELO))
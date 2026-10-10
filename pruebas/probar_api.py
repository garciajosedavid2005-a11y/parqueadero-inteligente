# -*- coding: utf-8 -*-

import base64
import json
import sys
import urllib.error
import urllib.request

URLS = {
    "backend": "http://localhost:5000/api/procesar",
    "modelo": "http://localhost:5001/predict",
}

if len(sys.argv) < 2:
    sys.exit("Uso: python probar_api.py fotos/placa_7.jpg [backend|modelo]")
destino = sys.argv[2] if len(sys.argv) > 2 else "backend"
if destino not in URLS:
    sys.exit("El destino debe ser 'backend' o 'modelo'")

with open(sys.argv[1], "rb") as f:
    imagen_b64 = base64.b64encode(f.read()).decode("ascii")

cuerpo = json.dumps({
    "image": imagen_b64,
    "metadata": {"origen": "prueba_script", "archivo": sys.argv[1]},
}).encode("utf-8")

peticion = urllib.request.Request(URLS[destino], data=cuerpo,
                                  headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(peticion) as r:
        print(json.dumps(json.loads(r.read()), indent=2, ensure_ascii=False))
except urllib.error.HTTPError as e:
    print("Error", e.code, e.read().decode())
except urllib.error.URLError:
    print(f"No pude conectar a {URLS[destino]}. ¿Está corriendo ese servidor?")
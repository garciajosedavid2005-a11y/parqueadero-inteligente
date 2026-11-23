#  Parqueadero Inteligente con Reconocimiento de Placas (CNN)

Sistema integral de parqueadero inteligente que automatiza el control de acceso, registro y cobro de vehículos mediante el reconocimiento óptico de placas vehiculares colombianas a partir de fotografías, utilizando visión por computadora y una Red Neuronal Convolucional (CNN) entrenada a medida.

Cuenta con un backend centralizado, un microservicio de inferencia de IA, un cliente web administrativo (React + Vite) y una aplicación móvil para operadores en campo (Expo / React Native).

---

##  Arquitectura del Sistema

```
                      ┌──────────────────────────────────────┐
                      │    Clientes de Captura y Control     │
                      ├──────────────────┬───────────────────┤
                      │  📱 App Móvil    │   💻 Panel Web    │
                      │  (Expo / React)  │  (React 18 + Vite)│
                      └─────────┬────────┴─────────┬─────────┘
                                │                  │
                                │  POST /procesar  │
                                ▼                  ▼
                      ┌──────────────────────────────────────┐
                      │       Backend Central (Flask)        │
                      │             Puerto 5000              │
                      │  • Liquidación de tarifas            │
                      │  • Lógica anti-rebote (30 seg)       │
                      │  • Persistencia GridFS / Registros   │
                      └──────────┬───────────────────┬───────┘
                                 │                   │
                     POST /predict│                   │ Lectura / Escritura
                                 ▼                   ▼
     ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
     │   Microservicio de IA (Flask)    │   │        Base de Datos             │
     │           Puerto 5001            │   │           MongoDB                │
     │  • Preprocesamiento y filtros    │   │  • Registros activos             │
     │  • Segmentación de caracteres    │   │  • Historial y auditoría         │
     │  • Inferencia CNN (model.keras)  │   │  • Almacén de fotos (GridFS)     │
     └──────────────────────────────────┘   └──────────────────────────────────┘
```

---

##  Módulos del Proyecto

| Directorio | Descripción | Tecnologías |
| :--- | :--- | :--- |
| **`backend/`** | API REST principal. Orquesta la lógica del negocio, liquida cobros, almacena imágenes en GridFS y gestiona la base de datos. | Python, Flask, Flask-CORS, PyMongo, GridFS |
| **`modelo/`** | Microservicio de inferencia de IA. Localiza la placa, segmenta los caracteres individuales y los clasifica con la CNN. | Python, Flask, Keras, TensorFlow, OpenCV, NumPy |
| **`frontend/`** | Panel de control web administrativo. Captura por cámara web o archivo, monitoreo de vehículos activos en vivo e historial con exportación a CSV. | React 18, Vite, React Router DOM, CSS nativo |
| **`movil/`** | Aplicación móvil para captura en campo. Permite tomar fotos con la cámara nativa o subirlas desde la galería, con renderizado fiel de placas colombianas y selector de IP. | React Native, Expo SDK, Async Storage |
| **`entrenamiento/`**| Herramientas para generar datasets sintéticos, aumentación de datos reales y entrenamiento de la red neuronal. | Python, Keras, Pillow, OpenCV |
| **`pruebas/`** | Scripts de prueba por consola para validar la API REST y el modelo enviando imágenes locales. | Python |

---

##  Requisitos Previos

- **Python 3.10 o superior**: Para el backend, modelo y scripts de entrenamiento.
- **Node.js 18 o superior**: Para el frontend web y la aplicación móvil Expo.
- **MongoDB**: Instancia local en `localhost:27017` o una cuenta en MongoDB Atlas.

---

##  Guía de Instalación y Ejecución

Sigue este orden para iniciar todo el ecosistema de servicios:

### 1. Iniciar el Microservicio del Modelo de IA (Puerto 5001)

El modelo debe estar activo para que el backend pueda comunicarse con él y solicitar lecturas de placas.

```bash
# Instalar dependencias de Python si aún no se han instalado
pip install -r requirements.txt

# Iniciar el servicio del modelo
python modelo/app.py
```
> El servicio quedará disponible en `http://localhost:5001`.

---

### 2. Iniciar el Backend Central (Puerto 5000)

Asegúrate de que MongoDB esté en ejecución. En una nueva terminal:

```bash
python backend/backend.py
```
> El backend quedará disponible en `http://localhost:5000`.

*Variables de entorno opcionales (puedes crear un archivo `.env` en la raíz):*
```env
MONGO_URI=mongodb://localhost:27017
MODELO_URL=http://localhost:5001/predict
```

---

### 3. Iniciar el Frontend Web (Puerto 5173)

En una nueva terminal:

```bash
cd frontend
npm install
npm run dev
```
> Abre tu navegador en `http://localhost:5173`.
> - **Vistas**: Registro (`/`), Vehículos Activos (`/activos`) e Historial (`/historial`).

---

### 4. Iniciar la Aplicación Móvil con Expo

En una nueva terminal:

```bash
cd movil
npm install
npx expo start
```
> - Abre la app **Expo Go** en tu dispositivo móvil (Android / iOS).
> - Escanea el código QR que se imprime en la terminal.
> - **Nota de red**: Asegúrate de que el celular esté en la misma red Wi-Fi de tu computadora y configura la IP de tu PC en el botón de ajustes de la app (ej: `http://192.168.1.X:5000`).

---

##  Endpoints de la API REST (`backend/backend.py`)

| Método | Endpoint | Descripción | Formato Entrada / Parámetros |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Chequeo de salud del servicio backend | Ninguno |
| `POST` | `/api/procesar` | Procesa una imagen en Base64, corre la CNN y registra entrada o salida | JSON: `{ "image": "base64...", "metadata": { ... } }` |
| `GET` | `/api/registros/activos` | Lista los vehículos actualmente estacionados | Ninguno |
| `GET` | `/api/registros/historial` | Lista el historial de sesiones completadas | Query param opcional: `?limit=50` |
| `GET` | `/api/imagenes/<id>` | Descarga la imagen almacenada en GridFS | Parámetro en ruta: `<id>` de MongoDB |

---

##  Reglas de Negocio y Reconocimiento

1. **Reconocimiento de Placas**:
   - Compatible con placas vehiculares colombianas de automóvil (`AAA123`) y motocicleta (`AAA12A`).
   - El modelo exige un umbral de confianza mínimo (`0.70`). Si no alcanza la confianza esperada, retorna el estado `lectura_dudosa`.
2. **Entrada**:
   - Si la placa no registra un ingreso abierto en la base de datos, se crea un nuevo registro con la hora de entrada y la foto en GridFS.
3. **Anti-rebote**:
   - Si se envía la foto del mismo vehículo con menos de **30 segundos** de diferencia respecto a la entrada, el sistema evita liquidar una salida accidental retornando el estado `ya_registrado`.
4. **Salida y Cobro**:
   - Si el vehículo ya se encuentra dentro y han pasado más de 30 segundos, se calcula el tiempo total en minutos y se liquida a una tarifa de **$50 COP por minuto** (mínimo 1 minuto).

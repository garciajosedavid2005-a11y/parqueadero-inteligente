# Frontend - Parqueadero Inteligente

Interfaz web (React 18 + Vite) para el backend de `backend/backend.py`.

## Requisitos

- Node.js 18 o superior
- Backend corriendo en `http://localhost:5000` (con MongoDB)
- Servicio del modelo corriendo en `http://localhost:5001`

## Uso

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`.

Para compilar a archivos estaticos: `npm run build` (salida en `frontend/dist`).

## Configuracion

Copia `.env.example` a `.env` si necesitas cambiar las URLs o la tarifa:

| Variable             | Por defecto             | Uso                                             |
| -------------------- | ----------------------- | ----------------------------------------------- |
| `VITE_API_URL`       | `http://localhost:5000` | Backend Flask                                   |
| `VITE_MODELO_URL`    | `http://localhost:5001` | Solo para el indicador de estado del modelo     |
| `VITE_TARIFA_MINUTO` | `50`                    | Debe coincidir con `TARIFA_MINUTO` del backend  |

## Vistas

- **Registro** (`/`): captura con camara o archivo, envia a `POST /api/procesar` y muestra el
  resultado (entrada, salida con cobro, ya registrado, lectura dudosa, sin placa, modelo caido).
  Guarda en memoria una bitacora de las lecturas de la sesion.
- **Activos** (`/activos`): `GET /api/registros/activos`, con cronometro y cobro estimado en vivo.
- **Historial** (`/historial`): `GET /api/registros/historial?limit=N`, con filtros, totales y
  exportacion a CSV.
- Las fotos se cargan desde `GET /api/imagenes/<id>` (GridFS).

## Estructura

```
src/
  api/client.js          Llamadas HTTP al backend y al modelo
  context/SesionContext  Bitacora local de lecturas y aviso de refresco
  hooks/                 usePolling (consulta periodica), useAhora (reloj)
  components/            Layout, captura, resultado, placa, miniaturas, visor
  pages/                 Registro, Activos, Historial
  utils/                 Formato de fechas y moneda, compresion de imagenes
  styles.css             Estilos (sin framework CSS)
```

## Notas

- La camara del navegador solo funciona en `localhost` o con HTTPS.
- Las imagenes se reducen a 1600 px y se envian como JPEG; el modelo las lleva a 1000 px de ancho.
- El backend guarda las fechas en hora local sin zona horaria; el navegador las interpreta igual,
  por lo que conviene usar el frontend en la misma zona horaria del servidor.

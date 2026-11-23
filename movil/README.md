# Parqueadero Inteligente - Módulo Móvil (Expo)

Módulo móvil desarrollado con **React Native** y **Expo** para el sistema de parqueadero inteligente. Permite capturar la placa de los vehículos en tiempo real con la cámara del dispositivo o cargar imágenes existentes de la galería, enviarlas al backend Flask con el modelo CNN de visión por computadora y gestionar entradas, salidas y cobros.

---

## Características Principales

- **Captura con Cámara en Vivo**: Toma fotos de placas vehiculares con encuadre y recorte guiado.
- **Subida desde Galería**: Selecciona imágenes de vehículos ya capturadas.
- **Integración con IA / CNN**: Envía la imagen en Base64 al backend Flask (`/api/procesar`), el cual ejecuta el modelo de segmentación y clasificación (`model.keras`).
- 🇨🇴 **Visualización de Placa Colombiana**: Renderizado gráfico estilizado de la placa vehicular colombiana (formato automóvil `ABC · 123` y motocicleta `ABC · 12D`).
- **Liquidación Automática de Tarifas**:
  - **Entrada**: Registra la hora de ingreso en MongoDB.
  - **Salida**: Calcula minutos de permanencia y tarifa ($50 COP/minuto) cuando el vehículo vuelve a escanearse.
  - **Anti-rebote**: Previene doble marcación accidental (<30 segundos).
- **Monitoreo de Vehículos Activos**: Lista en tiempo real de los vehículos actualmente estacionados con tiempo transcurrido y cobro estimado acumulado.
- **Historial de Salidas**: Consulta de recaudos anteriores con fecha y montos pagados.
- **Configurador de IP del Backend**: Permite ajustar la URL del servidor Flask (ej. `http://172.16.90.66:5000` o `http://localhost:5000`) directamente desde la app con prueba de conexión integrada.

---

## Estructura del Módulo Móvil

```
movil/
├── assets/                     # Íconos y splash screen
├── src/
│   ├── config/
│   │   └── api.js              # Gestión de URL del backend, presets y persistencia
│   ├── services/
│   │   └── parkingService.js   # Comunicación con la API (/api/procesar, /activos, /historial)
│   ├── components/
│   │   ├── ColombianPlate.js   # Gráfico auténtico de placa colombiana
│   │   ├── ResultCard.js       # Modal de resultados (Entrada, Salida, Cobro, etc.)
│   │   └── ServerConfigModal.js# Modal para cambiar IP y probar conexión
│   ├── screens/
│   │   ├── ScanScreen.js       # Pantalla principal (Cámara y Galería)
│   │   ├── ActiveScreen.js     # Vehículos actualmente en parqueadero
│   │   └── HistoryScreen.js    # Historial de cobros
│   └── styles/
│       └── theme.js            # Paleta de colores dark mode y espaciados
├── App.js                      # Componente principal con navegación por pestañas
├── app.json                    # Configuración de Expo y permisos
└── package.json
```

---

## Cómo Iniciar la Aplicación Móvil

### 1. Iniciar el Backend y el Modelo
Asegúrate de que MongoDB, el servicio del modelo (puerto 5001) y el backend Flask (puerto 5000) estén corriendo:

```bash
# Terminal 1: Modelo CNN
python modelo/app.py

# Terminal 2: Backend Flask
python backend/backend.py
```

### 2. Iniciar el Servidor de Expo

Entra a la carpeta `movil` y ejecuta:

```bash
cd movil
npx expo start
```

### 3. Probar en tu Teléfono Móvil (Recomendado)

1. Descarga la aplicación **Expo Go** en tu celular (disponible gratis en [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) o [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)).
2. Asegúrate de que tu celular esté conectado a la **misma red Wi-Fi** que tu computador.
3. En la terminal donde ejecutaste `npx expo start`, escanea el código **QR**:
   - En **Android**: Escanéalo desde la app Expo Go.
   - En **iOS**: Escanéalo directamente desde la app Cámara nativa.
4. En la parte superior derecha de la app verás un indicador del estado del servidor. Si necesitas cambiar la IP de tu PC, pulsa sobre él e ingresa la IP local de tu computador (por ejemplo: `http://172.16.90.66:5000`).


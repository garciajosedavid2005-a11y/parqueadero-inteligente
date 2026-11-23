import { getBackendUrl } from '../config/api';

/**
 * Servicio para interactuar con la API Flask del Parqueadero Inteligente
 */
export const parkingService = {
  /**
   * Envía una foto (en formato Base64) al endpoint /api/procesar
   * El backend procesa la imagen, ejecuta el modelo CNN y registra entrada o salida en MongoDB.
   *
   * @param {string} base64Image Cadena base64 pura o con data URI
   * @param {object} metadata Metadatos adicionales (origen, etc.)
   */
  async procesarImagen(base64Image, metadata = {}) {
    const baseUrl = await getBackendUrl();
    const url = `${baseUrl}/api/procesar`;

    // Nos aseguramos de enviar base64 limpio o data URI
    let formattedBase64 = base64Image;
    if (!formattedBase64.startsWith('data:')) {
      formattedBase64 = `data:image/jpeg;base64,${formattedBase64}`;
    }

    const payload = {
      image: formattedBase64,
      metadata: {
        origen: 'app_movil_expo',
        dispositivo: 'movil',
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };

    const controller = new AbortController();
    // 35 segundos de timeout por si el modelo CNN tarda en segmentar/clasificar
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = (data && (data.error || data.mensaje)) || `Error del servidor (código ${response.status})`;
        return {
          exito: false,
          error: errorMsg,
          estado: data?.estado || 'error_servidor',
          data,
        };
      }

      return {
        exito: true,
        data,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      let mensaje = err.message || 'Error de conexión con el backend';
      if (err.name === 'AbortError') {
        mensaje = 'La petición tardó demasiado tiempo (tiempo de espera agotado)';
      } else if (err.message && err.message.includes('Network request failed')) {
        mensaje = `No se pudo conectar a ${baseUrl}. Verifica que el backend esté corriendo y que la IP sea accesible desde tu móvil.`;
      }
      return {
        exito: false,
        error: mensaje,
        estado: 'error_conexion',
      };
    }
  },

  /**
   * Obtiene la lista de vehículos actualmente estacionados
   */
  async getVehiculosActivos() {
    const baseUrl = await getBackendUrl();
    const url = `${baseUrl}/api/registros/activos`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status} al consultar activos`);
      }
      const data = await response.json();
      return { exito: true, data };
    } catch (err) {
      return { exito: false, error: err.message, data: [] };
    }
  },

  /**
   * Obtiene el historial de salidas y cobros recientes
   */
  async getHistorial(limit = 40) {
    const baseUrl = await getBackendUrl();
    const url = `${baseUrl}/api/registros/historial?limit=${limit}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status} al consultar historial`);
      }
      const data = await response.json();
      return { exito: true, data };
    } catch (err) {
      return { exito: false, error: err.message, data: [] };
    }
  },

  /**
   * Construye la URL para obtener la imagen guardada en GridFS
   */
  async getImageUrl(imagenId) {
    if (!imagenId) return null;
    const baseUrl = await getBackendUrl();
    return `${baseUrl}/api/imagenes/${imagenId}`;
  },
};


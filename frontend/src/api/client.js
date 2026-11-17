// Cliente HTTP para backend/backend.py (puerto 5000) y modelo/app.py (puerto 5001).

const limpiar = (url) => url.replace(/\/+$/, '');

export const API_URL = limpiar(import.meta.env.VITE_API_URL || 'http://localhost:5000');
export const MODELO_URL = limpiar(import.meta.env.VITE_MODELO_URL || 'http://localhost:5001');

export class ApiError extends Error {
  constructor(mensaje, status = 0, datos = null) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.datos = datos;
  }
}

async function peticion(url, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }

  return { respuesta, datos };
}

async function get(ruta, { signal } = {}) {
  const { respuesta, datos } = await peticion(`${API_URL}${ruta}`, { signal });
  if (!respuesta.ok) {
    throw new ApiError(datos?.error || `Error ${respuesta.status}`, respuesta.status, datos);
  }
  return datos;
}

export const api = {
  health: (opts) => get('/health', opts),

  async healthModelo({ signal } = {}) {
    const { respuesta, datos } = await peticion(`${MODELO_URL}/health`, { signal });
    if (!respuesta.ok) throw new ApiError(`Error ${respuesta.status}`, respuesta.status, datos);
    return datos;
  },

  /**
   * Envia una imagen al backend para leer la placa y registrar entrada o salida.
   * El backend responde 503 con estado "error_modelo" cuando el modelo no responde;
   * ese caso se devuelve como resultado y no como excepcion.
   */
  async procesar(imagenBase64, metadata = {}) {
    const { respuesta, datos } = await peticion(`${API_URL}/api/procesar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imagenBase64, metadata }),
    });
    if (respuesta.ok || (respuesta.status === 503 && datos?.estado)) return datos;
    throw new ApiError(datos?.error || `Error ${respuesta.status}`, respuesta.status, datos);
  },

  activos: (opts) => get('/api/registros/activos', opts),

  historial: (limite = 50, opts) => get(`/api/registros/historial?limit=${limite}`, opts),

  imagenUrl: (id) => (id ? `${API_URL}/api/imagenes/${id}` : null),
};

// Reduce la imagen antes de enviarla: el modelo la lleva a 1000 px de ancho,
// asi que enviar fotos de 12 MP solo agrega peso a la red y a GridFS.
const LADO_MAXIMO = 1600;
const CALIDAD = 0.92;

function dibujarEnCanvas(fuente, ancho, alto) {
  const escala = Math.min(1, LADO_MAXIMO / Math.max(ancho, alto));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ancho * escala);
  canvas.height = Math.round(alto * escala);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(fuente, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', CALIDAD);
}

export function archivoADataUrl(archivo) {
  return new Promise((resolve, reject) => {
    if (!archivo || !archivo.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen'));
      return;
    }
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      try {
        resolve(dibujarEnCanvas(img, img.naturalWidth, img.naturalHeight));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

export function videoADataUrl(video) {
  if (!video || !video.videoWidth) throw new Error('La cámara aún no está lista');
  return dibujarEnCanvas(video, video.videoWidth, video.videoHeight);
}

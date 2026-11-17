import { useCallback, useEffect, useRef, useState } from 'react';
import { videoADataUrl } from '../utils/imagen';

function mensajeError(e) {
  if (!window.isSecureContext) return 'La cámara solo funciona en localhost o con HTTPS';
  if (e?.name === 'NotAllowedError') return 'Permiso de cámara denegado';
  if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') return 'No se encontró una cámara';
  if (e?.name === 'NotReadableError') return 'La cámara está siendo usada por otra aplicación';
  return 'No se pudo iniciar la cámara';
}

export default function CapturaCamara({ onCaptura, deshabilitado }) {
  const video = useRef(null);
  const stream = useRef(null);
  const [activa, setActiva] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState(null);

  const detener = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setActiva(false);
  }, []);

  const iniciar = useCallback(async () => {
    setError(null);
    setIniciando(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('sin soporte');
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => {});
      }
      setActiva(true);
    } catch (e) {
      setError(mensajeError(e));
      detener();
    } finally {
      setIniciando(false);
    }
  }, [detener]);

  useEffect(() => detener, [detener]);

  const capturar = () => {
    try {
      onCaptura(videoADataUrl(video.current));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="camara">
      <div className={`camara__marco${activa ? ' camara__marco--activa' : ''}`}>
        <video ref={video} playsInline muted className="camara__video" />
        {!activa && (
          <div className="camara__reposo">
            <span className="camara__reposo-titulo">Cámara apagada</span>
            <span className="camara__reposo-texto">Encuadra la placa del vehículo y captura</span>
          </div>
        )}
        {activa && <div className="camara__guia" aria-hidden="true" />}
      </div>
      {error && <p className="texto-error">{error}</p>}
      <div className="fila-botones">
        {!activa ? (
          <button type="button" className="boton boton--primario" onClick={iniciar} disabled={iniciando}>
            {iniciando ? 'Iniciando' : 'Encender cámara'}
          </button>
        ) : (
          <>
            <button type="button" className="boton boton--primario" onClick={capturar} disabled={deshabilitado}>
              Capturar
            </button>
            <button type="button" className="boton boton--contorno" onClick={detener}>
              Apagar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

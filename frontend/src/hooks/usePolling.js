import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Ejecuta `cargar` al montar y cada `intervalo` ms mientras la pestana este visible.
 * Conserva los ultimos datos validos si una actualizacion falla.
 */
export function usePolling(cargar, intervalo, deps = []) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizado, setActualizado] = useState(null);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;
  const controlador = useRef(null);

  const refrescar = useCallback(async () => {
    controlador.current?.abort();
    const ctrl = new AbortController();
    controlador.current = ctrl;
    try {
      const r = await cargarRef.current({ signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      setDatos(r);
      setError(null);
      setActualizado(new Date());
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e);
    } finally {
      if (!ctrl.signal.aborted) setCargando(false);
    }
  }, []);

  useEffect(() => {
    setCargando(true);
    refrescar();
    if (!intervalo) return () => controlador.current?.abort();

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refrescar();
    }, intervalo);
    const alVolver = () => {
      if (document.visibilityState === 'visible') refrescar();
    };
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
      controlador.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalo, refrescar, ...deps]);

  return { datos, error, cargando, actualizado, refrescar };
}

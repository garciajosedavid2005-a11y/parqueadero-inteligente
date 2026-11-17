import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Guarda en memoria las lecturas hechas desde este navegador durante la sesion.
// El backend no expone la coleccion "lecturas", asi que esta bitacora es local.
const SesionContext = createContext(null);
const MAX_LECTURAS = 30;

export function SesionProvider({ children }) {
  const [lecturas, setLecturas] = useState([]);
  const [version, setVersion] = useState(0);

  const agregarLectura = useCallback((lectura) => {
    setLecturas((prev) =>
      [{ ...lectura, clave: `${Date.now()}-${Math.random()}`, fecha_local: new Date() }, ...prev].slice(
        0,
        MAX_LECTURAS,
      ),
    );
    // Avisar a las vistas que dependen de registros para que se refresquen.
    if (lectura.estado === 'entrada' || lectura.estado === 'salida') setVersion((v) => v + 1);
  }, []);

  const limpiarLecturas = useCallback(() => setLecturas([]), []);

  const valor = useMemo(
    () => ({ lecturas, agregarLectura, limpiarLecturas, version }),
    [lecturas, agregarLectura, limpiarLecturas, version],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return ctx;
}

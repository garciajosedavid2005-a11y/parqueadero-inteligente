import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const VisorContext = createContext(() => {});

export function useVisor() {
  return useContext(VisorContext);
}

export function VisorProvider({ children }) {
  const [actual, setActual] = useState(null);
  const abrir = useCallback((src, titulo) => setActual({ src, titulo }), []);
  const cerrar = useCallback(() => setActual(null), []);

  useEffect(() => {
    if (!actual) return undefined;
    const alTeclear = (e) => e.key === 'Escape' && cerrar();
    document.addEventListener('keydown', alTeclear);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = '';
    };
  }, [actual, cerrar]);

  return (
    <VisorContext.Provider value={abrir}>
      {children}
      {actual && (
        <div className="visor" role="dialog" aria-modal="true" aria-label={actual.titulo} onClick={cerrar}>
          <div className="visor__barra" onClick={(e) => e.stopPropagation()}>
            <span className="visor__titulo">{actual.titulo}</span>
            <button type="button" className="boton boton--fantasma boton--sm" onClick={cerrar}>
              Cerrar
            </button>
          </div>
          <img className="visor__img" src={actual.src} alt={actual.titulo} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </VisorContext.Provider>
  );
}

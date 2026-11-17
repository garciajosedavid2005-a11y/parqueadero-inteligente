import { useRef, useState } from 'react';
import { archivoADataUrl } from '../utils/imagen';

const TIPOS = 'image/jpeg,image/png,image/webp';

export default function CapturaArchivo({ onCaptura, deshabilitado }) {
  const input = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState(null);

  const leer = async (archivo) => {
    setError(null);
    if (!archivo) return;
    try {
      onCaptura(await archivoADataUrl(archivo), archivo.name);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="archivo">
      <div
        className={`soltar${arrastrando ? ' soltar--activo' : ''}${deshabilitado ? ' soltar--off' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => !deshabilitado && input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !deshabilitado && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          if (!deshabilitado) leer(e.dataTransfer.files?.[0]);
        }}
      >
        <span className="soltar__titulo">Arrastra una foto aquí</span>
        <span className="soltar__texto">o haz clic para seleccionarla. JPEG, PNG o WEBP.</span>
        <input
          ref={input}
          type="file"
          accept={TIPOS}
          hidden
          onChange={(e) => {
            leer(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="texto-error">{error}</p>}
    </div>
  );
}

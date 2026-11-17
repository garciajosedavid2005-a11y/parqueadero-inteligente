import { useState } from 'react';
import { api } from '../api/client';
import { useVisor } from './VisorImagen';

export default function Miniatura({ imagenId, titulo, etiqueta }) {
  const abrir = useVisor();
  const [fallo, setFallo] = useState(false);
  const src = api.imagenUrl(imagenId);

  if (!src) return <span className="miniatura miniatura--vacia">{etiqueta || 'Sin foto'}</span>;
  if (fallo) return <span className="miniatura miniatura--vacia">No disponible</span>;

  return (
    <button type="button" className="miniatura" onClick={() => abrir(src, titulo)} title={`Ver ${titulo}`}>
      <img src={src} alt={titulo} loading="lazy" onError={() => setFallo(true)} />
      {etiqueta && <span className="miniatura__etiqueta">{etiqueta}</span>}
    </button>
  );
}

import { formatPlaca } from '../utils/format';

export default function Placa({ valor, tamano = 'md', tenue = false }) {
  if (!valor) return <span className="placa placa--vacia">------</span>;
  return (
    <span className={`placa placa--${tamano}${tenue ? ' placa--tenue' : ''}`} aria-label={`Placa ${valor}`}>
      {formatPlaca(valor)}
    </span>
  );
}

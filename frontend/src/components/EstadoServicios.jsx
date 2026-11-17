import { api } from '../api/client';
import { usePolling } from '../hooks/usePolling';

function Indicador({ nombre, estado }) {
  const texto = estado === 'ok' ? 'En línea' : estado === 'cargando' ? 'Verificando' : 'Sin conexión';
  return (
    <div className={`indicador indicador--${estado}`} title={`${nombre}: ${texto}`}>
      <span className="indicador__punto" aria-hidden="true" />
      <span className="indicador__nombre">{nombre}</span>
      <span className="indicador__texto">{texto}</span>
    </div>
  );
}

export default function EstadoServicios() {
  const backend = usePolling(api.health, 15000);
  const modelo = usePolling(api.healthModelo, 15000);

  const estado = (p) => (p.cargando && !p.datos && !p.error ? 'cargando' : p.error ? 'error' : 'ok');

  return (
    <div className="estado-servicios">
      <Indicador nombre="Backend" estado={estado(backend)} />
      <Indicador nombre="Modelo" estado={estado(modelo)} />
    </div>
  );
}

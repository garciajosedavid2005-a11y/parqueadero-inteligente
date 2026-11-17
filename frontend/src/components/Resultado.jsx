import Placa from './Placa';
import { formatConfianza, formatDuracion, formatHora, formatMoneda } from '../utils/format';

const ESTADOS = {
  entrada: { etiqueta: 'Entrada', tono: 'positivo' },
  salida: { etiqueta: 'Salida', tono: 'positivo' },
  ya_registrado: { etiqueta: 'Ya registrado', tono: 'aviso' },
  lectura_dudosa: { etiqueta: 'Lectura dudosa', tono: 'aviso' },
  sin_placa: { etiqueta: 'Sin placa', tono: 'error' },
  error_modelo: { etiqueta: 'Modelo no disponible', tono: 'error' },
  error_red: { etiqueta: 'Error', tono: 'error' },
};

function Dato({ etiqueta, valor, grande }) {
  return (
    <div className={`dato${grande ? ' dato--grande' : ''}`}>
      <span className="dato__etiqueta">{etiqueta}</span>
      <span className="dato__valor">{valor}</span>
    </div>
  );
}

export default function Resultado({ resultado, procesando }) {
  if (procesando) {
    return (
      <div className="resultado resultado--procesando" aria-live="polite">
        <div className="barra-progreso" aria-hidden="true" />
        <span className="resultado__estado">Procesando</span>
        <p className="resultado__mensaje">Leyendo la placa con el modelo</p>
      </div>
    );
  }

  if (!resultado) {
    return (
      <div className="resultado resultado--vacio">
        <span className="resultado__estado">En espera</span>
        <p className="resultado__mensaje">Captura o sube una foto para registrar una entrada o una salida.</p>
        <ol className="pasos">
          <li>La foto se guarda en GridFS</li>
          <li>El modelo CNN lee la placa</li>
          <li>Si la placa no está adentro, se registra la entrada</li>
          <li>Si ya está adentro, se registra la salida y se calcula el cobro</li>
        </ol>
      </div>
    );
  }

  const info = ESTADOS[resultado.estado] || { etiqueta: resultado.estado, tono: 'aviso' };
  const r = resultado;

  return (
    <div className={`resultado resultado--${info.tono}`} aria-live="polite">
      <div className="resultado__cabeza">
        <span className={`sello sello--${info.tono}`}>{info.etiqueta}</span>
        {r.confianza != null && <span className="resultado__conf">Confianza {formatConfianza(r.confianza)}</span>}
      </div>

      {r.placa && (
        <div className="resultado__placa">
          <Placa valor={r.placa} tamano="xl" tenue={r.estado === 'lectura_dudosa'} />
        </div>
      )}

      <p className="resultado__mensaje">{r.mensaje}</p>

      {r.estado === 'salida' && (
        <>
          <div className="resultado__cobro">
            <span className="resultado__cobro-etiqueta">Valor a pagar</span>
            <span className="resultado__cobro-valor">{formatMoneda(r.valor_a_pagar)}</span>
          </div>
          <div className="datos">
            <Dato etiqueta="Entrada" valor={formatHora(r.hora_entrada)} />
            <Dato etiqueta="Salida" valor={formatHora(r.hora_salida)} />
            <Dato etiqueta="Tiempo" valor={formatDuracion(r.minutos)} />
          </div>
        </>
      )}

      {(r.estado === 'entrada' || r.estado === 'ya_registrado') && (
        <div className="datos">
          <Dato etiqueta="Hora de entrada" valor={formatHora(r.hora_entrada)} />
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { Actualizado, AvisoError, Buscador, EncabezadoPagina, Metrica, Vacio } from '../components/Comunes';
import Miniatura from '../components/Miniatura';
import Placa from '../components/Placa';
import { useSesion } from '../context/SesionContext';
import { usePolling } from '../hooks/usePolling';
import { esHoy, formatDuracion, formatFecha, formatHora, formatMoneda } from '../utils/format';

const LIMITES = [25, 50, 100, 200, 500];

function exportarCsv(filas) {
  const cabecera = ['placa', 'hora_entrada', 'hora_salida', 'minutos', 'valor_a_pagar'];
  const lineas = filas.map((r) => cabecera.map((c) => r[c] ?? '').join(','));
  const blob = new Blob([[cabecera.join(','), ...lineas].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historial_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Historial() {
  const { version } = useSesion();
  const [limite, setLimite] = useState(50);
  const [filtro, setFiltro] = useState('');
  const [soloHoy, setSoloHoy] = useState(false);

  const { datos, error, cargando, actualizado, refrescar } = usePolling(
    (opts) => api.historial(limite, opts),
    30000,
    [limite, version],
  );

  const filas = useMemo(() => {
    let lista = datos || [];
    if (soloHoy) lista = lista.filter((r) => esHoy(r.hora_salida));
    if (filtro) lista = lista.filter((r) => r.placa.includes(filtro.replace(/\s/g, '')));
    return lista;
  }, [datos, filtro, soloHoy]);

  const recaudo = filas.reduce((s, r) => s + (r.valor_a_pagar || 0), 0);
  const promedio = filas.length ? filas.reduce((s, r) => s + (r.minutos || 0), 0) / filas.length : null;
  const maximo = filas.reduce((m, r) => Math.max(m, r.valor_a_pagar || 0), 0);

  return (
    <>
      <EncabezadoPagina titulo="Historial" descripcion="Estadías cerradas, de la salida más reciente a la más antigua.">
        <Actualizado fecha={actualizado} cargando={cargando} onRefrescar={refrescar} />
      </EncabezadoPagina>

      <section className="metricas">
        <Metrica etiqueta="Recaudado" valor={formatMoneda(recaudo)} detalle={`${filas.length} salidas`} destacada />
        <Metrica etiqueta="Estadía promedio" valor={formatDuracion(promedio)} detalle="Por vehículo" />
        <Metrica etiqueta="Cobro más alto" valor={filas.length ? formatMoneda(maximo) : '--'} detalle="En la selección" />
      </section>

      <AvisoError error={error} onReintentar={refrescar} />

      <section className="panel">
        <div className="panel__cabeza panel__cabeza--filtros">
          <h2 className="panel__titulo">Salidas</h2>
          <div className="filtros">
            <Buscador valor={filtro} onCambio={setFiltro} />
            <select className="campo campo--select" value={limite} onChange={(e) => setLimite(Number(e.target.value))} aria-label="Cantidad de registros">
              {LIMITES.map((l) => (
                <option key={l} value={l}>
                  Últimos {l}
                </option>
              ))}
            </select>
            <label className="interruptor interruptor--compacto">
              <input type="checkbox" checked={soloHoy} onChange={(e) => setSoloHoy(e.target.checked)} />
              <span className="interruptor__pista" aria-hidden="true" />
              <span>Solo hoy</span>
            </label>
            <button type="button" className="boton boton--contorno boton--sm" onClick={() => exportarCsv(filas)} disabled={!filas.length}>
              Exportar CSV
            </button>
          </div>
        </div>

        {!datos && cargando ? (
          <div className="cargando-tabla">Cargando</div>
        ) : !datos && error ? (
          <Vacio titulo="Sin datos" texto="No fue posible cargar el historial." />
        ) : filas.length === 0 ? (
          <Vacio
            titulo="Sin registros"
            texto={filtro || soloHoy ? 'Ningún registro coincide con los filtros.' : 'Aún no hay salidas registradas.'}
          />
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Fecha</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Tiempo</th>
                  <th className="num">Valor</th>
                  <th>Fotos</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Placa valor={r.placa} />
                    </td>
                    <td className="mono tenue">{formatFecha(r.hora_salida)}</td>
                    <td className="mono">{formatHora(r.hora_entrada)}</td>
                    <td className="mono">{formatHora(r.hora_salida)}</td>
                    <td className="mono">{formatDuracion(r.minutos)}</td>
                    <td className="num mono fuerte">{formatMoneda(r.valor_a_pagar)}</td>
                    <td>
                      <div className="miniaturas">
                        <Miniatura imagenId={r.imagen_entrada_id} titulo={`Entrada ${r.placa}`} etiqueta="E" />
                        <Miniatura imagenId={r.imagen_salida_id} titulo={`Salida ${r.placa}`} etiqueta="S" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { Actualizado, AvisoError, Buscador, EncabezadoPagina, Metrica, Vacio } from '../components/Comunes';
import Miniatura from '../components/Miniatura';
import Placa from '../components/Placa';
import { useSesion } from '../context/SesionContext';
import { useAhora } from '../hooks/useAhora';
import { usePolling } from '../hooks/usePolling';
import {
  TARIFA_MINUTO,
  estimarCobro,
  formatCronometro,
  formatFecha,
  formatHora,
  formatMoneda,
  esHoy,
} from '../utils/format';

export default function Activos() {
  const { version } = useSesion();
  const { datos, error, cargando, actualizado, refrescar } = usePolling(api.activos, 10000, [version]);
  const ahora = useAhora(1000);
  const [filtro, setFiltro] = useState('');

  const filas = useMemo(() => {
    const lista = (datos || []).map((r) => ({ ...r, cobro: estimarCobro(r.hora_entrada, ahora) }));
    return filtro ? lista.filter((r) => r.placa.includes(filtro.replace(/\s/g, ''))) : lista;
  }, [datos, ahora, filtro]);

  const total = (datos || []).length;
  const acumulado = filas.reduce((s, r) => s + r.cobro.valor, 0);
  const masAntiguo = filas.reduce((m, r) => (r.cobro.segundos > (m?.cobro.segundos ?? -1) ? r : m), null);

  return (
    <>
      <EncabezadoPagina titulo="Activos" descripcion="Vehículos que están dentro del parqueadero en este momento.">
        <Actualizado fecha={actualizado} cargando={cargando} onRefrescar={refrescar} />
      </EncabezadoPagina>

      <section className="metricas">
        <Metrica etiqueta="Adentro" valor={datos ? total : '--'} detalle="Vehículos" destacada />
        <Metrica etiqueta="Por cobrar" valor={formatMoneda(acumulado)} detalle="Estimado si salen ahora" />
        <Metrica
          etiqueta="Más tiempo"
          valor={masAntiguo ? formatCronometro(masAntiguo.cobro.segundos) : '--'}
          detalle={masAntiguo ? `Placa ${masAntiguo.placa}` : 'Sin vehículos'}
        />
        <Metrica etiqueta="Tarifa" valor={formatMoneda(TARIFA_MINUTO)} detalle="Por minuto iniciado" />
      </section>

      <AvisoError error={error} onReintentar={refrescar} />

      <section className="panel">
        <div className="panel__cabeza">
          <h2 className="panel__titulo">Vehículos adentro</h2>
          <Buscador valor={filtro} onCambio={setFiltro} />
        </div>

        {!datos && cargando ? (
          <div className="cargando-tabla">Cargando</div>
        ) : !datos && error ? (
          <Vacio titulo="Sin datos" texto="No fue posible cargar los vehículos activos." />
        ) : filas.length === 0 ? (
          <Vacio
            titulo={filtro ? 'Sin coincidencias' : 'Parqueadero vacío'}
            texto={filtro ? `Ninguna placa activa contiene "${filtro}".` : 'No hay vehículos registrados adentro.'}
          />
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Entrada</th>
                  <th>Tiempo</th>
                  <th className="num">Estimado</th>
                  <th>Foto</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Placa valor={r.placa} />
                    </td>
                    <td className="mono">
                      {formatHora(r.hora_entrada)}
                      {!esHoy(r.hora_entrada) && <span className="sub">{formatFecha(r.hora_entrada)}</span>}
                    </td>
                    <td className="mono fuerte">{formatCronometro(r.cobro.segundos)}</td>
                    <td className="num mono fuerte">{formatMoneda(r.cobro.valor)}</td>
                    <td>
                      <Miniatura imagenId={r.imagen_entrada_id} titulo={`Entrada ${r.placa}`} />
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

import { useState } from 'react';
import { api } from '../api/client';
import CapturaArchivo from '../components/CapturaArchivo';
import CapturaCamara from '../components/CapturaCamara';
import { EncabezadoPagina, Metrica, Vacio } from '../components/Comunes';
import Miniatura from '../components/Miniatura';
import Placa from '../components/Placa';
import Resultado from '../components/Resultado';
import { useSesion } from '../context/SesionContext';
import { usePolling } from '../hooks/usePolling';
import { formatConfianza, formatMoneda } from '../utils/format';

const ETIQUETAS = {
  entrada: 'Entrada',
  salida: 'Salida',
  ya_registrado: 'Ya registrado',
  lectura_dudosa: 'Lectura dudosa',
  sin_placa: 'Sin placa',
  error_modelo: 'Modelo caído',
  error_red: 'Error',
};

export default function Registro() {
  const { lecturas, agregarLectura, limpiarLecturas, version } = useSesion();
  const activos = usePolling(api.activos, 20000, [version]);

  const [modo, setModo] = useState('archivo');
  const [imagen, setImagen] = useState(null);
  const [nombre, setNombre] = useState(null);
  const [enviarDirecto, setEnviarDirecto] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const procesar = async (dataUrl = imagen, archivo = nombre) => {
    if (!dataUrl || procesando) return;
    setProcesando(true);
    setResultado(null);
    const metadata = { origen: modo === 'camara' ? 'web_camara' : 'web_archivo' };
    if (archivo) metadata.archivo = archivo;
    let r;
    try {
      r = await api.procesar(dataUrl, metadata);
    } catch (e) {
      r = { estado: 'error_red', placa: null, mensaje: e.message };
    }
    setResultado(r);
    agregarLectura(r);
    setProcesando(false);
  };

  const alCapturar = (dataUrl, archivo = null) => {
    setImagen(dataUrl);
    setNombre(archivo);
    setResultado(null);
    if (enviarDirecto) procesar(dataUrl, archivo);
  };

  const descartar = () => {
    setImagen(null);
    setNombre(null);
    setResultado(null);
  };

  const recaudoSesion = lecturas.filter((l) => l.estado === 'salida').reduce((s, l) => s + (l.valor_a_pagar || 0), 0);

  return (
    <>
      <EncabezadoPagina
        titulo="Registro"
        descripcion="Toma o sube una foto de la placa. El sistema decide si es una entrada o una salida."
      />

      <section className="metricas">
        <Metrica
          etiqueta="Vehículos adentro"
          valor={activos.datos ? activos.datos.length : '--'}
          detalle={activos.error ? 'Sin conexión' : 'En este momento'}
          destacada
        />
        <Metrica etiqueta="Lecturas" valor={lecturas.length} detalle="En esta sesión" />
        <Metrica
          etiqueta="Recaudado"
          valor={formatMoneda(recaudoSesion)}
          detalle="Salidas de esta sesión"
        />
      </section>

      <section className="rejilla-registro">
        <div className="panel">
          <div className="panel__cabeza">
            <h2 className="panel__titulo">Captura</h2>
            <div className="segmentado" role="tablist" aria-label="Origen de la imagen">
              {[
                ['archivo', 'Archivo'],
                ['camara', 'Cámara'],
              ].map(([v, t]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={modo === v}
                  className={`segmentado__op${modo === v ? ' segmentado__op--activo' : ''}`}
                  onClick={() => setModo(v)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {modo === 'camara' ? (
            <CapturaCamara onCaptura={(d) => alCapturar(d)} deshabilitado={procesando} />
          ) : (
            <CapturaArchivo onCaptura={alCapturar} deshabilitado={procesando} />
          )}

          <label className="interruptor">
            <input type="checkbox" checked={enviarDirecto} onChange={(e) => setEnviarDirecto(e.target.checked)} />
            <span className="interruptor__pista" aria-hidden="true" />
            <span>Procesar automáticamente al capturar</span>
          </label>

          {imagen && (
            <div className="vista-previa">
              <img src={imagen} alt="Imagen capturada" />
              <div className="fila-botones">
                {!enviarDirecto || resultado ? (
                  <button type="button" className="boton boton--primario" onClick={() => procesar()} disabled={procesando}>
                    {resultado ? 'Procesar de nuevo' : 'Procesar'}
                  </button>
                ) : null}
                <button type="button" className="boton boton--contorno" onClick={descartar} disabled={procesando}>
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="panel panel--resultado">
          <div className="panel__cabeza">
            <h2 className="panel__titulo">Resultado</h2>
          </div>
          <Resultado resultado={resultado} procesando={procesando} />
        </div>
      </section>

      <section className="panel">
        <div className="panel__cabeza">
          <h2 className="panel__titulo">Lecturas de esta sesión</h2>
          {lecturas.length > 0 && (
            <button type="button" className="boton boton--fantasma boton--sm" onClick={limpiarLecturas}>
              Limpiar
            </button>
          )}
        </div>
        {lecturas.length === 0 ? (
          <Vacio titulo="Sin lecturas" texto="Las lecturas que hagas desde este navegador aparecerán aquí." />
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Placa</th>
                  <th>Estado</th>
                  <th>Confianza</th>
                  <th className="num">Valor</th>
                  <th>Foto</th>
                </tr>
              </thead>
              <tbody>
                {lecturas.map((l) => (
                  <tr key={l.clave}>
                    <td className="mono">{l.fecha_local.toLocaleTimeString('es-CO', { hour12: false })}</td>
                    <td>
                      <Placa valor={l.placa} tamano="sm" />
                    </td>
                    <td>
                      <span className={`etiqueta etiqueta--${l.estado}`}>{ETIQUETAS[l.estado] || l.estado}</span>
                    </td>
                    <td className="mono">{formatConfianza(l.confianza)}</td>
                    <td className="num mono">{l.estado === 'salida' ? formatMoneda(l.valor_a_pagar) : '--'}</td>
                    <td>
                      <Miniatura imagenId={l.imagen_id} titulo={`Lectura ${l.placa || 'sin placa'}`} />
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

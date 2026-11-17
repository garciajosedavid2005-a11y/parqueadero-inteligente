export function EncabezadoPagina({ titulo, descripcion, children }) {
  return (
    <div className="encabezado">
      <div>
        <h1 className="encabezado__titulo">{titulo}</h1>
        {descripcion && <p className="encabezado__desc">{descripcion}</p>}
      </div>
      {children && <div className="encabezado__acciones">{children}</div>}
    </div>
  );
}

export function Metrica({ etiqueta, valor, detalle, destacada = false }) {
  return (
    <div className={`metrica${destacada ? ' metrica--destacada' : ''}`}>
      <span className="metrica__etiqueta">{etiqueta}</span>
      <span className="metrica__valor">{valor}</span>
      {detalle && <span className="metrica__detalle">{detalle}</span>}
    </div>
  );
}

export function Vacio({ titulo, texto }) {
  return (
    <div className="vacio">
      <p className="vacio__titulo">{titulo}</p>
      {texto && <p className="vacio__texto">{texto}</p>}
    </div>
  );
}

export function AvisoError({ error, onReintentar }) {
  if (!error) return null;
  return (
    <div className="aviso aviso--error" role="alert">
      <span>{error.message || 'Ocurrió un error'}</span>
      {onReintentar && (
        <button type="button" className="boton boton--fantasma boton--sm" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Actualizado({ fecha, cargando, onRefrescar }) {
  return (
    <div className="actualizado">
      <span>
        {cargando ? 'Actualizando' : fecha ? `Actualizado ${fecha.toLocaleTimeString('es-CO', { hour12: false })}` : ''}
      </span>
      <button type="button" className="boton boton--contorno boton--sm" onClick={onRefrescar} disabled={cargando}>
        Actualizar
      </button>
    </div>
  );
}

export function Buscador({ valor, onCambio, placeholder = 'Buscar placa' }) {
  return (
    <input
      type="search"
      className="campo"
      value={valor}
      onChange={(e) => onCambio(e.target.value.toUpperCase())}
      placeholder={placeholder}
      aria-label={placeholder}
      maxLength={8}
    />
  );
}

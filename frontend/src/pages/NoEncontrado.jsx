import { Link } from 'react-router-dom';

export default function NoEncontrado() {
  return (
    <div className="no-encontrado">
      <span className="no-encontrado__codigo">404</span>
      <p>Esta página no existe.</p>
      <Link to="/" className="boton boton--primario">
        Ir al registro
      </Link>
    </div>
  );
}

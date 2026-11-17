import { NavLink, Outlet } from 'react-router-dom';
import EstadoServicios from './EstadoServicios';

const RUTAS = [
  { a: '/', texto: 'Registro', fin: true },
  { a: '/activos', texto: 'Activos' },
  { a: '/historial', texto: 'Historial' },
];

export default function Layout() {
  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera__fila">
          <NavLink to="/" className="marca" aria-label="Inicio">
            <span className="marca__bloque">P</span>
            <span className="marca__texto">
              <strong>Parqueadero</strong>
              <span>Inteligente</span>
            </span>
          </NavLink>
          <nav className="nav" aria-label="Principal">
            {RUTAS.map((r) => (
              <NavLink key={r.a} to={r.a} end={r.fin} className={({ isActive }) => `nav__item${isActive ? ' nav__item--activo' : ''}`}>
                {r.texto}
              </NavLink>
            ))}
          </nav>
          <EstadoServicios />
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
      <footer className="pie">
        <span>Lectura de placas con CNN propia</span>
        <span>Cliente / Backend 5000 / Modelo 5001 / MongoDB</span>
      </footer>
    </div>
  );
}

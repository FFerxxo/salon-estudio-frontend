import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MenuUsuario } from './MenuUsuario';

interface ItemNav {
  to: string;
  label: string;
  end?: boolean;
}

// La navegación cambia según la sesión: sin sesión no se muestran Panel ni Perfil.
const NAV_SIN_SESION: ItemNav[] = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/ingresar', label: 'Ingresar' },
  { to: '/registro', label: 'Registrarse', end: true },
  { to: '/ayuda', label: 'Ayuda' },
];

const NAV_CON_SESION: ItemNav[] = [
  { to: '/panel', label: 'Panel' },
  { to: '/ayuda', label: 'Ayuda' },
];

const NAV_PERFIL_INCOMPLETO: ItemNav[] = [{ to: '/ayuda', label: 'Ayuda' }];

export function Layout() {
  const { estado, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const navItems =
    estado === 'con-perfil'
      ? NAV_CON_SESION
      : estado === 'perfil-incompleto'
        ? NAV_PERFIL_INCOMPLETO
        : NAV_SIN_SESION;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:font-semibold focus:rounded-md focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-sky-400"
      >
        Saltar al contenido
      </a>

      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="font-bold text-xl tracking-tight">Salón de Estudio</div>
          <nav aria-label="Navegación principal" className="flex flex-wrap items-center gap-2">
            <ul className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                        isActive
                          ? 'bg-sky-800 text-white'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            {estado === 'con-perfil' && <MenuUsuario />}
            {estado === 'perfil-incompleto' && (
              <button
                type="button"
                onClick={() =>
                  void cerrarSesion().then(() =>
                    navigate('/ingresar', { replace: true, state: { motivo: 'cerro-sesion' } })
                  )
                }
                className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Cerrar sesión
              </button>
            )}
          </nav>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 focus:outline-none">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-sm text-slate-700">
        <div className="max-w-5xl mx-auto px-4">
          Salón de Estudio Colaborativo en Tiempo Real · Universidad del Valle
        </div>
      </footer>
    </div>
  );
}

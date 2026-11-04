import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/ingresar', label: 'Ingresar' },
  { to: '/registro', label: 'Registro' },
  { to: '/panel', label: 'Panel' },
  { to: '/perfil', label: 'Perfil' },
  { to: '/ayuda', label: 'Ayuda' },
  { to: '/base-tecnica', label: 'Base técnica' },
];

export function Layout() {
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
          <nav aria-label="Navegación principal">
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
          </nav>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 focus:outline-none">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-sm text-slate-700">
        <div className="max-w-5xl mx-auto px-4">
          Salón de Estudio Colaborativo en Tiempo Real · Proyecto Integrador I (Sprint 0)
        </div>
      </footer>
    </div>
  );
}

import { LogOut, Moon, Pause, Play, Sun } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AmbientMotionBackdrop } from './AmbientMotionBackdrop';

const navItems = [
  { to: '/panel', label: 'Panel' },
  { to: '/perfil', label: 'Perfil' },
  { to: '/ayuda', label: 'Ayuda' },
  { to: '/base-tecnica', label: 'Base técnica' },
];

const ACCESS_ROUTES = new Set(['/', '/ingresar', '/registro', '/registro/google-username']);

export function Layout() {
  const { theme, toggleTheme, motionPaused, toggleMotionPaused } = useTheme();
  const { status, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isDark = theme === 'dark';
  const isAccessRoute = ACCESS_ROUTES.has(location.pathname);

  const handleLogout = async () => {
    navigate('/', { replace: true });
    await logout();
  };

  const floatingButtonClass = `min-h-[44px] px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] border-[#64748b] inline-flex items-center gap-1.5 shadow-lg backdrop-blur-[14px] transition-colors ${
    isDark
      ? 'bg-[#0f172a]/85 text-[#f8fafc] hover:bg-[#1e293b]/90'
      : 'bg-white/90 text-[#0f172a] hover:bg-white'
  }`;

  return (
    <div
      className={`relative min-h-screen flex flex-col transition-colors duration-300 ${
        isDark ? 'bg-[#0b1220] text-[#f8fafc]' : 'bg-[#f8fafc] text-[#0f172a]'
      }`}
    >
      <AmbientMotionBackdrop subtle={!isAccessRoute} />

      <a
        href="#contenido"
        className={`sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:min-h-[44px] focus:inline-flex focus:items-center focus:px-4 focus:py-2 focus:font-bold focus:rounded-xl focus:shadow-lg ${
          isDark ? 'focus:bg-[#38bdf8] focus:text-[#0b1220]' : 'focus:bg-[#075985] focus:text-white'
        }`}
      >
        Saltar al contenido
      </a>

      {isAccessRoute ? (
        <header
          className={`relative z-20 transition-colors ${
            isDark
              ? 'bg-gradient-to-b from-[#0b1220]/85 via-[#0b1220]/50 to-transparent text-[#f8fafc]'
              : 'bg-gradient-to-b from-white/90 via-white/70 to-transparent text-[#0f172a]'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 pt-3.5 pb-2 pr-44 sm:pr-48 flex flex-wrap items-center justify-between gap-2">
            <Link to="/" className="inline-flex items-center gap-2.5 min-h-[44px]">
              {/* Rojo Univalle #990000 reservado exclusivamente al escudo institucional (Guía visual v3) */}
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#990000] font-extrabold text-white text-xs shrink-0"
              >
                UV
              </span>
              <span className="leading-tight">
                <span className="block font-bold text-sm sm:text-base tracking-tight">
                  Salón de Estudio
                </span>
                <span className={`block text-xs ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
                  Estudia en grupo, en tiempo real
                </span>
              </span>
            </Link>

            <nav aria-label="Navegación principal">
              <ul className="flex items-center gap-1">
                <li>
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `inline-flex items-center min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? 'underline underline-offset-4'
                          : isDark
                            ? 'text-[#f8fafc] hover:text-[#7dd3fc]'
                            : 'text-[#0f172a] hover:text-[#075985]'
                      }`
                    }
                  >
                    Inicio
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/ayuda"
                    className={({ isActive }) =>
                      `inline-flex items-center min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? 'underline underline-offset-4'
                          : isDark
                            ? 'text-[#f8fafc] hover:text-[#7dd3fc]'
                            : 'text-[#0f172a] hover:text-[#075985]'
                      }`
                    }
                  >
                    Ayuda
                  </NavLink>
                </li>
              </ul>
            </nav>
          </div>
        </header>
      ) : (
        <header
          className={`relative z-20 border-b transition-colors ${
            isDark
              ? 'bg-[#0f172a] text-[#f8fafc] border-slate-400/35'
              : 'bg-white text-[#0f172a] border-slate-300 shadow-sm'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {/* Rojo Univalle #990000 reservado exclusivamente al escudo institucional (Guía visual v3) */}
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#990000] font-extrabold text-white text-xs"
              >
                UV
              </span>
              <div className="font-bold text-lg sm:text-xl tracking-tight">Salón de Estudio</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <nav aria-label="Navegación principal">
                <ul className="flex flex-wrap gap-1.5">
                  {navItems.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `inline-flex items-center min-h-[44px] px-3.5 py-2 rounded-[10px] text-sm font-semibold transition-colors ${
                            isActive
                              ? isDark
                                ? 'bg-[#38bdf8] text-[#0b1220]'
                                : 'bg-[#075985] text-white'
                              : isDark
                                ? 'text-[#f8fafc] hover:bg-white/10'
                                : 'text-[#0f172a] hover:bg-slate-100'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              {status === 'authenticated' && user && (
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  aria-label="Salir de la sesión"
                  className={`min-h-[44px] px-3 py-2 rounded-[10px] text-xs font-bold border-[1.5px] border-[#64748b] inline-flex items-center gap-1.5 transition-colors ${
                    isDark
                      ? 'bg-[#0b1220] text-[#f8fafc] hover:bg-white/10'
                      : 'bg-white text-[#0f172a] hover:bg-slate-100'
                  }`}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>Salir</span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <main
        id="contenido"
        tabIndex={-1}
        className={
          isAccessRoute
            ? 'relative z-10 flex-1 w-full grid place-items-center px-4 py-6 focus:outline-none'
            : 'relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-8 focus:outline-none'
        }
      >
        <Outlet />
      </main>

      {/* Botones flotantes pequeños en esquina para Pausa de mar y Tema (Guía visual v3 §3) */}
      <div
        role="group"
        aria-label="Controles de tema y movimiento"
        className="fixed top-3.5 right-4 z-30 flex items-center gap-2"
      >
        {isAccessRoute && (
          <button
            type="button"
            onClick={toggleMotionPaused}
            aria-pressed={motionPaused}
            aria-label={
              motionPaused ? 'Reanudar animación de fondo' : 'Pausar animación de fondo'
            }
            className={floatingButtonClass}
          >
            {motionPaused ? (
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Pause className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{motionPaused ? 'Mar' : 'Pausar'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className={floatingButtonClass}
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-[#075985]" aria-hidden="true" />
          )}
          <span>{isDark ? 'Día' : 'Noche'}</span>
        </button>
      </div>

      {isAccessRoute ? (
        <footer
          className={`relative z-10 py-3 text-center text-xs ${
            isDark
              ? 'bg-gradient-to-t from-[#0b1220]/85 via-[#0b1220]/50 to-transparent text-[#cbd5e1]'
              : 'bg-gradient-to-t from-white/90 via-white/70 to-transparent text-[#334155]'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4">Universidad del Valle · Proyecto Integrador I</div>
        </footer>
      ) : (
        <footer
          className={`relative z-10 border-t py-5 text-center text-sm ${
            isDark
              ? 'bg-[#0f172a] border-slate-400/35 text-[#cbd5e1]'
              : 'bg-white border-slate-300 text-[#334155]'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4">
            Salón de Estudio Colaborativo en Tiempo Real · Universidad del Valle (Sprint 1)
          </div>
        </footer>
      )}
    </div>
  );
}

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  HelpCircle,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Pause,
  Play,
  Sun,
  User,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AmbientMotionBackdrop } from './AmbientMotionBackdrop';

const ACCESS_ROUTES = new Set(['/', '/ingresar', '/registro', '/registro/google-username']);

const visitorNavItems = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/ayuda', label: 'Ayuda', end: false },
  { to: '/base-tecnica', label: 'Base técnica', end: false },
  { to: '/ingresar', label: 'Ingresar', end: false },
];

const workspaceTitleMap: Record<string, string> = {
  '/panel': 'Panel',
  '/perfil': 'Perfil',
  '/ayuda': 'Ayuda',
  '/base-tecnica': 'Base técnica',
};

export function Layout() {
  const { theme, toggleTheme, motionPaused, prefersReducedMotion, toggleMotionPaused } = useTheme();
  const { status, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDark = theme === 'dark';
  const isAccessRoute = ACCESS_ROUTES.has(location.pathname);
  const isAuthenticated = status === 'authenticated' && Boolean(user);
  const isAppWorkspace = !isAccessRoute && isAuthenticated;

  const searchParams = new URLSearchParams(location.search);
  const isMisSalasView =
    location.pathname === '/panel' && searchParams.get('vista') === 'mis-salas';

  const currentWorkspaceTitle = isMisSalasView
    ? 'Mis salas'
    : location.pathname.startsWith('/salas/')
      ? 'Sala colaborativa'
      : workspaceTitleMap[location.pathname] ?? 'Salón de Estudio';

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    navigate('/', { replace: true });
    await logout();
  };

  const floatingButtonClass = `min-h-[44px] px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] border-[#64748b] inline-flex items-center gap-1.5 shadow-lg backdrop-blur-[14px] transition-colors ${
    isDark
      ? 'bg-[#0f172a]/85 text-[#f8fafc] hover:bg-[#1e293b]/90'
      : 'bg-white/90 text-[#0f172a] hover:bg-white'
  }`;

  if (isAppWorkspace && user) {
    const sidebarItems = [
      {
        to: '/panel',
        label: 'Panel',
        icon: Home,
        active: location.pathname === '/panel' && !isMisSalasView,
      },
      {
        to: '/panel?vista=mis-salas',
        label: 'Mis salas',
        icon: LayoutGrid,
        active: isMisSalasView,
      },
      {
        to: '/perfil',
        label: 'Perfil',
        icon: User,
        active: location.pathname === '/perfil',
      },
      {
        to: '/ayuda',
        label: 'Ayuda',
        icon: HelpCircle,
        active: location.pathname === '/ayuda',
      },
      {
        to: '/base-tecnica',
        label: 'Base técnica',
        icon: Database,
        active: location.pathname === '/base-tecnica',
      },
    ];

    const userInitial = (user.nombres || user.username || 'E').trim().charAt(0).toUpperCase();

    return (
      <div
        className={`relative min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${
          isDark ? 'bg-[#162238] text-[#f8fafc]' : 'bg-[#f8fafc] text-[#0f172a]'
        }`}
      >
        <AmbientMotionBackdrop subtle />

        <a
          href="#contenido"
          className={`sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:min-h-[44px] focus:inline-flex focus:items-center focus:px-4 focus:py-2 focus:font-bold focus:rounded-xl focus:shadow-lg ${
            isDark
              ? 'focus:bg-[#38bdf8] focus:text-[#0b1220]'
              : 'focus:bg-[#075985] focus:text-white'
          }`}
        >
          Saltar al contenido
        </a>

        <aside
          id="workspace-sidebar"
          aria-label="Menú lateral"
          className={`relative z-20 shrink-0 transition-all duration-200 flex flex-col border-b md:border-b-0 md:border-r ${
            sidebarCollapsed ? 'md:w-[76px]' : 'md:w-64'
          } ${mobileMenuOpen ? 'flex' : 'hidden md:flex'} ${
            isDark
              ? 'bg-[#0f172a] border-slate-400/20 text-[#f8fafc]'
              : 'bg-[#e9eff6] border-slate-300/80 text-[#0f172a]'
          }`}
        >
          <div
            className={`flex items-center gap-3 px-4 py-4 min-h-[68px] ${
              sidebarCollapsed ? 'md:justify-center md:px-3' : ''
            }`}
          >
            <Link
              to="/panel"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center gap-3 min-h-[44px] rounded-xl focus-visible:outline-none"
              title="Salón de Estudio"
            >
              {/* Rojo Univalle #990000 reservado exclusivamente al escudo institucional (Guía visual v3) */}
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#990000] font-extrabold text-white text-xs shrink-0"
              >
                UV
              </span>
              <span
                className={`font-bold text-base tracking-tight whitespace-nowrap ${
                  sidebarCollapsed ? 'md:hidden' : ''
                }`}
              >
                Salón de Estudio
              </span>
            </Link>
          </div>

          <nav aria-label="Navegación principal" className="px-3 pb-3 flex-1">
            <ul className="flex flex-col gap-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={item.active ? 'page' : undefined}
                      title={item.label}
                      className={`min-h-[46px] px-3.5 rounded-[12px] text-sm font-semibold flex items-center gap-3.5 transition-colors ${
                        sidebarCollapsed ? 'md:justify-center md:px-0 md:gap-0' : ''
                      } ${
                        item.active
                          ? isDark
                            ? 'bg-[#38bdf8]/15 text-[#f8fafc]'
                            : 'bg-[#075985]/10 text-[#075985]'
                          : isDark
                            ? 'text-[#cbd5e1] hover:bg-white/10 hover:text-[#f8fafc]'
                            : 'text-[#334155] hover:bg-[#0f172a]/5 hover:text-[#0f172a]'
                      }`}
                    >
                      <Icon
                        aria-hidden="true"
                        className={`w-[18px] h-[18px] shrink-0 ${
                          item.active
                            ? isDark
                              ? 'text-[#7dd3fc]'
                              : 'text-[#075985]'
                            : ''
                        }`}
                      />
                      <span className={sidebarCollapsed ? 'md:hidden' : ''}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div
            className={`px-3 py-3 border-t flex flex-col gap-1 ${
              isDark ? 'border-slate-400/20' : 'border-slate-300/80'
            }`}
          >
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className={`min-h-[46px] px-3.5 rounded-[12px] text-sm font-semibold flex items-center gap-3.5 transition-colors ${
                sidebarCollapsed ? 'md:justify-center md:px-0 md:gap-0' : ''
              } ${
                isDark
                  ? 'text-[#cbd5e1] hover:bg-white/10 hover:text-[#f8fafc]'
                  : 'text-[#334155] hover:bg-[#0f172a]/5 hover:text-[#0f172a]'
              }`}
            >
              {isDark ? (
                <Sun className="w-[18px] h-[18px] text-[#38bdf8] shrink-0" aria-hidden="true" />
              ) : (
                <Moon className="w-[18px] h-[18px] text-[#075985] shrink-0" aria-hidden="true" />
              )}
              <span className={sidebarCollapsed ? 'md:hidden' : ''}>
                {isDark ? 'Día' : 'Noche'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
              title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
              className={`hidden md:flex min-h-[46px] px-3.5 rounded-[12px] text-sm font-semibold items-center gap-3.5 transition-colors ${
                sidebarCollapsed ? 'md:justify-center md:px-0 md:gap-0' : ''
              } ${
                isDark
                  ? 'text-[#cbd5e1] hover:bg-white/10 hover:text-[#f8fafc]'
                  : 'text-[#334155] hover:bg-[#0f172a]/5 hover:text-[#0f172a]'
              }`}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              ) : (
                <ChevronLeft className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              )}
              <span className={sidebarCollapsed ? 'md:hidden' : ''}>Contraer menú</span>
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Salir de la sesión"
              title="Salir"
              className={`min-h-[46px] px-3.5 rounded-[12px] text-sm font-semibold flex items-center gap-3.5 transition-colors ${
                sidebarCollapsed ? 'md:justify-center md:px-0 md:gap-0' : ''
              } ${
                isDark
                  ? 'text-[#cbd5e1] hover:bg-white/10 hover:text-[#f8fafc]'
                  : 'text-[#334155] hover:bg-[#0f172a]/5 hover:text-[#0f172a]'
              }`}
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              <span className={sidebarCollapsed ? 'md:hidden' : ''}>Salir</span>
            </button>
          </div>
        </aside>

        <div className="relative z-10 flex-1 min-w-0 flex flex-col">
          <header
            className={`min-h-[68px] px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-3 transition-colors ${
              isDark
                ? 'bg-[#162238] border-slate-400/20 text-[#f8fafc]'
                : 'bg-[#f8fafc] border-slate-300/80 text-[#0f172a]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-expanded={mobileMenuOpen}
                aria-controls="workspace-sidebar"
                aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                className={`md:hidden min-h-[44px] min-w-[44px] rounded-[10px] border border-[#64748b] inline-flex items-center justify-center transition-colors ${
                  isDark ? 'bg-[#0f172a] text-[#f8fafc]' : 'bg-white text-[#0f172a]'
                }`}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Menu className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
              <p className="text-base sm:text-lg font-bold tracking-tight truncate">
                {currentWorkspaceTitle}
              </p>
            </div>

            <Link
              to="/perfil"
              aria-label={`Cuenta de ${user.nombres || 'Estudiante'} (@${user.username || 'estudiante'})`}
              className={`min-h-[44px] pl-1.5 pr-3 py-1 rounded-full border inline-flex items-center gap-2 text-xs font-semibold transition-colors ${
                isDark
                  ? 'bg-[#1f2e4a] border-slate-400/30 text-[#f8fafc] hover:bg-[#26385a]'
                  : 'bg-white border-slate-300 text-[#0f172a] hover:bg-slate-100'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-8 w-8 rounded-full bg-[#0f766e] text-white font-bold text-xs inline-flex items-center justify-center overflow-hidden"
              >
                {user.avatarUrl?.startsWith('https://') ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  userInitial
                )}
              </span>
              <span className="hidden sm:inline font-mono">@{user.username || 'estudiante'}</span>
            </Link>
          </header>

          <main
            id="contenido"
            tabIndex={-1}
            className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-7 focus:outline-none"
          >
            <Outlet />
          </main>

          <footer
            className={`border-t py-4 text-center text-xs sm:text-sm ${
              isDark
                ? 'bg-[#121c30] border-slate-400/20 text-[#cbd5e1]'
                : 'bg-[#eef3f8] border-slate-300/80 text-[#334155]'
            }`}
          >
            <div className="max-w-5xl mx-auto px-4">
              Salón de Estudio Colaborativo en Tiempo Real · Universidad del Valle (Sprint 1)
            </div>
          </footer>
        </div>
      </div>
    );
  }

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
            isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 pt-3.5 pb-2 pr-32 sm:pr-36 flex flex-wrap items-center justify-between gap-2">
            <Link
              to="/"
              viewTransition
              className={`inline-flex items-center gap-2.5 min-h-[44px] rounded-2xl px-3 py-1 transition-colors ${
                isDark
                  ? 'bg-[#0f172a]/[0.80] shadow-[0_4px_16px_rgba(2,6,23,0.28)]'
                  : 'bg-white/[0.92] shadow-[0_4px_16px_rgba(15,23,42,0.12)]'
              }`}
            >
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
                <span className={`hidden sm:block text-xs ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
                  Estudia en grupo, en tiempo real
                </span>
              </span>
            </Link>

            <nav
              aria-label="Navegación principal"
              className={`rounded-2xl px-2 py-0.5 transition-colors ${
                isDark
                  ? 'bg-[#0f172a]/[0.80] shadow-[0_4px_16px_rgba(2,6,23,0.28)]'
                  : 'bg-white/[0.92] shadow-[0_4px_16px_rgba(15,23,42,0.12)]'
              }`}
            >
              <ul className="flex items-center gap-1">
                <li>
                  <NavLink
                    to="/"
                    viewTransition
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
          <div className="max-w-6xl mx-auto px-4 py-3 pr-24 sm:pr-28 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <Link to="/" className="inline-flex items-center gap-2.5 min-h-[44px] w-fit">
              {/* Rojo Univalle #990000 reservado exclusivamente al escudo institucional (Guía visual v3) */}
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#990000] font-extrabold text-white text-xs shrink-0"
              >
                UV
              </span>
              <span className="font-bold text-lg sm:text-xl tracking-tight">
                Salón de Estudio
              </span>
            </Link>

            <nav aria-label="Navegación principal">
              <ul className="flex flex-wrap gap-1.5">
                {visitorNavItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
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
        {isAccessRoute && !prefersReducedMotion && (
          <button
            type="button"
            onClick={toggleMotionPaused}
            aria-pressed={motionPaused}
            aria-label={motionPaused ? 'Reanudar fondo' : 'Pausar fondo'}
            title={motionPaused ? 'Reanudar fondo' : 'Pausar fondo'}
            className={`${floatingButtonClass} min-w-[44px] w-11 !px-0 justify-center`}
          >
            {motionPaused ? (
              <Play className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Pause className="w-4 h-4" aria-hidden="true" />
            )}
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
            isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4">
            <span
              className={`inline-block rounded-full px-3.5 py-1 transition-colors ${
                isDark
                  ? 'bg-[#0f172a]/[0.80] shadow-[0_2px_10px_rgba(2,6,23,0.28)]'
                  : 'bg-white/[0.92] shadow-[0_2px_10px_rgba(15,23,42,0.12)]'
              }`}
            >
              Universidad del Valle · Proyecto Integrador I
            </span>
          </div>
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

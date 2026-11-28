import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
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
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import type { StudentProfile } from '../services/authApi';
import { AmbientMotionBackdrop } from './AmbientMotionBackdrop';
import { resolveAvatarEmoji } from './AvatarPicker';

const ACCESS_ROUTES = new Set(['/', '/ingresar', '/registro', '/registro/google-username']);

const workspaceTitleMap: Record<string, string> = {
  '/panel': 'Inicio',
  '/salas': 'Mis salones',
  '/perfil': 'Perfil',
};

interface RoomTopbarState {
  pathname: string;
  title: string;
}

type SetRoomTopbarTitle = (pathname: string, title: string | null) => void;

const RoomTopbarContext = createContext<SetRoomTopbarTitle>(() => {});

/** Permite a la vista de sala fijar «Mi salón» (anfitrión) o el nombre real (invitado) en la barra superior. */
export function useRoomTopbarTitle(): SetRoomTopbarTitle {
  return useContext(RoomTopbarContext);
}

interface WorkspaceLayoutProps {
  theme: ThemeMode;
  toggleTheme: () => void;
  user: StudentProfile | null;
  onLogout: () => Promise<void>;
}

const SIDEBAR_COLLAPSED_KEY = 'uv_sidebar_collapsed';

function WorkspaceLayout({ theme, toggleTheme, user, onLogout }: WorkspaceLayoutProps) {
  const location = useLocation();
  // Contraído por defecto (Andres, 20/11); se recuerda la elección del usuario.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      // Sin almacenamiento: se queda con el valor por defecto
    }
  }, [sidebarCollapsed]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roomTopbar, setRoomTopbar] = useState<RoomTopbarState | null>(null);

  const setRoomTopbarTitle = useCallback<SetRoomTopbarTitle>((pathname, title) => {
    setRoomTopbar((prev) => {
      if (!title) {
        return prev && prev.pathname === pathname ? null : prev;
      }
      if (prev?.pathname === pathname && prev.title === title) {
        return prev;
      }
      return { pathname, title };
    });
  }, []);

  const isDark = theme === 'dark';
  const searchParams = new URLSearchParams(location.search);
  const isMisSalasView =
    location.pathname === '/panel' && searchParams.get('vista') === 'mis-salas';
  const isRoomRoute = location.pathname.startsWith('/salas/');
  const activeRoomTopbar =
    roomTopbar && roomTopbar.pathname === location.pathname ? roomTopbar.title : null;

  const currentWorkspaceTitle = isMisSalasView
    ? 'Mis salones'
    : isRoomRoute
      ? activeRoomTopbar
      : workspaceTitleMap[location.pathname] ?? 'Salón de Estudio';

  const showTopbarTitle =
    location.pathname !== '/panel' &&
    location.pathname !== '/salas' &&
    Boolean(currentWorkspaceTitle);

  const sidebarItems = [
    {
      to: '/panel',
      label: 'Inicio',
      icon: Home,
      active: location.pathname === '/panel' && !isMisSalasView,
    },
    {
      to: '/salas',
      label: 'Mis salones',
      icon: LayoutGrid,
      active: location.pathname === '/salas' || isMisSalasView,
    },
    {
      to: '/perfil',
      label: 'Perfil',
      icon: User,
      active: location.pathname === '/perfil',
    },
  ];

  const userInitial = (user?.nombres || user?.username || 'E').trim().charAt(0).toUpperCase();
  const userAvatarEmoji = resolveAvatarEmoji(user?.avatar);

  const navItemBaseClass = `min-h-[46px] px-3.5 rounded-[12px] text-sm font-semibold flex items-center gap-3.5 transition-[background-color,color,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none ${
    sidebarCollapsed ? 'md:justify-center md:px-0 md:gap-0' : ''
  }`;
  const navInactiveClass = isDark
    ? 'text-[#cbd5e1] hover:bg-white/[0.07] hover:text-[#f8fafc]'
    : 'text-[#29384d] hover:bg-[#0f172a]/[0.07] hover:text-[#0f172a]';

  const handleLogoutClick = async () => {
    setMobileMenuOpen(false);
    await onLogout();
  };

  return (
    <div
      className={`min-h-dvh md:h-dvh md:overflow-hidden flex flex-col md:flex-row bg-[var(--shell-bg)] transition-colors duration-200 motion-reduce:transition-none ${
        isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'
      }`}
    >
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
        className={`relative z-20 shrink-0 bg-[var(--shell-bg)] transition-[width] duration-200 motion-reduce:transition-none flex flex-col ${
          sidebarCollapsed ? 'md:w-[76px]' : 'md:w-[244px]'
        } ${
          mobileMenuOpen
            ? 'flex border-b border-[var(--panel-border)] md:border-b-0'
            : 'hidden md:flex'
        }`}
      >
        <div
          className={`flex items-center gap-3 px-4 py-3 min-h-[68px] ${
            sidebarCollapsed ? 'md:justify-center md:px-3' : ''
          }`}
        >
          <Link
            to="/panel"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex items-center gap-3 min-h-[44px] px-1 rounded-xl focus-visible:outline-none"
            title="Tuga - Salón de Estudio"
          >
            <img src="/favicon.svg" alt="" aria-hidden="true" className="h-8 w-8 rounded-lg shrink-0" />
            <span
              className={`font-bold text-base tracking-tight whitespace-nowrap ${
                sidebarCollapsed ? 'md:hidden' : ''
              }`}
            >
              Tuga
            </span>
          </Link>
        </div>

        <nav aria-label="Navegación principal" className="px-3 pb-3 flex-1">
          <ul className="flex flex-col gap-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const activeClass = isDark
                ? 'bg-[#38bdf8]/15 text-[#f8fafc]'
                : 'bg-[#075985]/14 text-[#0c4a6e]';
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={item.active ? 'page' : undefined}
                    title={item.label}
                    aria-label={item.label}
                    className={`${navItemBaseClass} ${item.active ? activeClass : navInactiveClass}`}
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

        <div className="px-3 py-3 flex flex-col gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className={`${navItemBaseClass} ${navInactiveClass}`}
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
            className={`hidden md:flex ${navItemBaseClass} ${navInactiveClass}`}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
            )}
            <span className={sidebarCollapsed ? 'md:hidden' : ''}>
              {sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleLogoutClick()}
            aria-label="Salir de la sesión"
            title="Salir"
            className={`${navItemBaseClass} ${navInactiveClass}`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
            <span className={sidebarCollapsed ? 'md:hidden' : ''}>Salir</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header
          className={`min-h-[64px] px-4 sm:px-5 py-2 bg-[var(--shell-bg)] flex items-center justify-between gap-3 shrink-0 transition-colors duration-200 motion-reduce:transition-none ${
            isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="workspace-sidebar"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className={`md:hidden min-h-[44px] min-w-[44px] rounded-[10px] border-[1.5px] inline-flex items-center justify-center transition-colors active:scale-[0.98] motion-reduce:active:scale-100 ${
                isDark
                  ? 'bg-[#111c30] border-[#64748b] text-[#f8fafc]'
                  : 'bg-[#f8fafc] border-[#5b6e84] text-[#0f172a]'
              }`}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            {showTopbarTitle && (
              <p className="text-base sm:text-lg font-bold tracking-tight truncate">
                {currentWorkspaceTitle}
              </p>
            )}
          </div>

          {user ? (
            <Link
              to="/perfil"
              aria-label={`Cuenta de ${user.nombres || 'Estudiante'} (@${user.username || 'estudiante'})`}
              className={`min-h-[44px] px-1.5 sm:pl-1.5 sm:pr-3 py-1 rounded-full border inline-flex items-center justify-center gap-2 text-xs font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none ${
                isDark
                  ? 'bg-[#192842] border-slate-400/25 text-[#f8fafc] hover:bg-[#223556]'
                  : 'bg-[#ffffff] border-slate-300 text-[#0f172a] hover:bg-slate-100'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-8 w-8 rounded-full bg-[#0f766e] text-white font-bold text-xs inline-flex items-center justify-center overflow-hidden shrink-0"
              >
                {userAvatarEmoji ? (
                  <span className="text-[15px] leading-none">{userAvatarEmoji}</span>
                ) : user.avatarUrl?.startsWith('https://') ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  userInitial
                )}
              </span>
              <span className="hidden sm:inline font-mono">@{user.username || 'estudiante'}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/ingresar"
                className={`min-h-[44px] px-4 rounded-xl border inline-flex items-center text-sm font-semibold transition-colors ${
                  isDark
                    ? 'border-slate-400/30 text-[#f8fafc] hover:bg-white/[0.07]'
                    : 'border-[#5b6e84] text-[#0f172a] hover:bg-[#0f172a]/[0.07]'
                }`}
              >
                Ingresar
              </Link>
              <Link
                to="/registro"
                className={`min-h-[44px] px-4 rounded-xl inline-flex items-center text-sm font-bold transition-colors ${
                  isDark
                    ? 'bg-[#38bdf8] text-[#0b1220] hover:bg-[#7dd3fc]'
                    : 'bg-[#075985] text-white hover:bg-[#0369a1]'
                }`}
              >
                Crear cuenta
              </Link>
            </div>
          )}
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          className={`flex-1 min-h-0 mx-2 mb-2 md:ml-0 md:mr-3 md:mb-3 rounded-[16px] md:rounded-[18px] border marea-workspace-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus:outline-none ${
            isRoomRoute
              ? 'p-0 overflow-y-auto flex flex-col'
              : 'overflow-y-auto px-4 py-5 sm:px-8 sm:py-7'
          }`}
        >
          <RoomTopbarContext.Provider value={setRoomTopbarTitle}>
            {isRoomRoute ? (
              <div className="flex-1 min-h-0 flex flex-col w-full">
                <Outlet />
              </div>
            ) : (
              <div className="w-full max-w-[1080px] mx-auto">
                <Outlet />
              </div>
            )}
          </RoomTopbarContext.Provider>
        </main>
      </div>
    </div>
  );
}

interface PublicLayoutProps {
  theme: ThemeMode;
  toggleTheme: () => void;
  motionPaused: boolean;
  prefersReducedMotion: boolean;
  toggleMotionPaused: () => void;
  isAccessRoute: boolean;
  pathname: string;
}

function PublicLayout({
  theme,
  toggleTheme,
  motionPaused,
  prefersReducedMotion,
  toggleMotionPaused,
  isAccessRoute,
  pathname,
}: PublicLayoutProps) {
  const isDark = theme === 'dark';

  const floatingButtonClass = `min-h-[44px] px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] border-[#64748b] inline-flex items-center gap-1.5 shadow-lg backdrop-blur-[14px] transition-colors active:scale-[0.98] motion-reduce:active:scale-100 ${
    isDark
      ? 'bg-[#0f172a]/85 text-[#f8fafc] hover:bg-[#1e293b]/90'
      : 'bg-[#eef6fb]/90 text-[#0f172a] ring-1 ring-[#075985]/15 hover:bg-[#eef6fb]'
  }`;

  const footerLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center min-h-[44px] px-2 font-semibold underline-offset-4 transition-colors ${
      isActive
        ? 'underline'
        : isDark
          ? 'text-[#cbd5e1] hover:text-[#7dd3fc] hover:underline'
          : 'text-[#334155] hover:text-[#075985] hover:underline'
    }`;

  return (
    <div
      className={`relative min-h-[100svh] overflow-x-clip flex flex-col transition-colors duration-300 motion-reduce:transition-none ${
        isDark ? 'bg-[#0b1220] text-[#f8fafc]' : 'bg-[#e0f2fe] text-[#0f172a]'
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

      <header
        className={
          isAccessRoute
            ? 'fixed top-0 inset-x-0 z-30 pointer-events-none'
            : 'relative z-20'
        }
      >
        <div
          role="group"
          aria-label="Controles de tema y movimiento"
          className={`flex items-center justify-end gap-2 px-4 pt-3.5 ${
            isAccessRoute ? 'pointer-events-auto' : 'max-w-6xl mx-auto'
          }`}
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
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className={
          isAccessRoute
            ? 'relative z-10 flex-1 w-full flex items-center justify-center px-4 pt-12 pb-3 focus:outline-none'
            : 'relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-6 focus:outline-none'
        }
      >
        <Outlet />
      </main>

      {pathname !== '/' && (
        <footer
          className={`relative z-10 py-2 text-center text-xs ${
            isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 flex justify-center">
            <div
              className={`inline-flex flex-wrap items-center justify-center gap-x-2 rounded-2xl sm:rounded-full px-4 transition-colors ${
                isDark
                  ? 'bg-[#0f172a]/[0.82] shadow-[0_2px_10px_rgba(2,6,23,0.28)]'
                  : 'bg-[#eef6fb]/[0.92] ring-1 ring-[#075985]/15 shadow-[0_2px_10px_rgba(15,23,42,0.12)]'
              }`}
            >
              <span className="py-2">Universidad del Valle · Proyecto Integrador I</span>
              <span aria-hidden="true">·</span>
              <nav aria-label="Enlaces secundarios" className="inline-flex items-center gap-1">
                <NavLink to="/" viewTransition className={footerLinkClass}>
                  Inicio
                </NavLink>
                <NavLink to="/ayuda" className={footerLinkClass}>
                  Ayuda
                </NavLink>
                {!isAccessRoute && (
                  <NavLink to="/ingresar" className={footerLinkClass}>
                    Ingresar
                  </NavLink>
                )}
              </nav>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export function Layout() {
  const { theme, toggleTheme, motionPaused, prefersReducedMotion, toggleMotionPaused } = useTheme();
  const { status, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Al recargar la página en /ingresar o /registro, volver al inicio con Tuga (pedido de Andres 13/11).
  useEffect(() => {
    const entry = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
    if (entry?.type === 'reload' && (location.pathname === '/ingresar' || location.pathname === '/registro')) {
      navigate('/', { replace: true });
    }
    // Solo en la primera carga de la página.
  }, []);

  const isAccessRoute = ACCESS_ROUTES.has(location.pathname);
  const isAuthenticated = status === 'authenticated' && Boolean(user);
  // Experimento local (13/11): un visitante también ve el panel, con Ingresar y Crear cuenta arriba.
  const isPanelVisitor = !isAuthenticated && location.pathname === '/panel';
  const isAppWorkspace = !isAccessRoute && (isAuthenticated || isPanelVisitor);

  const handleLogout = async () => {
    navigate('/', { replace: true });
    if (user) await logout();
  };

  if (isAppWorkspace) {
    return (
      <WorkspaceLayout
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <PublicLayout
      theme={theme}
      toggleTheme={toggleTheme}
      motionPaused={motionPaused}
      prefersReducedMotion={prefersReducedMotion}
      toggleMotionPaused={toggleMotionPaused}
      isAccessRoute={isAccessRoute}
      pathname={location.pathname}
    />
  );
}

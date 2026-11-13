import { LogOut } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  getGlassCardClasses,
  getPrimaryCtaClasses,
  getSolidSurfaceClasses,
} from '../utils/themeStyles';

export function HomePage() {
  useDocumentTitle('Inicio');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section
      aria-labelledby="inicio-heading"
      className={`w-full max-w-[440px] mx-auto rounded-[20px] p-6 sm:p-8 space-y-6 ${getGlassCardClasses(
        theme
      )}`}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#990000] font-extrabold text-white text-xs shrink-0"
        >
          UV
        </span>
        <div>
          <p className="font-bold text-sm leading-tight">Salón de Estudio</p>
          <p className={`text-xs ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
            Universidad del Valle
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <h1 id="inicio-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">
          Salón de Estudio Colaborativo en Tiempo Real
        </h1>
        <p className={`text-sm sm:text-base ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
          Espacio accesible para organizar sesiones de estudio en grupo, compartir objetivos y
          colaborar en una Sala.
        </p>
      </div>

      {/* CTAs principales del Home: Ingresar y Crear cuenta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <Link to="/ingresar" className={getPrimaryCtaClasses(theme)}>
          Ingresar
        </Link>
        <Link
          to="/registro"
          className={`min-h-[48px] px-5 py-3 rounded-xl border-[1.5px] border-[#64748b] font-semibold text-base transition-colors inline-flex items-center justify-center ${
            isDark
              ? 'bg-[#0b1220] text-[#f8fafc] hover:bg-white/10'
              : 'bg-white text-[#0f172a] hover:bg-slate-100'
          }`}
        >
          Crear cuenta
        </Link>
      </div>
    </section>
  );
}

export function DashboardPage() {
  useDocumentTitle('Panel');
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const handleLogout = async () => {
    navigate('/', { replace: true });
    await logout();
  };

  return (
    <section aria-labelledby="panel-heading" className="space-y-6">
      <div className={`rounded-[20px] p-6 sm:p-8 space-y-5 ${getSolidSurfaceClasses(theme)}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl border border-[#64748b] ${
                isDark ? 'bg-[#0b1220]' : 'bg-[#f8fafc]'
              }`}
            >
              {user?.avatar || '🚀'}
            </span>
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-[#7dd3fc]' : 'text-[#075985]'
                }`}
              >
                Sesión activa · @{user?.username || 'estudiante'}
              </p>
              <h1 id="panel-heading" className="text-2xl sm:text-3xl font-bold">
                Panel
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/salas/demo-1" className={`${getPrimaryCtaClasses(theme)} !w-auto`}>
              Abrir Sala de demostración
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className={`min-h-[48px] px-4 py-2.5 rounded-xl border-[1.5px] border-[#64748b] text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                isDark
                  ? 'bg-[#0b1220] text-[#f8fafc] hover:bg-white/10'
                  : 'bg-white text-[#0f172a] hover:bg-slate-100'
              }`}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>

        <p className={`text-sm sm:text-base ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
          Hola, <strong>{user?.nombres || 'Estudiante'}</strong>. Tu identidad{' '}
          <span className="font-mono font-semibold">@{user?.username || 'estudiante'}</span> está
          lista. La creación y listado de Salas en tiempo real se integran en el Sprint 2.
        </p>
      </div>
    </section>
  );
}

export function ProfilePage() {
  useDocumentTitle('Perfil');
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section
      aria-labelledby="perfil-heading"
      className={`rounded-[20px] p-6 sm:p-8 space-y-4 ${getSolidSurfaceClasses(theme)}`}
    >
      <h1 id="perfil-heading" className="text-3xl font-bold">
        Perfil
      </h1>
      <p className={isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}>
        Identidad registrada del Estudiante en el Salón de Estudio (la edición completa de Perfil y
        eliminación de cuenta corresponden al Sprint 2).
      </p>
      {user && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <dt className={`text-xs font-bold uppercase ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
              Nombre completo
            </dt>
            <dd className="text-base font-bold">
              {user.nombres} {user.apellidos}
            </dd>
          </div>
          <div>
            <dt className={`text-xs font-bold uppercase ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
              Usuario único
            </dt>
            <dd className="text-base font-mono font-bold">@{user.username}</dd>
          </div>
          <div>
            <dt className={`text-xs font-bold uppercase ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
              Correo institucional
            </dt>
            <dd className="text-sm font-mono">{user.correo}</dd>
          </div>
          <div>
            <dt className={`text-xs font-bold uppercase ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
              Avatar
            </dt>
            <dd className="text-xl">{user.avatar}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  useDocumentTitle(id ? `Sala ${id}` : 'Sala');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section
      aria-labelledby="sala-heading"
      className={`rounded-[20px] p-6 sm:p-8 space-y-4 ${getSolidSurfaceClasses(theme)}`}
    >
      <h1 id="sala-heading" className="text-3xl font-bold">
        Sala: {id}
      </h1>
      <p className={isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}>
        Espacio protegido de Sala colaborativa (identificador: <span className="font-mono">{id}</span>
        ). La transmisión en tiempo real se habilitará en los próximos sprints.
      </p>
      <Link to="/panel" className={`${getPrimaryCtaClasses(theme)} !w-auto`}>
        Volver al Panel
      </Link>
    </section>
  );
}

export function HelpPage() {
  useDocumentTitle('Ayuda');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section
      aria-labelledby="ayuda-heading"
      className={`rounded-[20px] p-6 sm:p-8 space-y-4 ${getSolidSurfaceClasses(theme)}`}
    >
      <h1 id="ayuda-heading" className="text-3xl font-bold">
        Ayuda
      </h1>
      <p className={isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}>
        Guía de navegación por teclado (<kbd className="font-mono">Tab</kbd> y enlace «Saltar al
        contenido»), control para pausar la animación del mar y pegado habilitado en contraseñas.
      </p>
    </section>
  );
}

export function NotFoundPage() {
  useDocumentTitle('404 · Página no encontrada');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section
      aria-labelledby="notfound-heading"
      className={`rounded-[20px] p-6 sm:p-8 space-y-4 ${getGlassCardClasses(theme)}`}
    >
      <h1 id="notfound-heading" className="text-3xl font-bold">
        404 · Página no encontrada
      </h1>
      <p className={isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}>
        La ruta que intentas visitar no existe en el mapa del sitio del Salón de Estudio.
      </p>
      <div>
        <Link to="/" className={`${getPrimaryCtaClasses(theme)} !w-auto`}>
          Volver al Inicio
        </Link>
      </div>
    </section>
  );
}

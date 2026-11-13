import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowRight, Link2, Plus } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TugaStage } from '../components/TugaStage';
import { selectTugaGreeting } from '../content/vozTuga';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  getGlassCardClasses,
  getPrimaryCtaClasses,
  getSolidSurfaceClasses,
} from '../utils/themeStyles';

const IS_JSDOM =
  typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
const SHH_DELAY_MS = 500;

interface ExampleRoom {
  id: string;
  title: string;
  codeLabel: string;
  hostHandle: string;
}

const EXAMPLE_ROOMS: ExampleRoom[] = [
  {
    id: 'demo-1',
    title: 'Cálculo I',
    codeLabel: 'Sala 01',
    hostHandle: '@equipo6.uv',
  },
  {
    id: 'fisica-parcial-2',
    title: 'Física · parcial 2',
    codeLabel: 'Sala 02',
    hostHandle: '@equipo6.uv',
  },
  {
    id: 'ingles-b1',
    title: 'Inglés B1',
    codeLabel: 'Sala 03',
    hostHandle: '@equipo6.uv',
  },
];

export function HomePage() {
  useDocumentTitle('Inicio');
  const navigate = useNavigate();
  const { theme, motionPaused, prefersReducedMotion } = useTheme();
  const isDark = theme === 'dark';

  const [{ phrase }] = useState(() => selectTugaGreeting());
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  const leaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current !== null) {
        window.clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  const handleGoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width > 0 && window.innerWidth > 0 && window.innerHeight > 0) {
        const originX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
        const originY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--marea-origin-x', `${originX.toFixed(1)}%`);
        document.documentElement.style.setProperty('--marea-origin-y', `${originY.toFixed(1)}%`);
      }
    }

    if (prefersReducedMotion || motionPaused || IS_JSDOM) {
      return;
    }

    event.preventDefault();
    if (isLeaving) return;
    setIsLeaving(true);
    document.documentElement.dataset.vt = 'ingresar';
    leaveTimerRef.current = window.setTimeout(() => {
      navigate('/ingresar', { viewTransition: true });
      window.setTimeout(() => {
        delete document.documentElement.dataset.vt;
      }, 650);
    }, SHH_DELAY_MS);
  };

  return (
    <div className="tuga-anclada w-full max-w-[720px] mx-auto flex flex-col items-center">
      <TugaStage
        phrase={phrase}
        theme={theme}
        motionPaused={motionPaused}
        prefersReducedMotion={prefersReducedMotion}
        isButtonHovered={isButtonHovered}
        isLeaving={isLeaving}
        ctaRef={ctaRef}
      />

      <section
        aria-labelledby="inicio-heading"
        className={`marea-morph-card relative z-[1] w-full max-w-[400px] mx-auto rounded-[24px] p-6 sm:p-7 space-y-4 text-center ${getGlassCardClasses(
          theme
        )}`}
      >
        <div className="space-y-1.5">
          <h1 id="inicio-heading" className="text-2xl sm:text-[28px] font-bold tracking-tight text-balance">
            Salón de Estudio
          </h1>
          <p className={`text-sm text-pretty ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
            Salas de estudio en vivo para enfocarte en grupo.
          </p>
        </div>

        <Link
          ref={ctaRef}
          to="/ingresar"
          viewTransition
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          onFocus={() => setIsButtonHovered(true)}
          onBlur={() => setIsButtonHovered(false)}
          onClick={handleGoClick}
          className={getPrimaryCtaClasses(theme)}
        >
          <span>Vamos a estudiar</span>
          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const isMisSalasView = searchParams.get('vista') === 'mis-salas';
  useDocumentTitle(isMisSalasView ? 'Mis salas' : 'Panel');
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  return (
    <section aria-labelledby="panel-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p
            className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? 'text-[#7dd3fc]' : 'text-[#075985]'
            }`}
          >
            Sesión activa · @{user?.username || 'estudiante'}
          </p>
          <h1 id="panel-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">
            {isMisSalasView ? 'Mis salas' : 'Panel'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              setActionNotice(
                'La unión por código de sala se conecta con Firestore y WebSockets en el Sprint 2.'
              )
            }
            className={`min-h-[44px] px-4 py-2 rounded-[12px] border-[1.5px] border-[#64748b] text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
              isDark
                ? 'bg-[#1f2e4a] text-[#f8fafc] hover:bg-[#27395c]'
                : 'bg-white text-[#0f172a] hover:bg-slate-100'
            }`}
          >
            <Link2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Unirme con un ID</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setActionNotice(
                'La creación de salas reales y persistentes se habilita en el Sprint 2.'
              )
            }
            className={`min-h-[44px] px-4 py-2 rounded-[12px] text-sm font-bold inline-flex items-center gap-2 transition-colors ${
              isDark
                ? 'bg-[#38bdf8] text-[#0b1220] hover:bg-[#7dd3fc]'
                : 'bg-[#075985] text-white hover:bg-[#0369a1]'
            }`}
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Crear sala</span>
          </button>
        </div>
      </div>

      <p className={`text-sm text-pretty ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
        {isMisSalasView
          ? `Hola, ${user?.nombres || 'Estudiante'}. Esta vista previa muestra tarjetas de ejemplo; tus salas creadas aparecerán aquí en el Sprint 2.`
          : `Hola, ${user?.nombres || 'Estudiante'}. Tu sesión @${user?.username || 'estudiante'} está activa. Salas de ejemplo sin contadores en vivo hasta conectar la API en el Sprint 2.`}
      </p>

      {actionNotice && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-[14px] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm border ${
            isDark
              ? 'bg-[#1f2e4a] border-[#38bdf8]/40 text-[#f8fafc]'
              : 'bg-[#ffffff] border-slate-300 text-[#0f172a] shadow-sm'
          }`}
        >
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className={`min-h-[44px] px-3 rounded-[10px] text-xs font-semibold border border-[#64748b] ${
              isDark ? 'bg-[#121c30] text-[#f8fafc]' : 'bg-[#eef3f8] text-[#0f172a]'
            }`}
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXAMPLE_ROOMS.map((room) => (
          <article
            key={room.id}
            className={`rounded-[22px] p-2.5 flex flex-col gap-2.5 transition-colors ${
              isDark
                ? 'bg-[#1f2e4a] text-[#f8fafc] shadow-[0_8px_24px_rgba(2,6,23,0.28)]'
                : 'bg-[#ffffff] text-[#0f172a] shadow-[0_6px_20px_rgba(15,23,42,0.08)]'
            }`}
          >
            <div
              className={`rounded-[12px] px-4 py-5 min-h-[126px] flex flex-col items-center justify-center text-center gap-2 ${
                isDark ? 'bg-[#121c30]' : 'bg-[#eef3f8]'
              }`}
            >
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isDark
                    ? 'bg-[#38bdf8]/15 text-[#7dd3fc]'
                    : 'bg-[#075985]/10 text-[#075985]'
                }`}
              >
                Ejemplo
              </span>
              <h2 className="text-lg font-bold tracking-tight text-balance">{room.title}</h2>
              <p className={`text-xs ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
                {room.codeLabel} · {room.hostHandle}
              </p>
            </div>

            <Link to={`/salas/${room.id}`} className={getPrimaryCtaClasses(theme)}>
              Entrar
            </Link>
          </article>
        ))}
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
            <dd className="text-xl">
              {user.avatarUrl?.startsWith('https://') ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar del estudiante"
                  className="h-10 w-10 rounded-xl object-cover"
                />
              ) : (
                user.avatar
              )}
            </dd>
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
      className={`rounded-[20px] p-6 sm:p-8 space-y-4 ${getSolidSurfaceClasses(theme)}`}
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

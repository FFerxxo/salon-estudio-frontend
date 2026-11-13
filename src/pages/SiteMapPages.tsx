import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowRight, Music, Sparkles, Waves } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
        className={`marea-morph-card inicio-card relative z-[1] -mt-14 sm:-mt-10 w-full max-w-[400px] mx-auto rounded-[22px] p-5 space-y-3.5 text-center ring-1 ${
          isDark ? 'ring-[#38bdf8]/25' : 'ring-[#075985]/15'
        } ${getGlassCardClasses(theme)}`}
      >
        <div className="space-y-1">
          <h1 id="inicio-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-balance">
            Bienvenido a <span className={isDark ? 'text-[#38bdf8]' : 'text-[#075985]'}>Tuga</span>
          </h1>
          <p className={`text-sm text-pretty ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
            Un espacio donde estudiar te sumerge en un mundo de ideas.
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

        <ul className="flex flex-wrap justify-center gap-2" aria-label="Lo que encuentras en Tuga">
          {[
            { label: 'Tu espacio', Icon: Waves },
            { label: 'Tu música', Icon: Music },
            { label: 'Tu elección', Icon: Sparkles },
          ].map(({ label, Icon }) => (
            <li
              key={label}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                isDark
                  ? 'bg-[#38bdf8]/15 text-[#7dd3fc] ring-[#38bdf8]/30'
                  : 'bg-[#075985]/10 text-[#075985] ring-[#075985]/25'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const PANEL_ROOMS = [
  { id: 'studio-ghibli', name: 'Studio Ghibli' },
  { id: 'ruido-azul', name: 'Ruido azul' },
];

export function DashboardPage() {
  useDocumentTitle('Panel');
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [avisoSala, setAvisoSala] = useState<string | null>(null);

  return (
    <section aria-labelledby="panel-heading" className="py-6 sm:py-10">
      <h1 id="panel-heading" className="sr-only">
        Panel
      </h1>
      <ul className="flex flex-wrap justify-center gap-5" aria-label="Salas disponibles">
        {PANEL_ROOMS.map((room) => (
          <li
            key={room.id}
            className={`w-[260px] rounded-[20px] p-2.5 flex flex-col gap-2.5 border ${
              isDark ? 'bg-[#1f2e4a]/80 border-slate-400/20' : 'bg-[#eef6fb] border-[#075985]/15'
            }`}
          >
            <div className={`rounded-[14px] px-3 pt-6 pb-7 text-center ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`}>
              <h2 className="text-base font-bold">{room.name}</h2>
              <p
                className={`mt-2 inline-flex items-center gap-2 text-sm font-semibold ${
                  isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
                }`}
              >
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />0 en línea
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAvisoSala(room.id)}
              aria-label={`Entrar a ${room.name}`}
              className={`min-h-[44px] rounded-xl inline-flex items-center justify-center text-[15px] font-bold transition-colors ${
                isDark ? 'bg-[#38bdf8] text-[#0b1220] hover:bg-[#7dd3fc]' : 'bg-[#075985] text-white hover:bg-[#0369a1]'
              }`}
            >
              Entrar
            </button>
            <p
              role="status"
              className={`min-h-[20px] text-center text-sm font-semibold ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}
            >
              {avisoSala === room.id ? 'Sala no disponible aún.' : ''}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProfilePage() {
  useDocumentTitle('Perfil');
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const initial = (user?.nombres || user?.username || 'E').trim().charAt(0).toUpperCase();

  return (
    <section
      aria-labelledby="perfil-heading"
      className={`max-w-md mx-auto rounded-[20px] p-6 sm:p-8 text-center ${getSolidSurfaceClasses(theme)}`}
    >
      <h1 id="perfil-heading" className="sr-only">
        Perfil
      </h1>
      {user && (
        <div className="flex flex-col items-center gap-3">
          {user.avatarUrl?.startsWith('https://') ? (
            <img src={user.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <span
              aria-hidden="true"
              className="h-20 w-20 rounded-full bg-[#0f766e] text-white text-3xl font-bold inline-flex items-center justify-center"
            >
              {initial}
            </span>
          )}
          <p className="text-2xl font-bold tracking-tight">
            {user.nombres} {user.apellidos}
          </p>
          <p className={`font-mono text-base ${isDark ? 'text-[#7dd3fc]' : 'text-[#075985]'}`}>@{user.username}</p>
        </div>
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
        Esta sala se está preparando. Muy pronto podrás estudiar aquí con otras personas en tiempo real.
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

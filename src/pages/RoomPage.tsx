import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AmbienteChip } from '../components/AmbienteChip';
import { AmbientePlayer } from '../components/AmbientePlayer';
import { StatusBanner } from '../components/StatusBanner';
import { useAuth } from '../context/AuthContext';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getRoomById, RoomsApiError, type Room } from '../services/roomsApi';
import { copyText, resolveAuthToken } from '../utils/roomHelpers';
import {
  getErrorAlertClasses,
  getPrimaryCtaClasses,
  getSolidSurfaceClasses,
  getSuccessAlertClasses,
} from '../utils/themeStyles';

interface RoomLocationState {
  room?: Room;
  justCreated?: boolean;
}

function RoomSkeleton({ theme }: { theme: ThemeMode }) {
  const isDark = theme === 'dark';
  const blockBg = isDark ? 'bg-slate-700/60' : 'bg-slate-200';

  return (
    <section
      aria-busy="true"
      aria-labelledby="room-loading-heading"
      className={`max-w-3xl mx-auto rounded-[20px] p-6 sm:p-8 space-y-5 ${getSolidSurfaceClasses(
        theme
      )}`}
    >
      <h1 id="room-loading-heading" className="sr-only">
        Sala
      </h1>
      <div role="status" aria-live="polite" className="space-y-4">
        <span className="sr-only">Cargando sala</span>
        <div aria-hidden="true" className="space-y-2.5">
          <div
            className={`h-8 w-3/5 rounded-lg animate-pulse motion-reduce:animate-none ${blockBg}`}
          />
          <div
            className={`h-5 w-2/5 rounded-lg animate-pulse motion-reduce:animate-none ${blockBg}`}
          />
        </div>
        <div
          aria-hidden="true"
          className={`h-28 w-full rounded-2xl animate-pulse motion-reduce:animate-none ${blockBg}`}
        />
        <div
          aria-hidden="true"
          className={`h-16 w-full rounded-2xl animate-pulse motion-reduce:animate-none ${blockBg}`}
        />
      </div>
    </section>
  );
}

/** Vista mínima de sala con datos del anfitrión, copia de ID y reproductor de ambiente sonoro. */
export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const locationState = (location.state as RoomLocationState | null) ?? null;

  const { user, idToken } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const stateRoom =
    locationState?.room && locationState.room.id === id ? locationState.room : null;

  const [fetchedRoom, setFetchedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(!stateRoom);
  const [errorKind, setErrorKind] = useState<'none' | 'not-found' | 'generic'>('none');
  const [reloadCount, setReloadCount] = useState(0);
  const [bannerDismissedForId, setBannerDismissedForId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const copyTimerRef = useRef<number | null>(null);
  const announceTimerRef = useRef<number | null>(null);

  const room = stateRoom ?? (fetchedRoom && fetchedRoom.id === id ? fetchedRoom : null);

  useDocumentTitle(room ? room.nombre : id ? `Sala ${id}` : 'Sala');

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      if (announceTimerRef.current !== null) {
        window.clearTimeout(announceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (stateRoom) {
      setLoading(false);
      setErrorKind('none');
      return;
    }

    if (!id) {
      setLoading(false);
      setErrorKind('not-found');
      return;
    }

    let active = true;
    setLoading(true);
    setErrorKind('none');

    void (async () => {
      try {
        const token = await resolveAuthToken(idToken);
        const loaded = await getRoomById(token, id);
        if (!active) return;
        setFetchedRoom(loaded);
      } catch (err) {
        if (!active) return;
        if (err instanceof RoomsApiError && err.status === 404) {
          setErrorKind('not-found');
        } else {
          setErrorKind('generic');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [id, idToken, reloadCount, stateRoom]);

  const handleCopyId = useCallback(async () => {
    if (!room) return;
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    if (announceTimerRef.current !== null) {
      window.clearTimeout(announceTimerRef.current);
      announceTimerRef.current = null;
    }

    const copiedOk = await copyText(room.id);
    if (!copiedOk) {
      setCopied(false);
      setLiveAnnouncement('');
      setCopyError(`No pudimos copiar el ID. Cópialo a mano: ${room.id}`);
      return;
    }

    setCopyError(null);
    setCopied(true);
    setLiveAnnouncement('');
    announceTimerRef.current = window.setTimeout(() => {
      setLiveAnnouncement(`ID de ${room.nombre} copiado al portapapeles`);
    }, 20);

    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false);
    }, 3000);
  }, [room]);

  if (loading) {
    return <RoomSkeleton theme={theme} />;
  }

  if (errorKind === 'generic') {
    return (
      <section
        aria-labelledby="room-error-heading"
        className={`max-w-3xl mx-auto rounded-[20px] p-6 sm:p-8 space-y-5 ${getSolidSurfaceClasses(
          theme
        )}`}
      >
        <h1 id="room-error-heading" className="sr-only">
          Error al cargar la sala
        </h1>
        <div
          role="alert"
          className={`rounded-xl p-4 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 ${getErrorAlertClasses(
            theme
          )}`}
        >
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-pretty">No pudimos cargar la sala.</span>
          </span>
          <button
            type="button"
            onClick={() => setReloadCount((prev) => prev + 1)}
            className={`min-h-[44px] px-4 py-2 rounded-lg border-[1.5px] text-sm font-semibold inline-flex items-center gap-1.5 active:scale-[0.96] transition-[transform,background-color] ${
              isDark
                ? 'border-[#94a3b8] bg-[#0f172a] text-[#f8fafc] hover:bg-white/10'
                : 'border-[#64748b] bg-white text-[#0f172a] hover:bg-slate-50'
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Reintentar</span>
          </button>
        </div>
        <div>
          <Link
            to="/panel"
            className={`${getPrimaryCtaClasses(
              theme
            )} !w-auto !min-h-[44px] !py-2.5 text-sm active:scale-[0.96] transition-[transform,background-color]`}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Volver al panel</span>
          </Link>
        </div>
      </section>
    );
  }

  if (errorKind === 'not-found' || !room) {
    return (
      <section
        aria-labelledby="room-not-found-heading"
        className={`max-w-3xl mx-auto rounded-[20px] p-6 sm:p-8 space-y-5 ${getSolidSurfaceClasses(
          theme
        )}`}
      >
        <h1 id="room-not-found-heading" className="sr-only">
          Sala no encontrada
        </h1>
        <div
          role="alert"
          className={`rounded-xl p-4 text-sm font-semibold flex items-center gap-2 ${getErrorAlertClasses(
            theme
          )}`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-pretty">Esta sala no existe o fue eliminada.</span>
        </div>
        <div>
          <Link
            to="/panel"
            className={`${getPrimaryCtaClasses(
              theme
            )} !w-auto !min-h-[44px] !py-2.5 text-sm active:scale-[0.96] transition-[transform,background-color]`}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Volver al panel</span>
          </Link>
        </div>
      </section>
    );
  }

  const isHost =
    Boolean(locationState?.justCreated) ||
    (Boolean(user?.uid) && room.anfitrionUid === user?.uid);
  const showCreatedBanner = Boolean(
    locationState?.justCreated && id && bannerDismissedForId !== id
  );

  return (
    <section
      aria-labelledby="room-heading"
      className={`max-w-3xl mx-auto rounded-[20px] p-6 sm:p-8 space-y-5 ${getSolidSurfaceClasses(
        theme
      )}`}
    >
      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {showCreatedBanner && id && (
        <StatusBanner
          message="Sala creada"
          onDismiss={() => setBannerDismissedForId(id)}
        />
      )}

      <div
        className={`flex flex-wrap items-start justify-between gap-4 pb-4 border-b ${
          isDark ? 'border-slate-400/25' : 'border-[#075985]/15'
        }`}
      >
        <div className="space-y-2.5 min-w-0">
          <h1
            id="room-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-balance break-words"
          >
            {room.nombre}
          </h1>

          <div className="flex flex-wrap items-center gap-2.5">
            {isHost && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${
                  isDark
                    ? 'bg-[#38bdf8]/15 text-[#7dd3fc] ring-[#38bdf8]/30'
                    : 'bg-[#075985]/10 text-[#075985] ring-[#075985]/25'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Anfitrión</span>
              </span>
            )}

            <AmbienteChip ambiente={room.ambiente} theme={theme} />

            <span
              className={`inline-flex items-center gap-1.5 text-xs ${
                isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
              }`}
            >
              <span>ID:</span>
              <code className="font-mono font-semibold tabular-nums">{room.id}</code>
            </span>

            <button
              type="button"
              onClick={() => void handleCopyId()}
              className={`min-h-[44px] px-3 py-1.5 rounded-xl border-[1.5px] text-xs font-semibold inline-flex items-center gap-1.5 active:scale-[0.96] transition-[transform,background-color] ${
                isDark
                  ? 'border-[#94a3b8] text-[#f8fafc] hover:bg-white/10'
                  : 'border-[#64748b] text-[#0f172a] hover:bg-slate-100'
              }`}
            >
              <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Copiar ID</span>
            </button>

            {copied && (
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1.5 ${getSuccessAlertClasses(
                  theme
                )}`}
              >
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>ID copiado</span>
              </span>
            )}
          </div>
        </div>

        <Link
          to="/panel"
          className={`min-h-[44px] px-4 py-2 rounded-xl border-[1.5px] text-sm font-semibold inline-flex items-center gap-1.5 shrink-0 active:scale-[0.96] transition-[transform,background-color] ${
            isDark
              ? 'border-[#94a3b8] text-[#f8fafc] hover:bg-white/10'
              : 'border-[#64748b] text-[#0f172a] hover:bg-slate-100'
          }`}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Salir de la sala</span>
        </Link>
      </div>

      {copyError && (
        <div
          role="alert"
          className={`rounded-xl p-4 text-sm font-semibold flex items-center gap-2 ${getErrorAlertClasses(
            theme
          )}`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-pretty">{copyError}</span>
        </div>
      )}

      <AmbientePlayer key={room.id} ambiente={room.ambiente} />

      <div
        className={`rounded-2xl border border-dashed p-5 text-center text-sm font-medium text-pretty ${
          isDark
            ? 'border-[#64748b] text-[#cbd5e1]'
            : 'border-[#64748b] text-[#334155]'
        }`}
      >
        El chat y el video llegan pronto.
      </div>
    </section>
  );
}

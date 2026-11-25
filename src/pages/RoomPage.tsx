import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2, RotateCcw, WifiOff } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MemberGrid } from '../components/MemberGrid';
import { RoomBar } from '../components/RoomPopovers';
import { StatusBanner } from '../components/StatusBanner';
import { ROOM_BACKGROUNDS, type AmbienteId } from '../content/ambientes';
import { useAuth } from '../context/AuthContext';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRoomRealtime, type UseRoomRealtimeResult } from '../hooks/useRoomRealtime';
import { getRoomById, RoomsApiError, type Room } from '../services/roomsApi';
import { copyText, resolveAuthToken } from '../utils/roomHelpers';
import {
  getErrorAlertClasses,
  getPrimaryCtaClasses,
  getSecondaryBtnClasses,
  getSolidSurfaceClasses,
} from '../utils/themeStyles';

interface RoomLocationState {
  room?: Room;
  justCreated?: boolean;
}

function getRoomScrimStyle(ambiente: AmbienteId, isDark: boolean): string {
  if (ambiente === 'green') {
    return isDark
      ? 'linear-gradient(180deg, rgba(6, 16, 12, 0.72) 0%, rgba(6, 16, 12, 0.52) 50%, rgba(6, 16, 12, 0.78) 100%)'
      : 'linear-gradient(180deg, rgba(8, 24, 18, 0.64) 0%, rgba(10, 26, 20, 0.48) 50%, rgba(8, 22, 16, 0.7) 100%)';
  }
  if (ambiente === 'blue') {
    return isDark
      ? 'linear-gradient(180deg, rgba(7, 15, 30, 0.72) 0%, rgba(7, 15, 30, 0.52) 50%, rgba(7, 15, 30, 0.78) 100%)'
      : 'linear-gradient(180deg, rgba(8, 20, 38, 0.64) 0%, rgba(10, 24, 46, 0.46) 50%, rgba(8, 18, 34, 0.7) 100%)';
  }
  return isDark
    ? 'linear-gradient(180deg, #0b1220 0%, #111c30 55%, #0f172a 100%)'
    : 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)';
}

function RoomSkeleton({ theme }: { theme: ThemeMode }) {
  const isDark = theme === 'dark';
  const blockBg = isDark ? 'bg-slate-700/60' : 'bg-slate-200';

  return (
    <section
      aria-busy="true"
      aria-labelledby="room-loading-heading"
      className={`max-w-4xl mx-auto rounded-[20px] p-6 sm:p-8 space-y-5 ${getSolidSurfaceClasses(
        theme
      )}`}
    >
      <h1 id="room-loading-heading" className="sr-only">
        Sala
      </h1>
      <div role="status" aria-live="polite" className="space-y-4">
        <span className="sr-only">Cargando sala</span>
        <div
          aria-hidden="true"
          className={`h-16 w-full rounded-2xl animate-pulse motion-reduce:animate-none ${blockBg}`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" aria-hidden="true">
          {[1, 2, 3, 4].map((slot) => (
            <div
              key={slot}
              className={`aspect-[16/10] w-full rounded-2xl animate-pulse motion-reduce:animate-none ${blockBg}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Aviso del estado de la conexión en vivo: conectando, reconectando o error con «Reintentar». */
function ConnectionStatus({
  realtime,
  theme,
}: {
  realtime: UseRoomRealtimeResult;
  theme: ThemeMode;
}) {
  const { estado, errorConexion, reintentarConexion } = realtime;

  if (estado === 'error' && errorConexion) {
    return (
      <div
        role="alert"
        className={`rounded-xl p-3 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 ${getErrorAlertClasses(
          theme
        )}`}
      >
        <span className="inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-pretty">{errorConexion.mensaje}</span>
        </span>
        <button
          type="button"
          onClick={reintentarConexion}
          className={getSecondaryBtnClasses(theme)}
        >
          <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Reintentar</span>
        </button>
      </div>
    );
  }

  if (estado === 'reconectando') {
    return (
      <div
        role="status"
        className="rounded-xl px-3 py-2 text-sm font-semibold inline-flex items-center gap-2 self-start bg-[#451a03]/90 text-[#fde68a] border border-[#fbbf24]/60"
      >
        <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>Se perdió la conexión. Reconectando…</span>
      </div>
    );
  }

  if (estado === 'conectando') {
    return (
      <div
        role="status"
        className="rounded-xl px-3 py-2 text-sm font-semibold inline-flex items-center gap-2 self-start bg-[#0b1220]/85 text-[#e2e8f0] border border-white/20"
      >
        <Loader2 className="w-4 h-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        <span>Conectando a la sala…</span>
      </div>
    );
  }

  if (estado === 'sin-servidor') {
    return (
      <p
        role="status"
        className="rounded-xl px-3 py-2 text-sm font-medium self-start bg-[#0b1220]/85 text-[#e2e8f0] border border-white/20"
      >
        La sala en vivo no está disponible en este momento.
      </p>
    );
  }

  return null;
}

/** Escenario de la sala colaborativa con fondo por ambiente, barra de audio y cuadrícula 2×2. */
export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const locationState = (location.state as RoomLocationState | null) ?? null;

  const navigate = useNavigate();
  const { user, idToken, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const stateRoom =
    locationState?.room && locationState.room.id === id ? locationState.room : null;

  const [fetchedRoom, setFetchedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(!stateRoom);
  const [errorKind, setErrorKind] = useState<'none' | 'not-found' | 'generic'>('none');
  const [reloadCount, setReloadCount] = useState(0);
  const [bannerDismissedForId, setBannerDismissedForId] = useState<string | null>(null);
  const [participantsOpen, setParticipantsOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const copyTimerRef = useRef<number | null>(null);
  const announceTimerRef = useRef<number | null>(null);

  const room = stateRoom ?? (fetchedRoom && fetchedRoom.id === id ? fetchedRoom : null);

  // Se conecta al tiempo real cuando la API confirmó que la sala existe (SDECG6-50).
  const realtime = useRoomRealtime(room?.id, user?.uid, Boolean(room));
  const codigoErrorConexion = realtime.errorConexion?.codigo;

  useEffect(() => {
    if (codigoErrorConexion === 'NO_AUTENTICADO' || codigoErrorConexion === 'SESION_INVALIDA') {
      // Se cierra la sesión: si solo se navegara a /ingresar, la sesión seguiría iniciada y
      // /ingresar devolvería a la sala en un bucle. ProtectedRoute lleva a Ingresar con `from`.
      // Si cerrar sesión falla, se queda el aviso de error con «Reintentar» (sin bucle).
      logout().catch(() => {});
    } else if (codigoErrorConexion === 'PERFIL_INCOMPLETO') {
      navigate('/registro/google-username', { replace: true });
    }
  }, [codigoErrorConexion, navigate, logout]);

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
            className={`${getSecondaryBtnClasses(theme)} ${
              isDark ? '!bg-[#0f172a]' : '!bg-white'
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
            )} !w-auto !min-h-[44px] !py-2.5 text-sm`}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Volver a Inicio</span>
          </Link>
        </div>
      </section>
    );
  }

  if (errorKind === 'not-found' || !room || realtime.salaNoEncontrada) {
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
            )} !w-auto !min-h-[44px] !py-2.5 text-sm`}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Volver a Inicio</span>
          </Link>
        </div>
      </section>
    );
  }

  const isHost =
    Boolean(user?.uid && room.anfitrionUid === user.uid) ||
    Boolean(locationState?.justCreated);
  const showCreatedBanner = Boolean(
    locationState?.justCreated && id && bannerDismissedForId !== id
  );
  const bgSrc = ROOM_BACKGROUNDS[room.ambiente];
  const scrimStyle = getRoomScrimStyle(room.ambiente, isDark);

  return (
    <section
      aria-labelledby="roomHeading"
      className={`relative flex-1 min-h-full rounded-[16px] md:rounded-[18px] overflow-hidden border flex flex-col ${
        isDark
          ? 'border-white/15 bg-[#0b1220]'
          : 'border-[#0f172a]/15 bg-[#f1f5f9]'
      }`}
    >
      {bgSrc && (
        <img
          src={bgSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: scrimStyle }}
      />

      <div className="relative z-10 flex-1 flex flex-col gap-3 sm:gap-4 p-4 sm:p-5">
        <div role="status" aria-live="polite" className="sr-only">
          {liveAnnouncement}
        </div>

        {showCreatedBanner && id && (
          <StatusBanner
            message="Sala creada"
            onDismiss={() => setBannerDismissedForId(id)}
          />
        )}

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

        <RoomBar
          room={room}
          roomId={id ?? room.id}
          copied={copied}
          onCopyId={() => void handleCopyId()}
          participantsOpen={participantsOpen}
          onToggleParticipants={() => setParticipantsOpen((prev) => !prev)}
          onExit={realtime.salir}
        />

        <ConnectionStatus realtime={realtime} theme={theme} />

        <div className="flex-1 flex items-center py-2">
          <MemberGrid
            currentUser={user}
            isHost={isHost}
            visible={participantsOpen}
          />
        </div>
      </div>
    </section>
  );
}

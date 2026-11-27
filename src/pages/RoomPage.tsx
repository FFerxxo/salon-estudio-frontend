import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2, LogOut, RotateCcw, UserPlus, WifiOff } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MemberGrid } from '../components/MemberGrid';
import { RoomChat } from '../components/RoomChat';
import { DeleteRoomDialog, RenameRoomDialog, RoomDeletedDialog } from '../components/RoomDialogs';
import { RoomBar } from '../components/RoomPopovers';
import { StatusBanner } from '../components/StatusBanner';
import { ROOM_BACKGROUNDS, type AmbienteId } from '../content/ambientes';
import { useAuth } from '../context/AuthContext';
import { useRooms } from '../context/RoomsContext';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRoomRealtime, type UseRoomRealtimeResult } from '../hooks/useRoomRealtime';
import { setTopbarRoomTitle } from '../hooks/useTopbarTitle';
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
  const { updateRoom, removeRoom } = useRooms();
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
  const [chatOpen, setChatOpen] = useState(true);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renamedName, setRenamedName] = useState<{ id: string; nombre: string } | null>(null);
  const [mobileTab, setMobileTab] = useState<'participantes' | 'chat'>('participantes');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const copyTimerRef = useRef<number | null>(null);
  const announceTimerRef = useRef<number | null>(null);

  const loadedRoom = stateRoom ?? (fetchedRoom && fetchedRoom.id === id ? fetchedRoom : null);

  // Se conecta al tiempo real cuando la API confirmó que la sala existe (SDECG6-50).
  const realtime = useRoomRealtime(loadedRoom?.id, user?.uid, Boolean(loadedRoom));
  const codigoErrorConexion = realtime.errorConexion?.codigo;

  // Nombre vigente: el que llegó en vivo (sala:actualizada) o el que acaba de poner el anfitrión.
  const liveName =
    renamedName && renamedName.id === loadedRoom?.id ? renamedName.nombre : realtime.nombreSala;
  const room: Room | null = loadedRoom
    ? { ...loadedRoom, nombre: liveName ?? loadedRoom.nombre }
    : null;
  const isHost = Boolean(
    room && ((user?.uid && room.anfitrionUid === user.uid) || locationState?.justCreated)
  );

  // Barra superior: «Mi salón» para el anfitrión y el nombre de la sala para el invitado.
  const topbarTitle = room && !isHost ? room.nombre : null;
  useEffect(() => {
    setTopbarRoomTitle(topbarTitle);
    return () => setTopbarRoomTitle(null);
  }, [topbarTitle]);

  // El anfitrión eliminó la sala: el invitado ve el aviso y elige «Volver al Panel» (US-07).
  const volverAlPanelTrasEliminar = useCallback(() => {
    navigate('/panel', { replace: true });
  }, [navigate]);

  // Aviso visible y breve de quién entró o salió (además del anuncio al lector de pantalla).
  const [avisoVisible, setAvisoVisible] = useState('');
  useEffect(() => {
    const texto = realtime.anuncioSala;
    if (!/(entró a|salió de) la sala$/.test(texto)) return;
    setAvisoVisible(texto);
    const t = window.setTimeout(() => setAvisoVisible(''), 4000);
    return () => window.clearTimeout(t);
  }, [realtime.anuncioSala]);

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
        {/* «@ana entró a la sala» / «@ana salió de la sala» sin mover el foco (SDECG6-52) */}
        <div role="status" aria-live="polite" className="sr-only" data-testid="anuncio-sala">
          {realtime.anuncioSala}
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
          isHost={isHost}
          onRename={() => setRenameOpen(true)}
          onDelete={() => setDeleteOpen(true)}
          conectado={realtime.estado === 'conectado'}
          cantidadParticipantes={realtime.participantes.length}
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen((prev) => !prev)}
        />

        <ConnectionStatus realtime={realtime} theme={theme} />

        {/* En celular: pestañas «Participantes / Chat». En computador: chat a la derecha. */}
        <div role="tablist" aria-label="Secciones de la sala" className="lg:hidden grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0b1220]/80 border border-white/15">
          {(['participantes', 'chat'] as const).map((tab) => (
            <button
              key={tab}
              id={`room-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={mobileTab === tab}
              aria-controls={`room-panel-${tab}`}
              onClick={() => setMobileTab(tab)}
              className={`min-h-[44px] rounded-lg text-sm font-bold transition-colors ${
                mobileTab === tab
                  ? 'bg-[#38bdf8] text-[#0b1220]'
                  : 'text-[#e2e8f0] hover:bg-white/10'
              }`}
            >
              {tab === 'participantes'
                ? `Participantes${realtime.participantes.length > 0 ? ` (${realtime.participantes.length})` : ''}`
                : 'Chat'}
            </button>
          ))}
        </div>

        <div
          className={`flex-1 grid grid-cols-1 gap-4 min-h-0 ${
            chatOpen ? 'lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]' : ''
          }`}
        >
          <div
            id="room-panel-participantes"
            role="tabpanel"
            aria-labelledby="room-tab-participantes"
            className={`${mobileTab === 'participantes' ? 'flex' : 'hidden'} lg:flex relative items-center pt-12 pb-2`}
          >
            {avisoVisible && (
              <p
                aria-hidden="true"
                data-testid="aviso-sala-visible"
                className="absolute top-1 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap min-h-[36px] px-3.5 rounded-full border border-white/20 bg-[#0b1220]/90 text-[#f8fafc] text-sm font-semibold inline-flex items-center gap-2 shadow-lg"
              >
                {avisoVisible.endsWith('entró a la sala') ? (
                  <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : (
                  <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                {avisoVisible}
              </p>
            )}

            <MemberGrid
              currentUser={user}
              anfitrionUid={isHost && user?.uid ? user.uid : room.anfitrionUid}
              participantes={realtime.participantes}
              visible={participantsOpen}
            />
          </div>

          <div
            id="room-panel-chat"
            role="tabpanel"
            aria-labelledby="room-tab-chat"
            className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} ${chatOpen ? 'lg:flex' : 'lg:hidden'} flex-col h-[65dvh] min-h-[380px] lg:min-h-[420px] lg:h-[min(70vh,640px)]`}
          >
            <RoomChat
              mensajes={realtime.mensajes}
              miUid={user?.uid}
              estado={realtime.estado}
              historial={realtime.historial}
              anuncio={realtime.anuncioChat}
              hayMas={realtime.hayMas}
              cargandoAnteriores={realtime.cargandoAnteriores}
              onCargarAnteriores={realtime.cargarAnteriores}
              onEnviar={realtime.enviar}
              onReintentarHistorial={realtime.reintentarHistorial}
              personas={realtime.participantes.length}
            />
          </div>
        </div>
      </div>

      <RoomDeletedDialog
        open={realtime.salaEliminada && !isHost}
        roomName={room.nombre}
        onBack={volverAlPanelTrasEliminar}
      />

      <RenameRoomDialog
        open={renameOpen && isHost}
        room={room}
        onClose={() => setRenameOpen(false)}
        onRenamed={(updated) => {
          setRenamedName({ id: updated.id || room.id, nombre: updated.nombre });
          updateRoom({ ...room, ...updated, id: updated.id || room.id });
          setRenameOpen(false);
          setLiveAnnouncement(`La sala ahora se llama ${updated.nombre}`);
        }}
      />

      <DeleteRoomDialog
        open={deleteOpen && isHost}
        room={room}
        onClose={() => setDeleteOpen(false)}
        onDeleted={(deletedId) => {
          setDeleteOpen(false);
          realtime.salir();
          removeRoom(deletedId);
          navigate('/panel', { replace: true, state: { avisoSala: 'Sala eliminada.' } });
        }}
      />
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Copy, Plus, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AmbienteChip } from '../components/AmbienteChip';
import { CreateRoomDialog } from '../components/CreateRoomDialog';
import { useAuth } from '../context/AuthContext';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getMyRooms, type Room } from '../services/roomsApi';
import { copyText, resolveAuthToken } from '../utils/roomHelpers';
import {
  getErrorAlertClasses,
  getPrimaryCtaClasses,
  getSuccessAlertClasses,
} from '../utils/themeStyles';

function CompactTugaIllustration() {
  return (
    <svg width="118" height="80" viewBox="0 0 180 120" aria-hidden="true">
      <ellipse cx="90" cy="108" rx="56" ry="7" fill="rgba(56, 189, 248, 0.2)" />
      <ellipse cx="42" cy="86" rx="18" ry="10" fill="#0ea5e9" transform="rotate(-18 42 86)" />
      <ellipse cx="116" cy="90" rx="16" ry="9" fill="#0ea5e9" transform="rotate(16 116 90)" />
      <ellipse cx="76" cy="68" rx="44" ry="30" fill="#38bdf8" />
      <path d="M76 44 l18 12 -7 20 h-22 l-7 -20 z" fill="#075985" />
      <circle cx="128" cy="48" r="24" fill="#7dd3fc" />
      <ellipse cx="121" cy="45" rx="7.5" ry="8" fill="#f8fafc" />
      <ellipse cx="139" cy="45" rx="7.5" ry="8" fill="#f8fafc" />
      <circle cx="122" cy="46" r="4.8" fill="#0f172a" />
      <circle cx="140" cy="46" r="4.8" fill="#0f172a" />
      <path
        d="M123 59 q8 6 16 0"
        fill="none"
        stroke="#0f172a"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DashboardSkeleton({ theme }: { theme: ThemeMode }) {
  const isDark = theme === 'dark';
  const blockBg = isDark ? 'bg-slate-700/60' : 'bg-slate-200';

  return (
    <section aria-labelledby="panel-heading" aria-busy="true" className="py-2 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 id="panel-heading" className="text-2xl font-bold tracking-tight text-balance">
            Panel
          </h1>
          <p
            role="status"
            aria-live="polite"
            className={`text-sm text-pretty ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}
          >
            Cargando tus salas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-hidden="true">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className={`rounded-[20px] p-2.5 flex flex-col gap-2.5 border ${
              isDark
                ? 'bg-[#1f2e4a]/80 border-slate-400/20'
                : 'bg-[#eef6fb] border-[#075985]/15'
            }`}
          >
            <div
              className={`rounded-[10px] p-4 space-y-3 ${
                isDark ? 'bg-[#0f172a]' : 'bg-white'
              }`}
            >
              <div
                className={`h-5 w-3/4 rounded-lg animate-pulse motion-reduce:animate-none ${blockBg}`}
              />
              <div
                className={`h-4 w-1/2 rounded-lg animate-pulse motion-reduce:animate-none ${blockBg}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`h-11 rounded-xl animate-pulse motion-reduce:animate-none ${blockBg}`}
              />
              <div
                className={`h-11 rounded-xl animate-pulse motion-reduce:animate-none ${blockBg}`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface RoomCardProps {
  room: Room;
  theme: ThemeMode;
  isCopied: boolean;
  copyErrorMessage: string | null;
  onCopyId: (room: Room) => void;
  onEnter: (room: Room) => void;
}

function RoomCard({
  room,
  theme,
  isCopied,
  copyErrorMessage,
  onCopyId,
  onEnter,
}: RoomCardProps) {
  const isDark = theme === 'dark';

  return (
    <article
      className={`w-full rounded-[20px] p-2.5 flex flex-col justify-between gap-2.5 border ${
        isDark
          ? 'bg-[#1f2e4a]/80 border-slate-400/25 shadow-[0_10px_24px_rgba(2,6,23,0.32)]'
          : 'bg-[#eef6fb] border-[#075985]/15 shadow-[0_6px_18px_rgba(15,23,42,0.08)]'
      }`}
    >
      <div
        className={`rounded-[10px] p-4 flex-1 flex flex-col justify-between gap-3 ${
          isDark ? 'bg-[#0f172a]' : 'bg-white'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-bold leading-snug text-balance break-words min-w-0">
            {room.nombre}
          </h2>
          <AmbienteChip
            ambiente={room.ambiente}
            theme={theme}
            className="shrink-0 whitespace-nowrap"
          />
        </div>

        <div
          className={`flex items-center gap-1.5 text-xs ${
            isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
          }`}
        >
          <span>ID:</span>
          <code className="font-mono font-semibold tabular-nums break-all">{room.id}</code>
        </div>
      </div>

      {isCopied && !copyErrorMessage && (
        <div
          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 ${getSuccessAlertClasses(
            theme
          )}`}
        >
          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>ID copiado</span>
        </div>
      )}

      {copyErrorMessage && (
        <div
          role="alert"
          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold inline-flex items-start gap-1.5 ${getErrorAlertClasses(
            theme
          )}`}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="text-pretty break-all">{copyErrorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onCopyId(room)}
          aria-label={`Copiar ID de ${room.nombre}`}
          className={`min-h-[44px] px-3 py-2 rounded-xl border-[1.5px] text-sm font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.96] transition-[transform,background-color] ${
            isDark
              ? 'border-[#94a3b8] bg-[#0f172a] text-[#f8fafc] hover:bg-white/10'
              : 'border-[#64748b] bg-white text-[#0f172a] hover:bg-slate-100'
          }`}
        >
          <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Copiar ID</span>
        </button>

        <button
          type="button"
          onClick={() => onEnter(room)}
          aria-label={`Entrar a ${room.nombre}`}
          className={`${getPrimaryCtaClasses(
            theme
          )} !w-full !min-h-[44px] !py-2 text-sm active:scale-[0.96] transition-[transform,background-color]`}
        >
          Entrar
        </button>
      </div>
    </article>
  );
}

/** Panel principal con las salas creadas por el estudiante y acceso a crear una nueva. */
export function DashboardPage() {
  useDocumentTitle('Panel');
  const navigate = useNavigate();
  const { idToken } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<{ id: string; message: string } | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const copyTimerRef = useRef<number | null>(null);
  const announceTimerRef = useRef<number | null>(null);

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
    let active = true;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        const token = await resolveAuthToken(idToken);
        const list = await getMyRooms(token);
        if (!active) return;
        setRooms(list);
      } catch {
        if (!active) return;
        setLoadError('No pudimos cargar tus salas.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [idToken, reloadCount]);

  const handleCopyId = useCallback(async (room: Room) => {
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
      setCopiedRoomId(null);
      setLiveAnnouncement('');
      setCopyError({
        id: room.id,
        message: `No pudimos copiar el ID. Cópialo a mano: ${room.id}`,
      });
      return;
    }

    setCopyError(null);
    setCopiedRoomId(room.id);
    setLiveAnnouncement('');
    announceTimerRef.current = window.setTimeout(() => {
      setLiveAnnouncement(`ID de ${room.nombre} copiado al portapapeles`);
    }, 20);

    copyTimerRef.current = window.setTimeout(() => {
      setCopiedRoomId(null);
    }, 3000);
  }, []);

  const handleEnterRoom = useCallback(
    (room: Room) => {
      navigate(`/salas/${room.id}`, { state: { room } });
    },
    [navigate]
  );

  const handleRoomCreated = useCallback(
    (room: Room) => {
      setCreateOpen(false);
      navigate(`/salas/${room.id}`, { state: { room, justCreated: true } });
    },
    [navigate]
  );

  if (loading) {
    return <DashboardSkeleton theme={theme} />;
  }

  if (loadError) {
    return (
      <section aria-labelledby="panel-heading" className="py-2 space-y-5">
        <h1 id="panel-heading" className="text-2xl font-bold tracking-tight text-balance">
          Panel
        </h1>
        <div
          role="alert"
          className={`rounded-xl p-4 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 ${getErrorAlertClasses(
            theme
          )}`}
        >
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-pretty">{loadError}</span>
          </span>
          <button
            type="button"
            onClick={() => setReloadCount((prev) => prev + 1)}
            className={`min-h-[44px] px-4 py-2 rounded-lg border-[1.5px] border-[#64748b] text-sm font-semibold inline-flex items-center gap-1.5 active:scale-[0.96] transition-[transform,background-color] ${
              isDark
                ? 'bg-[#0f172a] text-[#f8fafc] hover:bg-white/10'
                : 'bg-white text-[#0f172a] hover:bg-slate-50'
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Reintentar</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="panel-heading" className="py-2 space-y-5">
      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {rooms.length === 0 ? (
        <>
          <h1 id="panel-heading" className="sr-only">
            Panel
          </h1>
          <div
            className={`max-w-lg mx-auto mt-3 rounded-[20px] border p-8 sm:p-10 text-center flex flex-col items-center gap-4 ${
              isDark
                ? 'bg-[#1f2e4a]/80 border-slate-400/25 shadow-[0_10px_24px_rgba(2,6,23,0.32)]'
                : 'bg-[#eef6fb] border-[#075985]/15 shadow-[0_6px_18px_rgba(15,23,42,0.08)]'
            }`}
          >
            <CompactTugaIllustration />
            <p className="text-base font-semibold max-w-sm text-pretty">
              Aún no tienes salas. Crea una para estudiar con tu grupo.
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={`${getPrimaryCtaClasses(
                theme
              )} !w-auto min-h-[44px] px-5 py-2.5 text-sm active:scale-[0.96] transition-[transform,background-color]`}
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Crear sala</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h1
                id="panel-heading"
                className="text-2xl font-bold tracking-tight text-balance"
              >
                Panel
              </h1>
              <p
                className={`text-sm text-pretty ${
                  isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
                }`}
              >
                Entra a una sala o comparte su ID con tu grupo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={`${getPrimaryCtaClasses(
                theme
              )} !w-auto min-h-[44px] px-5 py-2.5 text-sm active:scale-[0.96] transition-[transform,background-color]`}
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Crear sala</span>
            </button>
          </div>

          <ul
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 list-none p-0 m-0"
            aria-label="Tus salas creadas"
          >
            {rooms.map((room) => (
              <li key={room.id} className="flex">
                <RoomCard
                  room={room}
                  theme={theme}
                  isCopied={copiedRoomId === room.id}
                  copyErrorMessage={copyError?.id === room.id ? copyError.message : null}
                  onCopyId={(selected) => void handleCopyId(selected)}
                  onEnter={handleEnterRoom}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <CreateRoomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleRoomCreated}
      />
    </section>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Plus, RotateCcw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreateRoomDialog } from '../components/CreateRoomDialog';
import { RoomCard } from '../components/RoomCard';
import { DeleteRoomDialog, RenameRoomDialog } from '../components/RoomDialogs';
import { StatusBanner } from '../components/StatusBanner';
import { type AmbienteId } from '../content/ambientes';
import { selectTugaGreeting } from '../content/vozTuga';
import { useRooms } from '../context/RoomsContext';
import { useTheme } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { type Room } from '../services/roomsApi';
import {
  getErrorAlertClasses,
  getSecondaryBtnClasses,
} from '../utils/themeStyles';
import { MyRoomsPage } from './MyRoomsPage';

function DashboardInicioView() {
  useDocumentTitle('Inicio');
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [{ phrase: greeting }] = useState(() => selectTugaGreeting());
  const {
    rooms,
    hasLoaded,
    loadingInitial,
    loadError,
    refreshRooms,
    addRoom,
    updateRoom,
    removeRoom,
  } = useRooms();

  const [createOpen, setCreateOpen] = useState(false);
  const [initialAmbiente, setInitialAmbiente] = useState<AmbienteId>('ninguno');
  const [renamingRoom, setRenamingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    void refreshRooms();
  }, [refreshRooms]);

  const openCreateWithAmbiente = (ambiente: AmbienteId) => {
    setInitialAmbiente(ambiente);
    setCreateOpen(true);
  };

  const handleRoomCreated = useCallback(
    (room: Room) => {
      addRoom(room);
      setCreateOpen(false);
      navigate(`/salas/${room.id}`, { state: { room, justCreated: true } });
    },
    [addRoom, navigate]
  );

  const handleRenamed = useCallback(
    (updated: Room) => {
      updateRoom(updated);
      setRenamingRoom(null);
      setStatusBanner('Nombre de sala actualizado');
    },
    [updateRoom]
  );

  const handleDeleted = useCallback(
    (deletedId: string) => {
      removeRoom(deletedId);
      setDeletingRoom(null);
      setStatusBanner('Sala eliminada');
    },
    [removeRoom]
  );

  const envCardBase =
    'group relative min-h-[144px] sm:min-h-[210px] rounded-[18px] overflow-hidden p-5 flex flex-col text-left transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none';

  const photoCardRing = isDark
    ? 'border border-white/10 shadow-[0_12px_28px_rgba(2,6,23,0.45)]'
    : 'border border-black/10 shadow-[0_8px_22px_rgba(15,23,42,0.12)]';

  return (
    <section aria-labelledby="panel-heading" className="pt-4 sm:pt-8 pb-4 space-y-8">
      <header className="text-center space-y-2.5 max-w-2xl mx-auto">
        <h1
          id="panel-heading"
          className="text-2xl sm:text-[30px] font-bold tracking-[-0.025em] leading-[1.24] text-balance max-w-[24ch] mx-auto"
        >
          {greeting.segments.map((seg, idx) =>
            seg.lang ? (
              <span key={idx} lang={seg.lang}>
                {seg.text}
              </span>
            ) : (
              <span key={idx}>{seg.text}</span>
            )
          )}
        </h1>
        <p
          className={`text-sm sm:text-base text-pretty ${
            isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
          }`}
        >
          Puedes elegir entre dos ambientes o crear el tuyo
        </p>
      </header>

      {statusBanner && (
        <StatusBanner message={statusBanner} onDismiss={() => setStatusBanner(null)} />
      )}

      <div
        role="group"
        aria-label="Elegir ambiente para crear una sala"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <button
          type="button"
          onClick={() => openCreateWithAmbiente('green')}
          aria-label="Crear sala con ambiente Green"
          className={`${envCardBase} ${photoCardRing} justify-end items-start bg-[#06140e]`}
        >
          <img
            src="/ambientes/fondo-green.webp"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(6, 20, 14, 0.08) 0%, rgba(6, 20, 14, 0.36) 54%, rgba(5, 16, 12, 0.84) 100%)',
            }}
          />
          <span className="relative z-10 text-lg font-bold tracking-[-0.015em] text-[#f8fafc]">
            Green
          </span>
        </button>

        <button
          type="button"
          onClick={() => openCreateWithAmbiente('blue')}
          aria-label="Crear sala con ambiente Blue"
          className={`${envCardBase} ${photoCardRing} justify-end items-start bg-[#071122]`}
        >
          <img
            src="/ambientes/fondo-blue.webp"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(7, 17, 34, 0.1) 0%, rgba(7, 17, 34, 0.36) 54%, rgba(6, 14, 28, 0.84) 100%)',
            }}
          />
          <span className="relative z-10 text-lg font-bold tracking-[-0.015em] text-[#f8fafc]">
            Blue
          </span>
        </button>

        <button
          type="button"
          onClick={() => openCreateWithAmbiente('ninguno')}
          aria-label="Crear sala personalizada sin sonido"
          style={{
            background: isDark
              ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.86) 0%, rgba(15, 23, 42, 0.94) 100%)'
              : 'linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(226, 232, 240, 0.9) 100%)',
          }}
          className={`${envCardBase} justify-between items-center text-center border-[1.5px] border-dashed border-[#64748b] ${
            isDark
              ? 'text-[#f8fafc] shadow-[0_12px_28px_rgba(2,6,23,0.35)]'
              : 'text-[#0f172a] shadow-[0_8px_22px_rgba(15,23,42,0.08)]'
          }`}
        >
          <span className="flex-1 flex items-center justify-center" aria-hidden="true">
            <Plus className="w-11 h-11 stroke-[1.5] opacity-85" />
          </span>
          <span className="relative z-10 text-lg font-bold tracking-[-0.015em]">
            Personalizado
          </span>
        </button>
      </div>

      {loadError && (
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
            onClick={() => void refreshRooms({ showSkeletonIfEmpty: true })}
            className={`${getSecondaryBtnClasses(theme)} ${
              isDark ? '!bg-[#0f172a]' : '!bg-white'
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {hasLoaded && !loadingInitial && !loadError && rooms.length > 0 && (
        <section aria-labelledby="tus-salas-heading" className="pt-2 space-y-4">
          <h2
            id="tus-salas-heading"
            className="text-lg font-bold tracking-tight text-balance"
          >
            Tus salas
          </h2>
          <ul
            className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4 list-none p-0 m-0"
            aria-label="Tus salas creadas"
          >
            {rooms.map((room) => (
              <li key={room.id} className="flex">
                <RoomCard
                  room={room}
                  theme={theme}
                  onRename={setRenamingRoom}
                  onDelete={setDeletingRoom}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <CreateRoomDialog
        open={createOpen}
        initialAmbiente={initialAmbiente}
        onClose={() => setCreateOpen(false)}
        onCreated={handleRoomCreated}
      />

      <RenameRoomDialog
        open={Boolean(renamingRoom)}
        room={renamingRoom}
        onClose={() => setRenamingRoom(null)}
        onRenamed={handleRenamed}
      />

      <DeleteRoomDialog
        open={Boolean(deletingRoom)}
        room={deletingRoom}
        onClose={() => setDeletingRoom(null)}
        onDeleted={handleDeleted}
      />
    </section>
  );
}

/** Inicio del espacio de trabajo con ambientes rápidos y acceso a salas propias. */
export function DashboardPage() {
  const [searchParams] = useSearchParams();
  if (searchParams.get('vista') === 'mis-salas') {
    return <MyRoomsPage />;
  }
  return <DashboardInicioView />;
}

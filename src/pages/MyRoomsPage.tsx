import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Plus, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RoomCard } from '../components/RoomCard';
import { DeleteRoomDialog, RenameRoomDialog } from '../components/RoomDialogs';
import { StatusBanner } from '../components/StatusBanner';
import { getSceneCardShellClasses, getSceneInnerClasses } from '../components/SceneBanner';
import { useRooms } from '../context/RoomsContext';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { type Room } from '../services/roomsApi';
import {
  getErrorAlertClasses,
  getPrimaryCtaClasses,
  getSecondaryBtnClasses,
} from '../utils/themeStyles';

function MyRoomsSkeleton({ theme }: { theme: ThemeMode }) {
  const isDark = theme === 'dark';
  const blockBg = isDark ? 'bg-slate-700/60' : 'bg-slate-200';

  return (
    <section aria-labelledby="mis-salas-heading" aria-busy="true" className="py-2 space-y-5">
      <div className="space-y-1 text-center">
        <h1
          id="mis-salas-heading"
          className="text-2xl sm:text-[28px] font-bold tracking-tight text-balance text-center"
        >
          Mis salones
        </h1>
        <p
          role="status"
          aria-live="polite"
          className={`text-sm text-pretty ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}
        >
          Cargando tus salas
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-[18px]" aria-hidden="true">
        {[1, 2, 3].map((item) => (
          <div key={item} className={`${getSceneCardShellClasses(isDark)} mx-auto sm:mx-0`}>
            <div className={`${getSceneInnerClasses(isDark)} gap-2`}>
              <div className={`self-stretch aspect-[2.2/1] rounded-[8px] animate-pulse motion-reduce:animate-none ${blockBg}`} />
              <div className={`h-4 w-2/3 rounded-md animate-pulse motion-reduce:animate-none ${blockBg}`} />
              <div className={`h-3 w-1/2 rounded-md animate-pulse motion-reduce:animate-none ${blockBg}`} />
            </div>
            <div className={`h-11 sm:h-[38px] rounded-[10px] animate-pulse motion-reduce:animate-none ${blockBg}`} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Vista de administración de salas propias (renombrar, eliminar, copiar ID y entrar). */
export function MyRoomsPage() {
  useDocumentTitle('Mis salones');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const {
    rooms,
    hasLoaded,
    loadingInitial,
    loadError,
    refreshRooms,
    updateRoom,
    removeRoom,
  } = useRooms();
  const [renamingRoom, setRenamingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    void refreshRooms();
  }, [refreshRooms]);

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

  if ((loadingInitial || !hasLoaded) && !loadError) {
    return <MyRoomsSkeleton theme={theme} />;
  }

  if (loadError) {
    return (
      <section aria-labelledby="mis-salas-heading" className="py-2 space-y-5">
        <h1
          id="mis-salas-heading"
          className="text-2xl sm:text-[28px] font-bold tracking-tight text-balance text-center"
        >
          Mis salones
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
            onClick={() => void refreshRooms({ showSkeletonIfEmpty: true })}
            className={`${getSecondaryBtnClasses(theme)} ${
              isDark ? '!bg-[#0f172a]' : '!bg-white'
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
    <section aria-labelledby="mis-salas-heading" className="py-2 space-y-5">
      <h1
        id="mis-salas-heading"
        className="text-2xl sm:text-[28px] font-bold tracking-tight text-balance text-center"
      >
        Mis salones
      </h1>

      {statusBanner && (
        <StatusBanner message={statusBanner} onDismiss={() => setStatusBanner(null)} />
      )}

      {rooms.length === 0 ? (
        <div
          className={`rounded-[18px] border p-8 sm:p-10 text-center flex flex-col items-center gap-3 ${
            isDark
              ? 'bg-[#111c30] border-slate-400/25 shadow-[0_10px_24px_rgba(2,6,23,0.32)]'
              : 'bg-[#f8fafc] border-[#075985]/15 shadow-[0_6px_18px_rgba(15,23,42,0.08)]'
          }`}
        >
          <h2 className="text-lg font-bold tracking-tight text-balance">
            Todavía no tienes salones
          </h2>
          <p
            className={`text-sm max-w-[40ch] text-pretty ${
              isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
            }`}
          >
            Crea una en Inicio.
          </p>
          <Link
            to="/panel"
            className={`${getPrimaryCtaClasses(
              theme
            )} !w-auto !min-h-[44px] !py-2.5 text-sm mt-2`}
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Ir a Inicio</span>
          </Link>
        </div>
      ) : (
        <ul
          className="flex flex-wrap justify-center gap-[18px] list-none p-0 m-0"
          aria-label="Tus salas creadas"
        >
          {rooms.map((room) => (
            <li key={room.id} className="flex justify-center w-full sm:w-auto">
              <RoomCard
                room={room}
                theme={theme}
                onRename={setRenamingRoom}
                onDelete={setDeletingRoom}
              />
            </li>
          ))}
        </ul>
      )}

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

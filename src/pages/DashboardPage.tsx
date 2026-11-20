import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreateRoomDialog } from '../components/CreateRoomDialog';
import {
  SceneBanner,
  getSceneCardShellClasses,
  getSceneInnerClasses,
} from '../components/SceneBanner';
import { AMBIENTES, type AmbienteId } from '../content/ambientes';
import { selectTugaGreeting } from '../content/vozTuga';
import { useRooms } from '../context/RoomsContext';
import { useTheme } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { type Room } from '../services/roomsApi';
import { getPrimaryCtaClasses } from '../utils/themeStyles';
import { MyRoomsPage } from './MyRoomsPage';

const CREATE_OPTIONS: { ambiente: AmbienteId; label: string; ariaLabel: string; english: boolean }[] = [
  { ambiente: 'blue', label: AMBIENTES.blue.label, ariaLabel: `Crear sala con ambiente ${AMBIENTES.blue.label}`, english: true },
  { ambiente: 'green', label: AMBIENTES.green.label, ariaLabel: `Crear sala con ambiente ${AMBIENTES.green.label}`, english: true },
  { ambiente: 'ninguno', label: 'Personalizado', ariaLabel: 'Crear sala personalizada sin sonido', english: false },
];

function DashboardInicioView() {
  useDocumentTitle('Inicio');
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [{ phrase: greeting }] = useState(() => selectTugaGreeting());
  const { refreshRooms, addRoom } = useRooms();

  const [createOpen, setCreateOpen] = useState(false);
  const [initialAmbiente, setInitialAmbiente] = useState<AmbienteId>('ninguno');

  // Precarga las salas para que Mis salas se pinte al instante.
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

  return (
    <section aria-labelledby="panel-heading" className="pt-6 sm:pt-12 pb-6">
      <header className="text-center space-y-2 max-w-2xl mx-auto mb-12 sm:mb-20">
        <h1
          id="panel-heading"
          className="text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] leading-[1.2] text-balance max-w-[24ch] mx-auto"
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
        <p className={`text-sm text-pretty ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
          Puedes elegir entre dos ambientes o crear el tuyo
        </p>
      </header>

      <ul
        role="list"
        aria-label="Elegir ambiente para crear una sala"
        className="flex flex-wrap justify-center gap-[18px] list-none p-0 m-0"
      >
        {CREATE_OPTIONS.map((option) => (
          <li key={option.ambiente} className="flex justify-center w-full sm:w-auto">
            <div className={getSceneCardShellClasses(isDark)}>
              <div className={`${getSceneInnerClasses(isDark)} pb-3.5`}>
                <SceneBanner ambiente={option.ambiente} isDark={isDark} />
                <p
                  lang={option.english ? 'en' : undefined}
                  className="room-card-title-glow relative z-10 text-[15px] font-bold leading-snug"
                >
                  {option.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openCreateWithAmbiente(option.ambiente)}
                aria-label={option.ariaLabel}
                className={`${getPrimaryCtaClasses(theme)} !w-full !min-h-[44px] sm:!min-h-[38px] !py-1.5 !rounded-[10px] text-sm`}
              >
                Crear sala
              </button>
            </div>
          </li>
        ))}
      </ul>

      <CreateRoomDialog
        open={createOpen}
        initialAmbiente={initialAmbiente}
        onClose={() => setCreateOpen(false)}
        onCreated={handleRoomCreated}
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

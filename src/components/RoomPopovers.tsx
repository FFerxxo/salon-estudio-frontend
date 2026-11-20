import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Music,
  Pause,
  Play,
  SkipForward,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AMBIENTES,
  shuffleTracks,
  type AmbienteId,
  type AmbienteTrack,
} from '../content/ambientes';
import { useTheme } from '../context/ThemeContext';
import { type Room } from '../services/roomsApi';

export interface RoomBarProps {
  room: Room;
  roomId: string;
  copied: boolean;
  onCopyId: () => void;
  participantsOpen: boolean;
  onToggleParticipants: () => void;
}

type PopoverKind = 'sound' | 'volume' | null;

/** Barra superior translúcida de la sala con copia de ID, audio ambiental persistente y popovers. */
export function RoomBar({
  room,
  roomId,
  copied,
  onCopyId,
  participantsOpen,
  onToggleParticipants,
}: RoomBarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const displayId = room.id || roomId;
  const hasAudio = room.ambiente === 'blue' || room.ambiente === 'green';
  const definition = AMBIENTES[room.ambiente];
  const isDarkBar = isDark || room.ambiente !== 'ninguno';

  const soundPopoverId = useId();
  const volumePopoverId = useId();

  const [prevRoomKey, setPrevRoomKey] = useState(`${room.id}:${room.ambiente}`);
  const [playlist, setPlaylist] = useState<AmbienteTrack[]>(() =>
    shuffleTracks(AMBIENTES[room.ambiente].tracks)
  );
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [openPopover, setOpenPopover] = useState<PopoverKind>(null);
  const [popoverEntered, setPopoverEntered] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoAdvanceRef = useRef(false);
  const lastNonZeroVolumeRef = useRef(70);
  const controlsWrapRef = useRef<HTMLDivElement | null>(null);
  const soundBtnRef = useRef<HTMLButtonElement | null>(null);
  const volumeBtnRef = useRef<HTMLButtonElement | null>(null);

  const currentRoomKey = `${room.id}:${room.ambiente}`;
  if (currentRoomKey !== prevRoomKey) {
    setPrevRoomKey(currentRoomKey);
    setPlaylist(shuffleTracks(AMBIENTES[room.ambiente].tracks));
    setTrackIndex(0);
    setIsPlaying(false);
    setOpenPopover(null);
  }

  const currentTrack = playlist[trackIndex] ?? null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying || !hasAudio) {
      try {
        audio.pause();
      } catch {
        // Entorno sin implementación de medios
      }
      autoAdvanceRef.current = false;
      return;
    }

    if (autoAdvanceRef.current) {
      autoAdvanceRef.current = false;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }, [isPlaying, hasAudio, trackIndex, playlist]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      try {
        audio.pause();
      } catch {
        // Entorno sin implementación de medios
      }
    };
  }, []);

  useEffect(() => {
    if (!openPopover) {
      setPopoverEntered(false);
      return;
    }

    const frame = requestAnimationFrame(() => {
      setPopoverEntered(true);
    });

    const restoreTriggerFocus = (kind: PopoverKind) => {
      if (kind === 'sound') {
        soundBtnRef.current?.focus();
      } else if (kind === 'volume') {
        volumeBtnRef.current?.focus();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !controlsWrapRef.current?.contains(target)) {
        setOpenPopover(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        const closing = openPopover;
        setOpenPopover(null);
        restoreTriggerFocus(closing);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openPopover]);

  const handleTogglePlay = () => {
    if (!hasAudio) return;
    const audio = audioRef.current;

    if (isPlaying) {
      setIsPlaying(false);
      if (audio) {
        try {
          audio.pause();
        } catch {
          // Entorno sin implementación de medios
        }
      }
      return;
    }

    setIsPlaying(true);
    if (audio) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  };

  const handleNextTrack = () => {
    if (!hasAudio || playlist.length === 0) return;
    const nextIndex = (trackIndex + 1) % playlist.length;
    autoAdvanceRef.current = isPlaying;
    if (nextIndex === 0) {
      setPlaylist(shuffleTracks(definition.tracks, currentTrack?.src));
    }
    setTrackIndex(nextIndex);
  };

  const handleSelectTrack = (index: number) => {
    if (!hasAudio) return;
    autoAdvanceRef.current = isPlaying;
    setTrackIndex(index);
  };

  const handleTrackEnded = () => {
    if (!hasAudio || playlist.length === 0) return;
    const nextIndex = (trackIndex + 1) % playlist.length;
    autoAdvanceRef.current = true;
    if (nextIndex === 0) {
      setPlaylist(shuffleTracks(definition.tracks, currentTrack?.src));
    }
    setTrackIndex(nextIndex);
    setIsPlaying(true);
  };

  const handleVolumeChange = (nextValue: number) => {
    const clamped = Math.max(0, Math.min(100, nextValue));
    if (clamped > 0) {
      lastNonZeroVolumeRef.current = clamped;
    }
    setVolume(clamped);
  };

  const handleToggleMute = () => {
    if (volume === 0) {
      setVolume(lastNonZeroVolumeRef.current || 70);
    } else {
      lastNonZeroVolumeRef.current = volume;
      setVolume(0);
    }
  };

  const iconBtnBase = isDarkBar
    ? 'border-white/25 bg-white/10 text-[#f8fafc] hover:bg-white/20'
    : 'border-[#64748b] bg-slate-900/5 text-[#0f172a] hover:bg-slate-900/10';

  const iconBtnActive = isDarkBar
    ? 'border-[#7dd3fc] bg-[#38bdf8]/25 text-[#e0f2fe]'
    : 'border-[#075985] bg-[#075985]/15 text-[#075985]';

  const popoverSurfaceClasses = isDark
    ? 'bg-[#0f172a] text-[#f8fafc] border-[#64748b] shadow-[0_20px_44px_rgba(2,6,23,0.6)]'
    : 'bg-white text-[#0f172a] border-[#64748b] shadow-[0_20px_44px_rgba(15,23,42,0.2)]';

  const popoverAnimClasses = popoverEntered
    ? 'opacity-100 scale-100 translate-y-0'
    : 'opacity-0 scale-95 -translate-y-1 motion-reduce:opacity-100 motion-reduce:scale-100 motion-reduce:translate-y-0';

  const ambienteBadgeText: Record<AmbienteId, string> = {
    ninguno: 'Sin sonido',
    blue: 'Blue',
    green: 'Green',
  };

  return (
    <div
      className={`relative z-20 flex items-center justify-between gap-3 flex-wrap px-4 py-3 rounded-2xl border backdrop-blur-[12px] ${
        isDarkBar
          ? 'bg-[#0b1220]/80 border-white/15 text-[#f8fafc]'
          : 'bg-white/90 border-[#0f172a]/15 text-[#0f172a]'
      }`}
    >
      {/* Elemento de audio persistente fuera de los popovers para no pausar al cerrar */}
      <audio
        ref={audioRef}
        src={hasAudio ? currentTrack?.src : undefined}
        preload="none"
        onEnded={handleTrackEnded}
      />

      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
        <h1
          id="roomHeading"
          className="text-lg font-bold tracking-tight text-balance break-words"
        >
          {room.nombre}
        </h1>

        <button
          type="button"
          onClick={onCopyId}
          aria-label={`Copiar ID de la sala ${displayId}`}
          className={`min-h-[40px] px-3 py-1.5 rounded-[10px] border text-[13px] font-semibold inline-flex items-center gap-1.5 active:scale-[0.96] transition-[transform,background-color] duration-150 ${
            isDarkBar
              ? 'border-white/25 bg-white/10 text-[#f8fafc] hover:bg-white/20'
              : 'border-[#64748b] bg-white text-[#0f172a] hover:bg-slate-100'
          }`}
        >
          <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Copiar ID</span>
          <code className="font-mono font-semibold tabular-nums opacity-90">
            {displayId}
          </code>
        </button>

        {copied && (
          <span
            role="status"
            className="rounded-lg px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1.5 bg-[#022c22] text-[#6ee7b7] border border-[#6ee7b7]"
          >
            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>ID copiado</span>
          </span>
        )}
      </div>

      <div ref={controlsWrapRef} className="relative flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onToggleParticipants}
          aria-pressed={participantsOpen}
          aria-controls="roomMemberGrid"
          aria-label={participantsOpen ? 'Ocultar participantes' : 'Mostrar participantes'}
          title="Participantes"
          className={`size-11 rounded-xl border inline-flex items-center justify-center active:scale-[0.96] transition-[transform,background-color,border-color] duration-150 ${
            participantsOpen ? iconBtnActive : iconBtnBase
          }`}
        >
          <Users className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          ref={soundBtnRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={openPopover === 'sound'}
          aria-controls={openPopover === 'sound' ? soundPopoverId : undefined}
          aria-label="Ambiente sonoro"
          title="Ambiente sonoro"
          onClick={() =>
            setOpenPopover((prev) => (prev === 'sound' ? null : 'sound'))
          }
          className={`size-11 rounded-xl border inline-flex items-center justify-center active:scale-[0.96] transition-[transform,background-color,border-color] duration-150 ${
            openPopover === 'sound' || isPlaying ? iconBtnActive : iconBtnBase
          }`}
        >
          <Music className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          ref={volumeBtnRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={openPopover === 'volume'}
          aria-controls={openPopover === 'volume' ? volumePopoverId : undefined}
          aria-label="Volumen"
          title="Volumen"
          onClick={() =>
            setOpenPopover((prev) => (prev === 'volume' ? null : 'volume'))
          }
          className={`size-11 rounded-xl border inline-flex items-center justify-center active:scale-[0.96] transition-[transform,background-color,border-color] duration-150 ${
            openPopover === 'volume' ? iconBtnActive : iconBtnBase
          }`}
        >
          {volume === 0 ? (
            <VolumeX className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Volume2 className="w-5 h-5" aria-hidden="true" />
          )}
        </button>

        <Link
          to="/panel"
          className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-[13px] font-bold inline-flex items-center gap-1.5 active:scale-[0.96] transition-[transform,background-color] duration-150 ${
            isDarkBar
              ? 'border-[#fca5a5] bg-[#7f1d1d]/80 text-[#fef2f2] hover:bg-[#991b1b]'
              : 'border-[#b91c1c] bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2]'
          }`}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Salir de la sala</span>
        </Link>

        {openPopover === 'sound' && (
          <div
            id={soundPopoverId}
            role="dialog"
            aria-label="Ambiente sonoro"
            className={`absolute top-[calc(100%+10px)] right-0 w-[290px] max-w-[calc(100vw-2rem)] z-30 rounded-2xl p-4 border origin-top-right transition-[transform,opacity] duration-150 ease-out motion-reduce:transition-none ${popoverAnimClasses} ${popoverSurfaceClasses}`}
          >
            <p className="text-sm font-bold text-balance">
              Ambiente: {ambienteBadgeText[room.ambiente]}
            </p>

            {!hasAudio ? (
              <p
                className={`mt-1.5 text-xs leading-relaxed text-pretty ${
                  isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
                }`}
              >
                Sin sonido ambiental · Estudio en silencio
              </p>
            ) : (
              <div className="mt-2 space-y-3">
                <p
                  className={`text-xs text-pretty ${
                    isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
                  }`}
                >
                  {isPlaying && currentTrack
                    ? `Reproduciendo · ${currentTrack.title}`
                    : currentTrack
                      ? `Pista lista · ${currentTrack.title}`
                      : 'Apagado al entrar · elige una pista'}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={isPlaying}
                    onClick={handleTogglePlay}
                    className={`flex-1 min-h-[42px] px-3.5 py-2 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 active:scale-[0.96] transition-[transform,background-color] duration-150 ${
                      isDark
                        ? 'bg-[#38bdf8] text-[#0b1220] hover:bg-[#7dd3fc]'
                        : 'bg-[#075985] text-white hover:bg-[#0369a1]'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Reproducir</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextTrack}
                    aria-label="Siguiente pista"
                    title="Siguiente pista"
                    className={`size-[42px] shrink-0 rounded-xl border-[1.5px] border-[#64748b] inline-flex items-center justify-center active:scale-[0.96] transition-[transform,background-color] duration-150 ${
                      isDark
                        ? 'text-[#f8fafc] hover:bg-white/10'
                        : 'text-[#0f172a] hover:bg-slate-100'
                    }`}
                  >
                    <SkipForward className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div
                  role="group"
                  aria-label="Pistas del ambiente"
                  className="flex flex-col gap-1"
                >
                  {playlist.map((track, idx) => {
                    const active = idx === trackIndex;
                    return (
                      <button
                        key={track.src}
                        type="button"
                        aria-pressed={active}
                        onClick={() => handleSelectTrack(idx)}
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-[10px] border text-[13px] text-left flex items-center justify-between gap-2 transition-colors duration-150 ${
                          active
                            ? isDark
                              ? 'bg-[#38bdf8]/15 border-[#38bdf8]/45 text-[#f8fafc] font-semibold'
                              : 'bg-[#075985]/10 border-[#075985]/35 text-[#075985] font-semibold'
                            : isDark
                              ? 'border-transparent text-[#cbd5e1] hover:bg-white/10 hover:text-[#f8fafc]'
                              : 'border-transparent text-[#334155] hover:bg-slate-100 hover:text-[#0f172a]'
                        }`}
                      >
                        <span className="truncate">{track.title}</span>
                        {active && (
                          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {openPopover === 'volume' && (
          <div
            id={volumePopoverId}
            role="dialog"
            aria-label="Volumen"
            className={`absolute top-[calc(100%+10px)] right-0 w-[280px] max-w-[calc(100vw-2rem)] z-30 rounded-2xl p-4 border origin-top-right transition-[transform,opacity] duration-150 ease-out motion-reduce:transition-none ${popoverAnimClasses} ${popoverSurfaceClasses}`}
          >
            <p className="text-sm font-bold mb-2.5">Volumen</p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleMute}
                aria-pressed={volume === 0}
                aria-label={volume === 0 ? 'Activar sonido' : 'Silenciar'}
                title={volume === 0 ? 'Activar sonido' : 'Silenciar'}
                className={`size-11 shrink-0 rounded-xl border-[1.5px] border-[#64748b] inline-flex items-center justify-center active:scale-[0.96] transition-[transform,background-color] duration-150 ${
                  isDark
                    ? 'text-[#f8fafc] hover:bg-white/10'
                    : 'text-[#0f172a] hover:bg-slate-100'
                }`}
              >
                {volume === 0 ? (
                  <VolumeX className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                aria-label="Volumen del ambiente sonoro"
                onChange={(event) => handleVolumeChange(Number(event.target.value))}
                className={`flex-1 min-h-[44px] cursor-pointer ${
                  isDark ? 'accent-[#38bdf8]' : 'accent-[#075985]'
                }`}
              />

              <span className="font-mono text-xs font-semibold tabular-nums min-w-[40px] text-right">
                {volume}%
              </span>
            </div>

            {!hasAudio && (
              <p
                className={`mt-2 text-xs text-pretty ${
                  isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
                }`}
              >
                Sala en modo sin sonido ambiental.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

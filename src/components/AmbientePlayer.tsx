import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import {
  AMBIENTES,
  shuffleTracks,
  type AmbienteId,
  type AmbienteTrack,
} from '../content/ambientes';
import { useTheme } from '../context/ThemeContext';
import { getPrimaryCtaClasses } from '../utils/themeStyles';
import { AmbienteChip } from './AmbienteChip';

export interface AmbientePlayerProps {
  ambiente: AmbienteId;
}

/** Reproductor de ambiente sonoro apagado al entrar, con orden mezclado y control de volumen. */
export function AmbientePlayer({ ambiente }: AmbientePlayerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const volumeId = useId();
  const definition = AMBIENTES[ambiente];

  const [prevAmbiente, setPrevAmbiente] = useState<AmbienteId>(ambiente);
  const [playlist, setPlaylist] = useState<AmbienteTrack[]>(() =>
    shuffleTracks(definition.tracks)
  );
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoAdvanceRef = useRef(false);

  if (prevAmbiente !== ambiente) {
    setPrevAmbiente(ambiente);
    setPlaylist(shuffleTracks(AMBIENTES[ambiente].tracks));
    setTrackIndex(0);
    setIsPlaying(false);
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

    if (!isPlaying) {
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
  }, [isPlaying, trackIndex, playlist]);

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

  if (ambiente === 'ninguno') {
    return (
      <section
        aria-label="Ambiente sonoro"
        className={`rounded-2xl border p-4 sm:p-5 flex items-center gap-3 ${
          isDark
            ? 'bg-[#162238] border-slate-400/25 text-[#cbd5e1]'
            : 'bg-[#eef6fb] border-[#075985]/15 text-[#334155]'
        }`}
      >
        <AmbienteChip ambiente="ninguno" theme={theme} className="gap-1.5 py-1 shrink-0" />
        <p className="text-sm font-medium text-pretty">
          Sin sonido ambiental · Estudio en silencio
        </p>
      </section>
    );
  }

  const handleTogglePlay = () => {
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

  const handleTrackEnded = () => {
    if (playlist.length === 0) return;
    const nextIndex = (trackIndex + 1) % playlist.length;
    autoAdvanceRef.current = true;
    if (nextIndex === 0) {
      setPlaylist(shuffleTracks(definition.tracks, currentTrack?.src));
    }
    setTrackIndex(nextIndex);
    setIsPlaying(true);
  };

  return (
    <section
      aria-label="Reproductor de ambiente sonoro"
      className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${
        isDark
          ? 'bg-[#162238] border-slate-400/25 text-[#f8fafc]'
          : 'bg-[#eef6fb] border-[#075985]/15 text-[#0f172a]'
      }`}
    >
      <audio
        ref={audioRef}
        src={currentTrack?.src}
        preload="none"
        onEnded={handleTrackEnded}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <AmbienteChip ambiente={ambiente} theme={theme} className="gap-1.5" />
            <span
              className={`text-xs font-medium ${
                isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
              }`}
            >
              {definition.description}
            </span>
          </div>

          <p className="text-sm font-semibold text-pretty">
            {currentTrack ? currentTrack.title : 'Lista lista para reproducir'}
          </p>
          <p
            className={`text-xs tabular-nums ${
              isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
            }`}
          >
            {isPlaying
              ? `Reproduciendo pista ${trackIndex + 1} de ${playlist.length}`
              : 'Apagado al entrar · lista en orden aleatorio'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleTogglePlay}
          aria-pressed={isPlaying}
          className={`${getPrimaryCtaClasses(
            theme
          )} !w-auto min-h-[44px] min-w-[148px] !py-2.5 text-sm active:scale-[0.96] transition-[transform,background-color]`}
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

        <div className="flex flex-1 min-w-[200px] items-center gap-2.5">
          <Volume2
            className={`w-4 h-4 shrink-0 ${
              isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
            }`}
            aria-hidden="true"
          />
          <label
            htmlFor={volumeId}
            className={`text-xs font-semibold shrink-0 ${
              isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
            }`}
          >
            Volumen
          </label>
          <input
            id={volumeId}
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className={`flex-1 min-h-[44px] cursor-pointer ${
              isDark ? 'accent-[#38bdf8]' : 'accent-[#075985]'
            }`}
          />
          <span className="font-mono text-xs font-semibold tabular-nums min-w-[40px] text-right">
            {volume} %
          </span>
        </div>
      </div>
    </section>
  );
}

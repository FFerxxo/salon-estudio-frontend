import { useEffect, useRef, useState } from 'react';
import { MAREA_MEDIA, useTheme } from '../context/ThemeContext';

const IS_JSDOM =
  typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');

function isDataSaverActive(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(conn?.saveData);
}

/**
 * Capa ambiental única del Tema Marea (Guía visual v3 §3):
 * - En pantallas de acceso (subtle = false): loop de mar nítido (1080p por defecto, 1440p y 2160p 4K en pantallas retina/≥2560px, sin 4K en ahorro de datos), sin velo que lave el video (solo viñeta leve ≤ 25% en bordes). Día y Noche muestran el mismo mar nítido; solo cambia la tarjeta.
 * - En pantallas de lectura larga / interior de la app (subtle = true): lienzo sólido estático sin movimiento detrás.
 */
export function AmbientMotionBackdrop({ subtle = false }: { subtle?: boolean }) {
  const { theme, motionPaused, prefersReducedMotion } = useTheme();
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isDark = theme === 'dark';
  const saveData = isDataSaverActive();
  const useStaticFallback = subtle || prefersReducedMotion || videoFailed || IS_JSDOM;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || useStaticFallback) return;
    if (motionPaused) {
      video.pause();
    } else {
      const playPromise = video.play?.();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }, [motionPaused, useStaticFallback]);

  if (subtle) {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-0 select-none transition-colors duration-300 ${
          isDark ? 'bg-[#0b1220]' : 'bg-[#f8fafc]'
        }`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none bg-[#0b1220]"
    >
      <div className="absolute inset-0">
        {!useStaticFallback ? (
          <video
            ref={videoRef}
            autoPlay={!motionPaused}
            loop
            muted
            playsInline
            poster={MAREA_MEDIA.posterUrl}
            onError={() => setVideoFailed(true)}
            className="h-full w-full object-cover object-center"
          >
            {!saveData && (
              <source
                src={MAREA_MEDIA.video1440Url}
                type="video/mp4"
                media="(min-width: 1440px), (min-width: 960px) and (-webkit-min-device-pixel-ratio: 2), (min-width: 960px) and (min-resolution: 192dpi)"
              />
            )}
            <source src={MAREA_MEDIA.video1080Url} type="video/mp4" />
          </video>
        ) : (
          <img
            src={MAREA_MEDIA.posterUrl}
            alt=""
            className="h-full w-full object-cover object-center"
          />
        )}
      </div>

      {/* Viñeta leve (≤ 25 %) solo en bordes; centro 100 % transparente para máxima nitidez en Noche y Día */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(2, 6, 23, 0) 62%, rgba(2, 6, 23, 0.22) 100%)',
        }}
      />
    </div>
  );
}

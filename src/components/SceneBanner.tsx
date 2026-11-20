import { useId } from 'react';
import { ROOM_BACKGROUNDS, type AmbienteId } from '../content/ambientes';

/** Caja exterior compartida por las tarjetas de crear sala y las de sala propia (sin borde, flota con sombra). */
export function getSceneCardShellClasses(isDark: boolean): string {
  return `w-full max-w-[320px] sm:w-[210px] sm:max-w-none rounded-[16px] p-2 flex flex-col gap-2 ${
    isDark
      ? 'bg-[#1a2640] shadow-[0_1px_2px_rgba(0,0,0,0.3),0_10px_28px_rgba(2,6,23,0.45)]'
      : 'bg-[#f4f8fb] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.10)]'
  }`;
}

/** Panel interior donde va el paisaje difuminado y el nombre. */
export function getSceneInnerClasses(isDark: boolean): string {
  return `relative isolate rounded-[12px] p-3 flex flex-col items-center gap-1.5 text-center ${
    isDark ? 'bg-[#0f172a]' : 'bg-white'
  }`;
}

function CustomFogBanner({ isDark }: { isDark: boolean }) {
  const uid = useId().replace(/:/g, '');
  const primaryFilterId = `fog-primary-${uid}`;
  const secondaryFilterId = `fog-secondary-${uid}`;

  return (
    <div data-room-banner="custom" className="room-card-banner-mask absolute inset-0 overflow-hidden">
      <div
        className={`absolute inset-0 ${
          isDark ? 'room-card-fog-base-dark' : 'room-card-fog-base-light'
        }`}
      />
      <svg aria-hidden="true" preserveAspectRatio="none" className="absolute -inset-[10%] w-[120%] h-[120%]">
        <defs>
          <filter id={primaryFilterId} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.028" numOctaves="4" seed="7" result="n" />
            <feColorMatrix
              in="n"
              type="matrix"
              values={
                isDark
                  ? '0 0 0 0 0.6  0 0 0 0 0.65  0 0 0 0 0.72  0 0 0 1.2 -0.5'
                  : '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.2 -0.78'
              }
            />
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          <filter id={secondaryFilterId} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.002 0.016" numOctaves="3" seed="23" result="n" />
            <feColorMatrix
              in="n"
              type="matrix"
              values={
                isDark
                  ? '0 0 0 0 0.55  0 0 0 0 0.6  0 0 0 0 0.68  0 0 0 1.1 -0.48'
                  : '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2 -0.72'
              }
            />
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter={`url(#${primaryFilterId})`} />
        <rect width="100%" height="100%" filter={`url(#${secondaryFilterId})`} opacity="0.7" />
      </svg>
      <span
        aria-hidden="true"
        className={`absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 text-2xl font-light ${
          isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
        }`}
      >
        +
      </span>
    </div>
  );
}

/** Franja superior con el paisaje del ambiente (o niebla en Personalizado) que se disuelve detrás del nombre. */
export function SceneBanner({ ambiente, isDark }: { ambiente: AmbienteId; isDark: boolean }) {
  const bgSrc = ROOM_BACKGROUNDS[ambiente];

  return (
    <div
      aria-hidden="true"
      className="room-card-banner relative self-stretch -mx-3 -mt-3 -mb-[30px] pb-[30px] rounded-t-[12px] overflow-hidden z-0 pointer-events-none select-none"
    >
      {bgSrc ? (
        <div className="room-card-banner-mask absolute inset-0">
          <img
            src={bgSrc}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className={`room-card-img w-full h-full object-cover block ${
              ambiente === 'blue' ? 'object-[center_78%]' : 'object-[center_60%]'
            }`}
          />
          {isDark && <div aria-hidden="true" className="room-card-tint absolute inset-0" />}
        </div>
      ) : (
        <CustomFogBanner isDark={isDark} />
      )}
    </div>
  );
}

import { useSyncExternalStore } from 'react';

/**
 * Indica si la consulta de medios se cumple. Sin `matchMedia` (pruebas, SSR) usa `porDefecto`.
 */
export function useMediaQuery(consulta: string, porDefecto = true): boolean {
  const disponible = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  return useSyncExternalStore(
    (avisar) => {
      if (!disponible) return () => {};
      const media = window.matchMedia(consulta);
      media.addEventListener?.('change', avisar);
      return () => media.removeEventListener?.('change', avisar);
    },
    () => (disponible ? window.matchMedia(consulta).matches : porDefecto),
    () => porDefecto
  );
}

/** Computador (≥ 1024 px): la sala muestra el chat al lado y «Salir» dentro de la barra de la sala. */
export const CONSULTA_PANTALLA_GRANDE = '(min-width: 1024px)';

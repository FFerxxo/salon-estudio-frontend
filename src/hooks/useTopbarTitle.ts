import { useSyncExternalStore } from 'react';

/**
 * Título de la barra superior en una sala. El anfitrión ve «Mi salón»;
 * el invitado ve el nombre de la sala (SDECG6-55).
 */
let tituloSala: string | null = null;
const oyentes = new Set<() => void>();

export function setTopbarRoomTitle(titulo: string | null): void {
  if (titulo === tituloSala) return;
  tituloSala = titulo;
  oyentes.forEach((oyente) => oyente());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function useTopbarRoomTitle(): string | null {
  return useSyncExternalStore(suscribir, () => tituloSala, () => null);
}

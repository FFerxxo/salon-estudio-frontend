export const MOCK_DELAY_MS = 800;

let mockDelayOverrideMs: number | null = null;

/** Indica si el modo mock local está habilitado mediante VITE_USE_MOCKS=true. */
export function isMocksEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCKS === 'true';
}

/** Permite ajustar la demora simulada en pruebas automatizadas (null restaura MOCK_DELAY_MS). */
export function setMockDelayForTests(ms: number | null): void {
  mockDelayOverrideMs = ms;
}

/** Espera la demora simulada usando setTimeout para compatibilidad con temporizadores de prueba. */
export function waitMockDelay(): Promise<void> {
  const delay = mockDelayOverrideMs ?? MOCK_DELAY_MS;
  if (delay <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export type GreetingMode = 'initial' | 'returning';

export interface LoginGreeting {
  text: string;
  lang: 'es' | 'en';
  mode: GreetingMode;
}

const RETURNING_USER_KEY = 'salon_returning_user';
const LAST_INITIAL_INDEX_KEY = 'salon_last_greeting_initial';
const LAST_RETURNING_INDEX_KEY = 'salon_last_greeting_returning';

export const INITIAL_GREETINGS_ES: readonly string[] = [
  'Concéntrate, vamos a estudiar',
  'Hoy es un buen día para aprender',
  '¿Listo para enfocarte?',
];

export const RETURNING_GREETINGS_EN: readonly string[] = [
  'Welcome back!',
  'Coming back for more?',
  "Hey, how's it going?",
  'Ready to dive back in?',
  'Good to see you again',
];

const memoryFallback = new Map<string, string>();

function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function') {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Almacenamiento bloqueado o no disponible
  }
  return memoryFallback.get(key) ?? null;
}

function safeSetStorage(key: string, value: string): void {
  memoryFallback.set(key, value);
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Almacenamiento bloqueado o no disponible
  }
}

/** Marca en localStorage que el usuario cerró sesión para mostrar saludos de reingreso al volver a /ingresar. */
export function markReturningUser(): void {
  safeSetStorage(RETURNING_USER_KEY, '1');
}

function pickNonRepeatingIndex(length: number, lastRaw: string | null): number {
  if (length <= 1) return 0;
  const lastIdx = lastRaw !== null ? Number.parseInt(lastRaw, 10) : Number.NaN;
  const candidates: number[] = [];
  for (let i = 0; i < length; i += 1) {
    if (i !== lastIdx) candidates.push(i);
  }
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return chosen ?? 0;
}

/** Selecciona el saludo de /ingresar según si el usuario ya cerró sesión antes, evitando repetir la frase anterior. */
export function selectLoginGreeting(): LoginGreeting {
  const isReturning = safeGetStorage(RETURNING_USER_KEY) === '1';

  if (isReturning) {
    const idx = pickNonRepeatingIndex(
      RETURNING_GREETINGS_EN.length,
      safeGetStorage(LAST_RETURNING_INDEX_KEY)
    );
    safeSetStorage(LAST_RETURNING_INDEX_KEY, String(idx));
    return {
      text: RETURNING_GREETINGS_EN[idx],
      lang: 'en',
      mode: 'returning',
    };
  }

  const idx = pickNonRepeatingIndex(
    INITIAL_GREETINGS_ES.length,
    safeGetStorage(LAST_INITIAL_INDEX_KEY)
  );
  safeSetStorage(LAST_INITIAL_INDEX_KEY, String(idx));
  return {
    text: INITIAL_GREETINGS_ES[idx],
    lang: 'es',
    mode: 'initial',
  };
}

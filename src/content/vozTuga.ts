export type TugaSlotId =
  | 'madrugon'
  | 'manana'
  | 'almuerzo'
  | 'tarde'
  | 'noche'
  | 'trasnocho';

export interface TugaPhraseSegment {
  text: string;
  lang?: 'en';
}

export interface TugaPhrase {
  fullText: string;
  segments: TugaPhraseSegment[];
}

export interface TugaTimeSlot {
  id: TugaSlotId;
  label: string;
  minHour: number;
  maxHour: number;
  phrases: TugaPhrase[];
}

export const TUGA_ENTER_STATUS = 'Shhh… entrando al salón.';

export const TUGA_SLOTS: TugaTimeSlot[] = [
  {
    id: 'madrugon',
    label: 'madrugón',
    minHour: 5,
    maxHour: 8,
    phrases: [
      {
        fullText: '¿Vos madrugando a estudiar? Ni el gallo, parce.',
        segments: [{ text: '¿Vos madrugando a estudiar? Ni el gallo, parce.' }],
      },
      {
        fullText: 'Uy, juicioso desde temprano. ¿O es que no dormiste?',
        segments: [{ text: 'Uy, juicioso desde temprano. ¿O es que no dormiste?' }],
      },
      {
        fullText: 'Tan temprano y ya acá… ¿early bird o desesperado?',
        segments: [
          { text: 'Tan temprano y ya acá… ¿' },
          { text: 'early bird', lang: 'en' },
          { text: ' o desesperado?' },
        ],
      },
    ],
  },
  {
    id: 'manana',
    label: 'mañana',
    minHour: 8,
    maxHour: 12,
    phrases: [
      {
        fullText: 'Buenos días. El tinto ya hizo su parte, ahora te toca a vos.',
        segments: [{ text: 'Buenos días. El tinto ya hizo su parte, ahora te toca a vos.' }],
      },
      {
        fullText: 'Pilas pues: café en mano y a darle.',
        segments: [{ text: 'Pilas pues: café en mano y a darle.' }],
      },
      {
        fullText: 'Arranquemos, que el parcial no se va a presentar solo.',
        segments: [{ text: 'Arranquemos, que el parcial no se va a presentar solo.' }],
      },
    ],
  },
  {
    id: 'almuerzo',
    label: 'almuerzo',
    minHour: 12,
    maxHour: 14,
    phrases: [
      {
        fullText: '¿Estudiando a la hora del almuerzo? Ambicioso… o atrasado.',
        segments: [{ text: '¿Estudiando a la hora del almuerzo? Ambicioso… o atrasado.' }],
      },
      {
        fullText: 'Barriga llena, cerebro contento. O eso dicen.',
        segments: [{ text: 'Barriga llena, cerebro contento. O eso dicen.' }],
      },
      {
        fullText: 'Lunch break is for the weak, ¿cierto?',
        segments: [
          { text: '' },
          { text: 'Lunch break is for the weak', lang: 'en' },
          { text: ', ¿cierto?' },
        ],
      },
    ],
  },
  {
    id: 'tarde',
    label: 'tarde',
    minHour: 14,
    maxHour: 19,
    phrases: [
      {
        fullText: 'La siesta te estaba llamando y elegiste estudiar. Respeto.',
        segments: [{ text: 'La siesta te estaba llamando y elegiste estudiar. Respeto.' }],
      },
      {
        fullText: 'Buenas tardes. El parche puede esperar, el parcial no.',
        segments: [{ text: 'Buenas tardes. El parche puede esperar, el parcial no.' }],
      },
      {
        fullText: '¿Otra vez “mañana empiezo”? Mejor hoy, que ya estás acá.',
        segments: [{ text: '¿Otra vez “mañana empiezo”? Mejor hoy, que ya estás acá.' }],
      },
    ],
  },
  {
    id: 'noche',
    label: 'noche',
    minHour: 19,
    maxHour: 23,
    phrases: [
      {
        fullText: 'Buenas noches. Nada de series hasta terminar, ¿oíste?',
        segments: [{ text: 'Buenas noches. Nada de series hasta terminar, ¿oíste?' }],
      },
      {
        fullText: 'La noche es joven y vos con los apuntes. Bien ahí.',
        segments: [{ text: 'La noche es joven y vos con los apuntes. Bien ahí.' }],
      },
      {
        fullText: 'Last call para estudiar antes de que te gane el sueño.',
        segments: [
          { text: '' },
          { text: 'Last call', lang: 'en' },
          { text: ' para estudiar antes de que te gane el sueño.' },
        ],
      },
    ],
  },
  {
    id: 'trasnocho',
    label: 'trasnocho',
    minHour: 23,
    maxHour: 29,
    phrases: [
      {
        fullText: '¿Trasnochando otra vez? Yo no te juzgo… mucho.',
        segments: [{ text: '¿Trasnochando otra vez? Yo no te juzgo… mucho.' }],
      },
      {
        fullText:
          'A esta hora solo estudian los valientes y los que dejaron todo para el final. ¿Cuál sos vos?',
        segments: [
          {
            text: 'A esta hora solo estudian los valientes y los que dejaron todo para el final. ¿Cuál sos vos?',
          },
        ],
      },
      {
        fullText: 'Mañana vas a parecer zombi, pero bueno, acá estamos.',
        segments: [{ text: 'Mañana vas a parecer zombi, pero bueno, acá estamos.' }],
      },
    ],
  },
];

const plain = (text: string): TugaPhrase => ({ fullText: text, segments: [{ text }] });

/**
 * Frases de Inicio (donde se crean las salas). Pool distinto al de la portada, así
 * nunca se repite la frase que el estudiante acaba de leer al entrar. Cortas, con la
 * misma ironía, y sobre lo que toca hacer ahí: escoger sala y arrancar.
 */
export const TUGA_INICIO_PHRASES: Record<TugaSlotId, TugaPhrase[]> = {
  madrugon: [
    plain('Madrugaste. Que no sea para mirar el techo.'),
    plain('Ya que estás despierto, escogé sala.'),
    plain('El café todavía no hace efecto. La sala espera.'),
  ],
  manana: [
    plain('Escogé sala antes de que se te pase la mañana.'),
    plain('Una sala, un tema. No veinte pestañas.'),
    plain('Mañana productiva o de pestañas abiertas. Vos decidís.'),
  ],
  almuerzo: [
    plain('Estudiar con la barriga llena: deporte extremo.'),
    plain('Escogé rápido, que el sueño de las dos ya viene.'),
    plain('Digestión y estudio. Ambicioso, pero va.'),
  ],
  tarde: [
    plain('La tarde se va volando. Escogé sala ya.'),
    plain('Una sala y el celular lejos. Solo eso.'),
    plain('Menos scroll, más sala.'),
  ],
  noche: [
    plain('Escogé sala antes de que las series te escojan a vos.'),
    plain('Elegí sala y no mirés el reloj.'),
    plain('Con calma, que la noche es larga… y el parcial también.'),
  ],
  trasnocho: [
    plain('A esta hora, mejor una sala tranquila.'),
    plain('Escogé sala y prometé dormir después. Mentira, pero bueno.'),
    plain('El trasnocho pesa menos con buena música. Escogé.'),
  ],
};

export type TugaContext = 'bienvenida' | 'inicio';

interface SeenState {
  seen: string[];
  last?: string;
}

interface CurrentState {
  slot: TugaSlotId;
  text: string;
}

const SEEN_KEY = (context: TugaContext, slot: TugaSlotId) => `uv_tuga_vistas_${context}_${slot}`;
const CURRENT_KEY = (context: TugaContext) => `uv_tuga_actual_${context}`;

function readJson<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage | undefined, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento en entornos restringidos
  }
}

function getStorages(): { local?: Storage; session?: Storage } {
  if (typeof window === 'undefined') return {};
  let local: Storage | undefined;
  let session: Storage | undefined;
  try {
    local = window.localStorage;
  } catch {
    local = undefined;
  }
  try {
    session = window.sessionStorage;
  } catch {
    session = undefined;
  }
  return { local, session };
}

export function getTugaTimeSlot(date: Date = new Date()): TugaTimeSlot {
  const rawHour = date.getHours();
  const normalizedHour = rawHour < 5 ? rawHour + 24 : rawHour;
  return (
    TUGA_SLOTS.find(
      (slot) => normalizedHour >= slot.minHour && normalizedHour < slot.maxHour
    ) ?? TUGA_SLOTS[1]
  );
}

function poolFor(context: TugaContext, slot: TugaTimeSlot): TugaPhrase[] {
  return context === 'inicio' ? TUGA_INICIO_PHRASES[slot.id] : slot.phrases;
}

/**
 * Escoge la frase de Tuga según la hora y el lugar:
 * - Dentro de la misma visita (pestaña) la frase se queda quieta, para no cansar.
 * - Entre visitas no repite ninguna de la franja hasta haberlas mostrado todas,
 *   y al volver a empezar tampoco repite la última.
 * - Portada e Inicio usan pools distintos, así que nunca coinciden.
 */
export function selectTugaPhrase(
  context: TugaContext,
  date: Date = new Date(),
  random: () => number = Math.random
): { slot: TugaTimeSlot; phrase: TugaPhrase } {
  const slot = getTugaTimeSlot(date);
  const pool = poolFor(context, slot);
  const { local, session } = getStorages();

  const current = readJson<Partial<CurrentState>>(session, CURRENT_KEY(context));
  if (current && current.slot === slot.id && typeof current.text === 'string') {
    const kept = pool.find((item) => item.fullText === current.text);
    if (kept) return { slot, phrase: kept };
  }

  // Lo guardado puede venir dañado: solo se confía en listas de textos.
  const stored = readJson<Partial<SeenState>>(local, SEEN_KEY(context, slot.id));
  const storedSeen = stored && Array.isArray(stored.seen) ? stored.seen : [];
  const lastShown = stored && typeof stored.last === 'string' ? stored.last : undefined;
  let seen = storedSeen.filter((text): text is string => typeof text === 'string');
  let candidates = pool.filter((item) => !seen.includes(item.fullText));
  if (candidates.length === 0) {
    seen = [];
    candidates = pool.filter((item) => item.fullText !== lastShown);
    if (candidates.length === 0) candidates = pool;
  }

  const index = Math.min(Math.floor(random() * candidates.length), candidates.length - 1);
  const selected = candidates[index] ?? pool[0];

  writeJson(local, SEEN_KEY(context, slot.id), { seen: [...seen, selected.fullText], last: selected.fullText });
  writeJson(session, CURRENT_KEY(context), { slot: slot.id, text: selected.fullText });

  return { slot, phrase: selected };
}

/** Frase de la portada (`/`). Se mantiene por compatibilidad. */
export function selectTugaGreeting(date: Date = new Date()): { slot: TugaTimeSlot; phrase: TugaPhrase } {
  return selectTugaPhrase('bienvenida', date);
}

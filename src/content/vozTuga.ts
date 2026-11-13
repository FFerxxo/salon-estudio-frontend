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
        fullText: '«¿Vos madrugando a estudiar? Ni el gallo, parce.»',
        segments: [{ text: '«¿Vos madrugando a estudiar? Ni el gallo, parce.»' }],
      },
      {
        fullText: '«Uy, juicioso desde temprano. ¿O es que no dormiste?»',
        segments: [{ text: '«Uy, juicioso desde temprano. ¿O es que no dormiste?»' }],
      },
      {
        fullText: '«Tan temprano y ya acá… ¿early bird o desesperado?»',
        segments: [
          { text: '«Tan temprano y ya acá… ¿' },
          { text: 'early bird', lang: 'en' },
          { text: ' o desesperado?»' },
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
        fullText: '«Buenos días. El tinto ya hizo su parte, ahora te toca a vos.»',
        segments: [{ text: '«Buenos días. El tinto ya hizo su parte, ahora te toca a vos.»' }],
      },
      {
        fullText: '«Pilas pues, que la mañana no se estudia sola.»',
        segments: [{ text: '«Pilas pues, que la mañana no se estudia sola.»' }],
      },
      {
        fullText: '«Arranquemos, que el parcial no se va a presentar solo.»',
        segments: [{ text: '«Arranquemos, que el parcial no se va a presentar solo.»' }],
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
        fullText: '«¿Estudiando a la hora del almuerzo? Ambicioso… o atrasado.»',
        segments: [{ text: '«¿Estudiando a la hora del almuerzo? Ambicioso… o atrasado.»' }],
      },
      {
        fullText: '«Primero el almuercito, ¿no? Bueno, vos sabrás.»',
        segments: [{ text: '«Primero el almuercito, ¿no? Bueno, vos sabrás.»' }],
      },
      {
        fullText: '«Lunch break is for the weak, ¿cierto?»',
        segments: [
          { text: '«' },
          { text: 'Lunch break is for the weak', lang: 'en' },
          { text: ', ¿cierto?»' },
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
        fullText: '«La siesta te estaba llamando y elegiste estudiar. Respeto.»',
        segments: [{ text: '«La siesta te estaba llamando y elegiste estudiar. Respeto.»' }],
      },
      {
        fullText: '«Buenas tardes. Un bloque más y te lo ganaste.»',
        segments: [{ text: '«Buenas tardes. Un bloque más y te lo ganaste.»' }],
      },
      {
        fullText: '«Ya casi es de noche y vos con esa lista de pendientes… dale.»',
        segments: [{ text: '«Ya casi es de noche y vos con esa lista de pendientes… dale.»' }],
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
        fullText: '«Buenas noches. Nada de series hasta terminar, ¿oíste?»',
        segments: [{ text: '«Buenas noches. Nada de series hasta terminar, ¿oíste?»' }],
      },
      {
        fullText: '«La noche es joven y vos con los apuntes. Bien ahí.»',
        segments: [{ text: '«La noche es joven y vos con los apuntes. Bien ahí.»' }],
      },
      {
        fullText: '«Last call para estudiar antes de que te gane el sueño.»',
        segments: [
          { text: '«' },
          { text: 'Last call', lang: 'en' },
          { text: ' para estudiar antes de que te gane el sueño.»' },
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
        fullText: '«¿Trasnochando otra vez? Yo no te juzgo… mucho.»',
        segments: [{ text: '«¿Trasnochando otra vez? Yo no te juzgo… mucho.»' }],
      },
      {
        fullText:
          '«A esta hora solo estudian los valientes y los que dejaron todo para el final. ¿Cuál sos vos?»',
        segments: [
          {
            text: '«A esta hora solo estudian los valientes y los que dejaron todo para el final. ¿Cuál sos vos?»',
          },
        ],
      },
      {
        fullText: '«Mañana vas a parecer zombi, pero bueno, acá estamos.»',
        segments: [{ text: '«Mañana vas a parecer zombi, pero bueno, acá estamos.»' }],
      },
    ],
  },
];

const LAST_PHRASE_STORAGE_KEY = 'uv_tuga_last_phrase';

export function getTugaTimeSlot(date: Date = new Date()): TugaTimeSlot {
  const rawHour = date.getHours();
  const normalizedHour = rawHour < 5 ? rawHour + 24 : rawHour;
  return (
    TUGA_SLOTS.find(
      (slot) => normalizedHour >= slot.minHour && normalizedHour < slot.maxHour
    ) ?? TUGA_SLOTS[1]
  );
}

export function selectTugaGreeting(
  date: Date = new Date(),
  previousPhrase?: string
): { slot: TugaTimeSlot; phrase: TugaPhrase } {
  const slot = getTugaTimeSlot(date);
  let lastSeen = previousPhrase;

  if (!lastSeen && typeof window !== 'undefined') {
    try {
      lastSeen = window.sessionStorage.getItem(LAST_PHRASE_STORAGE_KEY) ?? undefined;
    } catch {
      lastSeen = undefined;
    }
  }

  const candidates = slot.phrases.filter((item) => item.fullText !== lastSeen);
  const pool = candidates.length > 0 ? candidates : slot.phrases;
  const index = Math.floor(Math.random() * pool.length);
  const selected = pool[index] ?? slot.phrases[0];

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(LAST_PHRASE_STORAGE_KEY, selected.fullText);
    } catch {
      // Sin almacenamiento en entornos restringidos
    }
  }

  return { slot, phrase: selected };
}

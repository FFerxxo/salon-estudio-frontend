export type AmbienteId = 'ninguno' | 'blue' | 'green';

export interface AmbienteTrack {
  title: string;
  src: string;
}

export interface AmbienteDefinition {
  id: AmbienteId;
  label: string;
  description: string;
  tracks: AmbienteTrack[];
}

export const AMBIENTES: Record<AmbienteId, AmbienteDefinition> = {
  ninguno: {
    id: 'ninguno',
    label: 'Sin sonido',
    description: 'Estudio en silencio',
    tracks: [],
  },
  blue: {
    id: 'blue',
    label: 'Blue',
    description: 'mar, olas, chill',
    tracks: [
      { title: 'Ocean Waves Chill', src: '/ambientes/blue/01-ocean-waves-chill.mp3' },
      { title: 'Golden Sea', src: '/ambientes/blue/02-golden-sea.mp3' },
      { title: 'Silent Waves', src: '/ambientes/blue/03-silent-waves.mp3' },
      { title: 'Beach', src: '/ambientes/blue/04-beach.mp3' },
    ],
  },
  green: {
    id: 'green',
    label: 'Green',
    description: 'bosque, vals, clásica suave',
    tracks: [
      { title: 'A Playful Adventure', src: '/ambientes/green/01-a-playful-adventure.mp3' },
      {
        title: 'The Floating Garden of Stars',
        src: '/ambientes/green/02-the-floating-garden-of-stars.mp3',
      },
      { title: 'The Wind Awakening', src: '/ambientes/green/03-the-wind-awakening.mp3' },
      {
        title: 'Waltz of the Enchanted Sky',
        src: '/ambientes/green/04-waltz-of-the-enchanted-sky.mp3',
      },
    ],
  },
};

export const AMBIENTE_LIST: AmbienteDefinition[] = [
  AMBIENTES.ninguno,
  AMBIENTES.blue,
  AMBIENTES.green,
];

/** Mezcla una lista de pistas con Fisher-Yates sin mutar el arreglo original. */
export function shuffleTracks(tracks: AmbienteTrack[]): AmbienteTrack[] {
  const copy = [...tracks];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/** Devuelve el nombre visible del ambiente sonoro para chips y etiquetas. */
export function getAmbienteLabel(id?: string): string {
  if (id === 'blue') return AMBIENTES.blue.label;
  if (id === 'green') return AMBIENTES.green.label;
  return AMBIENTES.ninguno.label;
}

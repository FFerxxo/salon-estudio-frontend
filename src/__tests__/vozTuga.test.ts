import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TUGA_INICIO_PHRASES,
  TUGA_SLOTS,
  getTugaTimeSlot,
  selectTugaPhrase,
} from '../content/vozTuga';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

const at = (hour: number) => new Date(2026, 10, 20, hour, 15);
let local: MemoryStorage;
let session: MemoryStorage;
const originalLocal = Object.getOwnPropertyDescriptor(window, 'localStorage');
const originalSession = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

describe('Voz de Tuga: frases sin repetir entre portada e Inicio', () => {
  beforeEach(() => {
    local = new MemoryStorage();
    session = new MemoryStorage();
    Object.defineProperty(window, 'localStorage', { value: local, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: session, configurable: true });
  });

  afterEach(() => {
    if (originalLocal) Object.defineProperty(window, 'localStorage', originalLocal);
    if (originalSession) Object.defineProperty(window, 'sessionStorage', originalSession);
  });

  it('usa franjas por hora local, incluido el trasnocho de madrugada', () => {
    expect(getTugaTimeSlot(at(6)).id).toBe('madrugon');
    expect(getTugaTimeSlot(at(9)).id).toBe('manana');
    expect(getTugaTimeSlot(at(13)).id).toBe('almuerzo');
    expect(getTugaTimeSlot(at(16)).id).toBe('tarde');
    expect(getTugaTimeSlot(at(21)).id).toBe('noche');
    expect(getTugaTimeSlot(at(2)).id).toBe('trasnocho');
  });

  it('nunca comparte frases entre la portada e Inicio en ninguna franja', () => {
    for (const slot of TUGA_SLOTS) {
      const portada = slot.phrases.map((p) => p.fullText);
      const inicio = TUGA_INICIO_PHRASES[slot.id].map((p) => p.fullText);
      expect(inicio.length).toBeGreaterThanOrEqual(3);
      expect(inicio.filter((text) => portada.includes(text))).toEqual([]);
    }
  });

  it('deja quieta la frase dentro de la misma visita para no cansar', () => {
    const first = selectTugaPhrase('inicio', at(16)).phrase.fullText;
    const again = selectTugaPhrase('inicio', at(16)).phrase.fullText;
    expect(again).toBe(first);
  });

  it('entre visitas no repite hasta mostrar todas y luego no repite la última', () => {
    const shown: string[] = [];
    for (let visit = 0; visit < 3; visit += 1) {
      session.clear();
      shown.push(selectTugaPhrase('inicio', at(16)).phrase.fullText);
    }
    expect(new Set(shown).size).toBe(3);

    session.clear();
    const fourth = selectTugaPhrase('inicio', at(16)).phrase.fullText;
    expect(fourth).not.toBe(shown[2]);
  });

  it('cambia de frase si cambia la franja aunque sea la misma visita', () => {
    const tarde = selectTugaPhrase('inicio', at(16)).phrase.fullText;
    const noche = selectTugaPhrase('inicio', at(21)).phrase.fullText;
    expect(TUGA_INICIO_PHRASES.tarde.map((p) => p.fullText)).toContain(tarde);
    expect(TUGA_INICIO_PHRASES.noche.map((p) => p.fullText)).toContain(noche);
  });

  it('respeta los bordes de franja: 4:59 trasnocho, 5:00 madrugón, 22:59 noche, 23:00 y 0:00 trasnocho', () => {
    const atMin = (hour: number, minute: number) => new Date(2026, 10, 20, hour, minute);
    expect(getTugaTimeSlot(atMin(4, 59)).id).toBe('trasnocho');
    expect(getTugaTimeSlot(atMin(5, 0)).id).toBe('madrugon');
    expect(getTugaTimeSlot(atMin(22, 59)).id).toBe('noche');
    expect(getTugaTimeSlot(atMin(23, 0)).id).toBe('trasnocho');
    expect(getTugaTimeSlot(atMin(0, 0)).id).toBe('trasnocho');
  });

  it('no falla si lo guardado está dañado o con otra forma', () => {
    local.setItem('uv_tuga_vistas_inicio_tarde', JSON.stringify({ seen: 'x', last: 5 }));
    session.setItem('uv_tuga_actual_inicio', JSON.stringify({ slot: 'tarde', text: 42 }));
    const { phrase } = selectTugaPhrase('inicio', at(16));
    expect(TUGA_INICIO_PHRASES.tarde.map((p) => p.fullText)).toContain(phrase.fullText);

    local.setItem('uv_tuga_vistas_inicio_tarde', '"x"');
    session.setItem('uv_tuga_actual_inicio', '{roto');
    expect(() => selectTugaPhrase('inicio', at(16))).not.toThrow();
  });

  it('funciona sin almacenamiento disponible', () => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('bloqueado');
      },
      configurable: true,
    });
    const { phrase } = selectTugaPhrase('bienvenida', at(9));
    expect(TUGA_SLOTS[1].phrases.map((p) => p.fullText)).toContain(phrase.fullText);
  });
});

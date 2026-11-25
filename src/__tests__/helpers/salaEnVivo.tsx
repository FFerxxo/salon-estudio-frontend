import { useEffect } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { App } from '../../App';
import type { StudentProfile } from '../../services/authApi';
import type { Mensaje, Participante } from '../../services/realtime';
import { setRealtimeFactoryForTests } from '../../services/realtime';
import { MockRealtimeConnection } from '../../services/realtimeMock';
import type { Room } from '../../services/roomsApi';

export const ana: StudentProfile = {
  uid: 'u-ana',
  nombres: 'Ana',
  apellidos: 'Gómez',
  username: 'ana',
  avatar: '🚀',
  correo: 'ana@correounivalle.edu.co',
  provider: 'password',
  creadoEn: '2026-11-13T15:00:00.000Z',
};

export const salaDeAna: Room = {
  id: 'ABCD1234',
  nombre: 'Cálculo II',
  ambiente: 'ninguno',
  anfitrionUid: 'u-ana',
  creadaEn: '2026-11-20T12:00:00.000Z',
};

export function participante(uid: string, username: string): Participante {
  return { socketId: `sock-${uid}`, uid, username, avatarUrl: null, microfono: false, camara: false };
}

export function mensaje(n: number, extra: Partial<Mensaje> = {}): Mensaje {
  const minuto = String(n % 60).padStart(2, '0');
  const hora = String(10 + Math.floor(n / 60)).padStart(2, '0');
  return {
    id: `m-${String(n).padStart(3, '0')}`,
    salaId: salaDeAna.id,
    autorUid: 'u-luis',
    autorUsername: 'luis',
    texto: `Mensaje ${n}`,
    creadoEn: `2026-11-20T${hora}:${minuto}:00.000Z`,
    ...extra,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** API falsa: GET /api/salas/:id devuelve la sala si existe. */
export function stubApiSalas(salas: Room[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const metodo = init?.method ?? 'GET';
    if (url.endsWith('/api/salas/mias')) {
      return jsonResponse({ salas: salas.filter((s) => s.anfitrionUid === 'u-ana') });
    }
    const match = url.match(/\/api\/salas\/([^/?]+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      const sala = salas.find((s) => s.id === id);
      if (!sala) {
        return jsonResponse(
          { error: 'No encontramos una sala con ese ID. Revisa que esté bien escrito.' },
          404
        );
      }
      if (metodo === 'PATCH') {
        const body = JSON.parse(String(init?.body ?? '{}')) as { nombre?: string };
        return jsonResponse({ ...sala, nombre: body.nombre ?? sala.nombre });
      }
      if (metodo === 'DELETE') {
        return jsonResponse({ mensaje: 'La sala fue eliminada.' });
      }
      return jsonResponse(sala);
    }
    return jsonResponse({ error: 'No encontrada' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function LocationProbe({ onChange }: { onChange: (path: string) => void }) {
  const location = useLocation();
  useEffect(() => {
    onChange(location.pathname);
  }, [location.pathname, onChange]);
  return null;
}

export interface RenderSalaOptions {
  usuario?: StudentProfile;
  anfitrionUid?: string;
  conexion?: MockRealtimeConnection | null;
}

/** Monta la app en una ruta con sesión iniciada y un servidor de tiempo real falso. */
export function renderConTiempoReal(ruta: string, opciones: RenderSalaOptions = {}) {
  const usuario = opciones.usuario ?? ana;
  const conexion =
    opciones.conexion === undefined
      ? new MockRealtimeConnection(
          { uid: usuario.uid, username: usuario.username },
          { anfitrionUid: opciones.anfitrionUid ?? 'u-ana' }
        )
      : opciones.conexion;
  setRealtimeFactoryForTests(conexion ? () => conexion : null);
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();

  let pathname = ruta;
  const rendered = render(
    <MemoryRouter initialEntries={[ruta]}>
      <LocationProbe onChange={(p) => (pathname = p)} />
      <App authOverrides={{ initialStatus: 'authenticated', initialUser: usuario }} />
    </MemoryRouter>
  );
  return { ...rendered, conexion: conexion as MockRealtimeConnection, getPathname: () => pathname };
}

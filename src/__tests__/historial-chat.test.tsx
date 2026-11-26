import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setRealtimeFactoryForTests } from '../services/realtime';
import { MockRealtimeConnection } from '../services/realtimeMock';
import { mensaje, renderConTiempoReal, salaDeAna, stubApiSalas } from './helpers/salaEnVivo';

function conexionCon(cantidad: number) {
  const conexion = new MockRealtimeConnection({ uid: 'u-ana', username: 'ana' });
  conexion.sembrarMensajes(
    'ABCD1234',
    Array.from({ length: cantidad }, (_, i) => mensaje(i + 1))
  );
  return conexion;
}

describe('SDECG6-54 · Historial del chat al entrar o recargar (US-11)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCKS', 'false');
    stubApiSalas([salaDeAna]);
  });

  afterEach(() => {
    setRealtimeFactoryForTests(null);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('en una sala sin mensajes dice «Aún no hay mensajes. Escribe el primero.»', async () => {
    renderConTiempoReal('/salas/ABCD1234');
    expect(await screen.findByText('Aún no hay mensajes. Escribe el primero.')).toBeInTheDocument();
  });

  it('muestra «Cargando mensajes…» mientras llega el historial', async () => {
    const conexion = conexionCon(3);
    let liberar!: () => void;
    const original = conexion.request.bind(conexion);
    vi.spyOn(conexion, 'request').mockImplementation(async (event, data) => {
      if (event === 'chat:historial') {
        await new Promise<void>((resolve) => (liberar = resolve));
      }
      return original(event, data);
    });
    renderConTiempoReal('/salas/ABCD1234', { conexion });

    expect(await screen.findByText('Cargando mensajes…')).toBeInTheDocument();
    await waitFor(() => expect(liberar).toBeTypeOf('function'));
    act(() => liberar());
    expect(await screen.findByText('Mensaje 3')).toBeInTheDocument();
    expect(screen.queryByText('Cargando mensajes…')).not.toBeInTheDocument();
  });

  it('al entrar carga los últimos 30 en orden y «Cargar mensajes anteriores» trae el resto', async () => {
    const user = userEvent.setup();
    const conexion = conexionCon(35);
    renderConTiempoReal('/salas/ABCD1234', { conexion });

    const lista = await screen.findByRole('list', { name: 'Mensajes del chat' });
    await waitFor(() => expect(within(lista).getAllByRole('listitem')).toHaveLength(30));
    const textos = within(lista).getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(textos[0]).toContain('Mensaje 6');
    expect(textos[29]).toContain('Mensaje 35');

    await user.click(screen.getByRole('button', { name: 'Cargar mensajes anteriores' }));

    await waitFor(() => expect(within(lista).getAllByRole('listitem')).toHaveLength(35));
    expect(within(lista).getAllByRole('listitem')[0]).toHaveTextContent('Mensaje 1');
    const pedido = conexion.solicitudes.filter((s) => s.event === 'chat:historial')[1];
    expect(pedido.data).toEqual({ salaId: 'ABCD1234', antesDe: mensaje(6).creadoEn });
    expect(screen.getByText('No hay más mensajes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cargar mensajes anteriores' })).not.toBeInTheDocument();
    expect(screen.getByText('Se cargaron 5 mensajes anteriores')).toBeInTheDocument();
  });

  it('al cargar los anteriores no se pierde la posición de lectura', async () => {
    const user = userEvent.setup();
    const conexion = conexionCon(35);
    renderConTiempoReal('/salas/ABCD1234', { conexion });
    await screen.findByText('Mensaje 35');

    const lista = screen.getByTestId('lista-chat');
    let alto = 3000;
    Object.defineProperty(lista, 'scrollHeight', { get: () => alto, configurable: true });
    lista.scrollTop = 0;

    // Cuando llegan los 5 mensajes anteriores la lista crece 500 px
    const original = conexion.request.bind(conexion);
    vi.spyOn(conexion, 'request').mockImplementation(async (event, data) => {
      const res = await original(event, data);
      if (event === 'chat:historial') alto = 3500;
      return res;
    });

    await user.click(screen.getByRole('button', { name: 'Cargar mensajes anteriores' }));
    await screen.findByText('Mensaje 1');

    expect(lista.scrollTop).toBe(500);
  });

  it('si falla el historial muestra el error y «Reintentar» lo vuelve a pedir', async () => {
    const user = userEvent.setup();
    const conexion = conexionCon(2);
    conexion.responderUnaVez('chat:historial', {
      ok: false,
      codigo: 'ERROR_SERVIDOR',
      error: 'No se pudo completar la acción. Intenta de nuevo.',
    });
    renderConTiempoReal('/salas/ABCD1234', { conexion });

    expect(await screen.findByText('No pudimos cargar los mensajes.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Mensaje 2')).toBeInTheDocument();
  });

  it('al reconectar vuelve a pedir el historial sin duplicar mensajes', async () => {
    const conexion = conexionCon(3);
    renderConTiempoReal('/salas/ABCD1234', { conexion });
    const lista = await screen.findByRole('list', { name: 'Mensajes del chat' });
    await within(lista).findByText('Mensaje 3');

    act(() => conexion.simularCaida());
    act(() => conexion.simularReconexion());

    await waitFor(() => expect(conexion.cuantas('chat:historial')).toBe(2));
    await waitFor(() => expect(within(lista).getAllByRole('listitem')).toHaveLength(3));
  });
});

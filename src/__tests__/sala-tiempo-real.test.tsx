import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setRealtimeFactoryForTests } from '../services/realtime';
import { MockRealtimeConnection } from '../services/realtimeMock';
import { renderConTiempoReal, salaDeAna, stubApiSalas } from './helpers/salaEnVivo';

describe('SDECG6-50 · Sala conectada al servidor de tiempo real', () => {
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

  it('al entrar se une a la sala y pide el historial', async () => {
    const { conexion } = renderConTiempoReal('/salas/ABCD1234');

    expect(await screen.findByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();
    await waitFor(() => expect(conexion.cuantas('chat:historial')).toBe(1));
    expect(conexion.solicitudes[0]).toEqual({ event: 'sala:unirse', data: { salaId: 'ABCD1234' } });
    expect(screen.queryByText('Conectando a la sala…')).not.toBeInTheDocument();
  });

  it('si se cae la conexión avisa «Reconectando…» y al volver entra de nuevo a la sala', async () => {
    const { conexion } = renderConTiempoReal('/salas/ABCD1234');
    await waitFor(() => expect(conexion.cuantas('chat:historial')).toBe(1));

    act(() => conexion.simularCaida());
    expect(await screen.findByText('Se perdió la conexión. Reconectando…')).toBeInTheDocument();

    act(() => conexion.simularReconexion());
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(2));
    await waitFor(() => expect(conexion.cuantas('chat:historial')).toBe(2));
    await waitFor(() =>
      expect(screen.queryByText('Se perdió la conexión. Reconectando…')).not.toBeInTheDocument()
    );
  });

  it('«Salir de la sala» emite sala:salir y vuelve al panel', async () => {
    const user = userEvent.setup();
    const { conexion, getPathname } = renderConTiempoReal('/salas/ABCD1234');
    await waitFor(() => expect(conexion.cuantas('chat:historial')).toBe(1));

    await user.click(screen.getByRole('link', { name: 'Salir de la sala' }));

    await waitFor(() => expect(getPathname()).toBe('/panel'));
    expect(conexion.cuantas('sala:salir')).toBe(1);
    expect(conexion.connected).toBe(false);
  });

  it('con la sesión vencida pide un token nuevo y reintenta una vez', async () => {
    const conexion = new MockRealtimeConnection({ uid: 'u-ana', username: 'ana' });
    conexion.fallarConexion('SESION_INVALIDA');
    renderConTiempoReal('/salas/ABCD1234', { conexion });

    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));
    expect(conexion.pidioTokenNuevo).toBe(true);
  });

  it('si la sesión sigue vencida después de renovar, lleva a Ingresar', async () => {
    const conexion = new MockRealtimeConnection({ uid: 'u-ana', username: 'ana' });
    conexion.fallarConexion('SESION_INVALIDA');
    conexion.fallarConexion('SESION_INVALIDA');
    const { getPathname } = renderConTiempoReal('/salas/ABCD1234', { conexion });

    await waitFor(() => expect(getPathname()).toBe('/ingresar'));
  });

  it('si el servidor rechaza siempre la sesión, la cierra y se queda en Ingresar sin volver a la sala', async () => {
    const conexion = new MockRealtimeConnection({ uid: 'u-ana', username: 'ana' });
    for (let i = 0; i < 20; i += 1) conexion.fallarConexion('SESION_INVALIDA');
    const connect = vi.spyOn(conexion, 'connect');
    const { getPathname } = renderConTiempoReal('/salas/ABCD1234', { conexion });

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(getPathname()).toBe('/ingresar');
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('con el perfil incompleto lleva a elegir nombre de usuario', async () => {
    const conexion = new MockRealtimeConnection({ uid: 'u-ana', username: 'ana' });
    conexion.fallarConexion('PERFIL_INCOMPLETO');
    const { getPathname } = renderConTiempoReal('/salas/ABCD1234', { conexion });

    await waitFor(() => expect(getPathname()).toBe('/registro/google-username'));
  });

  it('con un error del servidor muestra el mensaje y «Reintentar» vuelve a conectar', async () => {
    const user = userEvent.setup();
    const conexion = new MockRealtimeConnection({ uid: 'u-ana', username: 'ana' });
    conexion.fallarConexion('ERROR_SERVIDOR', 'No pudimos conectarte. Intenta de nuevo.');
    renderConTiempoReal('/salas/ABCD1234', { conexion });

    const alerta = await screen.findByText('No pudimos conectarte. Intenta de nuevo.');
    expect(alerta.closest('[role="alert"]')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));
    expect(screen.queryByText('No pudimos conectarte. Intenta de nuevo.')).not.toBeInTheDocument();
  });

  it('sin servidor de tiempo real configurado la sala carga y lo avisa', async () => {
    renderConTiempoReal('/salas/ABCD1234', { conexion: null });

    expect(await screen.findByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();
    expect(await screen.findByText('La sala en vivo no está disponible en este momento.')).toBeInTheDocument();
  });
});

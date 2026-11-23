import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import type { AuthSessionAdapter } from '../context/AuthContext';
import { setRealtimeFactoryForTests } from '../services/realtime';
import { MockRealtimeConnection } from '../services/realtimeMock';
import { normalizarIdSala, validarIdSala } from '../components/JoinRoomForm';
import { ana, renderConTiempoReal, salaDeAna, stubApiSalas } from './helpers/salaEnVivo';

describe('SDECG6-51 · Unirse a una sala con su ID (US-08)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCKS', 'false');
  });

  afterEach(() => {
    setRealtimeFactoryForTests(null);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normaliza y valida el ID', () => {
    expect(normalizarIdSala('  abcd 1234 ')).toBe('ABCD1234');
    expect(validarIdSala('')).toMatch(/Escribe el ID/);
    expect(validarIdSala('ABC-12')).toMatch(/8 letras o números/);
    expect(validarIdSala('ABCD1234')).toBeNull();
  });

  it('con el campo vacío explica cómo corregirlo y no llama a la API', async () => {
    const user = userEvent.setup();
    const fetchMock = stubApiSalas([salaDeAna]);
    renderConTiempoReal('/panel');

    await user.click(await screen.findByRole('button', { name: 'Unirse' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe el ID de la sala para unirte.');
    expect(screen.getByLabelText('¿Tienes un ID? Únete')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/salas/ABCD'))).toBe(false);
  });

  it('con un formato inválido dice cómo debe ser el ID', async () => {
    const user = userEvent.setup();
    stubApiSalas([salaDeAna]);
    renderConTiempoReal('/panel');

    await user.type(await screen.findByLabelText('¿Tienes un ID? Únete'), 'ABC-12');
    await user.click(screen.getByRole('button', { name: 'Unirse' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El ID tiene 8 letras o números');
  });

  it('recorta espacios, pasa a mayúsculas y entra a la sala', async () => {
    const user = userEvent.setup();
    stubApiSalas([salaDeAna]);
    const { getPathname, conexion } = renderConTiempoReal('/panel', { usuario: { ...ana, uid: 'u-luis', username: 'luis' } });

    await user.type(await screen.findByLabelText('¿Tienes un ID? Únete'), '  abcd1234  ');
    await user.click(screen.getByRole('button', { name: 'Unirse' }));

    await waitFor(() => expect(getPathname()).toBe('/salas/ABCD1234'));
    expect(await screen.findByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));
  });

  it('muestra «Entrando…» con el botón desactivado mientras busca la sala', async () => {
    const user = userEvent.setup();
    let liberar!: () => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            liberar = () => resolve(new Response(JSON.stringify(salaDeAna), { status: 200 }));
          })
      )
    );
    renderConTiempoReal('/panel');

    await user.type(await screen.findByLabelText('¿Tienes un ID? Únete'), 'ABCD1234');
    await user.click(screen.getByRole('button', { name: 'Unirse' }));

    const boton = await screen.findByRole('button', { name: 'Entrando…' });
    expect(boton).toBeDisabled();
    liberar();
  });

  it('con un ID que no existe dice que no encontró la sala', async () => {
    const user = userEvent.setup();
    stubApiSalas([salaDeAna]);
    renderConTiempoReal('/panel');

    await user.type(await screen.findByLabelText('¿Tienes un ID? Únete'), 'ZZZZ9999');
    await user.click(screen.getByRole('button', { name: 'Unirse' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No encontramos una sala con ese ID. Revisa que esté bien escrito.'
    );
    expect(screen.getByRole('button', { name: 'Unirse' })).toBeEnabled();
  });

  it('el enlace directo sin sesión lleva a Ingresar y al entrar vuelve a la sala', async () => {
    const user = userEvent.setup();
    stubApiSalas([salaDeAna]);
    const conexion = new MockRealtimeConnection({ uid: 'u-ana', username: 'ana' });
    setRealtimeFactoryForTests(() => conexion);
    const adapter: AuthSessionAdapter = {
      registerWithEmail: vi.fn(),
      loginWithEmail: vi.fn(async () => ({ status: 'authenticated' as const, user: ana })),
      loginWithGoogle: vi.fn(),
      completeGoogleUsername: vi.fn(),
      logout: vi.fn(async () => {}),
    };

    render(
      <MemoryRouter initialEntries={['/salas/ABCD1234']}>
        <App authOverrides={{ initialStatus: 'unauthenticated', adapter }} />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Correo/), 'ana@correounivalle.edu.co');
    await user.type(screen.getByLabelText('Contraseña'), 'Secreta123!');
    await user.click(screen.getByRole('button', { name: 'Ingresar con correo' }));

    expect(await screen.findByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();
  });
});

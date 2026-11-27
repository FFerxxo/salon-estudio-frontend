import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import type { AuthSessionAdapter } from '../context/AuthContext';
import { AuthApiError, requestUsernameLoginToken } from '../services/authApi';
import { clasificarIdentificador } from '../utils/authValidation';
import { ana } from './helpers/salaEnVivo';

function crearAdapter(extra: Partial<AuthSessionAdapter> = {}): AuthSessionAdapter {
  return {
    registerWithEmail: vi.fn(),
    loginWithEmail: vi.fn(async () => ({ status: 'authenticated' as const, user: ana })),
    loginWithUsername: vi.fn(async () => ({ status: 'authenticated' as const, user: ana })),
    loginWithGoogle: vi.fn(),
    completeGoogleUsername: vi.fn(),
    logout: vi.fn(async () => {}),
    ...extra,
  };
}

function renderIngresar(adapter: AuthSessionAdapter) {
  return render(
    <MemoryRouter initialEntries={['/ingresar']}>
      <App authOverrides={{ initialStatus: 'unauthenticated', adapter }} />
    </MemoryRouter>
  );
}

describe('SDECG6-57 · Ingresar con correo o @usuario (issue #9)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('clasifica lo escrito como correo o como usuario', () => {
    expect(clasificarIdentificador('@presentacion_s1')).toEqual({ tipo: 'usuario', valor: 'presentacion_s1' });
    expect(clasificarIdentificador('Ana.Gomez')).toEqual({ tipo: 'usuario', valor: 'ana.gomez' });
    expect(clasificarIdentificador(' ana@correounivalle.edu.co ')).toEqual({
      tipo: 'correo',
      valor: 'ana@correounivalle.edu.co',
    });
    expect(clasificarIdentificador('')).toEqual({ tipo: 'error', mensaje: 'Ingresa tu correo o tu @usuario.' });
    expect(clasificarIdentificador('ana@')).toMatchObject({ tipo: 'error' });
    expect(clasificarIdentificador('@a')).toMatchObject({ tipo: 'error' });
  });

  it('con @usuario entra por la ruta nueva y no muestra «Ingresa un correo válido»', async () => {
    const user = userEvent.setup();
    const adapter = crearAdapter();
    renderIngresar(adapter);

    await user.type(screen.getByLabelText('Correo o @usuario'), '@presentacion_s1');
    await user.type(screen.getByLabelText('Contraseña'), 'Secreta123!');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() =>
      expect(adapter.loginWithUsername).toHaveBeenCalledWith('presentacion_s1', 'Secreta123!')
    );
    expect(adapter.loginWithEmail).not.toHaveBeenCalled();
    expect(screen.queryByText(/Ingresa un correo válido/)).not.toBeInTheDocument();
    expect(await screen.findByText('Puedes elegir entre dos ambientes o crear el tuyo')).toBeInTheDocument();
  });

  it('con correo entra como antes', async () => {
    const user = userEvent.setup();
    const adapter = crearAdapter();
    renderIngresar(adapter);

    await user.type(screen.getByLabelText('Correo o @usuario'), 'ana@correounivalle.edu.co');
    await user.type(screen.getByLabelText('Contraseña'), 'Secreta123!');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() =>
      expect(adapter.loginWithEmail).toHaveBeenCalledWith('ana@correounivalle.edu.co', 'Secreta123!')
    );
    expect(adapter.loginWithUsername).not.toHaveBeenCalled();
  });

  it('con usuario o contraseña incorrectos muestra un solo mensaje claro', async () => {
    const user = userEvent.setup();
    const adapter = crearAdapter({
      loginWithUsername: vi.fn(async () => {
        throw new AuthApiError('Usuario o contraseña incorrectos.', 401, 'INVALID_CREDENTIALS');
      }),
    });
    renderIngresar(adapter);

    await user.type(screen.getByLabelText('Correo o @usuario'), '@no_existe');
    await user.type(screen.getByLabelText('Contraseña'), 'Mala1234!');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.');
  });

  it('el servicio llama a POST /api/auth/ingresar-usuario y devuelve el token', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ token: 'custom-123' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestUsernameLoginToken('ana', 'Secreta123!')).resolves.toBe('custom-123');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/auth\/ingresar-usuario$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ username: 'ana', password: 'Secreta123!' });
  });

  it('el servicio convierte 401 o 404 en el mismo mensaje sin revelar cuál falló', async () => {
    for (const status of [401, 404]) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'x' }), { status })));
      await expect(requestUsernameLoginToken('ana', 'x')).rejects.toMatchObject({
        message: 'Usuario o contraseña incorrectos.',
        status: 401,
      });
    }
  });
});

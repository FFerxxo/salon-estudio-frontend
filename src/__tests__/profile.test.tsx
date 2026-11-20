import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import type { AuthSessionAdapter } from '../context/AuthContext';
import {
  AuthApiError,
  getMyProfile,
  updateMyProfile,
  type StudentProfile,
  type UpdateProfilePayload,
} from '../services/authApi';
import { resetMockState } from '../services/mockApi';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function buildStudentProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    uid: 'u-123',
    nombres: 'Andrés',
    apellidos: 'Barbosa',
    username: 'andres.uv',
    avatar: '🚀',
    correo: 'andres.barbosa@correounivalle.edu.co',
    provider: 'password',
    creadoEn: '2026-11-13T15:00:00.000Z',
    ...overrides,
  };
}

function createMockAdapter(
  overrides: Partial<AuthSessionAdapter> = {},
  initialProfile: StudentProfile = buildStudentProfile()
): AuthSessionAdapter {
  return {
    registerWithEmail: vi.fn(async (input) => ({
      uid: 'u-123',
      nombres: input.nombres,
      apellidos: input.apellidos,
      username: input.username,
      avatar: input.avatar,
      correo: input.correo,
      provider: 'password' as const,
    })),
    loginWithEmail: vi.fn(async () => ({
      status: 'authenticated' as const,
      user: initialProfile,
    })),
    loginWithGoogle: vi.fn(async () => ({
      status: 'authenticated' as const,
      user: initialProfile,
    })),
    completeGoogleUsername: vi.fn(async (input) => ({
      uid: 'g-123',
      nombres: input.nombres,
      apellidos: input.apellidos,
      username: input.username,
      avatar: input.avatar,
      correo: input.correo,
      provider: 'google' as const,
    })),
    logout: vi.fn(async () => {}),
    getMyProfile: vi.fn(async () => initialProfile),
    updateProfile: vi.fn(async (payload: UpdateProfilePayload) => ({
      ...initialProfile,
      ...payload,
    })),
    ...overrides,
  };
}

function installMemoryStorage(): void {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
}

function renderProfile(options: {
  user?: StudentProfile | null;
  adapter?: AuthSessionAdapter;
} = {}) {
  const initialUser = options.user === undefined ? buildStudentProfile() : options.user;
  const adapter =
    options.adapter ?? createMockAdapter({}, initialUser ?? buildStudentProfile());

  const rendered = render(
    <MemoryRouter initialEntries={['/perfil']}>
      <App
        authOverrides={{
          initialStatus: 'authenticated',
          initialUser,
          adapter,
        }}
      />
    </MemoryRouter>
  );

  return { ...rendered, adapter };
}

describe('Perfil de Estudiante: ver y editar', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    window.localStorage?.clear?.();
  });

  it('permite pasar de modo Ver a Editar, enviar solo los campos modificados, mostrar «Guardando…» y confirmar «Cambios guardados»', async () => {
    const user = userEvent.setup();
    const initialUser = buildStudentProfile({ provider: 'password' });
    const deferred = createDeferred<StudentProfile>();
    const updateProfile = vi.fn((_payload: UpdateProfilePayload) => deferred.promise);
    const adapter = createMockAdapter({ updateProfile }, initialUser);

    renderProfile({ user: initialUser, adapter });

    await user.click(await screen.findByRole('button', { name: /Editar perfil/i }));

    const nombresInput = screen.getByLabelText(/^Nombres?$/i);
    const apellidosInput = screen.getByLabelText(/^Apellidos?$/i);

    await user.clear(nombresInput);
    await user.type(nombresInput, 'Andrés Fernando');
    await user.clear(apellidosInput);
    await user.type(apellidosInput, 'Barbosa Salazar');
    expect(screen.getByText('Tu avatar')).toBeInTheDocument();
    expect(screen.queryByText('Avatar en Sala')).not.toBeInTheDocument();
    for (const label of ['Cohete', 'Audífonos', 'Rayo', 'Búho']) {
      expect(screen.getByRole('radio', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
    await user.click(screen.getByRole('radio', { name: /Audífonos/i }));

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    expect(updateProfile).toHaveBeenCalledTimes(1);
    const sentPayload = updateProfile.mock.calls[0]?.[0] as UpdateProfilePayload;
    expect(sentPayload).toEqual({
      nombres: 'Andrés Fernando',
      apellidos: 'Barbosa Salazar',
      avatar: '🎧',
    });
    expect(sentPayload).not.toHaveProperty('username');
    expect(sentPayload).not.toHaveProperty('correo');

    const savingButton = screen.getByRole('button', { name: /Guardando/i });
    expect(savingButton).toBeDisabled();

    deferred.resolve({
      ...initialUser,
      nombres: 'Andrés Fernando',
      apellidos: 'Barbosa Salazar',
      avatar: '🎧',
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Editar perfil/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Andrés Fernando Barbosa Salazar')).toBeInTheDocument();
    const statusBanner = screen
      .getAllByRole('status')
      .find((el) => /Cambios guardados/i.test(el.textContent || ''));
    expect(statusBanner).toBeDefined();
    expect(statusBanner).toHaveTextContent(/Cambios guardados/i);
  });

  it('muestra error inline junto a @username cuando el servidor devuelve 409 y conserva los datos escritos', async () => {
    const user = userEvent.setup();
    const initialUser = buildStudentProfile({ provider: 'password' });
    const updateProfile = vi.fn(async () => {
      throw new AuthApiError(
        'Ese nombre de usuario ya está en uso. Prueba con otro.',
        409,
        'USERNAME_TAKEN',
        'username'
      );
    });
    const adapter = createMockAdapter({ updateProfile }, initialUser);

    renderProfile({ user: initialUser, adapter });

    await user.click(await screen.findByRole('button', { name: /Editar perfil/i }));

    const nombresInput = screen.getByLabelText(/^Nombres?$/i);
    const usernameInput = screen.getByLabelText(/Nombre de usuario/i);

    await user.clear(nombresInput);
    await user.type(nombresInput, 'Andrés Editado');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'ocupado');

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    expect(
      await screen.findByText('Ese nombre de usuario ya está en uso. Prueba con otro.')
    ).toBeInTheDocument();
    expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
    expect(usernameInput).toHaveValue('ocupado');
    expect(nombresInput).toHaveValue('Andrés Editado');
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument();
  });

  it('muestra aviso inline role="status" en UsernameField al escribir mayúsculas o espacios', async () => {
    const user = userEvent.setup();
    const initialUser = buildStudentProfile({ provider: 'password' });
    const adapter = createMockAdapter({}, initialUser);

    renderProfile({ user: initialUser, adapter });

    await user.click(await screen.findByRole('button', { name: /Editar perfil/i }));
    const usernameInput = screen.getByLabelText(/Nombre de usuario/i);
    await user.clear(usernameInput);
    await user.paste('Andres UV');

    expect(usernameInput).toHaveValue('andresuv');
    const statusNotice = screen
      .getAllByRole('status')
      .find((el) => /Se ajustó a minúsculas y sin espacios/i.test(el.textContent || ''));
    expect(statusNotice).toBeDefined();
    expect(statusNotice).toHaveTextContent('Se ajustó a minúsculas y sin espacios: @andresuv');
  });

  it('muestra error inline junto al correo cuando el servidor devuelve 409 en cuenta manual y mantiene modo edición', async () => {
    const user = userEvent.setup();
    const initialUser = buildStudentProfile({ provider: 'password' });
    const updateProfile = vi.fn(async () => {
      throw new AuthApiError(
        'Ese correo ya tiene una cuenta.',
        409,
        'EMAIL_TAKEN',
        'email'
      );
    });
    const adapter = createMockAdapter({ updateProfile }, initialUser);

    renderProfile({ user: initialUser, adapter });

    await user.click(await screen.findByRole('button', { name: /Editar perfil/i }));

    const emailInput = screen.getByLabelText(/^Correo/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'ocupado@example.com');

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    expect(await screen.findByText('Ese correo ya tiene una cuenta.')).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveValue('ocupado@example.com');
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument();
  });

  it('mantiene el correo en solo lectura con aviso en cuentas de Google y no lo incluye al guardar', async () => {
    const user = userEvent.setup();
    const googleUser = buildStudentProfile({
      provider: 'google',
      correo: 'andres.barbosa@correounivalle.edu.co',
    });
    const updateProfile = vi.fn(async (payload: UpdateProfilePayload) => ({
      ...googleUser,
      ...payload,
    }));
    const adapter = createMockAdapter({ updateProfile }, googleUser);

    renderProfile({ user: googleUser, adapter });

    await user.click(await screen.findByRole('button', { name: /Editar perfil/i }));

    const emailInput = screen.getByLabelText(/^Correo/i) as HTMLInputElement;
    expect(emailInput.readOnly || emailInput.getAttribute('aria-readonly') === 'true').toBe(true);
    expect(
      screen.getByText(
        'Tu correo lo administra Google. Para cambiarlo, hazlo en tu cuenta de Google.'
      )
    ).toBeVisible();

    const nombresInput = screen.getByLabelText(/^Nombres?$/i);
    await user.clear(nombresInput);
    await user.type(nombresInput, 'Andrés Google');

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledTimes(1);
    });
    const sentPayload = updateProfile.mock.calls[0]?.[0] as UpdateProfilePayload;
    expect(sentPayload).toEqual({ nombres: 'Andrés Google' });
    expect(sentPayload).not.toHaveProperty('correo');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Editar perfil/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Andrés Google Barbosa')).toBeInTheDocument();
  });

  it('descarta los cambios al presionar «Cancelar» sin llamar a updateProfile y restaura los datos guardados', async () => {
    const user = userEvent.setup();
    const initialUser = buildStudentProfile({ provider: 'password' });
    const adapter = createMockAdapter({}, initialUser);

    renderProfile({ user: initialUser, adapter });

    await user.click(await screen.findByRole('button', { name: /Editar perfil/i }));

    const nombresInput = screen.getByLabelText(/^Nombres?$/i);
    const apellidosInput = screen.getByLabelText(/^Apellidos?$/i);
    await user.clear(nombresInput);
    await user.type(nombresInput, 'Cambio Temporal');
    await user.clear(apellidosInput);
    await user.type(apellidosInput, 'Apellido Temporal');

    await user.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(adapter.updateProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Editar perfil/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mi cuenta' })).toBeInTheDocument();
    expect(screen.getByText('Andrés Barbosa')).toBeInTheDocument();
    expect(screen.queryByText(/Cambio Temporal/i)).not.toBeInTheDocument();
  });

  it('mueve el foco al encabezado «Editar perfil» al abrir y lo devuelve al botón «Editar perfil» al cancelar y al guardar', async () => {
    const user = userEvent.setup();
    const initialUser = buildStudentProfile({ provider: 'password' });
    const adapter = createMockAdapter({}, initialUser);

    renderProfile({ user: initialUser, adapter });

    const editBtn = await screen.findByRole('button', { name: /Editar perfil/i });
    await user.click(editBtn);

    const editHeading = screen.getByRole('heading', { name: 'Editar perfil' });
    expect(editHeading).toHaveAttribute('tabindex', '-1');
    expect(editHeading).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(screen.getByRole('button', { name: /Editar perfil/i })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /Editar perfil/i }));
    expect(screen.getByRole('heading', { name: 'Editar perfil' })).toHaveFocus();

    const nombresInput = screen.getByLabelText(/^Nombres?$/i);
    await user.clear(nombresInput);
    await user.type(nombresInput, 'Andrés Editado');
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Editar perfil/i })).toHaveFocus();
    });
  });

  it('valida datos inválidos en el formulario antes de enviar y no llama a updateProfile', async () => {
    const user = userEvent.setup();
    const initialUser = buildStudentProfile({ provider: 'password' });
    const adapter = createMockAdapter({}, initialUser);

    renderProfile({ user: initialUser, adapter });

    await user.click(await screen.findByRole('button', { name: /Editar perfil/i }));

    const nombresInput = screen.getByLabelText(/^Nombres?$/i);
    const emailInput = screen.getByLabelText(/^Correo/i);

    await user.clear(nombresInput);
    await user.type(nombresInput, 'A');
    await user.clear(emailInput);
    await user.type(emailInput, 'correo-invalido');

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    expect(await screen.findByText(/mínimo 2 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText(/correo válido/i)).toBeInTheDocument();
    expect(adapter.updateProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument();
    expect(nombresInput).toHaveValue('A');
    expect(emailInput).toHaveValue('correo-invalido');
  });

  it('muestra estado de carga, error al fallar la carga inicial y recupera el perfil al pulsar «Reintentar»', async () => {
    const user = userEvent.setup();
    const loadedUser = buildStudentProfile({ provider: 'password' });
    const firstLoad = createDeferred<StudentProfile | null>();
    const getMyProfileMock = vi
      .fn<() => Promise<StudentProfile | null>>()
      .mockImplementationOnce(() => firstLoad.promise)
      .mockResolvedValueOnce(loadedUser);

    const adapter = createMockAdapter({ getMyProfile: getMyProfileMock }, loadedUser);

    renderProfile({ user: null, adapter });

    expect(await screen.findByText('Cargando perfil')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mi cuenta' })).not.toBeInTheDocument();

    firstLoad.reject(new Error('Network error'));

    expect(await screen.findByText('No pudimos cargar tu perfil.')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
    expect(retryBtn).toBeInTheDocument();

    await user.click(retryBtn);

    expect(await screen.findByRole('heading', { name: 'Mi cuenta' })).toBeInTheDocument();
    expect(getMyProfileMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('andres.barbosa@correounivalle.edu.co')).toBeInTheDocument();
  });

  it('mapea id de avatar a emoji en la barra superior y cae a la inicial si recibe un valor inválido como tYk', async () => {
    const { unmount } = renderProfile({
      user: buildStudentProfile({ nombres: 'Camila', avatar: 'audifonos', avatarUrl: null }),
    });

    const chipById = await screen.findByRole('link', { name: /Cuenta de Camila/i });
    expect(chipById).toHaveTextContent('🎧');
    unmount();

    renderProfile({
      user: buildStudentProfile({ nombres: 'Camila', avatar: 'tYk', avatarUrl: null }),
    });

    const chipFallback = await screen.findByRole('link', { name: /Cuenta de Camila/i });
    expect(chipFallback).not.toHaveTextContent('tYk');
    expect(chipFallback).toHaveTextContent('C');
  });

  it(
    'integra el servicio mock con VITE_USE_MOCKS=true: colisiones 409 y persistencia en el estado en memoria',
    async () => {
      vi.stubEnv('VITE_USE_MOCKS', 'true');
      resetMockState();

      await expect(updateMyProfile('mock-token', { username: 'ocupado' })).rejects.toSatisfy(
        (err: unknown) => err instanceof AuthApiError && err.status === 409
      );

      await expect(
        updateMyProfile('mock-token', { correo: 'ocupado@example.com' })
      ).rejects.toSatisfy((err: unknown) => err instanceof AuthApiError && err.status === 409);

      const updated = await updateMyProfile('mock-token', {
        nombres: 'Laura Sofía',
        apellidos: 'Pérez',
        avatar: '🦉',
      });
      expect(updated.nombres).toBe('Laura Sofía');
      expect(updated.apellidos).toBe('Pérez');
      expect(updated.avatar).toBe('🦉');

      const snapshot = await getMyProfile('mock-token');
      expect(snapshot.profileComplete).toBe(true);
      expect(snapshot.user?.nombres).toBe('Laura Sofía');
      expect(snapshot.user?.apellidos).toBe('Pérez');
      expect(snapshot.user?.avatar).toBe('🦉');
    },
    10_000
  );

  describe('Auditoría automática de accesibilidad (vitest-axe)', () => {
    it('no reporta violaciones en modo Ver', async () => {
      const { container } = renderProfile({ user: buildStudentProfile({ provider: 'password' }) });

      expect(await screen.findByRole('heading', { name: 'Mi cuenta' })).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('no reporta violaciones en modo Editar con cuenta manual', async () => {
      const user = userEvent.setup();
      const { container } = renderProfile({ user: buildStudentProfile({ provider: 'password' }) });

      await user.click(await screen.findByRole('button', { name: /Editar perfil/i }));
      expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('no reporta violaciones en modo Editar con cuenta de Google', async () => {
      const user = userEvent.setup();
      const { container } = renderProfile({ user: buildStudentProfile({ provider: 'google' }) });

      await user.click(await screen.findByRole('button', { name: /Editar perfil/i }));
      expect(
        screen.getByText(
          'Tu correo lo administra Google. Para cambiarlo, hazlo en tu cuenta de Google.'
        )
      ).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

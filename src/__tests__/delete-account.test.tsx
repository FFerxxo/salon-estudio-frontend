import { useEffect } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import type { AuthSessionAdapter } from '../context/AuthContext';
import {
  AuthApiError,
  deleteMyAccount,
  getMyProfile,
  type StudentProfile,
  type UpdateProfilePayload,
} from '../services/authApi';
import { resetMockState } from '../services/mockApi';
import { setMockDelayForTests } from '../services/mockConfig';

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
    deleteAccount: vi.fn(async () => {}),
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

function RouterProbe({
  onUpdate,
}: {
  onUpdate: (navigate: NavigateFunction, pathname: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    onUpdate(navigate, location.pathname);
  }, [navigate, location.pathname, onUpdate]);

  return null;
}

function renderProfile(options: {
  user?: StudentProfile | null;
  adapter?: AuthSessionAdapter;
} = {}) {
  const initialUser = options.user === undefined ? buildStudentProfile() : options.user;
  const adapter =
    options.adapter ?? createMockAdapter({}, initialUser ?? buildStudentProfile());

  let currentNavigate: NavigateFunction | null = null;
  let currentPathname = '/perfil';

  const handleUpdate = (nav: NavigateFunction, pathname: string) => {
    currentNavigate = nav;
    currentPathname = pathname;
  };

  const rendered = render(
    <MemoryRouter initialEntries={['/perfil']}>
      <RouterProbe onUpdate={handleUpdate} />
      <App
        authOverrides={{
          initialStatus: 'authenticated',
          initialUser,
          adapter,
        }}
      />
    </MemoryRouter>
  );

  return {
    ...rendered,
    adapter,
    navigateTo: (path: string) => {
      if (!currentNavigate) {
        throw new Error('Router navigate no disponible');
      }
      currentNavigate(path);
    },
    getPathname: () => currentPathname,
  };
}

describe('Eliminar cuenta de Estudiante', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  afterEach(() => {
    setMockDelayForTests(null);
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage?.clear?.();
  });

  it('muestra la Zona de peligro, abre el alertdialog con lista de pérdidas y enfoca inicialmente «Cancelar»', async () => {
    const user = userEvent.setup();
    renderProfile();

    expect(await screen.findByText('Zona de peligro')).toBeInTheDocument();
    const triggerBtn = screen.getByRole('button', { name: /Eliminar cuenta/i });
    expect(triggerBtn).toBeInTheDocument();

    await user.click(triggerBtn);

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-describedby', 'delete-account-desc');
    expect(within(dialog).getByText(/¿Eliminar tu cuenta\?/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Esto no se puede deshacer\./i)).toBeInTheDocument();
    expect(within(dialog).getAllByRole('listitem').length).toBeGreaterThanOrEqual(1);

    const cancelBtn = within(dialog).getByRole('button', { name: /^Cancelar$/i });
    await waitFor(() => {
      expect(cancelBtn).toHaveFocus();
    });
  });

  it('cierra el diálogo con «Cancelar» y con Escape sin eliminar la cuenta y restaura el foco al disparador', async () => {
    const user = userEvent.setup();
    const deleteAccount = vi.fn(async () => {});
    const adapter = createMockAdapter({ deleteAccount });

    renderProfile({ adapter });

    expect(await screen.findByText('Zona de peligro')).toBeInTheDocument();
    const triggerBtn = screen.getByRole('button', { name: /Eliminar cuenta/i });

    await user.click(triggerBtn);
    const dialog = await screen.findByRole('alertdialog');
    const cancelBtn = within(dialog).getByRole('button', { name: /^Cancelar$/i });
    await waitFor(() => {
      expect(cancelBtn).toHaveFocus();
    });

    await user.click(cancelBtn);
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(deleteAccount).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(triggerBtn).toHaveFocus();
    });

    await user.click(triggerBtn);
    const reopenedDialog = await screen.findByRole('alertdialog');
    const reopenedCancelBtn = within(reopenedDialog).getByRole('button', { name: /^Cancelar$/i });
    await waitFor(() => {
      expect(reopenedCancelBtn).toHaveFocus();
    });

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(deleteAccount).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(triggerBtn).toHaveFocus();
    });
  });

  it('muestra «Eliminando…», deshabilita ambos botones, bloquea Escape mientras procesa y muestra error del servidor en role="alert"', async () => {
    const user = userEvent.setup();
    const deferred = createDeferred<void>();
    const deleteAccount = vi.fn(() => deferred.promise);
    const adapter = createMockAdapter({ deleteAccount });

    renderProfile({ adapter });

    const triggerBtn = await screen.findByRole('button', { name: /Eliminar cuenta/i });
    await user.click(triggerBtn);

    const dialog = await screen.findByRole('alertdialog');
    const cancelBtn = within(dialog).getByRole('button', { name: /^Cancelar$/i });
    const confirmBtn = within(dialog).getByRole('button', { name: /Eliminar cuenta/i });

    await user.click(confirmBtn);
    expect(deleteAccount).toHaveBeenCalledTimes(1);

    const deletingBtn = await within(dialog).findByRole('button', { name: /Eliminando…/i });
    expect(deletingBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    deferred.reject(new AuthApiError('No pudimos eliminar tu cuenta. Intenta de nuevo.', 500));

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos eliminar tu cuenta. Intenta de nuevo.');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Zona de peligro')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Bienvenido a Tuga/i })).not.toBeInTheDocument();
    expect(cancelBtn).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: /Eliminar cuenta/i })).toBeEnabled();
  });

  it('al confirmar exitosamente redirige a Ingresar (/ingresar) con «Tu cuenta fue eliminada» en role="status" y limpia la sesión', async () => {
    const user = userEvent.setup();
    const deleteAccount = vi.fn(async () => {});
    const adapter = createMockAdapter({ deleteAccount });

    const { navigateTo, getPathname } = renderProfile({ adapter });

    const triggerBtn = await screen.findByRole('button', { name: /Eliminar cuenta/i });
    await user.click(triggerBtn);

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /Eliminar cuenta/i }));

    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: /^Ingresar$/i })).toBeInTheDocument();
    expect(getPathname()).toBe('/ingresar');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    const deletedNotice = await screen.findByText(/Tu cuenta fue eliminada/i);
    expect(deletedNotice.closest('[role="status"]')).toBeInTheDocument();

    act(() => {
      navigateTo('/perfil');
    });

    expect(await screen.findByRole('heading', { name: /^Ingresar$/i })).toBeInTheDocument();
    expect(getPathname()).toBe('/ingresar');
  });

  it('coloca «Cancelar» antes de «Eliminar cuenta» en el orden del DOM dentro del alertdialog', async () => {
    const user = userEvent.setup();
    renderProfile();

    const triggerBtn = await screen.findByRole('button', { name: /Eliminar cuenta/i });
    await user.click(triggerBtn);

    const dialog = await screen.findByRole('alertdialog');
    const cancelBtn = within(dialog).getByRole('button', { name: /^Cancelar$/i });
    const confirmBtn = within(dialog).getByRole('button', { name: /Eliminar cuenta/i });

    expect(
      cancelBtn.compareDocumentPosition(confirmBtn) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  describe('Integración servicio real y modo mock (deleteMyAccount)', () => {
    it('envía DELETE /api/usuarios/me con Authorization Bearer, maneja 204 sin error JSON y propaga 401/500', async () => {
      vi.stubEnv('VITE_USE_MOCKS', 'false');
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ error: 'Tu sesión expiró. Vuelve a ingresar.' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ error: 'No pudimos eliminar tu cuenta. Intenta de nuevo.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        );
      vi.stubGlobal('fetch', fetchMock);

      await expect(deleteMyAccount('tok')).resolves.toBeUndefined();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/api\/usuarios\/me$/);
      expect(init.method).toBe('DELETE');
      expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok');

      let err401: unknown = null;
      try {
        await deleteMyAccount('tok');
      } catch (err) {
        err401 = err;
      }
      expect(err401).toBeInstanceOf(AuthApiError);
      expect((err401 as AuthApiError).status).toBe(401);
      expect((err401 as AuthApiError).message).toBe('Tu sesión expiró. Vuelve a ingresar.');

      let err500: unknown = null;
      try {
        await deleteMyAccount('tok');
      } catch (err) {
        err500 = err;
      }
      expect(err500).toBeInstanceOf(AuthApiError);
      expect((err500 as AuthApiError).status).toBe(500);
      expect((err500 as AuthApiError).message).toBe(
        'No pudimos eliminar tu cuenta. Intenta de nuevo.'
      );
    });

    it('con VITE_USE_MOCKS=true limpia el perfil en memoria tras deleteMyAccount', async () => {
      vi.stubEnv('VITE_USE_MOCKS', 'true');
      setMockDelayForTests(0);
      resetMockState();

      const beforeDelete = await getMyProfile('mock-token');
      expect(beforeDelete.profileComplete).toBe(true);

      await expect(deleteMyAccount('mock-token')).resolves.toBeUndefined();

      const afterDelete = await getMyProfile('mock-token');
      expect(afterDelete.profileComplete).toBe(false);
    });
  });

  describe('Auditoría automática de accesibilidad (vitest-axe)', () => {
    it('no reporta violaciones en /perfil con la «Zona de peligro»', async () => {
      const { container } = renderProfile();

      expect(await screen.findByText('Zona de peligro')).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('no reporta violaciones con el diálogo «¿Eliminar tu cuenta?» abierto', async () => {
      const user = userEvent.setup();
      const { container } = renderProfile();

      await user.click(await screen.findByRole('button', { name: /Eliminar cuenta/i }));
      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText(/¿Eliminar tu cuenta\?/i)).toBeInTheDocument();

      expect(await axe(container)).toHaveNoViolations();
      if (!container.contains(dialog)) {
        expect(await axe(dialog)).toHaveNoViolations();
      }
    });

    it('no reporta violaciones en Ingresar (/ingresar) mostrando «Tu cuenta fue eliminada»', async () => {
      const user = userEvent.setup();
      const { container } = renderProfile();

      await user.click(await screen.findByRole('button', { name: /Eliminar cuenta/i }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: /Eliminar cuenta/i }));

      expect(await screen.findByRole('heading', { name: /^Ingresar$/i })).toBeInTheDocument();
      expect(await screen.findByText(/Tu cuenta fue eliminada/i)).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

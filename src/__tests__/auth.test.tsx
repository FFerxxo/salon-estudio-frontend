import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { INITIAL_GREETINGS_ES, RETURNING_GREETINGS_EN } from '../content/saludos';
import type { AuthSessionAdapter } from '../context/AuthContext';
import {
  AuthApiError,
  checkUsernameAvailability,
  createStudentProfile,
  getMyProfile,
  type StudentProfile,
} from '../services/authApi';

function createMockAdapter(overrides: Partial<AuthSessionAdapter> = {}): AuthSessionAdapter {
  const defaultProfile: StudentProfile = {
    uid: 'u-123',
    nombres: 'Andrés',
    apellidos: 'Barbosa',
    username: 'andres.uv',
    avatar: '🚀',
    correo: 'andres.barbosa@correounivalle.edu.co',
  };

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
      user: defaultProfile,
    })),
    loginWithGoogle: vi.fn(async () => ({
      status: 'authenticated' as const,
      user: defaultProfile,
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

describe('Sprint 1 Autenticación y Rutas Privadas (US-01, US-02, US-03)', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage?.clear?.();
  });

  describe('US-01 · Registro manual de Estudiante', () => {
    it('valida campos inválidos inline conservando los datos escritos y permite pegar contraseña', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/registro']}>
          <App authOverrides={{ adapter: createMockAdapter() }} />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/^Nombres$/i), 'A');
      await user.type(screen.getByLabelText(/^Apellidos$/i), 'Barbosa');
      await user.type(screen.getByLabelText(/Correo institucional/i), 'correo-invalido');

      const passwordInput = screen.getByLabelText(/^Contraseña$/i);
      await user.click(passwordInput);
      await user.paste('corta');

      expect(passwordInput).toHaveValue('corta');

      await user.click(screen.getByRole('button', { name: /Crear cuenta e ingresar al Panel/i }));

      expect(await screen.findByText(/mínimo 2 caracteres/i)).toBeInTheDocument();
      expect(screen.getByText(/Ingresa un correo válido/i)).toBeInTheDocument();
      expect(screen.getByText(/mínimo 8 caracteres, mayúscula, minúscula y número/i)).toBeInTheDocument();
      // Heurística S1-C02: conserva lo escrito sin limpiar campos
      expect(screen.getByLabelText(/^Apellidos$/i)).toHaveValue('Barbosa');
      expect(screen.getByLabelText(/Correo institucional/i)).toHaveValue('correo-invalido');
    });

    it('muestra error junto al campo @username cuando el servidor devuelve 409 Conflict y conserva los datos', async () => {
      const user = userEvent.setup();
      const adapter = createMockAdapter({
        registerWithEmail: vi.fn(async () => {
          throw new AuthApiError(
            'El nombre de usuario @admin ya está en uso.',
            409,
            'USERNAME_TAKEN',
            'username'
          );
        }),
      });

      render(
        <MemoryRouter initialEntries={['/registro']}>
          <App authOverrides={{ adapter }} />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/^Nombres$/i), 'Andrés');
      await user.type(screen.getByLabelText(/^Apellidos$/i), 'Barbosa');
      await user.type(screen.getByLabelText(/Nombre de usuario único/i), 'admin');
      await user.type(
        screen.getByLabelText(/Correo institucional/i),
        'andres.barbosa@correounivalle.edu.co'
      );
      await user.type(screen.getByLabelText(/^Contraseña$/i), 'Univalle2026!');
      await user.click(screen.getByRole('button', { name: /Crear cuenta e ingresar al Panel/i }));

      expect(await screen.findByText(/El nombre de usuario @admin ya está en uso/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Nombres$/i)).toHaveValue('Andrés');
      expect(screen.getByLabelText(/Correo institucional/i)).toHaveValue(
        'andres.barbosa@correounivalle.edu.co'
      );
    });

    it('ofrece enlace a Ingresar cuando el correo ya está registrado', async () => {
      const user = userEvent.setup();
      const adapter = createMockAdapter({
        registerWithEmail: vi.fn(async () => {
          throw new AuthApiError(
            'Este correo ya tiene una cuenta registrada.',
            409,
            'EMAIL_TAKEN',
            'email'
          );
        }),
      });

      render(
        <MemoryRouter initialEntries={['/registro']}>
          <App authOverrides={{ adapter }} />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/^Nombres$/i), 'Andrés');
      await user.type(screen.getByLabelText(/^Apellidos$/i), 'Barbosa');
      await user.type(screen.getByLabelText(/Nombre de usuario único/i), 'andres.uv');
      await user.type(
        screen.getByLabelText(/Correo institucional/i),
        'andres.barbosa@correounivalle.edu.co'
      );
      await user.type(screen.getByLabelText(/^Contraseña$/i), 'Univalle2026!');
      await user.click(screen.getByRole('button', { name: /Crear cuenta e ingresar al Panel/i }));

      expect(await screen.findByText(/Este correo ya tiene una cuenta registrada/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Ir a Ingresar/i })).toHaveAttribute('href', '/ingresar');
    });

    it('crea la cuenta exitosamente y navega al Panel privado', async () => {
      const user = userEvent.setup();
      const adapter = createMockAdapter();

      render(
        <MemoryRouter initialEntries={['/registro']}>
          <App authOverrides={{ adapter }} />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/^Nombres$/i), 'Andrés');
      await user.type(screen.getByLabelText(/^Apellidos$/i), 'Barbosa');
      await user.type(screen.getByLabelText(/Nombre de usuario único/i), 'andres.uv');
      await user.type(
        screen.getByLabelText(/Correo institucional/i),
        'andres.barbosa@correounivalle.edu.co'
      );
      await user.type(screen.getByLabelText(/^Contraseña$/i), 'Univalle2026!');
      await user.click(screen.getByRole('button', { name: /Crear cuenta e ingresar al Panel/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Panel$/i })).toBeInTheDocument();
      });
    });
  });

  describe('US-02 · Registro con Google y username obligatorio', () => {
    it('impide omitir el username redirigiendo /panel hacia /registro/google-username y permite completarlo con nombre Title Case silencioso', async () => {
      const user = userEvent.setup();
      const adapter = createMockAdapter();

      render(
        <MemoryRouter initialEntries={['/panel']}>
          <App
            authOverrides={{
              initialStatus: 'needs_username',
              initialPendingGoogle: {
                uid: 'g-123',
                nombres: 'ANDRES FERNANDO',
                apellidos: 'BARBOSA SALAZAR',
                correo: 'andres.barbosa@correounivalle.edu.co',
                avatar: 'https://lh3.googleusercontent.com/photo.jpg',
              },
              adapter,
            }}
          />
        </MemoryRouter>
      );

      expect(
        await screen.findByRole('heading', { name: /Elige tu @usuario/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/andres\.barbosa@correounivalle\.edu\.co/i)
      ).toBeInTheDocument();
      expect(screen.queryByLabelText(/Nombres/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Apellidos/i)).not.toBeInTheDocument();

      await user.type(
        screen.getByRole('textbox', { name: /@usuario/i }),
        'andres.google'
      );
      await user.click(screen.getByRole('button', { name: /Entrar al Salón/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Panel$/i })).toBeInTheDocument();
      });

      expect(adapter.completeGoogleUsername).toHaveBeenCalledWith(
        expect.objectContaining({
          nombres: 'Andres Fernando',
          apellidos: 'Barbosa Salazar',
          username: 'andres.google',
          avatar: 'https://lh3.googleusercontent.com/photo.jpg',
        })
      );
    });

    it('permite cambiar de cuenta con «Usar otra cuenta» y regresar a /ingresar', async () => {
      const user = userEvent.setup();
      const adapter = createMockAdapter();

      render(
        <MemoryRouter initialEntries={['/registro/google-username']}>
          <App
            authOverrides={{
              initialStatus: 'needs_username',
              initialPendingGoogle: {
                uid: 'g-123',
                nombres: 'Andrés',
                apellidos: 'Barbosa',
                correo: 'andres.barbosa@correounivalle.edu.co',
                avatar: '🚀',
              },
              adapter,
            }}
          />
        </MemoryRouter>
      );

      expect(
        await screen.findByRole('heading', { name: /Elige tu @usuario/i })
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Usar otra cuenta/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Ingresar$/i })).toBeInTheDocument();
      });
    });

    it('muestra mensaje comprensible si se cancela la ventana de Google', async () => {
      const user = userEvent.setup();
      const adapter = createMockAdapter({
        loginWithGoogle: vi.fn(async () => {
          throw new AuthApiError(
            'Se canceló el acceso con Google. Puedes intentarlo de nuevo.',
            400,
            'GOOGLE_CANCELLED'
          );
        }),
      });

      render(
        <MemoryRouter initialEntries={['/ingresar']}>
          <App authOverrides={{ adapter }} />
        </MemoryRouter>
      );

      await user.click(screen.getByRole('button', { name: /Continuar con Google/i }));
      expect(await screen.findByText(/Se canceló el acceso con Google/i)).toBeInTheDocument();
    });
  });

  describe('US-03 · Ingresar, rutas privadas y cierre de sesión', () => {
    it('valida formato de correo en el campo «Correo» sin aceptar usuario plano', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/ingresar']}>
          <App authOverrides={{ adapter: createMockAdapter() }} />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/^Correo$/i), 'usuario_plano');
      await user.type(screen.getByLabelText(/^Contraseña$/i), 'Clave123!');
      await user.click(screen.getByRole('button', { name: /^Ingresar con correo$/i }));

      expect(await screen.findByText(/Ingresa un correo válido/i)).toBeInTheDocument();
    });

    it('muestra mensaje genérico ante credenciales incorrectas sin revelar qué campo falló', async () => {
      const user = userEvent.setup();
      const adapter = createMockAdapter({
        loginWithEmail: vi.fn(async () => {
          throw new AuthApiError('Correo o contraseña incorrectos.', 401, 'INVALID_CREDENTIALS');
        }),
      });

      render(
        <MemoryRouter initialEntries={['/ingresar']}>
          <App authOverrides={{ adapter }} />
        </MemoryRouter>
      );

      await user.type(
        screen.getByLabelText(/^Correo$/i),
        'andres.barbosa@correounivalle.edu.co'
      );
      await user.type(screen.getByLabelText(/^Contraseña$/i), 'ClaveMala123');
      await user.click(screen.getByRole('button', { name: /^Ingresar con correo$/i }));

      expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument();
      expect(screen.getByLabelText(/^Correo$/i)).toHaveValue(
        'andres.barbosa@correounivalle.edu.co'
      );
    });

    it('redirige /panel sin sesión hacia /ingresar, inicia sesión, regresa a /panel y cierra sesión', async () => {
      const user = userEvent.setup();
      const adapter = createMockAdapter();

      render(
        <MemoryRouter initialEntries={['/panel']}>
          <App authOverrides={{ adapter }} />
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { name: /^Ingresar$/i })).toBeInTheDocument();

      await user.type(
        screen.getByLabelText(/^Correo$/i),
        'andres.barbosa@correounivalle.edu.co'
      );
      await user.type(screen.getByLabelText(/^Contraseña$/i), 'Univalle2026!');
      await user.click(screen.getByRole('button', { name: /^Ingresar con correo$/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Panel$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Salir de la sesión/i }));

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Vamos a estudiar/i })).toBeInTheDocument();
      });

      expect(window.localStorage.getItem('salon_returning_user')).toBe('1');
    });

    it('muestra saludo inicial en español sin repetir en visitas limpias y cambia a saludos en inglés con lang="en" tras cerrar sesión', () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/ingresar']}>
          <App authOverrides={{ adapter: createMockAdapter() }} />
        </MemoryRouter>
      );

      const firstInitialText = screen.getByText((content) =>
        INITIAL_GREETINGS_ES.includes(content)
      ).textContent;
      expect(
        screen.getByText((content) => INITIAL_GREETINGS_ES.includes(content))
      ).not.toHaveAttribute('lang', 'en');
      unmount();

      const secondMount = render(
        <MemoryRouter initialEntries={['/ingresar']}>
          <App authOverrides={{ adapter: createMockAdapter() }} />
        </MemoryRouter>
      );
      const secondInitialText = screen.getByText((content) =>
        INITIAL_GREETINGS_ES.includes(content)
      ).textContent;
      expect(secondInitialText).not.toBe(firstInitialText);
      secondMount.unmount();

      window.localStorage.setItem('salon_returning_user', '1');
      const thirdMount = render(
        <MemoryRouter initialEntries={['/ingresar']}>
          <App authOverrides={{ adapter: createMockAdapter() }} />
        </MemoryRouter>
      );
      const firstReturningEl = screen.getByText((content) =>
        RETURNING_GREETINGS_EN.includes(content)
      );
      const firstReturningText = firstReturningEl.textContent;
      expect(firstReturningEl).toHaveAttribute('lang', 'en');
      thirdMount.unmount();

      render(
        <MemoryRouter initialEntries={['/ingresar']}>
          <App authOverrides={{ adapter: createMockAdapter() }} />
        </MemoryRouter>
      );
      const secondReturningEl = screen.getByText((content) =>
        RETURNING_GREETINGS_EN.includes(content)
      );
      expect(secondReturningEl).toHaveAttribute('lang', 'en');
      expect(secondReturningEl.textContent).not.toBe(firstReturningText);
    });
  });

  describe('Contrato backend PR #5 · authApi y errores 400 por campo', () => {
    it('consulta GET /api/usuarios/disponible?username= mapeando { disponible } y errores 400', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ disponible: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              disponible: false,
              error: 'Usa entre 3 y 20 letras, números o guion bajo (_), sin espacios.',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      vi.stubGlobal('fetch', fetchMock);

      const okRes = await checkUsernameAvailability('  @Andres_UV ');
      expect(okRes).toEqual({ available: true });
      expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/usuarios\/disponible\?username=%40andres_uv$|\/api\/usuarios\/disponible\?username=/);

      try {
        await checkUsernameAvailability('ab');
        expect.fail('Debía lanzar AuthApiError en 400');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthApiError);
        const apiErr = err as AuthApiError;
        expect(apiErr.status).toBe(400);
        expect(apiErr.field).toBe('username');
        expect(apiErr.message).toMatch(/entre 3 y 20 letras/i);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('envía POST /api/usuarios sin correo ni provider, mapea avatar→avatarUrl null/https y adapta 201 + ambos 409', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              uid: 'u-1',
              nombres: 'Andrés',
              apellidos: 'Barbosa',
              username: 'andres_uv',
              email: 'andres@correounivalle.edu.co',
              avatarUrl: 'https://example.com/foto.png',
              proveedor: 'google',
              creadoEn: '2026-11-13T12:00:00.000Z',
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: 'Ese nombre de usuario ya está en uso. Prueba con otro.',
              errores: { username: 'Ese nombre de usuario ya está en uso. Prueba con otro.' },
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          )
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: 'Tu cuenta ya tiene un perfil creado.' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      vi.stubGlobal('fetch', fetchMock);

      try {
        const created = await createStudentProfile('tok-123', {
          nombres: 'Andrés',
          apellidos: 'Barbosa',
          username: 'andres_uv',
          avatar: '🚀',
          correo: 'andres@correounivalle.edu.co',
          provider: 'password',
        });

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toMatch(/\/api\/usuarios$/);
        expect(init.method).toBe('POST');
        expect(init.headers).toMatchObject({ Authorization: 'Bearer tok-123' });
        const sentBody = JSON.parse(String(init.body));
        expect(sentBody).toEqual({
          nombres: 'Andrés',
          apellidos: 'Barbosa',
          username: 'andres_uv',
          avatarUrl: null,
        });
        expect(sentBody).not.toHaveProperty('correo');
        expect(sentBody).not.toHaveProperty('provider');

        expect(created).toMatchObject({
          uid: 'u-1',
          username: 'andres_uv',
          correo: 'andres@correounivalle.edu.co',
          avatarUrl: 'https://example.com/foto.png',
          avatar: 'https://example.com/foto.png',
          provider: 'google',
        });

        await expect(
          createStudentProfile('tok-123', {
            nombres: 'Andrés',
            apellidos: 'Barbosa',
            username: 'admin_uv',
            avatarUrl: 'https://example.com/avatar.png',
          })
        ).rejects.toMatchObject({
          status: 409,
          code: 'USERNAME_TAKEN',
          field: 'username',
        });

        await expect(
          createStudentProfile('tok-123', {
            nombres: 'Andrés',
            apellidos: 'Barbosa',
            username: 'andres_uv',
            avatar: '🚀',
          })
        ).rejects.toMatchObject({
          status: 409,
          code: 'PROFILE_ALREADY_EXISTS',
          field: 'general',
        });
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('consulta GET /api/usuarios/me manejando 200 y 404 PERFIL_INCOMPLETO', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              uid: 'u-2',
              nombres: 'Esteban',
              apellidos: 'Salazar',
              username: 'esteban_uv',
              email: 'esteban@correounivalle.edu.co',
              avatarUrl: null,
              proveedor: 'password',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: 'Aún no has elegido tu nombre de usuario.',
              codigo: 'PERFIL_INCOMPLETO',
            }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        );
      vi.stubGlobal('fetch', fetchMock);

      try {
        const resOk = await getMyProfile('tok-me');
        expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/usuarios\/me$/);
        expect(resOk.profileComplete).toBe(true);
        expect(resOk.user).toMatchObject({
          username: 'esteban_uv',
          correo: 'esteban@correounivalle.edu.co',
          avatarUrl: null,
          avatar: '🚀',
          provider: 'password',
        });

        const resIncomplete = await getMyProfile('tok-me');
        expect(resIncomplete).toEqual({ profileComplete: false });
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('muestra cada mensaje de errores de un 400 junto a su campo en RegisterPage', async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: 'Revisa los campos marcados.',
            errores: {
              nombres: 'Tus nombres pueden tener máximo 50 caracteres.',
              username: 'Usa entre 3 y 20 letras, números o guion bajo (_), sin espacios.',
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      );
      vi.stubGlobal('fetch', fetchMock);

      let parsedErr: AuthApiError | null = null;
      try {
        await createStudentProfile('tok-400', {
          nombres: 'Andrés',
          apellidos: 'Barbosa',
          username: 'andres.uv',
        });
      } catch (err) {
        parsedErr = err as AuthApiError;
      } finally {
        vi.unstubAllGlobals();
      }

      expect(parsedErr).toBeInstanceOf(AuthApiError);
      expect(parsedErr?.fieldErrors).toEqual({
        nombres: 'Tus nombres pueden tener máximo 50 caracteres.',
        username: 'Usa entre 3 y 20 letras, números o guion bajo (_), sin espacios.',
      });

      const adapter = createMockAdapter({
        registerWithEmail: vi.fn(async () => {
          throw parsedErr!;
        }),
      });

      render(
        <MemoryRouter initialEntries={['/registro']}>
          <App authOverrides={{ adapter }} />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/^Nombres$/i), 'Andrés');
      await user.type(screen.getByLabelText(/^Apellidos$/i), 'Barbosa');
      await user.type(screen.getByLabelText(/Nombre de usuario único/i), 'andres_uv');
      await user.type(
        screen.getByLabelText(/Correo institucional/i),
        'andres.barbosa@correounivalle.edu.co'
      );
      await user.type(screen.getByLabelText(/^Contraseña$/i), 'Univalle2026!');
      await user.click(screen.getByRole('button', { name: /Crear cuenta e ingresar al Panel/i }));

      expect(
        await screen.findByText(/Tus nombres pueden tener máximo 50 caracteres/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Usa entre 3 y 20 letras, números o guion bajo/i)
      ).toBeInTheDocument();
    });
  });
});

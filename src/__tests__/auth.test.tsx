import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import type { AuthSessionAdapter } from '../context/AuthContext';
import { AuthApiError, type StudentProfile } from '../services/authApi';

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

describe('Sprint 1 Autenticación y Rutas Privadas (US-01, US-02, US-03)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    it('impide omitir el username redirigiendo /panel hacia /registro/google-username y permite completarlo', async () => {
      const user = userEvent.setup();
      const adapter = createMockAdapter();

      render(
        <MemoryRouter initialEntries={['/panel']}>
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
        await screen.findByRole('heading', { name: /Elige tu nombre de usuario único/i })
      ).toBeInTheDocument();

      await user.type(
        screen.getByRole('textbox', { name: /Nombre de usuario único/i }),
        'andres.google'
      );
      await user.click(screen.getByRole('button', { name: /Confirmar usuario y entrar al Panel/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Panel$/i })).toBeInTheDocument();
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
        screen.getByLabelText(/Correo o usuario/i),
        'andres.barbosa@correounivalle.edu.co'
      );
      await user.type(screen.getByLabelText(/^Contraseña$/i), 'ClaveMala123');
      await user.click(screen.getByRole('button', { name: /^Ingresar con correo$/i }));

      expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument();
      expect(screen.getByLabelText(/Correo o usuario/i)).toHaveValue(
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
        screen.getByLabelText(/Correo o usuario/i),
        'andres.barbosa@correounivalle.edu.co'
      );
      await user.type(screen.getByLabelText(/^Contraseña$/i), 'Univalle2026!');
      await user.click(screen.getByRole('button', { name: /^Ingresar con correo$/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Panel$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^Cerrar sesión$/i }));

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /Salón de Estudio Colaborativo en Tiempo Real/i })
        ).toBeInTheDocument();
      });
    });
  });
});

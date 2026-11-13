import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { Layout } from '../components/Layout';
import { BaseTecnicaPage } from '../pages/BaseTecnicaPage';

const mockStudent = {
  uid: 'uid-est-1',
  nombres: 'Andrés',
  apellidos: 'Barbosa',
  username: 'andres.uv',
  avatar: '🚀',
  correo: 'andres.barbosa@correounivalle.edu.co',
};

describe('Accesibilidad Base TS-04 y Formularios Sprint 1 (Tema Marea v3)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Auditoría automática con vitest-axe (0 violaciones por página)', () => {
    it('el Layout principal y Home muestran tarjeta vertical con Tuga, cabecera/pie mínimos TS-04 y botones flotantes sin violaciones axe', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByRole('link', { name: /Vamos a estudiar/i })).toHaveAttribute(
        'href',
        '/ingresar'
      );
      expect(screen.queryByRole('link', { name: /^Crear cuenta$/i })).not.toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /Enlaces secundarios/i })).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.queryByText(/Estudia en grupo, en tiempo real/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Un espacio donde estudiar te sumerge en un mundo de ideas/i)).toBeInTheDocument();
      expect(screen.queryByText(/Vista previa/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/5 \/ 7 días/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^En vivo$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/en línea/i)).not.toBeInTheDocument();
      const pauseBtn = screen.getByRole('button', { name: /^Pausar fondo$/i });
      expect(pauseBtn).toHaveAttribute('aria-pressed', 'false');
      await userEvent.click(pauseBtn);
      expect(screen.getByRole('button', { name: /^Reanudar fondo$/i })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(screen.getByRole('button', { name: /Cambiar a modo claro/i })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('la página de Registro (/registro) con barra role="progressbar" (Paso 1 de 2) no tiene violaciones axe', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/registro']}>
          <App />
        </MemoryRouter>
      );

      const progressbar = screen.getByRole('progressbar', { name: /Progreso del registro/i });
      expect(progressbar).toHaveAttribute('aria-valuenow', '1');
      expect(progressbar).toHaveAttribute('aria-valuemax', '2');
      expect(screen.getByText(/Paso 1 de 2/i)).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('la página de Google + username (/registro/google-username) con role="progressbar" (Paso 2 de 2) no tiene violaciones axe', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/registro/google-username']}>
          <App
            authOverrides={{
              initialStatus: 'needs_username',
              initialPendingGoogle: {
                uid: 'g-1',
                nombres: 'Andrés',
                apellidos: 'Barbosa',
                correo: 'andres.barbosa@correounivalle.edu.co',
                avatar: '🚀',
              },
            }}
          />
        </MemoryRouter>
      );

      const progressbar = screen.getByRole('progressbar', {
        name: /Progreso del registro con Google/i,
      });
      expect(progressbar).toHaveAttribute('aria-valuenow', '2');
      expect(screen.getByText(/Paso 2 de 2/i)).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('la página de Ingresar (/ingresar) no tiene violaciones axe', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/ingresar']}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /^Ingresar$/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Volver al inicio/i })).not.toBeInTheDocument();
      const greetingEl = container.querySelector('section p.text-center');
      expect(greetingEl).toBeInTheDocument();
      expect(screen.getByLabelText(/^Correo$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Contraseña$/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /¿Olvidaste tu contraseña\?/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continuar con Google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Ingresar con correo$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^Crear cuenta$/i })).toBeInTheDocument();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('la página de Base técnica en estado de carga no tiene violaciones', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));

      const { container } = render(
        <MemoryRouter initialEntries={['/base-tecnica']}>
          <BaseTecnicaPage />
        </MemoryRouter>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('la página de Base técnica en estado de éxito no tiene violaciones', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          nombre: 'Salón de Estudio',
          mensaje: 'Bienvenido',
        }),
      } as Response);

      const { container } = render(
        <MemoryRouter initialEntries={['/base-tecnica']}>
          <BaseTecnicaPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Bienvenido')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('la página de Base técnica en estado de error no tiene violaciones', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: 'No se pudo leer la base de datos.',
        }),
      } as Response);

      const { container } = render(
        <MemoryRouter initialEntries={['/base-tecnica']}>
          <BaseTecnicaPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No se pudo leer la base de datos/i)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('oculta el botón de pausar fondo cuando prefers-reduced-motion está activo', () => {
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      try {
        render(
          <MemoryRouter initialEntries={['/']}>
            <App />
          </MemoryRouter>
        );

        expect(
          screen.queryByRole('button', { name: /(Pausar|Reanudar) fondo/i })
        ).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cambiar a modo claro/i })).toBeInTheDocument();
      } finally {
        window.matchMedia = originalMatchMedia;
      }
    });
  });

  describe('Enlace de salto y regiones semánticas', () => {
    it('el enlace «Saltar al contenido» es el primer elemento de foco y apunta a #contenido', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Layout />
        </MemoryRouter>
      );

      const skipLink = screen.getByRole('link', { name: /Saltar al contenido/i });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#contenido');

      const main = document.getElementById('contenido');
      expect(main).toBeInTheDocument();
      expect(main?.tagName.toLowerCase()).toBe('main');
    });

    it('permite navegar con Tab hasta el botón de enviar en /ingresar y disparar la validación por teclado', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/ingresar']}>
          <App />
        </MemoryRouter>
      );

      const submitBtn = screen.getByRole('button', { name: /^Ingresar con correo$/i });
      let safety = 0;
      while (document.activeElement !== submitBtn && safety < 25) {
        await user.tab();
        safety += 1;
      }

      expect(submitBtn).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(
        await screen.findByText(/Ingresa tu correo institucional\./i)
      ).toBeInTheDocument();
    });

    it('muestra cabecera/pie mínimos en pantallas de acceso (/registro) y la barra completa dentro de la app (/panel)', async () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/registro']}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /Enlaces secundarios/i })).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.queryByText(/Estudia en grupo, en tiempo real/i)).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^Ayuda$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^Base técnica$/i })).toBeInTheDocument();
      expect(screen.queryByText(/Vista previa/i)).not.toBeInTheDocument();
      unmount();

      const { container: panelContainer, unmount: unmountPanel } = render(
        <MemoryRouter initialEntries={['/panel']}>
          <App
            authOverrides={{
              initialStatus: 'authenticated',
              initialUser: mockStudent,
            }}
          />
        </MemoryRouter>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /Navegación principal/i })).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      const menu = screen.getByRole('navigation', { name: /Navegación principal/i });
      expect(within(menu).getByRole('link', { name: /^Panel$/i })).toBeInTheDocument();
      expect(within(menu).getByRole('link', { name: /^Perfil$/i })).toBeInTheDocument();
      expect(within(menu).getByRole('link', { name: /^Base técnica$/i })).toBeInTheDocument();
      expect(within(menu).queryByRole('link', { name: /^(Mis salas|Ayuda)$/i })).not.toBeInTheDocument();
      const collapseBtn = screen.getByRole('button', { name: /Contraer menú/i });
      expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
      await userEvent.click(collapseBtn);
      expect(screen.getByRole('button', { name: /Expandir menú/i })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      expect(screen.getByRole('heading', { name: 'Studio Ghibli' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Ruido azul' })).toBeInTheDocument();
      expect(screen.getAllByText(/0 en línea/)).toHaveLength(2);
      expect(screen.getAllByRole('link', { name: /^Entrar a / })).toHaveLength(2);
      // «0 en línea» es un dato verdadero hoy (nadie conectado aún): decisión de Andres 13/11.

      const panelResults = await axe(panelContainer);
      expect(panelResults).toHaveNoViolations();
      unmountPanel();

      render(
        <MemoryRouter initialEntries={['/ayuda']}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByRole('link', { name: /^Base técnica$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^Ingresar$/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Panel$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Perfil$/i })).not.toBeInTheDocument();
    });

    it('los estados de Base técnica se anuncian con aria-live="polite"', () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));

      const { container } = render(
        <MemoryRouter initialEntries={['/base-tecnica']}>
          <BaseTecnicaPage />
        </MemoryRouter>
      );

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });
  });

  describe('Título único por ruta y guardia de rutas privadas', () => {
    const publicRoutes = [
      { path: '/', expectedTitle: 'Inicio · Tuga - Salón de Estudio' },
      { path: '/ingresar', expectedTitle: 'Ingresar · Tuga - Salón de Estudio' },
      { path: '/registro', expectedTitle: 'Registro · Tuga - Salón de Estudio' },
      { path: '/ayuda', expectedTitle: 'Ayuda · Tuga - Salón de Estudio' },
      { path: '/base-tecnica', expectedTitle: 'Base técnica · Tuga - Salón de Estudio' },
      {
        path: '/ruta-desconocida-404',
        expectedTitle: '404 · Página no encontrada · Tuga - Salón de Estudio',
      },
    ];

    publicRoutes.forEach(({ path, expectedTitle }) => {
      it(`establece el título "${expectedTitle}" en ruta pública ${path}`, async () => {
        render(
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(document.title).toBe(expectedTitle);
        });
      });
    });

    const privateRoutes = [
      { path: '/panel', expectedTitle: 'Panel · Tuga - Salón de Estudio' },
      { path: '/perfil', expectedTitle: 'Perfil · Tuga - Salón de Estudio' },
      { path: '/salas/demo-1', expectedTitle: 'Sala demo-1 · Tuga - Salón de Estudio' },
    ];

    privateRoutes.forEach(({ path, expectedTitle }) => {
      it(`redirige ruta privada ${path} a Ingresar cuando no hay sesión`, async () => {
        render(
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(document.title).toBe('Ingresar · Tuga - Salón de Estudio');
        });
      });

      it(`establece "${expectedTitle}" en ruta privada ${path} cuando el Estudiante está autenticado`, async () => {
        render(
          <MemoryRouter initialEntries={[path]}>
            <App
              authOverrides={{
                initialStatus: 'authenticated',
                initialUser: mockStudent,
              }}
            />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(document.title).toBe(expectedTitle);
        });
      });
    });
  });
});

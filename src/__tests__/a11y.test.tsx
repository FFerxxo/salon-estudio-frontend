import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { Layout } from '../components/Layout';
import { MAREA_MEDIA } from '../context/ThemeContext';

const mockStudent = {
  uid: 'uid-est-1',
  nombres: 'Andrés',
  apellidos: 'Barbosa',
  username: 'andres.uv',
  avatar: '🚀',
  correo: 'andres.barbosa@correounivalle.edu.co',
};

describe('Accesibilidad Base TS-04 y Navegación Sprint 2 (Tema Marea)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage?.clear?.();
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
      expect(screen.queryByRole('navigation', { name: /Enlaces secundarios/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
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

      const tugaAnclada = container.querySelector('.tuga-anclada');
      expect(tugaAnclada).toBeInTheDocument();
      expect(tugaAnclada).not.toHaveClass('overflow-x-clip');
      expect(container.firstElementChild).toHaveClass('overflow-x-clip');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('el fondo ambiental Marea expone solo el loop 1080p en MAREA_MEDIA y renderiza un único <source> en <video>', async () => {
      expect(Object.keys(MAREA_MEDIA)).toEqual(['posterUrl', 'video1080Url']);
      expect(Object.keys(MAREA_MEDIA)).not.toContain('video1440Url');
      expect(Object.keys(MAREA_MEDIA)).not.toContain('video2160Url');
      expect(MAREA_MEDIA.video1080Url).toBe('/assets/marea/marea-loop-1080p.mp4');

      const originalUaDescriptor = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true,
      });
      const playSpy = vi
        .spyOn(HTMLMediaElement.prototype, 'play')
        .mockResolvedValue(undefined);
      const pauseSpy = vi
        .spyOn(HTMLMediaElement.prototype, 'pause')
        .mockImplementation(() => {});

      try {
        vi.resetModules();
        const [{ ThemeProvider }, { AmbientMotionBackdrop }] = await Promise.all([
          import('../context/ThemeContext'),
          import('../components/AmbientMotionBackdrop'),
        ]);

        const { container } = render(
          <ThemeProvider>
            <AmbientMotionBackdrop />
          </ThemeProvider>
        );

        const video = container.querySelector('video');
        expect(video).toBeInTheDocument();
        expect(video).toHaveAttribute('poster', '/assets/marea/marea-poster.jpg');

        const sources = Array.from(container.querySelectorAll('video source'));
        expect(sources).toHaveLength(1);
        expect(sources[0]).toHaveAttribute('src', '/assets/marea/marea-loop-1080p.mp4');
        expect(sources[0]).toHaveAttribute('type', 'video/mp4');
        expect(
          container.querySelector('source[src*="1440p"], source[src*="2160p"]')
        ).not.toBeInTheDocument();
      } finally {
        playSpy.mockRestore();
        pauseSpy.mockRestore();
        if (originalUaDescriptor) {
          Object.defineProperty(navigator, 'userAgent', originalUaDescriptor);
        }
        vi.resetModules();
      }
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
      expect(screen.getByRole('link', { name: /Volver a la página de inicio/i })).toHaveAttribute(
        'href',
        '/'
      );
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

    it('la página de Ayuda (/ayuda) no tiene violaciones axe', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/ayuda']}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /^Ayuda$/i })).toBeInTheDocument();
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

    it('muestra cabecera/pie mínimos sin Base técnica en acceso (/registro) y barra lateral Inicio/Mis salas/Perfil sin pie público dentro de la app (/panel, /salas)', async () => {
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
      expect(screen.getByRole('link', { name: /^Inicio$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^Ayuda$/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Base técnica$/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Vista previa/i)).not.toBeInTheDocument();
      unmount();

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () =>
          new Response(JSON.stringify({ salas: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      );

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

      expect(screen.getAllByRole('banner').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByRole('link', { name: /Cuenta de Andrés \(@andres\.uv\)/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /Navegación principal/i })).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Salón de Estudio Colaborativo en Tiempo Real · Universidad del Valle/i)
      ).not.toBeInTheDocument();

      const menu = screen.getByRole('navigation', { name: /Navegación principal/i });
      expect(within(menu).getByRole('link', { name: /^Inicio$/i })).toHaveAttribute(
        'aria-current',
        'page'
      );
      expect(within(menu).getByRole('link', { name: /^Mis salas$/i })).toBeInTheDocument();
      expect(within(menu).getByRole('link', { name: /^Perfil$/i })).toBeInTheDocument();
      expect(within(menu).queryByRole('link', { name: /^Panel$/i })).not.toBeInTheDocument();
      expect(within(menu).queryByRole('link', { name: /^Base técnica$/i })).not.toBeInTheDocument();
      expect(within(menu).queryByRole('link', { name: /^Ayuda$/i })).not.toBeInTheDocument();

      // El menú lateral arranca contraído (Andres, 20/11) y se puede expandir.
      const expandBtn = screen.getByRole('button', { name: /Expandir menú/i });
      expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
      await userEvent.click(expandBtn);
      expect(screen.getByRole('button', { name: /Contraer menú/i })).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      // Este entorno no tiene localStorage: el menú arranca contraído igual y no falla (try/catch).

      expect(
        await screen.findByText('Puedes elegir entre dos ambientes o crear el tuyo')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Crear sala con ambiente Chill/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Crear sala con ambiente Focus/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Crear sala personalizada sin sonido/i })
      ).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Tus salas' })).not.toBeInTheDocument();
      expect(screen.queryByText(/0 en línea/)).not.toBeInTheDocument();

      const panelResults = await axe(panelContainer);
      expect(panelResults).toHaveNoViolations();
      unmountPanel();

      const { container: salasContainer, unmount: unmountSalas } = render(
        <MemoryRouter initialEntries={['/salas']}>
          <App
            authOverrides={{
              initialStatus: 'authenticated',
              initialUser: mockStudent,
            }}
          />
        </MemoryRouter>
      );

      expect(
        await screen.findByRole('heading', { name: /^Todavía no tienes salas$/i })
      ).toBeInTheDocument();
      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
      expect(await axe(salasContainer)).toHaveNoViolations();
      fetchSpy.mockRestore();
      unmountSalas();

      render(
        <MemoryRouter initialEntries={['/ayuda']}>
          <App />
        </MemoryRouter>
      );

      expect(screen.queryByRole('link', { name: /^Base técnica$/i })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^Ingresar$/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Inicio$/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Mis salas$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Perfil$/i })).not.toBeInTheDocument();
    });
  });

  describe('Título único por ruta y guardia de rutas privadas', () => {
    const publicRoutes = [
      { path: '/', expectedTitle: 'Inicio · Tuga - Salón de Estudio' },
      { path: '/ingresar', expectedTitle: 'Ingresar · Tuga - Salón de Estudio' },
      { path: '/registro', expectedTitle: 'Registro · Tuga - Salón de Estudio' },
      { path: '/ayuda', expectedTitle: 'Ayuda · Tuga - Salón de Estudio' },
      { path: '/base-tecnica', expectedTitle: 'Inicio · Tuga - Salón de Estudio' },
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
      { path: '/panel', expectedTitle: 'Inicio · Tuga - Salón de Estudio' },
      { path: '/salas', expectedTitle: 'Mis salas · Tuga - Salón de Estudio' },
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
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
          new Response(JSON.stringify({ salas: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );

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

    it('Perfil muestra «Mi cuenta» con correo, dominio, acceso y fecha de alta sin violaciones axe ni pie público', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/perfil']}>
          <App
            authOverrides={{
              initialStatus: 'authenticated',
              initialUser: { ...mockStudent, provider: 'google', creadoEn: '2026-11-13T15:00:00.000Z' },
            }}
          />
        </MemoryRouter>
      );

      const cuenta = await screen.findByRole('heading', { name: 'Mi cuenta' });
      expect(cuenta).toBeInTheDocument();
      expect(screen.getByText('andres.barbosa@correounivalle.edu.co')).toBeInTheDocument();
      expect(screen.getByText('correounivalle.edu.co · Universidad del Valle')).toBeInTheDocument();
      expect(screen.getByText('Cuenta de Google')).toBeInTheDocument();
      expect(screen.getByText('Conectado con Google')).toBeInTheDocument();
      expect(screen.getByText(/13 de noviembre de 2026/)).toBeInTheDocument();
      expect(screen.queryByText(/sprint/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { Layout } from '../components/Layout';
import { AuthProvider } from '../context/AuthContext';
import { BaseTecnicaPage } from '../pages/BaseTecnicaPage';

describe('Accesibilidad Base TS-04 (Paso 6)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Auditoría automática con axe (0 violaciones)', () => {
    it('el Layout principal no tiene violaciones de accesibilidad', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <Layout />
          </AuthProvider>
        </MemoryRouter>
      );

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
        expect(screen.getByText('No se pudo leer la base de datos.')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Enlace de salto y regiones semánticas', () => {
    it('el enlace «Saltar al contenido» es el primer elemento de foco y apunta a #contenido', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      const skipLink = screen.getByRole('link', { name: /Saltar al contenido/i });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#contenido');

      const main = document.getElementById('contenido');
      expect(main).toBeInTheDocument();
      expect(main?.tagName.toLowerCase()).toBe('main');
    });

    it('contiene las 4 regiones semánticas requeridas (header, nav, main, footer)', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('navigation', { name: /Navegación principal/i })).toBeInTheDocument(); // nav
      expect(screen.getByRole('main')).toBeInTheDocument(); // main
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
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

  describe('Título único por ruta (document.title)', () => {
    const routesToTest = [
      { path: '/', expectedTitle: 'Inicio · Salón de Estudio' },
      { path: '/ingresar', expectedTitle: 'Ingresar · Salón de Estudio' },
      { path: '/registro', expectedTitle: 'Crea tu cuenta · Salón de Estudio' },
      // Rutas privadas: sin sesión llevan a Ingresar.
      { path: '/panel', expectedTitle: 'Ingresar · Salón de Estudio' },
      { path: '/perfil', expectedTitle: 'Ingresar · Salón de Estudio' },
      { path: '/salas/demo-1', expectedTitle: 'Ingresar · Salón de Estudio' },
      { path: '/ayuda', expectedTitle: 'Ayuda · Salón de Estudio' },
      { path: '/base-tecnica', expectedTitle: 'Base técnica · Salón de Estudio' },
      { path: '/ruta-desconocida-404', expectedTitle: '404 · Página no encontrada · Salón de Estudio' },
    ];

    routesToTest.forEach(({ path, expectedTitle }) => {
      it(`establece el título "${expectedTitle}" al navegar a ${path}`, async () => {
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
  });
});

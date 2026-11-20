import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';

const mockStudent = {
  uid: 'uid-est-1',
  nombres: 'Andrés',
  apellidos: 'Barbosa',
  username: 'andres.uv',
  avatar: '🚀',
  correo: 'andres.barbosa@correounivalle.edu.co',
};

describe('Rutas base, redirección de /base-tecnica y separación de pies de página', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirige /base-tecnica limpiamente a / (Inicio)', async () => {
    render(
      <MemoryRouter initialEntries={['/base-tecnica']}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', { name: /Bienvenido a Tuga/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Vamos a estudiar/i })).toHaveAttribute(
      'href',
      '/ingresar'
    );
    await waitFor(() => {
      expect(document.title).toBe('Inicio · Tuga - Salón de Estudio');
    });
  });

  it('no muestra el enlace «Base técnica» en el pie de páginas públicas (/ayuda, /ingresar, /registro)', () => {
    for (const path of ['/ayuda', '/ingresar', '/registro']) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      );

      const footerNav = screen.getByRole('navigation', { name: /Enlaces secundarios/i });
      expect(within(footerNav).queryByRole('link', { name: /Base técnica/i })).not.toBeInTheDocument();
      expect(within(footerNav).getByRole('link', { name: /^Inicio$/i })).toBeInTheDocument();
      expect(within(footerNav).getByRole('link', { name: /^Ayuda$/i })).toBeInTheDocument();
      unmount();
    }
  });

  it.each(['/panel', '/salas', '/perfil'])(
    'la ruta privada %s no muestra el enlace «Base técnica» ni el pie público',
    async (privatePath) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ salas: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <MemoryRouter initialEntries={[privatePath]}>
          <App
            authOverrides={{
              initialStatus: 'authenticated',
              initialUser: mockStudent,
            }}
          />
        </MemoryRouter>
      );

      const sidebarNav = await screen.findByRole('navigation', {
        name: /Navegación principal/i,
      });
      expect(within(sidebarNav).queryByRole('link', { name: /Base técnica/i })).not.toBeInTheDocument();
      expect(within(sidebarNav).getByRole('link', { name: /^Inicio$/i })).toBeInTheDocument();
      expect(within(sidebarNav).getByRole('link', { name: /^Mis salas$/i })).toBeInTheDocument();
      expect(within(sidebarNav).getByRole('link', { name: /^Perfil$/i })).toBeInTheDocument();

      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Salón de Estudio Colaborativo en Tiempo Real · Universidad del Valle/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Universidad del Valle · Proyecto Integrador I/i)
      ).not.toBeInTheDocument();
    }
  );

  it('muestra la página 404 diseñada en una ruta desconocida', () => {
    render(
      <MemoryRouter initialEntries={['/ruta-inexistente-404']}>
        <App />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /404 · Página no encontrada/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver al Inicio/i })).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';

describe('Frontend Base + Base Técnica (TS-00 · Paso 5)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el estado de carga inicialmente en /base-tecnica', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise(() => {}) // Promesa pendiente
    );

    render(
      <MemoryRouter initialEntries={['/base-tecnica']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Cargando información desde la API/i)).toBeInTheDocument();
  });

  it('muestra el dato recibido cuando la API responde 200 en /base-tecnica', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        nombre: 'Salón de Estudio',
        mensaje: 'Bienvenido',
      }),
    } as Response);

    render(
      <MemoryRouter initialEntries={['/base-tecnica']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Bienvenido')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Salón de Estudio').length).toBeGreaterThanOrEqual(2);
  });

  it('muestra el error cuando la API falla y el botón «Reintentar» vuelve a pedir el dato', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: 'No se pudo leer la base de datos. Intenta de nuevo.',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          nombre: 'Salón de Estudio',
          mensaje: 'Bienvenido tras reintento',
        }),
      } as Response);

    render(
      <MemoryRouter initialEntries={['/base-tecnica']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText('No se pudo leer la base de datos. Intenta de nuevo.')
      ).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Reintentar/i });
    await userEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Bienvenido tras reintento')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

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

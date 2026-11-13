import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';

function renderRegistro() {
  return render(
    <MemoryRouter initialEntries={['/registro']}>
      <App />
    </MemoryRouter>
  );
}

describe('US-01 · Registro manual', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra todos los campos con su etiqueta visible', () => {
    renderRegistro();
    expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument();
    for (const etiqueta of ['Nombres', 'Apellidos', 'Nombre de usuario', 'Correo', 'Contraseña']) {
      expect(screen.getByLabelText(etiqueta, { exact: true })).toBeInTheDocument();
    }
    expect(screen.getByRole('group', { name: 'Avatar' })).toBeInTheDocument();
  });

  it('al enviar vacío marca cada campo, muestra el resumen y lleva el foco al primero', async () => {
    renderRegistro();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByText('Revisa los campos marcados.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombres')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Nombres')).toHaveFocus();
    expect(screen.getAllByText('Escribe tus nombres.').length).toBeGreaterThan(0);
  });

  it('conserva lo escrito cuando hay errores', async () => {
    renderRegistro();
    await userEvent.type(screen.getByLabelText('Nombres'), 'Juan Pablo');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByLabelText('Nombres')).toHaveValue('Juan Pablo');
  });

  it('avisa cuando el nombre de usuario está ocupado', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ disponible: false }),
    } as Response);
    renderRegistro();
    await userEvent.type(screen.getByLabelText('Nombre de usuario'), 'ocupado_1');
    expect(
      await screen.findByText('Ese nombre de usuario ya está en uso. Prueba con otro.', {}, { timeout: 2000 })
    ).toBeInTheDocument();
  });

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = renderRegistro();
    expect(await axe(container)).toHaveNoViolations();
  });
});

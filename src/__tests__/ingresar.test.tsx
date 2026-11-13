import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

function renderEn(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>
  );
}

describe('US-03 · Ingresar y rutas privadas', () => {
  it('muestra el formulario con correo, contraseña y Google', () => {
    renderEn('/ingresar');
    expect(screen.getByRole('heading', { name: 'Ingresar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Contraseña', { exact: true })).toHaveAttribute(
      'autocomplete',
      'current-password'
    );
    expect(screen.getByRole('button', { name: /Continuar con Google/i })).toBeInTheDocument();
  });

  it('al enviar vacío explica qué falta y no intenta ingresar', async () => {
    renderEn('/ingresar');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(screen.getAllByText('Escribe tu correo.').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Correo')).toHaveFocus();
  });

  it('una ruta privada sin sesión lleva a Ingresar con un aviso', () => {
    renderEn('/panel');
    expect(screen.getByRole('heading', { name: 'Ingresar' })).toBeInTheDocument();
    expect(screen.getByText('Ingresa para continuar a tu Panel.')).toBeInTheDocument();
  });

  it('sin sesión el menú muestra Ingresar y Registrarse, no Panel', () => {
    renderEn('/');
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(nav).toHaveTextContent('Registrarse');
    expect(nav).not.toHaveTextContent('Panel');
  });

  it('el botón «Mostrar» permite ver la contraseña', async () => {
    renderEn('/ingresar');
    const campo = screen.getByLabelText('Contraseña', { exact: true });
    expect(campo).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(campo).toHaveAttribute('type', 'text');
  });

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = renderEn('/ingresar');
    expect(await axe(container)).toHaveNoViolations();
  });
});

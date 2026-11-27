import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { textoAccesibleMensaje } from '../hooks/useRoomRealtime';
import { setRealtimeFactoryForTests } from '../services/realtime';
import { MockRealtimeConnection } from '../services/realtimeMock';
import { mensaje, renderConTiempoReal, salaDeAna, stubApiSalas } from './helpers/salaEnVivo';

const deCuentaEliminada = mensaje(1, {
  autorUid: '',
  autorUsername: '',
  autorEliminado: true,
  texto: 'Nos vemos mañana',
});

async function entrarConMensajeEliminado() {
  const conexion = new MockRealtimeConnection({ uid: 'u-ana', username: 'ana' });
  conexion.sembrarMensajes('ABCD1234', [deCuentaEliminada, mensaje(2)]);
  const r = renderConTiempoReal('/salas/ABCD1234', { conexion });
  await waitFor(() => expect(conexion.cuantas('chat:historial')).toBe(1));
  await screen.findByText('Nos vemos mañana');
  return r;
}

describe('SDECG6-56 · «Cuenta eliminada» en los mensajes del chat', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCKS', 'false');
    stubApiSalas([salaDeAna]);
  });

  afterEach(() => {
    setRealtimeFactoryForTests(null);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra «Cuenta eliminada» como autor en vez de un @usuario', async () => {
    await entrarConMensajeEliminado();
    const lista = screen.getByRole('list', { name: 'Mensajes del chat' });
    const item = within(lista).getAllByRole('listitem')[0];

    expect(within(item).getByRole('button', { name: 'Cuenta eliminada' })).toBeInTheDocument();
    expect(within(item).queryByText(/^@/)).not.toBeInTheDocument();
  });

  it('al enfocarlo con teclado o tocarlo dice «Esta cuenta fue eliminada»', async () => {
    const user = userEvent.setup();
    await entrarConMensajeEliminado();
    const autor = screen.getByRole('button', { name: 'Cuenta eliminada' });

    autor.focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Esta cuenta fue eliminada');
    expect(autor).toHaveAccessibleDescription('Esta cuenta fue eliminada');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.click(autor);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.click(autor);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('el lector de pantalla lo lee igual que los demás: autor, hora y texto', () => {
    expect(textoAccesibleMensaje(deCuentaEliminada)).toMatch(/^Cuenta eliminada, .+: Nos vemos mañana$/);
  });

  it('no tiene problemas de accesibilidad', async () => {
    const { container } = await entrarConMensajeEliminado();
    expect(await axe(container)).toHaveNoViolations();
  });
});

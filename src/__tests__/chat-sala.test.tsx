import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { setRealtimeFactoryForTests } from '../services/realtime';
import { MockRealtimeConnection } from '../services/realtimeMock';
import { mensaje, renderConTiempoReal, salaDeAna, stubApiSalas } from './helpers/salaEnVivo';

async function entrarALaSala(conexion?: MockRealtimeConnection) {
  const r = renderConTiempoReal('/salas/ABCD1234', conexion ? { conexion } : {});
  await waitFor(() => expect(r.conexion.cuantas('chat:historial')).toBe(1));
  return r;
}

/** jsdom no calcula tamaños: se simula que la lista tiene scroll y dónde está. */
function simularScroll(el: HTMLElement, { arriba }: { arriba: boolean }) {
  Object.defineProperty(el, 'scrollHeight', { value: 2000, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
  el.scrollTop = arriba ? 100 : 1600;
  fireEvent.scroll(el);
}

describe('SDECG6-53 · Chat en tiempo real dentro de la sala (US-10)', () => {
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

  it('Enter envía el mensaje, aparece en el chat y el campo queda vacío', async () => {
    const user = userEvent.setup();
    const { conexion } = await entrarALaSala();

    const campo = screen.getByLabelText('Escribe un mensaje');
    await user.type(campo, 'Hola a todos{Enter}');

    const lista = await screen.findByRole('list', { name: 'Mensajes del chat' });
    expect(await within(lista).findByText('Hola a todos')).toBeInTheDocument();
    expect(within(lista).getByText('Tú')).toBeInTheDocument();
    expect(campo).toHaveValue('');
    expect(conexion.solicitudes.filter((s) => s.event === 'chat:enviar')).toEqual([
      { event: 'chat:enviar', data: { salaId: 'ABCD1234', texto: 'Hola a todos' } },
    ]);
    // El mensaje propio llega también por chat:mensaje y no se duplica
    await waitFor(() => expect(within(lista).getAllByText('Hola a todos')).toHaveLength(1));
  });

  it('Shift+Enter hace salto de línea y no envía', async () => {
    const user = userEvent.setup();
    const { conexion } = await entrarALaSala();

    const campo = screen.getByLabelText('Escribe un mensaje');
    await user.type(campo, 'Línea 1{Shift>}{Enter}{/Shift}Línea 2');

    expect(campo).toHaveValue('Línea 1\nLínea 2');
    expect(conexion.cuantas('chat:enviar')).toBe(0);
  });

  it('con el campo vacío o solo espacios no envía nada por la red', async () => {
    const user = userEvent.setup();
    const { conexion } = await entrarALaSala();

    const campo = screen.getByLabelText('Escribe un mensaje');
    await user.type(campo, '{Enter}');
    await user.type(campo, '     {Enter}');

    expect(screen.getByRole('button', { name: 'Enviar mensaje' })).toBeDisabled();
    expect(conexion.cuantas('chat:enviar')).toBe(0);
  });

  it('muestra el contador hasta 1000 caracteres y no deja escribir más', async () => {
    await entrarALaSala();
    const campo = screen.getByLabelText('Escribe un mensaje');

    fireEvent.change(campo, { target: { value: 'a'.repeat(1000) } });

    expect(campo).toHaveAttribute('maxLength', '1000');
    expect(screen.getByText('1000/1000 caracteres')).toBeInTheDocument();
  });

  it('si falla el envío muestra el error y «Reintentar» lo vuelve a enviar', async () => {
    const user = userEvent.setup();
    const { conexion } = await entrarALaSala();
    conexion.responderUnaVez('chat:enviar', {
      ok: false,
      codigo: 'ERROR_SERVIDOR',
      error: 'No se pudo completar la acción. Intenta de nuevo.',
    });

    await user.type(screen.getByLabelText('Escribe un mensaje'), 'Hola{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('No se envió tu mensaje.');
    expect(screen.getByLabelText('Escribe un mensaje')).toHaveValue('Hola');

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(conexion.cuantas('chat:enviar')).toBe(2));
    expect(await screen.findByText('Hola', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('los mensajes de otros se anuncian en orden autor, hora y texto sin mover el foco', async () => {
    const user = userEvent.setup();
    const { conexion } = await entrarALaSala();
    const campo = screen.getByLabelText('Escribe un mensaje');
    await user.click(campo);

    act(() => conexion.emitirDesdeServidor('chat:mensaje', mensaje(5, { texto: '¿Empezamos?' })));

    expect(await screen.findByText('¿Empezamos?')).toBeInTheDocument();
    expect(screen.getByTestId('anuncio-chat').textContent).toMatch(/^@luis, .+: ¿Empezamos\?$/);
    expect(campo).toHaveFocus();
  });

  it('solo muestra mensajes de su sala', async () => {
    const { conexion } = await entrarALaSala();

    act(() =>
      conexion.emitirDesdeServidor('chat:mensaje', mensaje(6, { salaId: 'OTRA0001', texto: 'De otra sala' }))
    );

    expect(screen.queryByText('De otra sala')).not.toBeInTheDocument();
  });

  it('si estás leyendo más arriba no te baja y aparece «Mensajes nuevos»', async () => {
    const user = userEvent.setup();
    const conexion = new MockRealtimeConnection({ uid: 'u-ana', username: 'ana' });
    conexion.sembrarMensajes('ABCD1234', [mensaje(1), mensaje(2), mensaje(3)]);
    await entrarALaSala(conexion);
    await screen.findByText('Mensaje 3');

    const lista = screen.getByTestId('lista-chat');
    simularScroll(lista, { arriba: true });

    act(() => conexion.emitirDesdeServidor('chat:mensaje', mensaje(4)));

    const aviso = await screen.findByRole('button', { name: 'Mensajes nuevos' });
    expect(lista.scrollTop).toBe(100);

    await user.click(aviso);
    expect(lista.scrollTop).toBe(2000);
    expect(screen.queryByRole('button', { name: 'Mensajes nuevos' })).not.toBeInTheDocument();
  });

  it('si estás al final baja solo al llegar un mensaje', async () => {
    const conexion = new MockRealtimeConnection({ uid: 'u-ana', username: 'ana' });
    conexion.sembrarMensajes('ABCD1234', [mensaje(1)]);
    await entrarALaSala(conexion);
    await screen.findByText('Mensaje 1');

    const lista = screen.getByTestId('lista-chat');
    simularScroll(lista, { arriba: false });

    act(() => conexion.emitirDesdeServidor('chat:mensaje', mensaje(2)));

    await screen.findByText('Mensaje 2');
    expect(lista.scrollTop).toBe(2000);
    expect(screen.queryByRole('button', { name: 'Mensajes nuevos' })).not.toBeInTheDocument();
  });

  it('en celular cambia entre las pestañas «Participantes» y «Chat»', async () => {
    const user = userEvent.setup();
    await entrarALaSala();

    const tabChat = screen.getByRole('tab', { name: 'Chat' });
    expect(screen.getByRole('tab', { name: 'Participantes' })).toHaveAttribute('aria-selected', 'true');
    await user.click(tabChat);
    expect(tabChat).toHaveAttribute('aria-selected', 'true');
    expect(document.getElementById('room-panel-chat')).toHaveClass('flex');
    expect(document.getElementById('room-panel-participantes')).toHaveClass('hidden');
  });

  it('no tiene problemas de accesibilidad con mensajes en el chat', async () => {
    const conexion = new MockRealtimeConnection({ uid: 'u-ana', username: 'ana' });
    conexion.sembrarMensajes('ABCD1234', [mensaje(1), mensaje(2, { autorUid: 'u-ana', autorUsername: 'ana' })]);
    const { container } = await entrarALaSala(conexion);
    await screen.findByText('Mensaje 2');

    expect(await axe(container)).toHaveNoViolations();
  });
});

import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setRealtimeFactoryForTests } from '../services/realtime';
import { MockRealtimeConnection } from '../services/realtimeMock';
import { ana, renderConTiempoReal, salaDeAna, stubApiSalas } from './helpers/salaEnVivo';

const luis = { ...ana, uid: 'u-luis', username: 'luis', nombres: 'Luis' };

async function entrarComo(usuario: typeof ana) {
  const conexion = new MockRealtimeConnection(
    { uid: usuario.uid, username: usuario.username },
    { anfitrionUid: 'u-ana' }
  );
  const r = renderConTiempoReal('/salas/ABCD1234', { usuario, conexion });
  await waitFor(() => expect(conexion.cuantas('chat:historial')).toBe(1));
  return r;
}

describe('SDECG6-55 · Acciones del anfitrión dentro de la sala y avisos en vivo (US-07)', () => {
  let fetchMock: ReturnType<typeof stubApiSalas>;

  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCKS', 'false');
    fetchMock = stubApiSalas([salaDeAna]);
  });

  afterEach(() => {
    setRealtimeFactoryForTests(null);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('el anfitrión ve «Renombrar» y «Eliminar» en la barra y la barra superior dice «Mi salón»', async () => {
    await entrarComo(ana);

    expect(screen.getByRole('button', { name: 'Renombrar la sala Cálculo II' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar la sala Cálculo II' })).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).getByText('Mi salón')).toBeInTheDocument();
  });

  it('el invitado no ve esos botones y en la barra superior ve el nombre de la sala', async () => {
    await entrarComo(luis);

    expect(screen.queryByRole('button', { name: /Renombrar la sala/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar la sala/ })).not.toBeInTheDocument();
    const topbar = screen.getByRole('banner');
    expect(within(topbar).queryByText('Mi salón')).not.toBeInTheDocument();
    expect(within(topbar).getByText('Cálculo II')).toBeInTheDocument();
  });

  it('el anfitrión renombra desde la sala reutilizando la ventana de «Mis salones»', async () => {
    const user = userEvent.setup();
    await entrarComo(ana);

    await user.click(screen.getByRole('button', { name: 'Renombrar la sala Cálculo II' }));
    const dialogo = await screen.findByRole('dialog');
    const campo = within(dialogo).getByRole('textbox');
    await user.clear(campo);
    await user.type(campo, 'Cálculo III');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('heading', { name: 'Cálculo III' })).toBeInTheDocument();
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patch?.[0]).toContain('/api/salas/ABCD1234');
  });

  it('el invitado ve el nombre nuevo sin recargar cuando llega sala:actualizada', async () => {
    const { conexion } = await entrarComo(luis);

    act(() => conexion.emitirDesdeServidor('sala:actualizada', { salaId: 'ABCD1234', nombre: 'Física I' }));

    expect(await screen.findByRole('heading', { name: 'Física I' })).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).getByText('Física I')).toBeInTheDocument();
    expect(screen.getByTestId('anuncio-sala')).toHaveTextContent('La sala ahora se llama Física I');
  });

  it('cuando el anfitrión elimina la sala el invitado ve el aviso y elige «Volver al Panel»', async () => {
    const user = userEvent.setup();
    const { conexion, getPathname } = await entrarComo(luis);

    act(() => conexion.emitirDesdeServidor('sala:eliminada', { salaId: 'ABCD1234' }));

    const aviso = await screen.findByRole('alertdialog', { name: 'El anfitrión eliminó esta sala' });
    expect(aviso).toHaveTextContent('La sala Cálculo II fue cerrada por su anfitrión.');
    expect(getPathname()).toBe('/salas/ABCD1234');
    const volver = within(aviso).getByRole('button', { name: 'Volver al Panel' });
    await waitFor(() => expect(volver).toHaveFocus());

    await user.click(volver);
    await waitFor(() => expect(getPathname()).toBe('/panel'));
  });

  it('ignora sala:eliminada de otra sala', async () => {
    const { conexion, getPathname } = await entrarComo(luis);

    act(() => conexion.emitirDesdeServidor('sala:eliminada', { salaId: 'OTRA0001' }));

    expect(getPathname()).toBe('/salas/ABCD1234');
  });

  it('el anfitrión elimina desde la sala, confirma y vuelve al Panel', async () => {
    const user = userEvent.setup();
    const { getPathname, conexion } = await entrarComo(ana);

    await user.click(screen.getByRole('button', { name: 'Eliminar la sala Cálculo II' }));
    const dialogo = await screen.findByRole('alertdialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Eliminar sala' }));

    await waitFor(() => expect(getPathname()).toBe('/panel'));
    expect(await screen.findByText('Sala eliminada.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
    expect(conexion.cuantas('sala:salir')).toBe(1);
  });
});

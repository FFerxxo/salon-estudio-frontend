import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { setRealtimeFactoryForTests } from '../services/realtime';
import {
  participante,
  renderConTiempoReal,
  salaDeAna,
  stubApiSalas,
} from './helpers/salaEnVivo';

describe('SDECG6-52 · Participantes en vivo en la sala', () => {
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

  it('estando solo muestra solo tu cuadro y «Eres el único en la sala por ahora»', async () => {
    const { conexion } = renderConTiempoReal('/salas/ABCD1234');
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));

    const grid = await screen.findByLabelText('Participantes de la sala');
    expect(within(grid).getAllByRole('listitem')).toHaveLength(1);
    expect(within(grid).getByText('Tú')).toBeInTheDocument();
    expect(within(grid).getByText('Anfitrión')).toBeInTheDocument();
    expect(screen.getByText(/Eres el único en la sala por ahora/)).toBeInTheDocument();
    expect(screen.queryByText(/Compañero/)).not.toBeInTheDocument();
  });

  it('pinta los participantes reales y la lista cambia cuando alguien entra o sale', async () => {
    const { conexion } = renderConTiempoReal('/salas/ABCD1234');
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));

    const yo = participante('u-ana', 'ana');
    const luis = participante('u-luis', 'luis');
    const sofi = participante('u-sofi', 'sofi');

    act(() => {
      conexion.emitirDesdeServidor('sala:participante-entro', { salaId: 'ABCD1234', participante: luis });
      conexion.emitirDesdeServidor('sala:participantes', { salaId: 'ABCD1234', participantes: [yo, luis] });
    });

    const grid = screen.getByLabelText('Participantes de la sala');
    await waitFor(() => expect(within(grid).getAllByRole('listitem')).toHaveLength(2));
    expect(within(grid).getByLabelText('@luis')).toBeInTheDocument();
    expect(screen.queryByText(/Eres el único/)).not.toBeInTheDocument();
    expect(screen.getByTestId('anuncio-sala')).toHaveTextContent('@luis entró a la sala');
    // Además del anuncio al lector, un aviso visible y discreto (boceto S3)
    expect(screen.getByTestId('aviso-sala-visible')).toHaveTextContent('@luis entró a la sala');
    expect(screen.getByRole('button', { name: 'Participantes (2)' })).toBeInTheDocument();

    act(() => {
      conexion.emitirDesdeServidor('sala:participantes', { salaId: 'ABCD1234', participantes: [yo, luis, sofi] });
    });
    await waitFor(() => expect(within(grid).getAllByRole('listitem')).toHaveLength(3));

    act(() => {
      conexion.emitirDesdeServidor('sala:participante-salio', {
        salaId: 'ABCD1234',
        socketId: luis.socketId,
        uid: luis.uid,
        username: 'luis',
      });
      conexion.emitirDesdeServidor('sala:participantes', { salaId: 'ABCD1234', participantes: [yo, sofi] });
    });
    await waitFor(() => expect(within(grid).getAllByRole('listitem')).toHaveLength(2));
    expect(within(grid).queryByLabelText('@luis')).not.toBeInTheDocument();
    expect(screen.getByTestId('anuncio-sala')).toHaveTextContent('@luis salió de la sala');
    expect(screen.getByTestId('aviso-sala-visible')).toHaveTextContent('@luis salió de la sala');
  });

  it('ignora los avisos de otras salas', async () => {
    const { conexion } = renderConTiempoReal('/salas/ABCD1234');
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));

    act(() => {
      conexion.emitirDesdeServidor('sala:participantes', {
        salaId: 'OTRA0001',
        participantes: [participante('u-ana', 'ana'), participante('u-x', 'x')],
      });
    });

    const grid = screen.getByLabelText('Participantes de la sala');
    expect(within(grid).getAllByRole('listitem')).toHaveLength(1);
  });

  it('muestra cuando alguien tiene micrófono o cámara apagados', async () => {
    const { conexion } = renderConTiempoReal('/salas/ABCD1234');
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));

    act(() => {
      conexion.emitirDesdeServidor('sala:participantes', {
        salaId: 'ABCD1234',
        participantes: [participante('u-ana', 'ana'), { ...participante('u-luis', 'luis'), microfono: true }],
      });
    });

    const luis = await screen.findByLabelText('@luis');
    expect(within(luis).queryByLabelText('Micrófono apagado')).not.toBeInTheDocument();
    expect(within(luis).getByLabelText('Cámara apagada')).toBeInTheDocument();
  });

  it('no tiene problemas de accesibilidad con varios participantes', async () => {
    const { conexion, container } = renderConTiempoReal('/salas/ABCD1234');
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));
    act(() => {
      conexion.emitirDesdeServidor('sala:participantes', {
        salaId: 'ABCD1234',
        participantes: [participante('u-ana', 'ana'), participante('u-luis', 'luis')],
      });
    });
    await screen.findByLabelText('@luis');
    expect(await axe(container)).toHaveNoViolations();
  });
});

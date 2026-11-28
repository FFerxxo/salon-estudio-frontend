import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { StudentProfile } from '../services/authApi';
import { setRealtimeFactoryForTests } from '../services/realtime';
import { MockRealtimeConnection } from '../services/realtimeMock';
import {
  ana,
  jsonResponse,
  renderConTiempoReal,
  salaDeAna,
  stubApiSalas,
} from './helpers/salaEnVivo';

const luis: StudentProfile = {
  uid: 'u-luis',
  nombres: 'Luis',
  apellidos: 'Martínez',
  username: 'luis',
  avatar: '🎧',
  correo: 'luis@correounivalle.edu.co',
  provider: 'password',
  creadoEn: '2026-11-14T15:00:00.000Z',
};

describe('SDECG6-55 · Anfitrión en sala, actualización y eliminación en vivo (US-07)', () => {
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

  it('el anfitrión ve «Renombrar» y «Eliminar», ve «Mi salón» en la barra superior y puede renombrar la sala', async () => {
    const user = userEvent.setup();
    const { conexion, container } = renderConTiempoReal('/salas/ABCD1234', {
      usuario: ana,
      anfitrionUid: 'u-ana',
    });

    expect(await screen.findByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));

    const topbar = screen.getByRole('banner');
    expect(within(topbar).getByText('Mi salón')).toBeInTheDocument();

    const renameBtn = screen.getByRole('button', { name: 'Renombrar' });
    const deleteBtn = screen.getByRole('button', { name: 'Eliminar' });
    expect(renameBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(renameBtn);
    const dialog = await screen.findByRole('dialog', { name: 'Renombrar sala' });
    const input = within(dialog).getByLabelText<HTMLInputElement>('Nuevo nombre de la sala');
    await waitFor(() => {
      expect(input).toHaveFocus();
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe('Cálculo II'.length);
    });

    await user.clear(input);
    await user.type(input, 'Cálculo II · taller final');
    expect(input).toHaveValue('Cálculo II · taller final');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Renombrar sala' })).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Cálculo II · taller final' })
      ).toBeInTheDocument();
      expect(document.title).toBe('Cálculo II · taller final · Tuga - Salón de Estudio');
      expect(within(screen.getByRole('banner')).getByText('Mi salón')).toBeInTheDocument();
    });
  });

  it('el anfitrión puede eliminar la sala desde dentro y volver al Panel sin el aviso de invitado ni carrera con sala:eliminada', async () => {
    const user = userEvent.setup();

    let resolveDelete!: (res: Response) => void;
    const deletePromise = new Promise<Response>((res) => {
      resolveDelete = res;
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.endsWith('/api/salas/mias')) {
        return jsonResponse({ salas: [salaDeAna] });
      }
      if (url.endsWith('/api/salas/ABCD1234') && method === 'DELETE') {
        return deletePromise;
      }
      if (url.endsWith('/api/salas/ABCD1234')) {
        return jsonResponse(salaDeAna);
      }
      return jsonResponse({ error: 'No encontrada' }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { conexion, getPathname } = renderConTiempoReal('/salas/ABCD1234', {
      usuario: ana,
      anfitrionUid: 'u-ana',
    });

    await screen.findByRole('heading', { name: 'Cálculo II' });
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    const alertDialog = await screen.findByRole('alertdialog', { name: '¿Eliminar esta sala?' });
    const cancelBtn = within(alertDialog).getByRole('button', { name: 'Cancelar' });
    await waitFor(() => expect(cancelBtn).toHaveFocus());

    await user.click(within(alertDialog).getByRole('button', { name: 'Eliminar sala' }));

    // Simula la carrera donde el servidor en vivo emite sala:eliminada antes de que responda DELETE.
    act(() => {
      conexion.emitirDesdeServidor('sala:eliminada', { salaId: 'ABCD1234' });
    });
    expect(getPathname()).toBe('/salas/ABCD1234');

    await act(async () => {
      resolveDelete(jsonResponse({ mensaje: 'La sala fue eliminada.' }));
      await Promise.resolve();
    });

    await waitFor(() => expect(getPathname()).toBe('/panel'));
    expect(screen.queryByText('El anfitrión eliminó esta sala')).not.toBeInTheDocument();
  });

  it('el invitado no ve «Renombrar» ni «Eliminar», no parpadea «Mi salón» al cargar y ve el nombre de la sala en la barra superior', async () => {
    let resolveRoom!: (res: Response) => void;
    const roomPromise = new Promise<Response>((res) => {
      resolveRoom = res;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/salas/ABCD1234')) {
          return roomPromise;
        }
        if (url.endsWith('/api/salas/mias')) {
          return jsonResponse({ salas: [] });
        }
        return jsonResponse({ error: 'No encontrada' }, 404);
      })
    );

    const { container } = renderConTiempoReal('/salas/ABCD1234', {
      usuario: luis,
      anfitrionUid: 'u-ana',
    });

    // Mientras carga la sala, la barra superior no debe mostrar «Mi salón» ni datos falsos.
    const topbarWhileLoading = screen.getByRole('banner');
    expect(within(topbarWhileLoading).queryByText('Mi salón')).not.toBeInTheDocument();

    await act(async () => {
      resolveRoom(jsonResponse(salaDeAna));
      await Promise.resolve();
    });

    expect(await screen.findByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();
    const topbar = screen.getByRole('banner');
    expect(within(topbar).queryByText('Mi salón')).not.toBeInTheDocument();
    expect(within(topbar).getByText('Cálculo II')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Renombrar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar/i })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('al recibir sala:actualizada actualiza sin recargar la barra de la sala, el título del documento y la barra superior del invitado', async () => {
    const { conexion } = renderConTiempoReal('/salas/ABCD1234', {
      usuario: luis,
      anfitrionUid: 'u-ana',
    });

    await screen.findByRole('heading', { name: 'Cálculo II' });
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));

    // Ignora actualizaciones de otra sala.
    act(() => {
      conexion.emitirDesdeServidor('sala:actualizada', {
        salaId: 'OTRA9999',
        nombre: 'Otra sala',
      });
    });
    expect(screen.getByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();

    act(() => {
      conexion.emitirDesdeServidor('sala:actualizada', {
        salaId: 'ABCD1234',
        nombre: 'Cálculo II · repaso',
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Cálculo II · repaso' })).toBeInTheDocument();
      expect(
        within(screen.getByRole('banner')).getByText('Cálculo II · repaso')
      ).toBeInTheDocument();
      expect(document.title).toBe('Cálculo II · repaso · Tuga - Salón de Estudio');
    });
  });

  it('al recibir sala:eliminada devuelve al invitado a /panel y muestra «El anfitrión eliminó esta sala»', async () => {
    const user = userEvent.setup();
    const { conexion, getPathname, container } = renderConTiempoReal('/salas/ABCD1234', {
      usuario: luis,
      anfitrionUid: 'u-ana',
    });

    await screen.findByRole('heading', { name: 'Cálculo II' });
    await waitFor(() => expect(conexion.cuantas('sala:unirse')).toBe(1));

    // Ignora eliminación de otra sala.
    act(() => {
      conexion.emitirDesdeServidor('sala:eliminada', { salaId: 'OTRA9999' });
    });
    expect(getPathname()).toBe('/salas/ABCD1234');

    act(() => {
      conexion.emitirDesdeServidor('sala:eliminada', { salaId: 'ABCD1234' });
    });

    await waitFor(() => expect(getPathname()).toBe('/panel'));
    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('El anfitrión eliminó esta sala');
    expect(await axe(container)).toHaveNoViolations();

    await user.click(within(banner).getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByText('El anfitrión eliminó esta sala')).not.toBeInTheDocument();
  });

  it('si chat:enviar responde SALA_NO_ENCONTRADA devuelve al participante a /panel con «El anfitrión eliminó esta sala»', async () => {
    const user = userEvent.setup();
    const conexion = new MockRealtimeConnection(
      { uid: luis.uid, username: luis.username },
      { anfitrionUid: 'u-ana' }
    );
    conexion.responderUnaVez('chat:enviar', {
      ok: false,
      codigo: 'SALA_NO_ENCONTRADA',
      error: 'Esta sala no existe o fue eliminada.',
    });

    const { getPathname } = renderConTiempoReal('/salas/ABCD1234', {
      usuario: luis,
      anfitrionUid: 'u-ana',
      conexion,
    });

    await screen.findByRole('heading', { name: 'Cálculo II' });
    await waitFor(() => expect(conexion.cuantas('chat:historial')).toBe(1));

    const textarea = screen.getByLabelText('Escribe un mensaje');
    await user.type(textarea, 'Hola{Enter}');

    await waitFor(() => expect(getPathname()).toBe('/panel'));
    expect(await screen.findByText('El anfitrión eliminó esta sala')).toBeInTheDocument();
  });
});

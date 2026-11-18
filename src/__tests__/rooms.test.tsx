import { useEffect } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import type { StudentProfile } from '../services/authApi';
import { resetMockState } from '../services/mockApi';
import { setMockDelayForTests } from '../services/mockConfig';
import {
  createRoom,
  getMyRooms,
  getRoomById,
  RoomsApiError,
  type Room,
} from '../services/roomsApi';

const mockStudent: StudentProfile = {
  uid: 'u-123',
  nombres: 'Andrés',
  apellidos: 'Barbosa',
  username: 'andres.uv',
  avatar: '🚀',
  correo: 'andres.barbosa@correounivalle.edu.co',
  provider: 'password',
  creadoEn: '2026-11-13T15:00:00.000Z',
};

const sampleRooms: Room[] = [
  {
    id: 'sala-alpha',
    nombre: 'Cálculo II',
    ambiente: 'blue',
    anfitrionUid: 'u-123',
    creadaEn: '2026-11-18T12:00:00.000Z',
  },
  {
    id: 'sala-beta',
    nombre: 'Lectura silenciosa',
    ambiente: 'ninguno',
    anfitrionUid: 'u-123',
    creadaEn: '2026-11-18T11:00:00.000Z',
  },
  {
    id: 'sala-gamma',
    nombre: 'Taller de Física',
    ambiente: 'green',
    anfitrionUid: 'u-123',
    creadaEn: '2026-11-18T10:00:00.000Z',
  },
];

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installMemoryStorage(): void {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
}

function setupUserWithClipboard() {
  const user = userEvent.setup();
  if (!navigator.clipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  }
  const writeTextSpy = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue(undefined);
  return { user, writeTextSpy };
}

function LocationProbe({ onChange }: { onChange: (pathname: string) => void }) {
  const location = useLocation();

  useEffect(() => {
    onChange(location.pathname);
  }, [location.pathname, onChange]);

  return null;
}

function renderAuthenticatedApp(initialEntry = '/panel') {
  let currentPathname = initialEntry;

  const rendered = render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe
        onChange={(pathname) => {
          currentPathname = pathname;
        }}
      />
      <App
        authOverrides={{
          initialStatus: 'authenticated',
          initialUser: mockStudent,
        }}
      />
    </MemoryRouter>
  );

  return {
    ...rendered,
    getPathname: () => currentPathname,
  };
}

let playStub: ReturnType<typeof vi.fn>;
let pauseStub: ReturnType<typeof vi.fn>;

describe('Salas propias y ambiente sonoro', () => {
  beforeEach(() => {
    installMemoryStorage();
    vi.stubEnv('VITE_USE_MOCKS', 'false');
    playStub = vi.fn().mockResolvedValue(undefined);
    pauseStub = vi.fn();
    HTMLMediaElement.prototype.play = playStub;
    HTMLMediaElement.prototype.pause = pauseStub;
  });

  afterEach(() => {
    setMockDelayForTests(null);
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage?.clear?.();
  });

  describe('Panel vacío, cargando y error con Reintentar', () => {
    it('muestra esqueleto de carga con aria-busy="true" mientras GET /api/salas/mias está pendiente', async () => {
      const pending = createDeferred<Response>();
      vi.stubGlobal(
        'fetch',
        vi.fn(() => pending.promise)
      );

      const { container } = renderAuthenticatedApp('/panel');

      await waitFor(() => {
        expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
      });
      const hasLoadingCopy = Boolean(
        screen.queryByText(/Cargando tus salas/i) ??
          screen.queryByLabelText(/Cargando tus salas/i)
      );
      expect(hasLoadingCopy).toBe(true);

      pending.resolve(jsonResponse({ salas: [] }));

      expect(
        await screen.findByText('Aún no tienes salas. Crea una para estudiar con tu grupo.')
      ).toBeInTheDocument();
    });

    it('muestra error «No pudimos cargar tus salas.» con «Reintentar» ante 500 y carga las salas al reintentar', async () => {
      const user = userEvent.setup();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ error: 'Fallo temporal del servidor.' }, 500)
        )
        .mockResolvedValueOnce(jsonResponse({ salas: [sampleRooms[0]] }, 200));
      vi.stubGlobal('fetch', fetchMock);

      renderAuthenticatedApp('/panel');

      expect(await screen.findByText('No pudimos cargar tus salas.')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      expect(retryBtn).toBeInTheDocument();

      await user.click(retryBtn);

      expect(await screen.findByText('Cálculo II')).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('muestra estado vacío sin tarjetas inventadas ni «0 en línea» cuando GET /api/salas/mias devuelve []', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ salas: [] }, 200))
      );

      renderAuthenticatedApp('/panel');

      expect(
        await screen.findByText('Aún no tienes salas. Crea una para estudiar con tu grupo.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Crear sala/i })).toBeInTheDocument();
      expect(screen.queryByText(/0 en línea/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Studio Ghibli/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Ruido azul/i)).not.toBeInTheDocument();
    });
  });

  describe('Panel con salas y Copiar ID', () => {
    it('lista las salas con nombre, ID, chip de ambiente, «Copiar ID» y «Entrar», y anuncia «ID copiado» en role="status"', async () => {
      const { user, writeTextSpy } = setupUserWithClipboard();
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.endsWith('/api/salas/mias')) {
            return jsonResponse({ salas: sampleRooms }, 200);
          }
          if (url.endsWith('/api/salas/sala-alpha')) {
            return jsonResponse({ sala: sampleRooms[0] }, 200);
          }
          return jsonResponse({ error: 'No encontrada' }, 404);
        })
      );

      const { getPathname } = renderAuthenticatedApp('/panel');

      expect(await screen.findByText('Cálculo II')).toBeInTheDocument();
      expect(screen.getByText('Lectura silenciosa')).toBeInTheDocument();
      expect(screen.getByText('Taller de Física')).toBeInTheDocument();

      expect(screen.getByText('sala-alpha')).toBeInTheDocument();
      expect(screen.getByText('sala-beta')).toBeInTheDocument();
      expect(screen.getByText('sala-gamma')).toBeInTheDocument();

      expect(screen.getByText('Blue')).toBeInTheDocument();
      expect(screen.getByText('Sin sonido')).toBeInTheDocument();
      expect(screen.getByText('Green')).toBeInTheDocument();

      const copyButtons = screen.getAllByRole('button', { name: /Copiar ID/i });
      expect(copyButtons).toHaveLength(3);

      const enterLinks = screen.queryAllByRole('link', { name: /Entrar/i });
      const enterButtons = screen.queryAllByRole('button', { name: /Entrar/i });
      const enterControls = [...enterLinks, ...enterButtons];
      expect(enterControls).toHaveLength(3);

      await user.click(copyButtons[0]);

      expect(writeTextSpy).toHaveBeenCalledWith('sala-alpha');
      const statusEl = await screen.findByText('ID copiado');
      expect(statusEl.closest('[role="status"]')).toBeInTheDocument();

      await user.click(enterControls[0]);

      await waitFor(() => {
        expect(getPathname()).toBe('/salas/sala-alpha');
      });
      expect(await screen.findByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();
    });
  });

  describe('Ventana Crear sala', () => {
    it('abre el diálogo accesible con «Sin sonido» seleccionado, contador vivo y devuelve foco al cerrar con Cancelar o Escape', async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ salas: [] }, 200))
      );

      renderAuthenticatedApp('/panel');

      const openBtn = await screen.findByRole('button', { name: /Crear sala/i });
      await user.click(openBtn);

      const dialog = await screen.findByRole('dialog');
      expect(
        within(dialog).getByRole('heading', { name: /Crear sala/i })
      ).toBeInTheDocument();
      expect(within(dialog).getByRole('radio', { name: /Sin sonido/i })).toBeChecked();
      expect(within(dialog).getByText('0/50')).toBeInTheDocument();
      expect(playStub).not.toHaveBeenCalled();

      const nameInput = within(dialog).getByLabelText(/Nombre de la sala/i);
      await user.type(nameInput, 'Cálculo');
      expect(within(dialog).getByText('7/50')).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: /^Cancelar$/i }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      await waitFor(() => {
        expect(openBtn).toHaveFocus();
      });

      await user.click(openBtn);
      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      await waitFor(() => {
        expect(openBtn).toHaveFocus();
      });
    });

    it('valida el nombre (vacío, corto «ab» o >50 caracteres) sin borrar el texto ni llamar a POST /api/salas', async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ salas: [] }, 200));
      vi.stubGlobal('fetch', fetchMock);

      renderAuthenticatedApp('/panel');

      await user.click(await screen.findByRole('button', { name: /Crear sala/i }));
      const dialog = await screen.findByRole('dialog');
      const nameInput = within(dialog).getByLabelText(/Nombre de la sala/i) as HTMLInputElement;
      const submitBtn = within(dialog).getByRole('button', { name: /^Crear sala$/i });

      await user.click(submitBtn);
      expect(
        await within(dialog).findByText('El nombre debe tener entre 3 y 50 caracteres.')
      ).toBeInTheDocument();

      await user.type(nameInput, 'ab');
      await user.click(submitBtn);
      expect(
        await within(dialog).findByText('El nombre debe tener entre 3 y 50 caracteres.')
      ).toBeInTheDocument();
      expect(nameInput).toHaveValue('ab');

      await user.clear(nameInput);
      const tooLong = 'a'.repeat(51);
      await user.type(nameInput, tooLong);
      if (nameInput.value.length > 50) {
        await user.click(submitBtn);
        expect(
          await within(dialog).findByText('El nombre debe tener entre 3 y 50 caracteres.')
        ).toBeInTheDocument();
        expect(nameInput).toHaveValue(tooLong);
      }

      const postCalls = fetchMock.mock.calls.filter(
        ([url, init]) =>
          String(url).endsWith('/api/salas') &&
          (init as RequestInit | undefined)?.method === 'POST'
      );
      expect(postCalls).toHaveLength(0);
    });

    it('permite escuchar y detener la muestra de audio Blue sin reproducción automática al abrir', async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ salas: [] }, 200))
      );

      renderAuthenticatedApp('/panel');

      await user.click(await screen.findByRole('button', { name: /Crear sala/i }));
      const dialog = await screen.findByRole('dialog');
      expect(playStub).not.toHaveBeenCalled();

      const previewBlueBtn = within(dialog).getByRole('button', {
        name: /Escuchar.*Blue/i,
      });
      await user.click(previewBlueBtn);

      await waitFor(() => {
        expect(playStub).toHaveBeenCalledTimes(1);
      });
      const stopBtn = within(dialog).getByRole('button', { name: /Detener/i });
      expect(stopBtn).toBeInTheDocument();

      await user.click(stopBtn);
      expect(pauseStub).toHaveBeenCalled();
      expect(within(dialog).queryByRole('button', { name: /Detener/i })).not.toBeInTheDocument();
    });

    it('muestra error del servidor 500 dentro del diálogo conservando el nombre escrito', async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          if (url.endsWith('/api/salas/mias')) {
            return jsonResponse({ salas: [] }, 200);
          }
          if (url.endsWith('/api/salas') && init?.method === 'POST') {
            return jsonResponse(
              { error: 'No pudimos crear la sala. Intenta de nuevo.' },
              500
            );
          }
          return jsonResponse({ error: 'No encontrada' }, 404);
        })
      );

      renderAuthenticatedApp('/panel');

      await user.click(await screen.findByRole('button', { name: /Crear sala/i }));
      const dialog = await screen.findByRole('dialog');
      const nameInput = within(dialog).getByLabelText(/Nombre de la sala/i);

      await user.type(nameInput, 'Estudio Nocturno');
      await user.click(within(dialog).getByRole('button', { name: /^Crear sala$/i }));

      expect(
        await within(dialog).findByText('No pudimos crear la sala. Intenta de nuevo.')
      ).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(nameInput).toHaveValue('Estudio Nocturno');
    });

    it('muestra «Creando…» deshabilitado durante el envío válido, llama a POST /api/salas y navega a /salas/:id como «Anfitrión»', async () => {
      const user = userEvent.setup();
      const postDeferred = createDeferred<Response>();
      const createdRoom: Room = {
        id: 'sala-marea-1',
        nombre: 'Estudio Marea',
        ambiente: 'blue',
        anfitrionUid: 'u-123',
        creadaEn: '2026-11-18T13:00:00.000Z',
      };

      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/api/salas/mias')) {
          return jsonResponse({ salas: [] }, 200);
        }
        if (url.endsWith('/api/salas') && init?.method === 'POST') {
          return postDeferred.promise;
        }
        if (url.endsWith(`/api/salas/${createdRoom.id}`)) {
          return jsonResponse({ sala: createdRoom }, 200);
        }
        return jsonResponse({ error: 'No encontrada' }, 404);
      });
      vi.stubGlobal('fetch', fetchMock);

      const { getPathname } = renderAuthenticatedApp('/panel');

      await user.click(await screen.findByRole('button', { name: /Crear sala/i }));
      const dialog = await screen.findByRole('dialog');

      await user.type(
        within(dialog).getByLabelText(/Nombre de la sala/i),
        'Estudio Marea'
      );
      await user.click(within(dialog).getByRole('radio', { name: /^Blue/i }));
      await user.click(within(dialog).getByRole('button', { name: /^Crear sala$/i }));

      const creatingBtn = await within(dialog).findByRole('button', {
        name: /Creando/i,
      });
      expect(creatingBtn).toBeDisabled();

      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith('/api/salas') &&
          (init as RequestInit | undefined)?.method === 'POST'
      );
      expect(postCall).toBeDefined();
      expect(JSON.parse(String((postCall?.[1] as RequestInit).body))).toEqual({
        nombre: 'Estudio Marea',
        ambiente: 'blue',
      });

      postDeferred.resolve(jsonResponse({ sala: createdRoom }, 201));

      await waitFor(() => {
        expect(getPathname()).toBe('/salas/sala-marea-1');
      });
      expect(await screen.findByRole('heading', { name: 'Estudio Marea' })).toBeInTheDocument();
      expect(screen.getByText('Anfitrión')).toBeInTheDocument();
    });
  });

  describe('Sala mínima (/salas/:id)', () => {
    it('muestra nombre, insignia «Anfitrión», ID con «Copiar ID», aviso honesto, reproductor apagado al entrar sin descarga y «Salir de la sala»', async () => {
      const { user, writeTextSpy } = setupUserWithClipboard();
      const blueRoom: Room = {
        id: 'sala-alpha',
        nombre: 'Cálculo II',
        ambiente: 'blue',
        anfitrionUid: 'u-123',
        creadaEn: '2026-11-18T12:00:00.000Z',
      };

      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.endsWith('/api/salas/sala-alpha')) {
            return jsonResponse({ sala: blueRoom }, 200);
          }
          if (url.endsWith('/api/salas/mias')) {
            return jsonResponse({ salas: [blueRoom] }, 200);
          }
          return jsonResponse({ error: 'No encontrada' }, 404);
        })
      );

      const { container, getPathname } = renderAuthenticatedApp('/salas/sala-alpha');

      expect(await screen.findByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();
      expect(screen.getByText('Anfitrión')).toBeInTheDocument();
      expect(screen.getByText('sala-alpha')).toBeInTheDocument();
      expect(screen.getByText('El chat y el video llegan pronto.')).toBeInTheDocument();

      const audioEl = container.querySelector('audio');
      expect(audioEl).toBeInTheDocument();
      expect(audioEl).not.toHaveAttribute('autoplay');
      expect(playStub).not.toHaveBeenCalled();

      const playBtn = screen.getByRole('button', { name: /Reproducir/i });
      expect(playBtn).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: /Volumen/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Descargar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Descargar/i })).not.toBeInTheDocument();
      expect(container.querySelector('a[download]')).not.toBeInTheDocument();

      await user.click(playBtn);
      await waitFor(() => {
        expect(playStub).toHaveBeenCalledTimes(1);
      });
      const pauseBtn = screen.getByRole('button', { name: /Pausar/i });
      expect(pauseBtn).toBeInTheDocument();

      await user.click(pauseBtn);
      expect(pauseStub).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Reproducir/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Copiar ID/i }));
      expect(writeTextSpy).toHaveBeenCalledWith('sala-alpha');
      const statusEl = await screen.findByText('ID copiado');
      expect(statusEl.closest('[role="status"]')).toBeInTheDocument();

      const leaveLink = screen.getByRole('link', { name: /Salir de la sala/i });
      expect(leaveLink).toHaveAttribute('href', '/panel');
      await user.click(leaveLink);

      await waitFor(() => {
        expect(getPathname()).toBe('/panel');
      });
    });

    it('muestra estado 404 «Esta sala no existe o fue eliminada.» con «Volver al panel» en /salas/no-existe', async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.endsWith('/api/salas/mias')) {
            return jsonResponse({ salas: [] }, 200);
          }
          return jsonResponse({ error: 'Esta sala no existe o fue eliminada.' }, 404);
        })
      );

      const { getPathname } = renderAuthenticatedApp('/salas/no-existe');

      expect(
        await screen.findByText('Esta sala no existe o fue eliminada.')
      ).toBeInTheDocument();

      const backControl =
        screen.queryByRole('link', { name: /Volver al panel/i }) ??
        screen.getByRole('button', { name: /Volver al panel/i });
      expect(backControl).toBeInTheDocument();

      await user.click(backControl);
      await waitFor(() => {
        expect(getPathname()).toBe('/panel');
      });
    });
  });

  describe('Servicio roomsApi (fetch real y modo mock VITE_USE_MOCKS=true)', () => {
    it('integra VITE_USE_MOCKS=true: lista vacía inicial, validación 400, creación con persistencia y 404 en no-existe', async () => {
      vi.stubEnv('VITE_USE_MOCKS', 'true');
      setMockDelayForTests(0);
      resetMockState();

      expect(await getMyRooms('mock-token')).toEqual([]);

      let invalidErr: unknown = null;
      try {
        await createRoom('mock-token', { nombre: 'ab' });
      } catch (err) {
        invalidErr = err;
      }
      expect(invalidErr).toBeInstanceOf(RoomsApiError);
      expect((invalidErr as RoomsApiError).status).toBe(400);

      const created = await createRoom('mock-token', {
        nombre: 'Estudio Marea',
        ambiente: 'green',
      });
      expect(created.nombre).toBe('Estudio Marea');
      expect(created.ambiente).toBe('green');
      expect(created.id).toBeTruthy();

      const roomsAfter = await getMyRooms('mock-token');
      expect(roomsAfter).toHaveLength(1);
      expect(roomsAfter[0]?.id).toBe(created.id);
      expect(roomsAfter[0]?.nombre).toBe('Estudio Marea');
      expect(roomsAfter[0]?.ambiente).toBe('green');

      let notFoundErr: unknown = null;
      try {
        await getRoomById('mock-token', 'no-existe');
      } catch (err) {
        notFoundErr = err;
      }
      expect(notFoundErr).toBeInstanceOf(RoomsApiError);
      expect((notFoundErr as RoomsApiError).status).toBe(404);
    });

    it('envía cabeceras Bearer y normaliza respuestas y errores HTTP en roomsApi', async () => {
      vi.stubEnv('VITE_USE_MOCKS', 'false');
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ salas: [sampleRooms[0]] }, 200))
        .mockResolvedValueOnce(
          jsonResponse(
            {
              error: 'Datos inválidos',
              errores: { nombre: 'El nombre debe tener entre 3 y 50 caracteres.' },
            },
            400
          )
        )
        .mockResolvedValueOnce(
          jsonResponse({ error: 'Esta sala no existe o fue eliminada.' }, 404)
        );
      vi.stubGlobal('fetch', fetchMock);

      const rooms = await getMyRooms('tok-123');
      expect(rooms).toEqual([sampleRooms[0]]);
      const [listUrl, listInit] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(listUrl).toMatch(/\/api\/salas\/mias$/);
      expect(new Headers(listInit.headers).get('Authorization')).toBe('Bearer tok-123');

      await expect(
        createRoom('tok-123', { nombre: '  ab  ', ambiente: 'blue' })
      ).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof RoomsApiError &&
          err.status === 400 &&
          err.fieldErrors?.nombre === 'El nombre debe tener entre 3 y 50 caracteres.'
      );

      await expect(getRoomById('tok-123', 'no-existe')).rejects.toSatisfy(
        (err: unknown) => err instanceof RoomsApiError && err.status === 404
      );
    });
  });

  describe('Auditoría automática de accesibilidad (vitest-axe)', () => {
    it('no reporta violaciones en /panel vacío', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ salas: [] }, 200))
      );

      const { container } = renderAuthenticatedApp('/panel');

      expect(
        await screen.findByText('Aún no tienes salas. Crea una para estudiar con tu grupo.')
      ).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('no reporta violaciones en /panel con salas', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ salas: sampleRooms }, 200))
      );

      const { container } = renderAuthenticatedApp('/panel');

      expect(await screen.findByText('Cálculo II')).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('no reporta violaciones con el diálogo «Crear sala» abierto', async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ salas: [] }, 200))
      );

      const { container } = renderAuthenticatedApp('/panel');

      await user.click(await screen.findByRole('button', { name: /Crear sala/i }));
      const dialog = await screen.findByRole('dialog');

      expect(await axe(container)).toHaveNoViolations();
      if (!container.contains(dialog)) {
        expect(await axe(dialog)).toHaveNoViolations();
      }
    });

    it('no reporta violaciones en /salas/:id con reproductor de ambiente sonoro', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ sala: sampleRooms[0] }, 200))
      );

      const { container } = renderAuthenticatedApp('/salas/sala-alpha');

      expect(await screen.findByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reproducir/i })).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('no reporta violaciones en /salas/no-existe (estado 404)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          jsonResponse({ error: 'Esta sala no existe o fue eliminada.' }, 404)
        )
      );

      const { container } = renderAuthenticatedApp('/salas/no-existe');

      expect(
        await screen.findByText('Esta sala no existe o fue eliminada.')
      ).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { AmbientePlayer } from '../components/AmbientePlayer';
import { AMBIENTES, shuffleTracks } from '../content/ambientes';
import { TUGA_SLOTS } from '../content/vozTuga';
import { ThemeProvider } from '../context/ThemeContext';
import type { StudentProfile } from '../services/authApi';
import { resetMockState } from '../services/mockApi';
import { setMockDelayForTests } from '../services/mockConfig';
import {
  createRoom,
  deleteRoom,
  getMyRooms,
  getRoomById,
  renameRoom,
  RoomsApiError,
  validateRoomName,
  type Room,
} from '../services/roomsApi';

const ALL_TUGA_PHRASES = TUGA_SLOTS.flatMap((slot) =>
  slot.phrases.map((phrase) => phrase.fullText)
);

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

function setupUserWithFailingClipboard() {
  const user = userEvent.setup();
  if (!navigator.clipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    });
  }
  const writeTextSpy = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockRejectedValue(new Error('Clipboard unavailable'));

  const origExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');
  Object.defineProperty(document, 'execCommand', {
    value: undefined,
    configurable: true,
    writable: true,
  });

  const restoreExecCommand = () => {
    if (origExecCommand) {
      Object.defineProperty(document, 'execCommand', origExecCommand);
    } else {
      delete (document as unknown as Record<string, unknown>).execCommand;
    }
  };

  return { user, writeTextSpy, restoreExecCommand };
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

describe('Salas propias, gestión US-07 y ambiente sonoro', () => {
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

  describe('Inicio (/panel): saludo de Tuga, tarjetas de ambiente y «Tus salas»', () => {
    it('muestra el saludo de Tuga, el subtítulo y las 3 tarjetas de ambiente y oculta «Tus salas» cuando rooms.length === 0', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ salas: [] }, 200))
      );

      renderAuthenticatedApp('/panel');

      const heading = await screen.findByRole('heading', { level: 1 });
      expect(ALL_TUGA_PHRASES).toContain(heading.textContent?.trim());
      expect(
        screen.getByText('Puedes elegir entre dos ambientes o crear el tuyo')
      ).toBeInTheDocument();

      const envGroup = screen.getByRole('group', {
        name: /Elegir ambiente para crear una sala/i,
      });
      expect(within(envGroup).getByRole('button', { name: /ambiente Green/i })).toHaveTextContent(
        'Green'
      );
      expect(within(envGroup).getByRole('button', { name: /ambiente Blue/i })).toHaveTextContent(
        'Blue'
      );
      expect(
        within(envGroup).getByRole('button', { name: /personalizada sin sonido/i })
      ).toHaveTextContent('Personalizado');

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Tus salas' })).not.toBeInTheDocument();
      });
      expect(screen.queryByText(/0 en línea/i)).not.toBeInTheDocument();
    });

    it('muestra error «No pudimos cargar tus salas.» con «Reintentar» ante 500 y muestra «Tus salas» al recuperar salas', async () => {
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
      await user.click(retryBtn);

      expect(await screen.findByRole('heading', { name: 'Tus salas' })).toBeInTheDocument();
      expect(screen.getByText('Cálculo II')).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('renderiza «Tus salas» en /panel cuando existen salas', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ salas: sampleRooms }, 200))
      );

      renderAuthenticatedApp('/panel');

      expect(await screen.findByRole('heading', { name: 'Tus salas' })).toBeInTheDocument();
      const roomsList = screen.getByRole('list', { name: /Tus salas creadas/i });
      expect(within(roomsList).getAllByRole('listitem')).toHaveLength(sampleRooms.length);
      expect(within(roomsList).getByText('Cálculo II')).toBeInTheDocument();
      expect(within(roomsList).getByText('Lectura silenciosa')).toBeInTheDocument();
      expect(within(roomsList).getByText('Taller de Física')).toBeInTheDocument();
    });

    it('mantiene la caché SWR de salas entre /panel y /salas sin mostrar el esqueleto tras la primera carga y actualiza en segundo plano', async () => {
      const user = userEvent.setup();
      const firstDeferred = createDeferred<Response>();
      const secondDeferred = createDeferred<Response>();
      const thirdDeferred = createDeferred<Response>();
      const fourthDeferred = createDeferred<Response>();

      const fetchMock = vi
        .fn()
        .mockImplementationOnce(() => firstDeferred.promise)
        .mockImplementationOnce(() => secondDeferred.promise)
        .mockImplementationOnce(() => thirdDeferred.promise)
        .mockImplementationOnce(() => fourthDeferred.promise);
      vi.stubGlobal('fetch', fetchMock);

      const { container, getPathname } = renderAuthenticatedApp('/panel');

      const nav = await screen.findByRole('navigation', { name: /Navegación principal/i });

      // Primera visita a /salas con hasLoaded === false: muestra esqueleto mientras la carga inicial sigue pendiente
      await user.click(within(nav).getByRole('link', { name: /^Mis salas$/i }));
      await waitFor(() => {
        expect(getPathname()).toBe('/salas');
      });
      expect(screen.getByText('Cargando tus salas')).toBeInTheDocument();
      expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();

      firstDeferred.resolve(jsonResponse({ salas: [sampleRooms[0]] }, 200));

      expect(await screen.findByText('Cálculo II')).toBeInTheDocument();
      expect(screen.queryByText('Cargando tus salas')).not.toBeInTheDocument();

      // Navega a /panel (Inicio): pinta la caché al instante mientras refresca en segundo plano
      await user.click(within(nav).getByRole('link', { name: /^Inicio$/i }));
      await waitFor(() => {
        expect(getPathname()).toBe('/panel');
      });
      expect(screen.getByRole('heading', { name: 'Tus salas' })).toBeInTheDocument();
      expect(screen.getByText('Cálculo II')).toBeInTheDocument();
      expect(screen.queryByText('Cargando tus salas')).not.toBeInTheDocument();

      secondDeferred.resolve(jsonResponse({ salas: [sampleRooms[0], sampleRooms[1]] }, 200));
      expect(await screen.findByText('Lectura silenciosa')).toBeInTheDocument();

      // Vuelve a /salas: nunca parpadea «Cargando tus salas» aunque el fetch en segundo plano esté pendiente
      await user.click(within(nav).getByRole('link', { name: /^Mis salas$/i }));
      await waitFor(() => {
        expect(getPathname()).toBe('/salas');
      });
      expect(screen.queryByText('Cargando tus salas')).not.toBeInTheDocument();
      expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
      expect(screen.getByText('Cálculo II')).toBeInTheDocument();
      expect(screen.getByText('Lectura silenciosa')).toBeInTheDocument();

      thirdDeferred.resolve(jsonResponse({ salas: sampleRooms }, 200));
      expect(await screen.findByText('Taller de Física')).toBeInTheDocument();

      // Regresa a /panel: conserva la lista actualizada al instante y refresca en segundo plano
      await user.click(within(nav).getByRole('link', { name: /^Inicio$/i }));
      await waitFor(() => {
        expect(getPathname()).toBe('/panel');
      });
      expect(screen.getByText('Taller de Física')).toBeInTheDocument();
      fourthDeferred.resolve(jsonResponse({ salas: sampleRooms }, 200));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(4);
      });
    });

    it('conserva las salas cargadas en el primer montaje aunque la sesión resuelva de null a uid durante la petición', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ salas: [sampleRooms[0]] }, 200));
      vi.stubGlobal('fetch', fetchMock);

      const { rerender } = render(
        <MemoryRouter initialEntries={['/panel']}>
          <App
            authOverrides={{
              initialStatus: 'authenticated',
              initialUser: null,
            }}
          />
        </MemoryRouter>
      );

      rerender(
        <MemoryRouter initialEntries={['/panel']}>
          <App
            authOverrides={{
              initialStatus: 'authenticated',
              initialUser: mockStudent,
            }}
          />
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { name: 'Tus salas' })).toBeInTheDocument();
      expect(screen.getByText('Cálculo II')).toBeInTheDocument();
    });
  });

  describe('Mis salas (/salas): carga, vacío, error con Reintentar, tarjetas y Copiar ID', () => {
    it('muestra esqueleto de carga con aria-busy="true" mientras GET /api/salas/mias está pendiente y estado vacío «Todavía no tienes salas»', async () => {
      const pending = createDeferred<Response>();
      vi.stubGlobal(
        'fetch',
        vi.fn(() => pending.promise)
      );

      const { container } = renderAuthenticatedApp('/salas');

      await waitFor(() => {
        expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
      });
      expect(screen.getByRole('heading', { name: /^Mis salas$/i })).toBeInTheDocument();
      expect(screen.getByText('Cargando tus salas')).toBeInTheDocument();

      pending.resolve(jsonResponse({ salas: [] }));

      expect(
        await screen.findByRole('heading', { name: 'Todavía no tienes salas' })
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Ir a Inicio/i })).toHaveAttribute('href', '/panel');
      expect(screen.queryByText(/0 en línea/i)).not.toBeInTheDocument();
    });

    it('muestra error «No pudimos cargar tus salas.» con «Reintentar» en /salas ante 500 y carga las tarjetas al reintentar', async () => {
      const user = userEvent.setup();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: 'Error interno' }, 500))
        .mockResolvedValueOnce(jsonResponse({ salas: sampleRooms }, 200));
      vi.stubGlobal('fetch', fetchMock);

      renderAuthenticatedApp('/salas');

      expect(await screen.findByText('No pudimos cargar tus salas.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Reintentar/i }));

      expect(await screen.findByText('Cálculo II')).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('lista las salas con nombre, ID, chip de ambiente, «Copiar ID» y «Entrar» y navega a /salas/:id', async () => {
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

      const { getPathname } = renderAuthenticatedApp('/salas');

      expect(await screen.findByText('Cálculo II')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Mis salas', level: 1 })).toBeInTheDocument();
      expect(screen.getAllByText('Mis salas')).toHaveLength(2);
      expect(screen.getByRole('link', { name: /^Mis salas$/i })).toHaveAttribute(
        'aria-current',
        'page'
      );
      const roomsList = screen.getByRole('list', { name: /Tus salas creadas/i });
      expect(within(roomsList).getAllByRole('listitem')).toHaveLength(sampleRooms.length);

      expect(within(roomsList).getByText('sala-alpha')).toBeInTheDocument();
      expect(within(roomsList).getByText('sala-beta')).toBeInTheDocument();
      expect(within(roomsList).getByText('sala-gamma')).toBeInTheDocument();

      expect(within(roomsList).getByText('Blue')).toBeInTheDocument();
      expect(within(roomsList).getByText('Sin sonido')).toBeInTheDocument();
      expect(within(roomsList).getByText('Green')).toBeInTheDocument();

      for (const room of sampleRooms) {
        expect(
          within(roomsList).getByRole('button', { name: `Copiar ID de ${room.nombre}` })
        ).toBeInTheDocument();
        expect(
          within(roomsList).getByRole('link', { name: `Entrar a ${room.nombre}` })
        ).toBeInTheDocument();
        expect(
          within(roomsList).getByRole('button', { name: `Opciones de ${room.nombre}` })
        ).toBeInTheDocument();
      }

      const firstCopyBtn = within(roomsList).getByRole('button', {
        name: 'Copiar ID de Cálculo II',
      });
      await user.click(firstCopyBtn);

      expect(writeTextSpy).toHaveBeenCalledWith('sala-alpha');
      const copiedStatus = await within(roomsList).findByRole('status');
      expect(copiedStatus).toHaveTextContent('ID copiado');

      const firstEnterLink = within(roomsList).getByRole('link', {
        name: 'Entrar a Cálculo II',
      });
      await user.click(firstEnterLink);

      await waitFor(() => {
        expect(getPathname()).toBe('/salas/sala-alpha');
      });
      expect(await screen.findByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();
    });

    it('muestra alerta con instrucción manual si falla copiar el ID en /salas', async () => {
      const { user, writeTextSpy, restoreExecCommand } = setupUserWithFailingClipboard();
      try {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue(jsonResponse({ salas: [sampleRooms[0]] }, 200))
        );

        renderAuthenticatedApp('/salas');

        const copyBtn = await screen.findByRole('button', {
          name: 'Copiar ID de Cálculo II',
        });
        await user.click(copyBtn);

        expect(writeTextSpy).toHaveBeenCalledWith('sala-alpha');
        const alertEl = await screen.findByRole('alert');
        expect(alertEl).toHaveTextContent(
          'No pudimos copiar el ID. Cópialo a mano: sala-alpha'
        );
        expect(screen.queryByText('ID copiado')).not.toBeInTheDocument();
      } finally {
        restoreExecCommand();
      }
    });
  });

  describe('Ventana Crear sala desde tarjetas de ambiente (CreateRoomDialog)', () => {
    it('abre «¿Cómo se llama tu sala?» desde Green, Blue y Personalizado sin chip/ruido de ambiente, con maxLength=50, botones apilados y foco restaurado', async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ salas: [] }, 200))
      );

      renderAuthenticatedApp('/panel');

      const greenBtn = await screen.findByRole('button', { name: /ambiente Green/i });
      await user.click(greenBtn);

      let dialog = await screen.findByRole('dialog');
      const heading = within(dialog).getByRole('heading', { name: '¿Cómo se llama tu sala?' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('text-center');
      expect(within(dialog).queryByText('Green')).not.toBeInTheDocument();
      expect(within(dialog).queryByText('Personalizado · sin sonido')).not.toBeInTheDocument();
      expect(within(dialog).queryByRole('radiogroup', { name: 'Ambiente' })).not.toBeInTheDocument();
      expect(within(dialog).queryByText(/bosque, vals/i)).not.toBeInTheDocument();
      expect(within(dialog).getByText('0/50')).toBeInTheDocument();
      expect(playStub).not.toHaveBeenCalled();

      const nameInput = within(dialog).getByLabelText(/Nombre de la sala/i);
      expect(nameInput).toHaveAttribute('maxlength', '50');
      await user.type(nameInput, 'Cálculo');
      expect(within(dialog).getByText('7/50')).toBeInTheDocument();

      const cancelBtn = within(dialog).getByRole('button', { name: /^Cancelar$/i });
      const submitBtn = within(dialog).getByRole('button', { name: /^Entrar$/i });
      expect(submitBtn.className).toContain('w-full');
      expect(cancelBtn.className).not.toContain('w-full');
      expect(cancelBtn.parentElement?.className).toContain('flex-col-reverse');
      expect(
        cancelBtn.compareDocumentPosition(submitBtn) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      await user.click(cancelBtn);
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      await waitFor(() => {
        expect(greenBtn).toHaveFocus();
      });

      const blueBtn = screen.getByRole('button', { name: /ambiente Blue/i });
      await user.click(blueBtn);
      dialog = await screen.findByRole('dialog');
      expect(
        within(dialog).getByRole('heading', { name: '¿Cómo se llama tu sala?' })
      ).toBeInTheDocument();
      expect(within(dialog).queryByText('Blue')).not.toBeInTheDocument();
      expect(within(dialog).queryByRole('radiogroup', { name: 'Ambiente' })).not.toBeInTheDocument();
      expect(within(dialog).queryByText(/mar, olas, chill/i)).not.toBeInTheDocument();

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      await waitFor(() => {
        expect(blueBtn).toHaveFocus();
      });

      const customBtn = screen.getByRole('button', { name: /personalizada sin sonido/i });
      await user.click(customBtn);
      dialog = await screen.findByRole('dialog');
      expect(
        within(dialog).getByRole('heading', { name: '¿Cómo se llama tu sala?' })
      ).toBeInTheDocument();
      expect(within(dialog).queryByText('Personalizado · sin sonido')).not.toBeInTheDocument();
      expect(within(dialog).queryByText('Personalizado')).not.toBeInTheDocument();
      expect(within(dialog).queryByRole('radiogroup', { name: 'Ambiente' })).not.toBeInTheDocument();
    });

    it('valida el nombre (vacío, corto «ab», tope maxLength=50 al escribir 55 caracteres y validateRoomName >50) sin llamar a POST /api/salas', async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ salas: [] }, 200));
      vi.stubGlobal('fetch', fetchMock);

      renderAuthenticatedApp('/panel');

      await user.click(await screen.findByRole('button', { name: /ambiente Blue/i }));
      const dialog = await screen.findByRole('dialog');
      const nameInput = within(dialog).getByLabelText(/Nombre de la sala/i) as HTMLInputElement;
      const submitBtn = within(dialog).getByRole('button', { name: /^Entrar$/i });

      expect(nameInput).toHaveAttribute('maxlength', '50');

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
      await user.type(nameInput, 'a'.repeat(55));
      expect(nameInput).toHaveValue('a'.repeat(50));
      expect(within(dialog).getByText('50/50')).toBeInTheDocument();

      expect(validateRoomName('a'.repeat(50))).toBeNull();
      expect(validateRoomName('a'.repeat(51))).toBe(
        'El nombre debe tener entre 3 y 50 caracteres.'
      );

      const postCalls = fetchMock.mock.calls.filter(
        ([url, init]) =>
          String(url).endsWith('/api/salas') &&
          (init as RequestInit | undefined)?.method === 'POST'
      );
      expect(postCalls).toHaveLength(0);
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

      await user.click(await screen.findByRole('button', { name: /ambiente Green/i }));
      const dialog = await screen.findByRole('dialog');
      const nameInput = within(dialog).getByLabelText(/Nombre de la sala/i);

      await user.type(nameInput, 'Estudio Nocturno');
      await user.click(within(dialog).getByRole('button', { name: /^Entrar$/i }));

      expect(
        await within(dialog).findByText('No pudimos crear la sala. Intenta de nuevo.')
      ).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(nameInput).toHaveValue('Estudio Nocturno');
    });

    it('muestra «Entrando…» deshabilitado durante el envío válido, llama a POST /api/salas y navega a /salas/:id como «Anfitrión»', async () => {
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

      await user.click(await screen.findByRole('button', { name: /ambiente Blue/i }));
      const dialog = await screen.findByRole('dialog');

      await user.type(
        within(dialog).getByLabelText(/Nombre de la sala/i),
        'Estudio Marea'
      );
      await user.click(within(dialog).getByRole('button', { name: /^Entrar$/i }));

      const enteringBtn = await within(dialog).findByRole('button', {
        name: /Entrando/i,
      });
      expect(enteringBtn).toBeDisabled();

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
      expect(screen.getByText('Sala creada')).toBeInTheDocument();
      expect(screen.getByText('Anfitrión')).toBeInTheDocument();
    });

    it('envía ambiente green y ninguno limpiamente en POST /api/salas según la tarjeta elegida', async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/api/salas/mias')) {
          return jsonResponse({ salas: [] }, 200);
        }
        if (url.endsWith('/api/salas') && init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as { nombre: string; ambiente: 'green' | 'ninguno' };
          return jsonResponse(
            {
              sala: {
                id: `sala-${body.ambiente}`,
                nombre: body.nombre,
                ambiente: body.ambiente,
                anfitrionUid: 'u-123',
                creadaEn: '2026-11-20T13:00:00.000Z',
              },
            },
            201
          );
        }
        if (url.includes('/api/salas/sala-')) {
          return jsonResponse({ sala: sampleRooms[2] }, 200);
        }
        return jsonResponse({ error: 'No encontrada' }, 404);
      });
      vi.stubGlobal('fetch', fetchMock);

      const { unmount } = renderAuthenticatedApp('/panel');
      await user.click(await screen.findByRole('button', { name: /ambiente Green/i }));
      let dialog = await screen.findByRole('dialog');
      await user.type(within(dialog).getByLabelText(/Nombre de la sala/i), 'Bosque tranquilo');
      await user.click(within(dialog).getByRole('button', { name: /^Entrar$/i }));
      await screen.findByRole('heading', { name: 'Bosque tranquilo' });
      unmount();

      renderAuthenticatedApp('/panel');
      await user.click(await screen.findByRole('button', { name: /personalizada sin sonido/i }));
      dialog = await screen.findByRole('dialog');
      await user.type(within(dialog).getByLabelText(/Nombre de la sala/i), 'Lectura pura');
      await user.click(within(dialog).getByRole('button', { name: /^Entrar$/i }));
      await screen.findByRole('heading', { name: 'Lectura pura' });

      const postBodies = fetchMock.mock.calls
        .filter(
          ([url, init]) =>
            String(url).endsWith('/api/salas') &&
            (init as RequestInit | undefined)?.method === 'POST'
        )
        .map(([, init]) => JSON.parse(String((init as RequestInit).body)));

      expect(postBodies).toEqual([
        { nombre: 'Bosque tranquilo', ambiente: 'green' },
        { nombre: 'Lectura pura', ambiente: 'ninguno' },
      ]);
    });
  });

  describe('US-07 · Renombrar y eliminar sala propia', () => {
    it('abre el menú ···, valida nombres cortos (< 3), renombra la sala vía PATCH y actualiza lista + banner', async () => {
      const user = userEvent.setup();
      const renamedRoom: Room = {
        ...sampleRooms[0],
        nombre: 'Cálculo II · parcial',
      };

      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/api/salas/mias')) {
          return jsonResponse({ salas: [...sampleRooms] }, 200);
        }
        if (url.endsWith('/api/salas/sala-alpha') && init?.method === 'PATCH') {
          return jsonResponse({ sala: renamedRoom }, 200);
        }
        return jsonResponse({ error: 'No encontrada' }, 404);
      });
      vi.stubGlobal('fetch', fetchMock);

      renderAuthenticatedApp('/salas');

      const optionsBtn = await screen.findByRole('button', { name: 'Opciones de Cálculo II' });
      await user.click(optionsBtn);

      const menu = screen.getByRole('menu', { name: 'Acciones de Cálculo II' });
      expect(within(menu).getByRole('menuitem', { name: 'Renombrar sala' })).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: 'Eliminar sala' })).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(optionsBtn).toHaveFocus();

      await user.click(optionsBtn);
      await user.click(screen.getByRole('menuitem', { name: 'Renombrar sala' }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByRole('heading', { name: 'Renombrar sala' })).toBeInTheDocument();
      const nameInput = within(dialog).getByLabelText(/Nuevo nombre de la sala/i);
      expect(nameInput).toHaveValue('Cálculo II');
      expect(nameInput).toHaveAttribute('maxlength', '50');

      const cancelBtn = within(dialog).getByRole('button', { name: /^Cancelar$/i });
      const saveBtn = within(dialog).getByRole('button', { name: /^Guardar$/i });
      expect(saveBtn.className).toContain('w-full');
      expect(cancelBtn.className).not.toContain('w-full');
      expect(cancelBtn.parentElement?.className).toContain('flex-col-reverse');
      expect(
        cancelBtn.compareDocumentPosition(saveBtn) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      await user.clear(nameInput);
      await user.type(nameInput, 'b'.repeat(55));
      expect(nameInput).toHaveValue('b'.repeat(50));
      expect(within(dialog).getByText('50/50')).toBeInTheDocument();

      await user.clear(nameInput);
      await user.type(nameInput, 'ab');
      await user.click(saveBtn);
      expect(
        await within(dialog).findByText('El nombre debe tener entre 3 y 50 caracteres.')
      ).toBeInTheDocument();

      const patchCallsBefore = fetchMock.mock.calls.filter(
        ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH'
      );
      expect(patchCallsBefore).toHaveLength(0);

      await user.clear(nameInput);
      await user.type(nameInput, 'Cálculo II · parcial');
      await user.click(within(dialog).getByRole('button', { name: /^Guardar$/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      const patchCalls = fetchMock.mock.calls.filter(
        ([url, init]) =>
          String(url).endsWith('/api/salas/sala-alpha') &&
          (init as RequestInit | undefined)?.method === 'PATCH'
      );
      expect(patchCalls).toHaveLength(1);
      expect(JSON.parse(String((patchCalls[0]?.[1] as RequestInit).body))).toEqual({
        nombre: 'Cálculo II · parcial',
      });

      expect(screen.getByRole('heading', { name: 'Cálculo II · parcial' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Cálculo II' })).not.toBeInTheDocument();
      const statusBanner = screen
        .getAllByRole('status')
        .find((el) => /Nombre de sala actualizado/i.test(el.textContent || ''));
      expect(statusBanner).toBeDefined();
    });

    it('abre «¿Eliminar esta sala?» con foco inicial en Cancelar, permite cancelar y confirma eliminación vía DELETE', async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/api/salas/mias')) {
          return jsonResponse({ salas: [...sampleRooms] }, 200);
        }
        if (url.endsWith('/api/salas/sala-alpha') && init?.method === 'DELETE') {
          return new Response(null, { status: 204 });
        }
        return jsonResponse({ error: 'No encontrada' }, 404);
      });
      vi.stubGlobal('fetch', fetchMock);

      renderAuthenticatedApp('/salas');

      const optionsBtn = await screen.findByRole('button', { name: 'Opciones de Cálculo II' });
      await user.click(optionsBtn);
      await user.click(screen.getByRole('menuitem', { name: 'Eliminar sala' }));

      const alertDialog = await screen.findByRole('alertdialog');
      expect(
        within(alertDialog).getByRole('heading', { name: '¿Eliminar esta sala?' })
      ).toBeInTheDocument();
      expect(within(alertDialog).getByText('sala-alpha')).toBeInTheDocument();

      const cancelBtn = within(alertDialog).getByRole('button', { name: /^Cancelar$/i });
      const confirmDeleteBtn = within(alertDialog).getByRole('button', { name: /^Eliminar sala$/i });
      expect(confirmDeleteBtn.className).toContain('w-full');
      expect(confirmDeleteBtn.className).toMatch(/bg-\[#b91c1c\]/);
      expect(cancelBtn.className).not.toContain('w-full');
      expect(cancelBtn.parentElement?.className).toContain('flex-col-reverse');
      expect(
        cancelBtn.compareDocumentPosition(confirmDeleteBtn) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      await waitFor(() => {
        expect(cancelBtn).toHaveFocus();
      });

      await user.click(cancelBtn);
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Cálculo II')).toBeInTheDocument();

      await user.click(optionsBtn);
      await user.click(screen.getByRole('menuitem', { name: 'Eliminar sala' }));
      const reopened = await screen.findByRole('alertdialog');
      await user.click(within(reopened).getByRole('button', { name: /^Eliminar sala$/i }));

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });

      const deleteCalls = fetchMock.mock.calls.filter(
        ([url, init]) =>
          String(url).endsWith('/api/salas/sala-alpha') &&
          (init as RequestInit | undefined)?.method === 'DELETE'
      );
      expect(deleteCalls).toHaveLength(1);
      expect(screen.queryByText('Cálculo II')).not.toBeInTheDocument();
      expect(screen.getByText('Lectura silenciosa')).toBeInTheDocument();
      const statusBanner = screen
        .getAllByRole('status')
        .find((el) => /Sala eliminada/i.test(el.textContent || ''));
      expect(statusBanner).toBeDefined();
    });
  });

  describe('Sala mínima (/salas/:id): RoomBar popovers y MemberGrid', () => {
    it('inicia sin autoplay, muestra Tú/Anfitrión + Compañero 1..3, alterna Participantes, controla Ambiente sonoro y Volumen y restaura foco con Escape', async () => {
      const { user, writeTextSpy } = setupUserWithClipboard();
      const blueRoom = sampleRooms[0];

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
      const topbar = screen.getByRole('banner');
      expect(within(topbar).getByText('Mi salón')).toBeInTheDocument();
      expect(screen.queryByText('Sala colaborativa')).not.toBeInTheDocument();
      expect(screen.getByText('sala-alpha')).toBeInTheDocument();

      // Audio pausado al entrar (cero autoplay)
      const audioEl = container.querySelector('audio') as HTMLAudioElement | null;
      expect(audioEl).toBeInTheDocument();
      expect(audioEl).not.toHaveAttribute('autoplay');
      expect(playStub).not.toHaveBeenCalled();

      // Cuadrícula MemberGrid: Tú + Anfitrión + Compañero 1, 2, 3
      const memberGrid = screen.getByLabelText('Participantes de la sala');
      expect(within(memberGrid).getByLabelText('Tu cuadro en la sala')).toBeInTheDocument();
      expect(within(memberGrid).getByText('@andres.uv')).toBeInTheDocument();
      expect(within(memberGrid).getByText('Tú')).toBeInTheDocument();
      expect(within(memberGrid).getByText('Anfitrión')).toBeInTheDocument();
      expect(within(memberGrid).getByText('Compañero 1')).toBeInTheDocument();
      expect(within(memberGrid).getByText('Compañero 2')).toBeInTheDocument();
      expect(within(memberGrid).getByText('Compañero 3')).toBeInTheDocument();

      // Toggle Participantes
      const toggleParticipantsBtn = screen.getByRole('button', {
        name: /Ocultar participantes/i,
      });
      expect(toggleParticipantsBtn).toHaveAttribute('aria-pressed', 'true');
      await user.click(toggleParticipantsBtn);
      expect(screen.queryByLabelText('Participantes de la sala')).not.toBeInTheDocument();
      const showParticipantsBtn = screen.getByRole('button', {
        name: /Mostrar participantes/i,
      });
      expect(showParticipantsBtn).toHaveAttribute('aria-pressed', 'false');
      await user.click(showParticipantsBtn);
      expect(screen.getByLabelText('Participantes de la sala')).toBeInTheDocument();

      // Popover Ambiente sonoro (música sigue sonando al cerrar popover y Escape restaura foco)
      const soundBtn = screen.getByRole('button', { name: 'Ambiente sonoro' });
      await user.click(soundBtn);
      const soundDialog = await screen.findByRole('dialog', { name: 'Ambiente sonoro' });
      expect(within(soundDialog).getByText('Ambiente: Blue')).toBeInTheDocument();
      expect(
        within(soundDialog).getByRole('group', { name: 'Pistas del ambiente' })
      ).toBeInTheDocument();

      await user.click(within(soundDialog).getByRole('button', { name: /Reproducir/i }));
      await waitFor(() => {
        expect(playStub).toHaveBeenCalledTimes(1);
      });
      expect(within(soundDialog).getByRole('button', { name: /Pausar/i })).toBeInTheDocument();

      const pauseCallsBeforeEscape = pauseStub.mock.calls.length;
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: 'Ambiente sonoro' })).not.toBeInTheDocument();
      });
      expect(soundBtn).toHaveFocus();
      expect(pauseStub.mock.calls.length).toBe(pauseCallsBeforeEscape);

      await user.click(soundBtn);
      const reopenedSoundDialog = await screen.findByRole('dialog', { name: 'Ambiente sonoro' });
      await user.click(within(reopenedSoundDialog).getByRole('button', { name: /Pausar/i }));
      expect(pauseStub).toHaveBeenCalled();

      // Popover Volumen + Escape restaura foco
      const volumeBtn = screen.getByRole('button', { name: 'Volumen' });
      await user.click(volumeBtn);
      const volumeDialog = await screen.findByRole('dialog', { name: 'Volumen' });
      const slider = within(volumeDialog).getByRole('slider', {
        name: /Volumen del ambiente sonoro/i,
      });
      expect(slider).toHaveValue('70');
      fireEvent.change(slider, { target: { value: '35' } });
      expect(within(volumeDialog).getByText('35%')).toBeInTheDocument();
      expect(audioEl?.volume).toBeCloseTo(0.35);

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: 'Volumen' })).not.toBeInTheDocument();
      });
      expect(volumeBtn).toHaveFocus();

      // Copiar ID en RoomBar
      await user.click(screen.getByRole('button', { name: /Copiar ID de la sala sala-alpha/i }));
      expect(writeTextSpy).toHaveBeenCalledWith('sala-alpha');
      expect(await screen.findByText('ID copiado')).toBeInTheDocument();
      await waitFor(() => {
        expect(
          screen.getByText('ID de Cálculo II copiado al portapapeles')
        ).toBeInTheDocument();
      });

      // Salir de la sala vuelve a /panel
      const leaveLink = screen.getByRole('link', { name: /Salir de la sala/i });
      expect(leaveLink).toHaveAttribute('href', '/panel');
      await user.click(leaveLink);

      await waitFor(() => {
        expect(getPathname()).toBe('/panel');
      });
    });

    it('en una sala «ninguno» el popover Ambiente sonoro muestra estado silencioso sin controles de reproducción', async () => {
      const user = userEvent.setup();
      const silentRoom = sampleRooms[1];

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ sala: silentRoom }, 200))
      );

      renderAuthenticatedApp('/salas/sala-beta');

      expect(await screen.findByRole('heading', { name: 'Lectura silenciosa' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Ambiente sonoro' }));

      const soundDialog = await screen.findByRole('dialog', { name: 'Ambiente sonoro' });
      expect(within(soundDialog).getByText('Ambiente: Sin sonido')).toBeInTheDocument();
      expect(
        within(soundDialog).getByText('Sin sonido ambiental · Estudio en silencio')
      ).toBeInTheDocument();
      expect(within(soundDialog).queryByRole('button', { name: /Reproducir/i })).not.toBeInTheDocument();
      expect(playStub).not.toHaveBeenCalled();
    });

    it('muestra error «No pudimos cargar la sala.» ante 500 y recarga la sala al pulsar «Reintentar»', async () => {
      const user = userEvent.setup();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ error: 'Fallo temporal del servidor.' }, 500)
        )
        .mockResolvedValueOnce(jsonResponse({ sala: sampleRooms[0] }, 200));
      vi.stubGlobal('fetch', fetchMock);

      renderAuthenticatedApp('/salas/sala-alpha');

      expect(await screen.findByText('No pudimos cargar la sala.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Volver a Inicio/i })).toHaveAttribute(
        'href',
        '/panel'
      );
      expect(
        screen.queryByText('Esta sala no existe o fue eliminada.')
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Reintentar/i }));

      expect(
        await screen.findByRole('heading', { name: 'Cálculo II' })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ambiente sonoro' })).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('muestra alerta con instrucción manual si falla copiar el ID en /salas/:id', async () => {
      const { user, writeTextSpy, restoreExecCommand } = setupUserWithFailingClipboard();
      try {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue(jsonResponse({ sala: sampleRooms[0] }, 200))
        );

        renderAuthenticatedApp('/salas/sala-alpha');

        await screen.findByRole('heading', { name: 'Cálculo II' });
        await user.click(screen.getByRole('button', { name: /Copiar ID de la sala sala-alpha/i }));

        expect(writeTextSpy).toHaveBeenCalledWith('sala-alpha');
        const alertEl = await screen.findByRole('alert');
        expect(alertEl).toHaveTextContent(
          'No pudimos copiar el ID. Cópialo a mano: sala-alpha'
        );
        expect(screen.queryByText('ID copiado')).not.toBeInTheDocument();
      } finally {
        restoreExecCommand();
      }
    });

    it('muestra estado 404 «Esta sala no existe o fue eliminada.» con «Volver a Inicio» en /salas/no-existe', async () => {
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

      const backLink = screen.getByRole('link', { name: /Volver a Inicio/i });
      expect(backLink).toHaveAttribute('href', '/panel');

      await user.click(backLink);
      await waitFor(() => {
        expect(getPathname()).toBe('/panel');
      });
    });
  });

  describe('Ambiente sonoro (shuffleTracks y AmbientePlayer)', () => {
    it('shuffleTracks(AMBIENTES.blue.tracks, avoidSrc) nunca devuelve avoidSrc en el índice 0 en 50 ejecuciones', () => {
      const avoidSrc = AMBIENTES.blue.tracks[0].src;
      for (let run = 0; run < 50; run += 1) {
        const shuffled = shuffleTracks(AMBIENTES.blue.tracks, avoidSrc);
        expect(shuffled).toHaveLength(AMBIENTES.blue.tracks.length);
        expect(shuffled[0]?.src).not.toBe(avoidSrc);
      }
    });

    it('AmbientePlayer remezcla al terminar la última pista sin repetir la pista que acaba de sonar', async () => {
      const user = userEvent.setup();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

      const { container } = render(
        <ThemeProvider>
          <AmbientePlayer ambiente="blue" />
        </ThemeProvider>
      );

      await user.click(screen.getByRole('button', { name: /Reproducir/i }));
      await waitFor(() => {
        expect(playStub).toHaveBeenCalledTimes(1);
      });

      const audioEl = container.querySelector('audio');
      expect(audioEl).not.toBeNull();
      if (!audioEl) return;

      for (let step = 0; step < AMBIENTES.blue.tracks.length - 1; step += 1) {
        fireEvent.ended(audioEl);
      }

      expect(
        screen.getByText(
          `Reproduciendo pista ${AMBIENTES.blue.tracks.length} de ${AMBIENTES.blue.tracks.length}`
        )
      ).toBeInTheDocument();
      const lastTrackSrc = audioEl.getAttribute('src');
      expect(lastTrackSrc).toBeTruthy();

      randomSpy.mockReturnValue(0.99);
      fireEvent.ended(audioEl);

      expect(
        screen.getByText(`Reproduciendo pista 1 de ${AMBIENTES.blue.tracks.length}`)
      ).toBeInTheDocument();
      const nextCycleFirstSrc = audioEl.getAttribute('src');
      expect(nextCycleFirstSrc).toBeTruthy();
      expect(nextCycleFirstSrc).not.toBe(lastTrackSrc);
      await waitFor(() => {
        expect(playStub.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Servicio roomsApi (fetch real y modo mock VITE_USE_MOCKS=true)', () => {
    it('integra VITE_USE_MOCKS=true: creación, renombrado (400 y éxito) y eliminación (persistencia y 404)', async () => {
      vi.stubEnv('VITE_USE_MOCKS', 'true');
      setMockDelayForTests(0);
      resetMockState();

      expect(await getMyRooms('mock-token')).toEqual([]);

      await expect(createRoom('mock-token', { nombre: 'ab' })).rejects.toSatisfy(
        (err: unknown) => err instanceof RoomsApiError && err.status === 400
      );

      const created = await createRoom('mock-token', {
        nombre: 'Estudio Marea',
        ambiente: 'green',
      });
      expect(created.nombre).toBe('Estudio Marea');
      expect(created.ambiente).toBe('green');
      expect(created.id).toBeTruthy();

      await expect(renameRoom('mock-token', created.id, 'xy')).rejects.toSatisfy(
        (err: unknown) => err instanceof RoomsApiError && err.status === 400
      );

      const renamed = await renameRoom('mock-token', created.id, 'Estudio Marea II');
      expect(renamed.nombre).toBe('Estudio Marea II');

      const roomsAfterRename = await getMyRooms('mock-token');
      expect(roomsAfterRename).toHaveLength(1);
      expect(roomsAfterRename[0]?.nombre).toBe('Estudio Marea II');

      await expect(deleteRoom('mock-token', created.id)).resolves.toBeUndefined();
      expect(await getMyRooms('mock-token')).toEqual([]);

      await expect(getRoomById('mock-token', created.id)).rejects.toSatisfy(
        (err: unknown) => err instanceof RoomsApiError && err.status === 404
      );
      await expect(deleteRoom('mock-token', 'no-existe')).rejects.toSatisfy(
        (err: unknown) => err instanceof RoomsApiError && err.status === 404
      );
    });

    it('envía cabeceras Bearer y normaliza respuestas y errores HTTP en roomsApi (GET/POST/PATCH/DELETE)', async () => {
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
          jsonResponse({ sala: { ...sampleRooms[0], nombre: 'Cálculo Renombrado' } }, 200)
        )
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
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

      const renamed = await renameRoom('tok-123', 'sala-alpha', '  Cálculo Renombrado  ');
      expect(renamed.nombre).toBe('Cálculo Renombrado');
      const [patchUrl, patchInit] = fetchMock.mock.calls[2] as [string, RequestInit];
      expect(patchUrl).toMatch(/\/api\/salas\/sala-alpha$/);
      expect(patchInit.method).toBe('PATCH');
      expect(JSON.parse(String(patchInit.body))).toEqual({ nombre: 'Cálculo Renombrado' });

      await expect(deleteRoom('tok-123', 'sala-alpha')).resolves.toBeUndefined();
      const [delUrl, delInit] = fetchMock.mock.calls[3] as [string, RequestInit];
      expect(delUrl).toMatch(/\/api\/salas\/sala-alpha$/);
      expect(delInit.method).toBe('DELETE');

      await expect(getRoomById('tok-123', 'no-existe')).rejects.toSatisfy(
        (err: unknown) => err instanceof RoomsApiError && err.status === 404
      );
    });
  });

  describe('Auditoría automática de accesibilidad (vitest-axe)', () => {
    it('no reporta violaciones en /panel vacío ni con salas', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(jsonResponse({ salas: [] }, 200))
          .mockResolvedValueOnce(jsonResponse({ salas: sampleRooms }, 200))
      );

      const { container: emptyContainer, unmount } = renderAuthenticatedApp('/panel');
      expect(
        await screen.findByText('Puedes elegir entre dos ambientes o crear el tuyo')
      ).toBeInTheDocument();
      expect(await axe(emptyContainer)).toHaveNoViolations();
      unmount();

      const { container: withRoomsContainer } = renderAuthenticatedApp('/panel');
      expect(await screen.findByRole('heading', { name: 'Tus salas' })).toBeInTheDocument();
      expect(await axe(withRoomsContainer)).toHaveNoViolations();
    });

    it('no reporta violaciones con «CreateRoomDialog» abierto en /panel', async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ salas: [] }, 200))
      );

      const { container } = renderAuthenticatedApp('/panel');

      await user.click(await screen.findByRole('button', { name: /ambiente Blue/i }));
      const dialog = await screen.findByRole('dialog');

      expect(await axe(container)).toHaveNoViolations();
      if (!container.contains(dialog)) {
        expect(await axe(dialog)).toHaveNoViolations();
      }
    });

    it('no reporta violaciones en /salas (vacío, con salas, RenameRoomDialog y DeleteRoomDialog)', async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(jsonResponse({ salas: [] }, 200))
          .mockResolvedValue(jsonResponse({ salas: sampleRooms }, 200))
      );

      const { container: emptyContainer, unmount } = renderAuthenticatedApp('/salas');
      expect(
        await screen.findByRole('heading', { name: 'Todavía no tienes salas' })
      ).toBeInTheDocument();
      expect(await axe(emptyContainer)).toHaveNoViolations();
      unmount();

      const { container } = renderAuthenticatedApp('/salas');
      expect(await screen.findByText('Cálculo II')).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();

      await user.click(screen.getByRole('button', { name: 'Opciones de Cálculo II' }));
      await user.click(screen.getByRole('menuitem', { name: 'Renombrar sala' }));
      const renameDialog = await screen.findByRole('dialog');
      expect(await axe(container)).toHaveNoViolations();
      if (!container.contains(renameDialog)) {
        expect(await axe(renameDialog)).toHaveNoViolations();
      }

      await user.click(within(renameDialog).getByRole('button', { name: /^Cancelar$/i }));
      await user.click(screen.getByRole('button', { name: 'Opciones de Cálculo II' }));
      await user.click(screen.getByRole('menuitem', { name: 'Eliminar sala' }));
      const deleteDialog = await screen.findByRole('alertdialog');
      expect(await axe(container)).toHaveNoViolations();
      if (!container.contains(deleteDialog)) {
        expect(await axe(deleteDialog)).toHaveNoViolations();
      }
    });

    it('no reporta violaciones en /salas/:id con MemberGrid y popovers de RoomBar', async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ sala: sampleRooms[0] }, 200))
      );

      const { container } = renderAuthenticatedApp('/salas/sala-alpha');

      expect(await screen.findByRole('heading', { name: 'Cálculo II' })).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();

      await user.click(screen.getByRole('button', { name: 'Ambiente sonoro' }));
      const soundPopover = await screen.findByRole('dialog', { name: 'Ambiente sonoro' });
      await waitFor(() => {
        expect(soundPopover).toHaveClass('opacity-100');
      });
      expect(await axe(container)).toHaveNoViolations();

      await user.click(screen.getByRole('button', { name: 'Volumen' }));
      const volumePopover = await screen.findByRole('dialog', { name: 'Volumen' });
      await waitFor(() => {
        expect(volumePopover).toHaveClass('opacity-100');
      });
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

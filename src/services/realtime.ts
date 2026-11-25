import { io, type Socket } from 'socket.io-client';
import { firebaseAuth } from './firebase';
import { isMocksEnabled } from './mockConfig';
import { createMockRealtimeConnection } from './realtimeMock';

/**
 * Cliente del servidor de tiempo real (Socket.IO) del Sprint 3.
 * Los eventos y sus datos están documentados en
 * salon-estudio-backend/realtime/docs/EVENTOS.md.
 */

export interface Participante {
  socketId: string;
  uid: string;
  username: string;
  avatarUrl: string | null;
  microfono: boolean;
  camara: boolean;
}

export interface Mensaje {
  id: string;
  salaId: string;
  autorUid: string;
  autorUsername: string;
  texto: string;
  creadoEn: string;
  /** Lo agrega la API cuando el autor eliminó su cuenta (SDECG6-44). */
  autorEliminado?: boolean;
}

export interface SalaEnVivo {
  id: string;
  nombre: string;
  ambiente: string;
  anfitrionUid: string;
}

export type AckOk<T> = { ok: true } & T;
export interface AckError {
  ok: false;
  codigo: string;
  error: string;
}
export type AckRespuesta<T> = AckOk<T> | AckError;

export interface UnirseRespuesta {
  sala: SalaEnVivo;
  esAnfitrion: boolean;
  participantes: Participante[];
}

export interface HistorialRespuesta {
  mensajes: Mensaje[];
  hayMas: boolean;
}

/** Error que el servidor manda en `connect_error` (sección 1 de EVENTOS.md). */
export interface ErrorConexion {
  message: string;
  data?: { mensaje?: string };
}

type Handler = (...args: never[]) => void;

/**
 * Lo mínimo que la app necesita de un socket. Así la sala no depende
 * directamente de Socket.IO y en las pruebas se puede usar un servidor falso.
 */
export interface RealtimeConnection {
  readonly connected: boolean;
  on(event: string, handler: Handler): void;
  off(event: string, handler: Handler): void;
  request<T>(event: string, data: unknown): Promise<AckRespuesta<T>>;
  connect(): void;
  disconnect(): void;
  /** Pide un token nuevo en el siguiente intento de conexión (sesión vencida). */
  renovarToken(): void;
}

export interface RealtimeOptions {
  url: string;
  getToken: (forzar: boolean) => Promise<string>;
}

export type RealtimeFactory = (options: RealtimeOptions) => RealtimeConnection;

export const TIEMPO_ESPERA_MS = 8000;
export const SIN_RESPUESTA: AckError = {
  ok: false,
  codigo: 'SIN_RESPUESTA',
  error: 'No hubo respuesta del servidor. Intenta de nuevo.',
};

/** Conexión real con Socket.IO. El token se pide en cada intento, también al reconectar. */
function crearConexionSocketIo({ url, getToken }: RealtimeOptions): RealtimeConnection {
  let forzarToken = false;

  const socket: Socket = io(url, {
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: (cb) => {
      const forzar = forzarToken;
      forzarToken = false;
      getToken(forzar)
        .then((token) => cb({ token }))
        .catch(() => cb({ token: '' }));
    },
  });

  return {
    get connected() {
      return socket.connected;
    },
    on(event, handler) {
      socket.on(event, handler as (...args: unknown[]) => void);
    },
    off(event, handler) {
      socket.off(event, handler as (...args: unknown[]) => void);
    },
    async request<T>(event: string, data: unknown) {
      try {
        return (await socket.timeout(TIEMPO_ESPERA_MS).emitWithAck(event, data)) as AckRespuesta<T>;
      } catch {
        return SIN_RESPUESTA;
      }
    },
    connect() {
      socket.connect();
    },
    disconnect() {
      socket.disconnect();
    },
    renovarToken() {
      forzarToken = true;
    },
  };
}

let factoryDePrueba: RealtimeFactory | null = null;

/** Permite a las pruebas usar un servidor de tiempo real falso (null restaura el real). */
export function setRealtimeFactoryForTests(factory: RealtimeFactory | null): void {
  factoryDePrueba = factory;
}

export function getRealtimeUrl(): string {
  return (import.meta.env.VITE_REALTIME_URL || '').replace(/\/$/, '');
}

async function tokenDeFirebase(forzar: boolean): Promise<string> {
  const actual = firebaseAuth?.currentUser;
  if (!actual) return '';
  return actual.getIdToken(forzar);
}

/**
 * Crea la conexión de la sala o devuelve null si no hay servidor configurado
 * (sin VITE_REALTIME_URL y sin modo mock): la sala sigue funcionando sin chat.
 */
export function crearConexionTiempoReal(
  getToken: (forzar: boolean) => Promise<string> = tokenDeFirebase
): RealtimeConnection | null {
  if (factoryDePrueba) {
    return factoryDePrueba({ url: 'test://realtime', getToken });
  }
  if (isMocksEnabled()) {
    return createMockRealtimeConnection();
  }
  const url = getRealtimeUrl();
  if (!url) return null;
  return crearConexionSocketIo({ url, getToken });
}

/** Mensajes para cada error de conexión de EVENTOS.md. */
export const MENSAJES_CONEXION: Record<string, string> = {
  NO_AUTENTICADO: 'Debes iniciar sesión para continuar.',
  SESION_INVALIDA: 'Tu sesión expiró o no es válida. Vuelve a iniciar sesión.',
  PERFIL_INCOMPLETO: 'Aún no has elegido tu nombre de usuario.',
  ERROR_SERVIDOR: 'No pudimos conectarte. Intenta de nuevo.',
};

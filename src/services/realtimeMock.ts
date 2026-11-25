import type {
  AckRespuesta,
  ErrorConexion,
  Mensaje,
  Participante,
  RealtimeConnection,
} from './realtime';
import { getMockProfileSnapshot } from './mockApi';

type Handler = (...args: never[]) => void;
type Respondedor = (data: unknown) => AckRespuesta<Record<string, unknown>>;

const POR_PAGINA = 30;

export interface MockUsuario {
  uid: string;
  username: string;
  avatarUrl?: string | null;
}

/**
 * Servidor de tiempo real falso, en memoria. Lo usan el modo mock
 * (VITE_USE_MOCKS=true) y las pruebas automáticas para simular lo que hace
 * el servidor real: unirse, chat, historial de a 30 y avisos a la sala.
 */
export class MockRealtimeConnection implements RealtimeConnection {
  connected = false;
  readonly solicitudes: { event: string; data: unknown }[] = [];
  private handlers = new Map<string, Set<Handler>>();
  private respuestas = new Map<string, Respondedor[]>();
  private erroresConexion: ErrorConexion[] = [];
  private tokenRenovado = false;
  private salaActual: string | null = null;
  readonly mensajes = new Map<string, Mensaje[]>();
  readonly participantes = new Map<string, Participante[]>();
  private contador = 0;

  constructor(
    private usuario: MockUsuario = { uid: 'u-mock', username: 'estudiante' },
    private opciones: { conectarAlInstante?: boolean; anfitrionUid?: string } = {}
  ) {}

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
  }

  /** Dispara un evento como si viniera del servidor. */
  emitirDesdeServidor(event: string, ...args: unknown[]) {
    for (const handler of Array.from(this.handlers.get(event) ?? [])) {
      (handler as (...a: unknown[]) => void)(...args);
    }
  }

  connect() {
    const conectar = () => {
      const err = this.erroresConexion.shift();
      if (err) {
        this.emitirDesdeServidor('connect_error', err);
        return;
      }
      this.connected = true;
      this.emitirDesdeServidor('connect');
    };
    if (this.opciones.conectarAlInstante === false) return;
    queueMicrotask(conectar);
  }

  disconnect() {
    if (!this.connected) return;
    this.connected = false;
    this.emitirDesdeServidor('disconnect', 'io client disconnect');
  }

  renovarToken() {
    this.tokenRenovado = true;
  }

  get pidioTokenNuevo() {
    return this.tokenRenovado;
  }

  /** El siguiente intento de conexión falla con este código (p. ej. SESION_INVALIDA). */
  fallarConexion(codigo: string, mensaje = '') {
    this.erroresConexion.push({ message: codigo, data: { mensaje } });
  }

  cuantas(event: string) {
    return this.solicitudes.filter((s) => s.event === event).length;
  }

  /** Se cae la conexión (p. ej. se fue el internet). */
  simularCaida() {
    this.connected = false;
    this.salaActual = null;
    this.emitirDesdeServidor('disconnect', 'transport close');
  }

  /** Vuelve la conexión: Socket.IO reconecta solo y emite `connect` otra vez. */
  simularReconexion() {
    this.connected = true;
    this.emitirDesdeServidor('connect');
  }

  /** La próxima respuesta a `event` será esta (para probar errores). */
  responderUnaVez(event: string, respuesta: AckRespuesta<Record<string, unknown>>) {
    const lista = this.respuestas.get(event) ?? [];
    lista.push(() => respuesta);
    this.respuestas.set(event, lista);
  }

  /** Carga mensajes viejos en una sala (para probar el historial). */
  sembrarMensajes(salaId: string, mensajes: Mensaje[]) {
    this.mensajes.set(salaId, [...mensajes]);
  }

  async request<T>(event: string, data: unknown): Promise<AckRespuesta<T>> {
    this.solicitudes.push({ event, data });
    await Promise.resolve();
    const pendientes = this.respuestas.get(event);
    if (pendientes && pendientes.length > 0) {
      const responder = pendientes.shift()!;
      return responder(data) as AckRespuesta<T>;
    }
    return this.responder(event, data) as AckRespuesta<T>;
  }

  private yo(): Participante {
    return {
      socketId: `sock-${this.usuario.uid}`,
      uid: this.usuario.uid,
      username: this.usuario.username,
      avatarUrl: this.usuario.avatarUrl ?? null,
      microfono: false,
      camara: false,
    };
  }

  private responder(event: string, data: unknown): AckRespuesta<Record<string, unknown>> {
    const datos = (data ?? {}) as { salaId?: string; texto?: string; antesDe?: string };
    const salaId = String(datos.salaId ?? '').trim().toUpperCase();

    if (event === 'sala:unirse') {
      if (!salaId) {
        return { ok: false, codigo: 'SALA_NO_ENCONTRADA', error: 'No encontramos una sala con ese ID. Revisa que esté bien escrito.' };
      }
      this.salaActual = salaId;
      const lista = (this.participantes.get(salaId) ?? []).filter(
        (p) => p.socketId !== this.yo().socketId
      );
      lista.push(this.yo());
      this.participantes.set(salaId, lista);
      const anfitrionUid = this.opciones.anfitrionUid ?? this.usuario.uid;
      return {
        ok: true,
        sala: { id: salaId, nombre: '', ambiente: 'ninguno', anfitrionUid },
        esAnfitrion: anfitrionUid === this.usuario.uid,
        participantes: lista,
      };
    }

    if (event === 'sala:salir') {
      const lista = (this.participantes.get(salaId) ?? []).filter(
        (p) => p.socketId !== this.yo().socketId
      );
      this.participantes.set(salaId, lista);
      this.salaActual = null;
      return { ok: true };
    }

    if (event === 'chat:historial') {
      if (this.salaActual !== salaId) {
        return { ok: false, codigo: 'NO_ESTAS_EN_SALA', error: 'Primero debes entrar a la sala.' };
      }
      const todos = this.mensajes.get(salaId) ?? [];
      const filtrados = datos.antesDe
        ? todos.filter((m) => m.creadoEn < datos.antesDe!)
        : todos;
      const pagina = filtrados.slice(-POR_PAGINA);
      return { ok: true, mensajes: pagina, hayMas: filtrados.length > pagina.length };
    }

    if (event === 'chat:enviar') {
      if (this.salaActual !== salaId) {
        return { ok: false, codigo: 'NO_ESTAS_EN_SALA', error: 'Primero debes entrar a la sala.' };
      }
      const texto = String(datos.texto ?? '').trim();
      if (!texto) {
        return { ok: false, codigo: 'MENSAJE_VACIO', error: 'Escribe un mensaje antes de enviarlo.' };
      }
      if (texto.length > 1000) {
        return { ok: false, codigo: 'MENSAJE_LARGO', error: 'El mensaje puede tener máximo 1000 caracteres.' };
      }
      this.contador += 1;
      const mensaje: Mensaje = {
        id: `m-${Date.now()}-${this.contador}`,
        salaId,
        autorUid: this.usuario.uid,
        autorUsername: this.usuario.username,
        texto,
        creadoEn: new Date().toISOString(),
      };
      this.mensajes.set(salaId, [...(this.mensajes.get(salaId) ?? []), mensaje]);
      queueMicrotask(() => this.emitirDesdeServidor('chat:mensaje', mensaje));
      return { ok: true, mensaje };
    }

    if (event === 'presencia:estado') {
      return { ok: true };
    }

    return { ok: false, codigo: 'DATOS_INVALIDOS', error: 'La solicitud no es válida.' };
  }
}

/** Conexión para el modo mock: un solo usuario (el perfil mock), sin servidor. */
export function createMockRealtimeConnection(): RealtimeConnection {
  const perfil = getMockProfileSnapshot();
  return new MockRealtimeConnection({
    uid: perfil.uid || 'u-mock',
    username: perfil.username || 'estudiante',
  });
}

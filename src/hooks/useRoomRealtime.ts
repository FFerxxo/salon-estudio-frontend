import { useCallback, useEffect, useRef, useState } from 'react';
import {
  crearConexionTiempoReal,
  MENSAJES_CONEXION,
  type AckRespuesta,
  type ErrorConexion,
  type HistorialRespuesta,
  type Mensaje,
  type Participante,
  type RealtimeConnection,
  type UnirseRespuesta,
} from '../services/realtime';

export type EstadoConexion =
  | 'sin-servidor'
  | 'conectando'
  | 'conectado'
  | 'reconectando'
  | 'error';

export type EstadoHistorial = 'cargando' | 'listo' | 'error';

export interface ErrorDeConexion {
  codigo: string;
  mensaje: string;
}

export interface SalaActualizada {
  salaId: string;
  nombre: string;
}

export interface UseRoomRealtimeResult {
  estado: EstadoConexion;
  errorConexion: ErrorDeConexion | null;
  /** La sala no existe para el servidor de tiempo real (ID inválido o eliminada). */
  salaNoEncontrada: boolean;
  /** El anfitrión eliminó la sala mientras estábamos dentro. */
  salaEliminada: boolean;
  /** Último nombre recibido por `sala:actualizada`. */
  nombreSala: string | null;
  participantes: Participante[];
  mensajes: Mensaje[];
  historial: EstadoHistorial;
  hayMas: boolean;
  cargandoAnteriores: boolean;
  anuncioSala: string;
  anuncioChat: string;
  enviar: (texto: string) => Promise<AckRespuesta<{ mensaje: Mensaje }>>;
  cargarAnteriores: () => Promise<void>;
  reintentarHistorial: () => void;
  reintentarConexion: () => void;
  salir: () => void;
}

export const LARGO_MAXIMO_MENSAJE = 1000;

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
});

/** «3:45 p. m.» a partir de la fecha ISO del mensaje. */
export function formatearHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return formatoHora.format(fecha);
}

/** Une dos listas de mensajes sin repetir y en orden cronológico. */
export function unirMensajes(actuales: Mensaje[], nuevos: Mensaje[]): Mensaje[] {
  const porId = new Map<string, Mensaje>();
  for (const m of actuales) porId.set(m.id, m);
  for (const m of nuevos) porId.set(m.id, m);
  return Array.from(porId.values()).sort((a, b) =>
    a.creadoEn === b.creadoEn ? a.id.localeCompare(b.id) : a.creadoEn < b.creadoEn ? -1 : 1
  );
}

function nombreAutor(m: Mensaje): string {
  return m.autorEliminado ? 'Cuenta eliminada' : `@${m.autorUsername}`;
}

/** Texto que lee el lector de pantalla para un mensaje: autor, hora y texto. */
export function textoAccesibleMensaje(m: Mensaje): string {
  return `${nombreAutor(m)}, ${formatearHora(m.creadoEn)}: ${m.texto}`;
}

/**
 * Conecta la sala al servidor de tiempo real (SDECG6-50).
 * En cada conexión, también al reconectar, entra de nuevo a la sala y pide el historial.
 */
export function useRoomRealtime(
  salaId: string | undefined,
  usuarioUid: string | null | undefined,
  activo = true
): UseRoomRealtimeResult {
  const [estado, setEstado] = useState<EstadoConexion>('conectando');
  const [errorConexion, setErrorConexion] = useState<ErrorDeConexion | null>(null);
  const [salaNoEncontrada, setSalaNoEncontrada] = useState(false);
  const [salaEliminada, setSalaEliminada] = useState(false);
  const [nombreSala, setNombreSala] = useState<string | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [historial, setHistorial] = useState<EstadoHistorial>('cargando');
  const [hayMas, setHayMas] = useState(false);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const [anuncioSala, setAnuncioSala] = useState('');
  const [anuncioChat, setAnuncioChat] = useState('');

  const conexionRef = useRef<RealtimeConnection | null>(null);
  const yaSalioRef = useRef(false);
  const renovoTokenRef = useRef(false);
  const mensajesRef = useRef<Mensaje[]>([]);
  const uidRef = useRef(usuarioUid);
  uidRef.current = usuarioUid;

  const actualizarMensajes = useCallback((siguiente: (prev: Mensaje[]) => Mensaje[]) => {
    setMensajes((prev) => {
      const nuevos = siguiente(prev);
      mensajesRef.current = nuevos;
      return nuevos;
    });
  }, []);

  const pedirHistorial = useCallback(
    async (conexion: RealtimeConnection, id: string) => {
      setHistorial((prev) => (mensajesRef.current.length > 0 ? prev : 'cargando'));
      const res = await conexion.request<HistorialRespuesta>('chat:historial', { salaId: id });
      if (!res.ok) {
        setHistorial('error');
        return;
      }
      const teniaMensajes = mensajesRef.current.length > 0;
      actualizarMensajes((prev) => unirMensajes(prev, res.mensajes));
      if (!teniaMensajes) setHayMas(res.hayMas);
      setHistorial('listo');
    },
    [actualizarMensajes]
  );

  useEffect(() => {
    if (!activo || !salaId) return;

    const conexion = crearConexionTiempoReal();
    if (!conexion) {
      setEstado('sin-servidor');
      return;
    }
    conexionRef.current = conexion;
    yaSalioRef.current = false;
    renovoTokenRef.current = false;
    let vivo = true;

    const alConectar = () => {
      if (!vivo) return;
      setEstado('conectando');
      setErrorConexion(null);
      void (async () => {
        const res = await conexion.request<UnirseRespuesta>('sala:unirse', { salaId });
        if (!vivo) return;
        if (!res.ok) {
          if (res.codigo === 'SALA_NO_ENCONTRADA') {
            setSalaNoEncontrada(true);
          } else {
            setErrorConexion({ codigo: res.codigo, mensaje: res.error });
          }
          setEstado('error');
          return;
        }
        renovoTokenRef.current = false;
        setParticipantes(res.participantes ?? []);
        setEstado('conectado');
        await pedirHistorial(conexion, salaId);
      })();
    };

    const alDesconectar = (razon?: string) => {
      if (!vivo || razon === 'io client disconnect') return;
      setEstado('reconectando');
    };

    const alFallarConexion = (err: ErrorConexion) => {
      if (!vivo) return;
      const codigo = err?.message || 'ERROR_SERVIDOR';
      if (codigo === 'SESION_INVALIDA' && !renovoTokenRef.current) {
        // Token vencido: se pide uno nuevo y se reintenta una sola vez.
        renovoTokenRef.current = true;
        conexion.renovarToken();
        conexion.connect();
        return;
      }
      const conocido = MENSAJES_CONEXION[codigo];
      if (!conocido) {
        // Error de red: Socket.IO sigue reintentando solo.
        setEstado('reconectando');
        return;
      }
      setErrorConexion({ codigo, mensaje: err?.data?.mensaje || conocido });
      setEstado('error');
    };

    const alRecibirParticipantes = (datos: { salaId: string; participantes: Participante[] }) => {
      if (datos?.salaId !== salaId) return;
      setParticipantes(datos.participantes ?? []);
    };

    const alEntrar = (datos: { salaId: string; participante: Participante }) => {
      if (datos?.salaId !== salaId || !datos.participante) return;
      setAnuncioSala(`@${datos.participante.username} entró a la sala`);
    };

    const alSalir = (datos: { salaId: string; username: string; uid: string }) => {
      if (datos?.salaId !== salaId) return;
      setAnuncioSala(`@${datos.username} salió de la sala`);
    };

    const alRecibirMensaje = (m: Mensaje) => {
      if (!m || m.salaId !== salaId) return;
      actualizarMensajes((prev) => unirMensajes(prev, [m]));
      setHistorial('listo');
      if (m.autorUid !== uidRef.current) {
        setAnuncioChat(textoAccesibleMensaje(m));
      }
    };

    conexion.on('connect', alConectar);
    conexion.on('disconnect', alDesconectar);
    conexion.on('connect_error', alFallarConexion);
    conexion.on('sala:participantes', alRecibirParticipantes);
    conexion.on('sala:participante-entro', alEntrar);
    conexion.on('sala:participante-salio', alSalir);
    conexion.on('chat:mensaje', alRecibirMensaje);
    setEstado('conectando');
    conexion.connect();

    return () => {
      vivo = false;
      conexion.off('connect', alConectar);
      conexion.off('disconnect', alDesconectar);
      conexion.off('connect_error', alFallarConexion);
      conexion.off('sala:participantes', alRecibirParticipantes);
      conexion.off('sala:participante-entro', alEntrar);
      conexion.off('sala:participante-salio', alSalir);
      conexion.off('chat:mensaje', alRecibirMensaje);
      if (!yaSalioRef.current && conexion.connected) {
        void conexion.request('sala:salir', { salaId });
      }
      conexion.disconnect();
      conexionRef.current = null;
      mensajesRef.current = [];
      setMensajes([]);
      setParticipantes([]);
      setHayMas(false);
      setSalaNoEncontrada(false);
      setSalaEliminada(false);
      setNombreSala(null);
    };
  }, [activo, salaId, pedirHistorial, actualizarMensajes]);

  const enviar = useCallback(
    async (texto: string): Promise<AckRespuesta<{ mensaje: Mensaje }>> => {
      const conexion = conexionRef.current;
      const limpio = texto.trim();
      if (!limpio) {
        return { ok: false, codigo: 'MENSAJE_VACIO', error: 'Escribe un mensaje antes de enviarlo.' };
      }
      if (!conexion || !salaId || !conexion.connected) {
        return {
          ok: false,
          codigo: 'SIN_CONEXION',
          error: 'No hay conexión. Revisa tu internet e inténtalo de nuevo.',
        };
      }
      const res = await conexion.request<{ mensaje: Mensaje }>('chat:enviar', {
        salaId,
        texto: limpio,
      });
      if (res.ok && res.mensaje) {
        actualizarMensajes((prev) => unirMensajes(prev, [res.mensaje]));
      }
      return res;
    },
    [salaId, actualizarMensajes]
  );

  const cargarAnteriores = useCallback(async () => {
    const conexion = conexionRef.current;
    const masViejo = mensajesRef.current[0];
    if (!conexion || !salaId || !masViejo) return;
    setCargandoAnteriores(true);
    const res = await conexion.request<HistorialRespuesta>('chat:historial', {
      salaId,
      antesDe: masViejo.creadoEn,
    });
    setCargandoAnteriores(false);
    if (!res.ok) return;
    actualizarMensajes((prev) => unirMensajes(res.mensajes, prev));
    setHayMas(res.hayMas);
  }, [salaId, actualizarMensajes]);

  const reintentarHistorial = useCallback(() => {
    const conexion = conexionRef.current;
    if (conexion && salaId) void pedirHistorial(conexion, salaId);
  }, [salaId, pedirHistorial]);

  const reintentarConexion = useCallback(() => {
    const conexion = conexionRef.current;
    if (!conexion) return;
    renovoTokenRef.current = false;
    setErrorConexion(null);
    setEstado('conectando');
    conexion.connect();
  }, []);

  const salir = useCallback(() => {
    const conexion = conexionRef.current;
    if (!conexion || !salaId || yaSalioRef.current) return;
    yaSalioRef.current = true;
    if (conexion.connected) {
      void conexion.request('sala:salir', { salaId });
    }
  }, [salaId]);

  return {
    estado,
    errorConexion,
    salaNoEncontrada,
    salaEliminada,
    nombreSala,
    participantes,
    mensajes,
    historial,
    hayMas,
    cargandoAnteriores,
    anuncioSala,
    anuncioChat,
    enviar,
    cargarAnteriores,
    reintentarHistorial,
    reintentarConexion,
    salir,
  };
}

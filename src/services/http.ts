import type { User } from 'firebase/auth';

export function urlApi(ruta: string): string {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${ruta}`;
}

export type ErroresCampo = Partial<Record<string, string>>;

/** Error de la API con el código HTTP y, si vienen, los errores por campo. */
export class ErrorApi extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errores: ErroresCampo = {},
    public readonly codigo?: string
  ) {
    super(message);
    this.name = 'ErrorApi';
  }
}

export const MENSAJE_SIN_CONEXION = 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.';

interface OpcionesPeticion {
  metodo?: 'GET' | 'POST';
  cuerpo?: unknown;
  /** Si se envía, la petición lleva el ID token de Firebase (rutas privadas). */
  usuario?: User | null;
}

export async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opciones.cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (opciones.usuario) headers.Authorization = `Bearer ${await opciones.usuario.getIdToken()}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(urlApi(ruta), {
      method: opciones.metodo ?? 'GET',
      headers,
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(MENSAJE_SIN_CONEXION, 0);
  }

  let datos: unknown = null;
  try {
    datos = await respuesta.json();
  } catch {
    // Respuesta sin cuerpo JSON (por ejemplo, el servidor está despertando).
  }

  if (!respuesta.ok) {
    const cuerpo = (datos ?? {}) as { error?: string; errores?: ErroresCampo; codigo?: string };
    throw new ErrorApi(
      cuerpo.error ?? MENSAJE_SIN_CONEXION,
      respuesta.status,
      cuerpo.errores ?? {},
      cuerpo.codigo
    );
  }

  return datos as T;
}

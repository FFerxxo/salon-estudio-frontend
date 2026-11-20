import type { AmbienteId } from '../content/ambientes';
import * as mockApi from './mockApi';
import { isMocksEnabled } from './mockConfig';

export interface Room {
  id: string;
  nombre: string;
  ambiente: AmbienteId;
  anfitrionUid: string;
  creadaEn: string;
}

export interface CreateRoomPayload {
  nombre: string;
  ambiente?: AmbienteId;
}

interface BackendRoomPayload {
  id?: string;
  nombre?: string;
  ambiente?: string;
  anfitrionUid?: string;
  creadaEn?: string;
}

interface BackendErrorBody {
  error?: string;
  message?: string;
  code?: string;
  codigo?: string;
  errores?: Record<string, unknown>;
}

export class RoomsApiError extends Error {
  status: number;
  code: string;
  fieldErrors?: { nombre?: string };

  constructor(
    message: string,
    status: number,
    code = 'API_ERROR',
    fieldErrors?: { nombre?: string }
  ) {
    super(message);
    this.name = 'RoomsApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Valida que el nombre de la sala tenga entre 3 y 50 caracteres sin contar espacios extremos. */
export function validateRoomName(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed.length > 50) {
    return 'El nombre debe tener entre 3 y 50 caracteres.';
  }
  return null;
}

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function parseAmbienteId(raw?: string): AmbienteId {
  if (raw === 'blue' || raw === 'green' || raw === 'ninguno') {
    return raw;
  }
  return 'ninguno';
}

function normalizeRoom(raw: BackendRoomPayload): Room {
  return {
    id: raw.id ?? '',
    nombre: raw.nombre ?? '',
    ambiente: parseAmbienteId(raw.ambiente),
    anfitrionUid: raw.anfitrionUid ?? '',
    creadaEn: raw.creadaEn ?? '',
  };
}

async function readErrorBody(response: Response): Promise<BackendErrorBody> {
  try {
    return (await response.json()) as BackendErrorBody;
  } catch {
    return {};
  }
}

/** Obtiene las salas creadas por el estudiante autenticado vía GET /api/salas/mias. */
export async function getMyRooms(idToken: string): Promise<Room[]> {
  if (isMocksEnabled()) {
    return mockApi.mockGetMyRooms();
  }

  const response = await fetch(`${getApiBaseUrl()}/api/salas/mias`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const body = await readErrorBody(response);
    const defaultMsg =
      response.status === 401
        ? 'Tu sesión terminó. Vuelve a ingresar.'
        : 'No pudimos cargar tus salas.';
    const message = body.error || body.message || defaultMsg;
    const code =
      body.code ||
      body.codigo ||
      (response.status === 401 ? 'SESSION_EXPIRED' : `HTTP_${response.status}`);
    throw new RoomsApiError(message, response.status, code);
  }

  const data = (await response.json()) as { salas?: BackendRoomPayload[] };
  return (data.salas ?? []).map(normalizeRoom);
}

/** Crea una sala de estudio vía POST /api/salas y devuelve el registro creado. */
export async function createRoom(
  idToken: string,
  payload: CreateRoomPayload
): Promise<Room> {
  if (isMocksEnabled()) {
    return mockApi.mockCreateRoom(payload);
  }

  const response = await fetch(`${getApiBaseUrl()}/api/salas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      nombre: payload.nombre.trim(),
      ambiente: payload.ambiente ?? 'ninguno',
    }),
  });

  if (!response.ok) {
    const body = await readErrorBody(response);

    if (response.status === 400) {
      const rawNombreErr = body.errores?.nombre;
      const nombreErr =
        typeof rawNombreErr === 'string' && rawNombreErr.trim()
          ? rawNombreErr.trim()
          : body.error || body.message || 'El nombre debe tener entre 3 y 50 caracteres.';
      const message = body.error || body.message || nombreErr;
      const code = body.code || body.codigo || 'VALIDATION_ERROR';
      throw new RoomsApiError(message, 400, code, { nombre: nombreErr });
    }

    if (response.status === 401) {
      const message = body.error || body.message || 'Tu sesión terminó. Vuelve a ingresar.';
      const code = body.code || body.codigo || 'SESSION_EXPIRED';
      throw new RoomsApiError(message, 401, code);
    }

    const message = body.error || body.message || 'No pudimos crear la sala. Intenta de nuevo.';
    const code = body.code || body.codigo || `HTTP_${response.status}`;
    throw new RoomsApiError(message, response.status, code);
  }

  const data = (await response.json()) as { sala?: BackendRoomPayload } & BackendRoomPayload;
  return normalizeRoom(data.sala ?? data);
}

/** Obtiene el detalle de una sala específica vía GET /api/salas/:id. */
export async function getRoomById(idToken: string, roomId: string): Promise<Room> {
  if (isMocksEnabled()) {
    return mockApi.mockGetRoomById(roomId);
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/salas/${encodeURIComponent(roomId)}`,
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    }
  );

  if (!response.ok) {
    const body = await readErrorBody(response);

    if (response.status === 404) {
      const message = body.error || body.message || 'Esta sala no existe o fue eliminada.';
      const code = body.code || body.codigo || 'ROOM_NOT_FOUND';
      throw new RoomsApiError(message, 404, code);
    }

    if (response.status === 401) {
      const message = body.error || body.message || 'Tu sesión terminó. Vuelve a ingresar.';
      const code = body.code || body.codigo || 'SESSION_EXPIRED';
      throw new RoomsApiError(message, 401, code);
    }

    const message = body.error || body.message || 'No pudimos cargar la sala.';
    const code = body.code || body.codigo || `HTTP_${response.status}`;
    throw new RoomsApiError(message, response.status, code);
  }

  const data = (await response.json()) as { sala?: BackendRoomPayload } & BackendRoomPayload;
  return normalizeRoom(data.sala ?? data);
}

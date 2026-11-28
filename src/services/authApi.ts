import { isMocksEnabled } from './mockConfig';
import * as mockApi from './mockApi';
import { resolveAvatarEmoji } from '../components/AvatarPicker';

export interface StudentProfile {
  uid: string;
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string;
  avatarUrl?: string | null;
  correo: string;
  provider?: 'password' | 'google';
  creadoEn?: string;
}

export interface CreateProfilePayload {
  nombres: string;
  apellidos: string;
  username: string;
  avatar?: string;
  avatarUrl?: string | null;
  correo?: string;
  provider?: 'password' | 'google';
}

export interface UpdateProfilePayload {
  nombres?: string;
  apellidos?: string;
  username?: string;
  avatar?: string;
  avatarUrl?: string | null;
  correo?: string;
}

export type AuthApiFieldName =
  | 'nombres'
  | 'apellidos'
  | 'username'
  | 'avatarUrl'
  | 'email'
  | 'correo';
export type AuthApiFieldErrors = Partial<Record<AuthApiFieldName, string>>;

interface BackendUserPayload {
  uid?: string;
  nombres?: string;
  apellidos?: string;
  username?: string;
  avatar?: string;
  avatarUrl?: string | null;
  email?: string;
  correo?: string;
  proveedor?: string;
  provider?: string;
  creadoEn?: string;
}

export class AuthApiError extends Error {
  status: number;
  code: string;
  field?: 'username' | 'email' | 'general';
  fieldErrors?: AuthApiFieldErrors;

  constructor(
    message: string,
    status: number,
    code = 'API_ERROR',
    field?: 'username' | 'email' | 'general',
    fieldErrors?: AuthApiFieldErrors
  ) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
    this.field = field;
    this.fieldErrors = fieldErrors;
  }
}

export const INVALID_CREDENTIALS_MESSAGE = 'Usuario o contraseña incorrectos.';
export const TOO_MANY_ATTEMPTS_MESSAGE =
  'Demasiados intentos. Espera unos minutos e intenta de nuevo.';

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/** Avatar que acepta el back: emoji del selector o enlace https; si no, null. */
function toAvatarForApi(raw?: string | null): string | null {
  return toValidHttpsAvatarUrl(raw) ?? resolveAvatarEmoji(raw);
}

function toValidHttpsAvatarUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}

function parseProvider(raw?: string): 'password' | 'google' | undefined {
  if (raw === 'google' || raw === 'google.com') return 'google';
  if (raw === 'password') return 'password';
  return undefined;
}

function normalizeStudentProfile(
  raw: BackendUserPayload,
  fallback?: { avatar?: string; correo?: string; provider?: 'password' | 'google' }
): StudentProfile {
  const avatarUrl =
    typeof raw.avatarUrl === 'string' && raw.avatarUrl.trim() ? raw.avatarUrl.trim() : null;
  const explicitAvatar = typeof raw.avatar === 'string' && raw.avatar.trim() ? raw.avatar.trim() : undefined;

  return {
    uid: raw.uid ?? '',
    nombres: raw.nombres ?? '',
    apellidos: raw.apellidos ?? '',
    username: raw.username ?? '',
    avatar: explicitAvatar ?? avatarUrl ?? fallback?.avatar ?? '🚀',
    avatarUrl,
    correo: raw.email ?? raw.correo ?? fallback?.correo ?? '',
    provider: parseProvider(raw.proveedor ?? raw.provider ?? fallback?.provider),
    creadoEn: raw.creadoEn,
  };
}

function sanitizeFieldErrors(raw: unknown): AuthApiFieldErrors | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const entries = Object.entries(raw as Record<string, unknown>);
  const validKeys: AuthApiFieldName[] = [
    'nombres',
    'apellidos',
    'username',
    'avatarUrl',
    'email',
    'correo',
  ];
  const cleaned: AuthApiFieldErrors = {};

  for (const [key, val] of entries) {
    if (validKeys.includes(key as AuthApiFieldName) && typeof val === 'string' && val.trim()) {
      cleaned[key as AuthApiFieldName] = val.trim();
    }
  }

  if (cleaned.correo && !cleaned.email) {
    cleaned.email = cleaned.correo;
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

async function parseErrorResponse(
  response: Response,
  defaultField?: 'username' | 'email' | 'general'
): Promise<AuthApiError> {
  let message = 'No se pudo completar la solicitud. Intenta nuevamente.';
  let code = `HTTP_${response.status}`;
  let field: 'username' | 'email' | 'general' | undefined = defaultField;
  let fieldErrors: AuthApiFieldErrors | undefined;
  let rawField: 'username' | 'email' | 'correo' | 'general' | undefined;

  try {
    const body = (await response.json()) as {
      error?: string;
      message?: string;
      code?: string;
      codigo?: string;
      field?: 'username' | 'email' | 'correo' | 'general';
      campo?: 'username' | 'email' | 'correo' | 'general';
      errores?: Record<string, unknown>;
    };
    message = body.error || body.message || message;
    if (body.code || body.codigo) code = body.code || body.codigo || code;
    rawField = body.field ?? body.campo;
    if (rawField) {
      field = rawField === 'correo' ? 'email' : rawField;
    }
    fieldErrors = sanitizeFieldErrors(body.errores);
  } catch {
    // Mantiene el mensaje predeterminado cuando no hay cuerpo JSON
  }

  if (response.status === 409) {
    const lowerMsg = message.toLowerCase();
    const isEmailConflict =
      rawField === 'correo' ||
      rawField === 'email' ||
      Boolean(fieldErrors?.correo || fieldErrors?.email) ||
      lowerMsg.includes('correo');

    if (isEmailConflict) {
      code = 'EMAIL_TAKEN';
      field = 'email';
    } else if (fieldErrors?.username || lowerMsg.includes('usuario') || lowerMsg.includes('username')) {
      if (code === 'HTTP_409') code = 'USERNAME_TAKEN';
      field = field ?? 'username';
    } else if (lowerMsg.includes('perfil creado') || lowerMsg.includes('ya tiene un perfil')) {
      code = 'PROFILE_ALREADY_EXISTS';
      field = 'general';
    } else if (!field) {
      field = code.toLowerCase().includes('email') ? 'email' : 'username';
    }
  } else if (response.status === 400 && !field && fieldErrors) {
    if (fieldErrors.username) field = 'username';
    else if (fieldErrors.email || fieldErrors.correo) field = 'email';
  }

  return new AuthApiError(message, response.status, code, field, fieldErrors);
}

/** Autentica por @usuario vía POST /api/auth/ingresar-usuario y devuelve el customToken de Firebase. */
export async function loginWithUsername(
  username: string,
  password: string
): Promise<{ customToken: string }> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/api/auth/ingresar-usuario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
    });
  } catch {
    throw new AuthApiError(
      'No pudimos conectarnos con el servidor. Intenta de nuevo en unos segundos.',
      503,
      'NETWORK_ERROR'
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      let msg = TOO_MANY_ATTEMPTS_MESSAGE;
      try {
        const body = (await response.json()) as { error?: string; message?: string };
        msg = body.error || body.message || msg;
      } catch {
        // Mantiene el mensaje predeterminado cuando no hay cuerpo JSON
      }
      throw new AuthApiError(msg, 429, 'TOO_MANY_ATTEMPTS');
    }

    if (response.status === 401) {
      throw new AuthApiError(INVALID_CREDENTIALS_MESSAGE, 401, 'INVALID_CREDENTIALS');
    }

    throw await parseErrorResponse(response);
  }

  const data = (await response.json()) as { customToken?: string };
  if (!data.customToken) {
    throw new AuthApiError(
      'No pudimos completar el ingreso en este momento. Intenta de nuevo.',
      502,
      'MISSING_CUSTOM_TOKEN'
    );
  }

  return { customToken: data.customToken };
}

/** Verifica disponibilidad del @username contra GET /api/usuarios/disponible?username=. */
export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean }> {
  if (isMocksEnabled()) {
    return mockApi.mockCheckUsernameAvailability(username);
  }

  const clean = encodeURIComponent(username.trim().toLowerCase());
  const response = await fetch(
    `${getApiBaseUrl()}/api/usuarios/disponible?username=${clean}`
  );
  if (!response.ok) {
    throw await parseErrorResponse(
      response,
      response.status === 400 ? 'username' : undefined
    );
  }
  const data = (await response.json()) as { disponible?: boolean; available?: boolean };
  return { available: Boolean(data.disponible ?? data.available) };
}

/** Crea el perfil del estudiante en Firestore vía POST /api/usuarios sin enviar correo ni provider. */
export async function createStudentProfile(
  idToken: string,
  payload: CreateProfilePayload
): Promise<StudentProfile> {
  const requestBody = {
    nombres: payload.nombres,
    apellidos: payload.apellidos,
    username: payload.username,
    avatarUrl: toAvatarForApi(payload.avatarUrl ?? payload.avatar),
  };

  const response = await fetch(`${getApiBaseUrl()}/api/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = (await response.json()) as { user?: BackendUserPayload } & BackendUserPayload;
  const userBody = data.user ?? data;
  return normalizeStudentProfile(userBody, {
    avatar: payload.avatar,
    correo: payload.correo,
    provider: payload.provider,
  });
}

/** Consulta GET /api/usuarios/me para verificar si la cuenta ya tiene perfil y @username. */
export async function getMyProfile(
  idToken: string
): Promise<{ profileComplete: boolean; user?: StudentProfile }> {
  if (isMocksEnabled()) {
    return mockApi.mockGetMyProfile();
  }

  const response = await fetch(`${getApiBaseUrl()}/api/usuarios/me`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (response.status === 404) {
    return { profileComplete: false };
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = (await response.json()) as {
    profileComplete?: boolean;
    user?: BackendUserPayload;
  } & BackendUserPayload;

  if (data.profileComplete === false) {
    return { profileComplete: false };
  }

  const rawUser = data.user ?? data;
  const user = rawUser.username ? normalizeStudentProfile(rawUser) : undefined;
  return {
    profileComplete: data.profileComplete ?? Boolean(user?.username),
    user,
  };
}

/** Actualiza parcialmente el perfil autenticado vía PATCH /api/usuarios/me. */
export async function updateMyProfile(
  idToken: string,
  payload: UpdateProfilePayload
): Promise<StudentProfile> {
  if (isMocksEnabled()) {
    return mockApi.mockUpdateMyProfile(payload);
  }

  const requestBody: Record<string, unknown> = {};

  if (payload.nombres !== undefined) {
    requestBody.nombres = payload.nombres.trim();
  }
  if (payload.apellidos !== undefined) {
    requestBody.apellidos = payload.apellidos.trim();
  }
  if (payload.username !== undefined) {
    requestBody.username = payload.username.trim().toLowerCase();
  }
  // El back recibe el correo como `email` (validation/usuario.ts).
  if (payload.correo !== undefined) {
    requestBody.email = payload.correo.trim();
  }

  // El back guarda el avatar en `avatarUrl`: un emoji del selector o un enlace https.
  if (payload.avatar !== undefined) {
    const avatar = toAvatarForApi(payload.avatar);
    if (avatar) requestBody.avatarUrl = avatar;
  }

  if (payload.avatarUrl !== undefined && requestBody.avatarUrl === undefined) {
    if (payload.avatarUrl === null) {
      requestBody.avatarUrl = null;
    } else {
      // Un valor que no es emoji del selector ni https se omite: no borra el avatar guardado.
      const avatar = toAvatarForApi(payload.avatarUrl);
      if (avatar) requestBody.avatarUrl = avatar;
    }
  }

  const response = await fetch(`${getApiBaseUrl()}/api/usuarios/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = (await response.json()) as { user?: BackendUserPayload } & BackendUserPayload;
  return normalizeStudentProfile(data.user ?? data);
}

/** Elimina la cuenta del estudiante autenticado vía DELETE /api/usuarios/me. */
export async function deleteMyAccount(idToken: string): Promise<void> {
  if (isMocksEnabled()) {
    return mockApi.mockDeleteMyAccount();
  }

  const response = await fetch(`${getApiBaseUrl()}/api/usuarios/me`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    let msg =
      response.status === 401
        ? 'Tu sesión terminó. Vuelve a ingresar.'
        : 'No pudimos eliminar tu cuenta. Intenta de nuevo.';
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      msg = body.error || body.message || msg;
    } catch {
      // Mantiene el mensaje predeterminado cuando no hay cuerpo JSON
    }
    throw new AuthApiError(
      msg,
      response.status,
      response.status === 401 ? 'SESSION_EXPIRED' : 'DELETE_ACCOUNT_ERROR'
    );
  }
}

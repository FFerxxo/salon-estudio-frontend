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

export type AuthApiFieldName = 'nombres' | 'apellidos' | 'username' | 'avatarUrl' | 'email';
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

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
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
  const validKeys: AuthApiFieldName[] = ['nombres', 'apellidos', 'username', 'avatarUrl', 'email'];
  const cleaned: AuthApiFieldErrors = {};

  for (const [key, val] of entries) {
    if (validKeys.includes(key as AuthApiFieldName) && typeof val === 'string' && val.trim()) {
      cleaned[key as AuthApiFieldName] = val.trim();
    }
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

  try {
    const body = (await response.json()) as {
      error?: string;
      message?: string;
      code?: string;
      codigo?: string;
      field?: 'username' | 'email' | 'general';
      errores?: Record<string, unknown>;
    };
    message = body.error || body.message || message;
    if (body.code || body.codigo) code = body.code || body.codigo || code;
    if (body.field) field = body.field;
    fieldErrors = sanitizeFieldErrors(body.errores);
  } catch {
    // Mantiene el mensaje predeterminado cuando no hay cuerpo JSON
  }

  if (response.status === 409) {
    const lowerMsg = message.toLowerCase();
    if (fieldErrors?.username || lowerMsg.includes('usuario') || lowerMsg.includes('username')) {
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
    else if (fieldErrors.email) field = 'email';
  }

  return new AuthApiError(message, response.status, code, field, fieldErrors);
}

/** Verifica disponibilidad del @username contra GET /api/usuarios/disponible?username=. */
export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean }> {
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
    avatarUrl: toValidHttpsAvatarUrl(payload.avatarUrl ?? payload.avatar),
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

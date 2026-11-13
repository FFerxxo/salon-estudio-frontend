export interface StudentProfile {
  uid: string;
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string;
  correo: string;
  provider?: 'password' | 'google';
}

export interface CreateProfilePayload {
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string;
  correo: string;
  provider?: 'password' | 'google';
}

export class AuthApiError extends Error {
  status: number;
  code: string;
  field?: 'username' | 'email' | 'general';

  constructor(
    message: string,
    status: number,
    code = 'API_ERROR',
    field?: 'username' | 'email' | 'general'
  ) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
}

async function parseErrorResponse(response: Response): Promise<AuthApiError> {
  let message = 'No se pudo completar la solicitud. Intenta nuevamente.';
  let code = `HTTP_${response.status}`;
  let field: 'username' | 'email' | 'general' | undefined;

  try {
    const body = (await response.json()) as {
      error?: string;
      message?: string;
      code?: string;
      field?: 'username' | 'email' | 'general';
    };
    message = body.error || body.message || message;
    if (body.code) code = body.code;
    if (body.field) field = body.field;
  } catch {
    // Mantiene el mensaje predeterminado cuando no hay cuerpo JSON
  }

  if (response.status === 409 && !field) {
    field = code.toLowerCase().includes('email') ? 'email' : 'username';
  }

  return new AuthApiError(message, response.status, code, field);
}

/** Verifica disponibilidad del @username contra la API antes o durante el registro. */
export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean }> {
  const clean = encodeURIComponent(username.trim().toLowerCase());
  const response = await fetch(
    `${getApiBaseUrl()}/api/usuarios/disponibilidad?username=${clean}`
  );
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  return (await response.json()) as { available: boolean };
}

/** Crea o completa el perfil del estudiante en Firestore a través de backend-api. */
export async function createStudentProfile(
  idToken: string,
  payload: CreateProfilePayload
): Promise<StudentProfile> {
  const response = await fetch(`${getApiBaseUrl()}/api/usuarios/registro`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = (await response.json()) as { user?: StudentProfile } & Partial<StudentProfile>;
  return data.user ?? (data as StudentProfile);
}

/** Consulta el perfil autenticado actual para verificar si ya tiene username asignado. */
export async function getMyProfile(
  idToken: string
): Promise<{ profileComplete: boolean; user?: StudentProfile }> {
  const response = await fetch(`${getApiBaseUrl()}/api/usuarios/perfil`, {
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
    user?: StudentProfile;
  } & Partial<StudentProfile>;

  const user = data.user ?? (data.username ? (data as StudentProfile) : undefined);
  return {
    profileComplete: data.profileComplete ?? Boolean(user?.username),
    user,
  };
}

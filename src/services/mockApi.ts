import {
  AuthApiError,
  type AuthApiFieldErrors,
  type StudentProfile,
  type UpdateProfilePayload,
} from './authApi';
import { waitMockDelay } from './mockConfig';
import {
  normalizeUsername,
  validateEmail,
  validatePersonName,
} from '../utils/authValidation';

const MOCK_PROFILE_STORAGE_KEY = 'salon_estudio_mock_profile_v1';
const MOCK_SESSION_STORAGE_KEY = 'salon_estudio_mock_session_v1';
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$/;

const DEFAULT_MOCK_PROFILE: StudentProfile = {
  uid: 'mock-est-1',
  nombres: 'Camila',
  apellidos: 'Morales',
  username: 'camila.m',
  avatar: '🚀',
  avatarUrl: null,
  correo: 'camila.morales@correounivalle.edu.co',
  provider: 'password',
  creadoEn: '2026-11-10T14:00:00.000Z',
};

export interface MockRegisterInput {
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string;
  correo: string;
  password?: string;
}

let inMemoryProfile: StudentProfile | null = { ...DEFAULT_MOCK_PROFILE };
let inMemorySessionActive: boolean | null = null;

function isValidHttpsUrl(raw?: string | null): string | null {
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

function readStoredProfileOrNull(): StudentProfile | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(MOCK_PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StudentProfile>;
        if (parsed && typeof parsed === 'object' && parsed.username && parsed.correo) {
          return {
            uid: parsed.uid || DEFAULT_MOCK_PROFILE.uid,
            nombres: parsed.nombres || DEFAULT_MOCK_PROFILE.nombres,
            apellidos: parsed.apellidos || DEFAULT_MOCK_PROFILE.apellidos,
            username: parsed.username,
            avatar: parsed.avatar || parsed.avatarUrl || DEFAULT_MOCK_PROFILE.avatar,
            avatarUrl: parsed.avatarUrl ?? null,
            correo: parsed.correo,
            provider: parsed.provider ?? DEFAULT_MOCK_PROFILE.provider,
            creadoEn: parsed.creadoEn || DEFAULT_MOCK_PROFILE.creadoEn,
          };
        }
      }
    }
  } catch {
    // Ignora errores de acceso o parseo en localStorage
  }

  if (inMemoryProfile) {
    return { ...inMemoryProfile };
  }

  return null;
}

function readStoredProfile(): StudentProfile {
  return readStoredProfileOrNull() ?? { ...DEFAULT_MOCK_PROFILE };
}

function writeStoredProfile(profile: StudentProfile): void {
  inMemoryProfile = { ...profile };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MOCK_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    }
  } catch {
    // Mantiene respaldo en memoria cuando localStorage no está disponible
  }
}

function setMockSessionActive(active: boolean): void {
  inMemorySessionActive = active;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (active) {
        window.localStorage.setItem(MOCK_SESSION_STORAGE_KEY, 'true');
      } else {
        window.localStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
      }
    }
  } catch {
    // Mantiene estado de sesión en memoria cuando localStorage no está disponible
  }
}

/** Indica si hay una sesión mock activa persistida para hidratación inicial. */
export function hasActiveMockSession(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(MOCK_SESSION_STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    }
  } catch {
    // Usa respaldo en memoria
  }
  return Boolean(inMemorySessionActive);
}

/** Devuelve una copia inmediata del perfil mock actual. */
export function getMockProfileSnapshot(): StudentProfile {
  return { ...readStoredProfile() };
}

function clearStoredMockAuth(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(MOCK_PROFILE_STORAGE_KEY);
      window.localStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignora cuando localStorage no está disponible
  }
}

/** Restaura el perfil y la sesión mock a su estado inicial por defecto. */
export function resetMockState(): void {
  inMemoryProfile = { ...DEFAULT_MOCK_PROFILE };
  inMemorySessionActive = false;
  clearStoredMockAuth();
}

/** Simula verificación de disponibilidad de @username con demora de red. */
export async function mockCheckUsernameAvailability(
  username: string
): Promise<{ available: boolean }> {
  await waitMockDelay();
  const clean = normalizeUsername(username);
  return { available: clean !== 'ocupado' };
}

/** Simula consulta del perfil autenticado actual. */
export async function mockGetMyProfile(): Promise<{
  profileComplete: boolean;
  user?: StudentProfile;
}> {
  await waitMockDelay();
  const profile = readStoredProfileOrNull();
  if (!profile || !profile.username) {
    return { profileComplete: false };
  }
  return {
    profileComplete: true,
    user: { ...profile },
  };
}

/** Simula actualización parcial de perfil con validaciones y conflictos del contrato. */
export async function mockUpdateMyProfile(
  payload: UpdateProfilePayload
): Promise<StudentProfile> {
  await waitMockDelay();
  const current = readStoredProfile();

  if (
    current.provider === 'google' &&
    'correo' in payload &&
    payload.correo !== undefined &&
    payload.correo.trim().toLowerCase() !== current.correo.trim().toLowerCase()
  ) {
    throw new AuthApiError(
      'Tu correo lo administra Google. Para cambiarlo, hazlo en tu cuenta de Google.',
      403,
      'CORREO_GOOGLE',
      'email'
    );
  }

  const fieldErrors: AuthApiFieldErrors = {};

  if (payload.nombres !== undefined) {
    const nombresErr = validatePersonName(payload.nombres, 'nombres');
    if (nombresErr) fieldErrors.nombres = nombresErr;
  }

  if (payload.apellidos !== undefined) {
    const apellidosErr = validatePersonName(payload.apellidos, 'apellidos');
    if (apellidosErr) fieldErrors.apellidos = apellidosErr;
  }

  if (payload.username !== undefined) {
    const cleanUsername = payload.username.trim().toLowerCase();
    if (
      cleanUsername.length < 3 ||
      cleanUsername.length > 24 ||
      !USERNAME_PATTERN.test(cleanUsername)
    ) {
      fieldErrors.username =
        'Usa entre 3 y 24 letras minúsculas, números, punto o guion bajo, sin espacios.';
    }
  }

  if (payload.correo !== undefined) {
    const emailErr = validateEmail(payload.correo);
    if (emailErr) {
      fieldErrors.correo = emailErr;
      fieldErrors.email = emailErr;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    const primaryField = fieldErrors.username
      ? 'username'
      : fieldErrors.email || fieldErrors.correo
        ? 'email'
        : 'general';
    throw new AuthApiError(
      'Revisa los campos marcados.',
      400,
      'VALIDATION_ERROR',
      primaryField,
      fieldErrors
    );
  }

  if (payload.username?.trim().toLowerCase() === 'ocupado') {
    throw new AuthApiError(
      'Ese nombre de usuario ya está en uso. Prueba con otro.',
      409,
      'USERNAME_TAKEN',
      'username'
    );
  }

  if (payload.correo?.trim().toLowerCase() === 'ocupado@example.com') {
    throw new AuthApiError(
      'Ese correo ya tiene una cuenta.',
      409,
      'EMAIL_TAKEN',
      'email'
    );
  }

  const next: StudentProfile = { ...current };

  if (payload.nombres !== undefined) {
    next.nombres = payload.nombres.trim();
  }
  if (payload.apellidos !== undefined) {
    next.apellidos = payload.apellidos.trim();
  }
  if (payload.username !== undefined) {
    next.username = payload.username.trim().toLowerCase();
  }
  if (payload.correo !== undefined) {
    next.correo = payload.correo.trim();
  }

  if (payload.avatarUrl !== undefined) {
    if (payload.avatarUrl === null) {
      next.avatarUrl = null;
    } else {
      const validHttps = isValidHttpsUrl(payload.avatarUrl);
      if (validHttps) {
        next.avatarUrl = validHttps;
        next.avatar = validHttps;
      } else if (payload.avatarUrl.trim()) {
        next.avatar = payload.avatarUrl.trim();
        next.avatarUrl = null;
      }
    }
  }

  if (payload.avatar !== undefined) {
    const trimmedAvatar = payload.avatar.trim();
    const validHttps = isValidHttpsUrl(trimmedAvatar);
    if (validHttps) {
      next.avatarUrl = validHttps;
      next.avatar = validHttps;
    } else if (trimmedAvatar) {
      next.avatar = trimmedAvatar;
      if (payload.avatarUrl === undefined) {
        next.avatarUrl = null;
      }
    }
  }

  writeStoredProfile(next);
  return { ...next };
}

/** Simula inicio de sesión con correo electrónico. */
export async function mockLoginWithEmail(correo: string): Promise<{
  status: 'authenticated';
  user: StudentProfile;
}> {
  await waitMockDelay();
  const current = readStoredProfile();
  const cleanEmail = correo.trim();
  const next: StudentProfile = {
    ...current,
    correo: cleanEmail || current.correo,
    provider: 'password',
  };
  writeStoredProfile(next);
  setMockSessionActive(true);
  return {
    status: 'authenticated',
    user: { ...next },
  };
}

/** Simula inicio de sesión con cuenta de Google. */
export async function mockLoginWithGoogle(): Promise<{
  status: 'authenticated';
  user: StudentProfile;
}> {
  await waitMockDelay();
  const current = readStoredProfile();
  const next: StudentProfile = {
    ...current,
    provider: 'google',
  };
  writeStoredProfile(next);
  setMockSessionActive(true);
  return {
    status: 'authenticated',
    user: { ...next },
  };
}

/** Simula registro de estudiante con correo y contraseña. */
export async function mockRegisterWithEmail(
  input: MockRegisterInput
): Promise<StudentProfile> {
  await waitMockDelay();
  const cleanUsername = input.username.trim().toLowerCase();
  const cleanEmail = input.correo.trim();

  if (cleanUsername === 'ocupado') {
    throw new AuthApiError(
      'Ese nombre de usuario ya está en uso. Prueba con otro.',
      409,
      'USERNAME_TAKEN',
      'username'
    );
  }

  if (cleanEmail.toLowerCase() === 'ocupado@example.com') {
    throw new AuthApiError(
      'Este correo ya tiene una cuenta registrada. Puedes ir a Ingresar.',
      409,
      'EMAIL_TAKEN',
      'email'
    );
  }

  const validAvatarHttps = isValidHttpsUrl(input.avatar);
  const created: StudentProfile = {
    uid: DEFAULT_MOCK_PROFILE.uid,
    nombres: input.nombres.trim(),
    apellidos: input.apellidos.trim(),
    username: cleanUsername,
    avatar: input.avatar.trim() || '🚀',
    avatarUrl: validAvatarHttps,
    correo: cleanEmail,
    provider: 'password',
    creadoEn: new Date().toISOString(),
  };

  writeStoredProfile(created);
  setMockSessionActive(true);
  return { ...created };
}

/** Simula finalización de perfil con Google eligiendo nombre de usuario. */
export async function mockCompleteGoogleUsername(payload: {
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string;
  correo?: string;
}): Promise<StudentProfile> {
  await waitMockDelay();
  const cleanUsername = payload.username.trim().toLowerCase();

  if (cleanUsername === 'ocupado') {
    throw new AuthApiError(
      'Ese nombre de usuario ya está en uso. Prueba con otro.',
      409,
      'USERNAME_TAKEN',
      'username'
    );
  }

  const current = readStoredProfile();
  const validAvatarHttps = isValidHttpsUrl(payload.avatar);
  const updated: StudentProfile = {
    ...current,
    nombres: payload.nombres.trim(),
    apellidos: payload.apellidos.trim(),
    username: cleanUsername,
    avatar: payload.avatar.trim() || current.avatar,
    avatarUrl: validAvatarHttps,
    correo: payload.correo?.trim() || current.correo,
    provider: 'google',
  };

  writeStoredProfile(updated);
  setMockSessionActive(true);
  return { ...updated };
}

/** Simula cierre de sesión limpiando el indicador de sesión activa. */
export async function mockLogout(): Promise<void> {
  await waitMockDelay();
  setMockSessionActive(false);
}

/** Simula la eliminación definitiva de la cuenta y limpia el estado mock local. */
export async function mockDeleteMyAccount(): Promise<void> {
  await waitMockDelay();
  clearStoredMockAuth();
  inMemoryProfile = null;
  inMemorySessionActive = false;
}

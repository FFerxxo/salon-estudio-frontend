import type { User } from 'firebase/auth';
import { ErrorApi, peticion } from './http';

export interface PerfilUsuario {
  uid: string;
  nombres: string;
  apellidos: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  proveedor: string;
  creadoEn: string;
}

export interface DatosPerfil {
  nombres: string;
  apellidos: string;
  username: string;
  avatarUrl: string | null;
}

/** GET /api/usuarios/disponible (pública) */
export async function consultarDisponibilidad(username: string): Promise<boolean> {
  const { disponible } = await peticion<{ disponible: boolean }>(
    `/api/usuarios/disponible?username=${encodeURIComponent(username.trim())}`
  );
  return disponible;
}

/** GET /api/usuarios/me (privada). Devuelve null si la cuenta aún no tiene perfil (404). */
export async function obtenerMiPerfil(usuario: User): Promise<PerfilUsuario | null> {
  try {
    return await peticion<PerfilUsuario>('/api/usuarios/me', { usuario });
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 404) return null;
    throw error;
  }
}

/** POST /api/usuarios (privada): crea el perfil tras el registro manual o con Google. */
export function crearPerfil(usuario: User, datos: DatosPerfil): Promise<PerfilUsuario> {
  return peticion<PerfilUsuario>('/api/usuarios', { metodo: 'POST', cuerpo: datos, usuario });
}

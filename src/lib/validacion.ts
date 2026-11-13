/**
 * Mismas reglas que valida la API en src/validation/usuario.ts (backend).
 * Se validan aquí para avisar antes de enviar; la API sigue siendo la que decide.
 */
export const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MENSAJES = {
  nombresVacio: 'Escribe tus nombres.',
  apellidosVacio: 'Escribe tus apellidos.',
  nombresLargo: 'Tus nombres pueden tener máximo 50 caracteres.',
  apellidosLargo: 'Tus apellidos pueden tener máximo 50 caracteres.',
  usernameVacio: 'Escribe un nombre de usuario.',
  usernameFormato: 'Usa entre 3 y 20 letras, números o guion bajo (_), sin espacios.',
  usernameOcupado: 'Ese nombre de usuario ya está en uso. Prueba con otro.',
  correoVacio: 'Escribe tu correo.',
  correoFormato: 'Escribe un correo válido, por ejemplo nombre@correounivalle.edu.co.',
  contrasenaVacia: 'Escribe tu contraseña.',
  contrasenaDebil: 'La contraseña debe tener mínimo 8 caracteres, con al menos una letra y un número.',
} as const;

export function validarNombres(valor: string): string | null {
  if (valor.trim() === '') return MENSAJES.nombresVacio;
  if (valor.trim().length > 50) return MENSAJES.nombresLargo;
  return null;
}

export function validarApellidos(valor: string): string | null {
  if (valor.trim() === '') return MENSAJES.apellidosVacio;
  if (valor.trim().length > 50) return MENSAJES.apellidosLargo;
  return null;
}

export function validarUsername(valor: string): string | null {
  if (valor.trim() === '') return MENSAJES.usernameVacio;
  if (!USERNAME_REGEX.test(valor.trim())) return MENSAJES.usernameFormato;
  return null;
}

export function validarCorreo(valor: string): string | null {
  if (valor.trim() === '') return MENSAJES.correoVacio;
  if (!CORREO_REGEX.test(valor.trim())) return MENSAJES.correoFormato;
  return null;
}

export interface ReglaContrasena {
  texto: string;
  cumple: boolean;
}

export function reglasContrasena(valor: string): ReglaContrasena[] {
  return [
    { texto: 'Mínimo 8 caracteres', cumple: valor.length >= 8 },
    { texto: 'Al menos una letra', cumple: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(valor) },
    { texto: 'Al menos un número', cumple: /\d/.test(valor) },
  ];
}

export function validarContrasenaNueva(valor: string): string | null {
  if (valor === '') return MENSAJES.contrasenaVacia;
  if (!reglasContrasena(valor).every((regla) => regla.cumple)) return MENSAJES.contrasenaDebil;
  return null;
}

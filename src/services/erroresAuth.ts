import { MENSAJE_SIN_CONEXION } from './http';

/** Traduce los códigos de Firebase Authentication a mensajes para el estudiante. */
const MENSAJES: Record<string, string> = {
  'auth/email-already-in-use': 'Este correo ya tiene una cuenta. ¿Quieres ingresar?',
  'auth/invalid-email': 'Escribe un correo válido, por ejemplo nombre@correounivalle.edu.co.',
  'auth/weak-password':
    'La contraseña debe tener mínimo 8 caracteres, con al menos una letra y un número.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-login-credentials': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Hiciste muchos intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/popup-closed-by-user':
    'Cerraste la ventana de Google antes de terminar. Puedes intentarlo de nuevo.',
  'auth/cancelled-popup-request':
    'Cerraste la ventana de Google antes de terminar. Puedes intentarlo de nuevo.',
  'auth/popup-blocked':
    'Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.',
  'auth/network-request-failed': MENSAJE_SIN_CONEXION,
  'auth/user-disabled': 'Esta cuenta está deshabilitada. Escríbenos desde Ayuda.',
};

export function codigoError(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown };
    return typeof code === 'string' ? code : null;
  }
  return null;
}

export function mensajeErrorAuth(error: unknown): string {
  const codigo = codigoError(error);
  if (codigo && MENSAJES[codigo]) return MENSAJES[codigo];
  if (error instanceof Error && error.name === 'ErrorApi') return error.message;
  return 'Algo salió mal. Inténtalo de nuevo en unos segundos.';
}

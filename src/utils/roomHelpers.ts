import { firebaseAuth } from '../services/firebase';
import { isMocksEnabled } from '../services/mockConfig';

/** Resuelve el token de autenticación en modo mock o desde la sesión activa de Firebase. */
export async function resolveAuthToken(idToken: string | null): Promise<string> {
  if (isMocksEnabled()) {
    return idToken ?? 'mock-token';
  }
  const fbToken = await firebaseAuth?.currentUser?.getIdToken().catch(() => null);
  return fbToken ?? idToken ?? '';
}

/** Copia un texto al portapapeles e indica si la operación tuvo éxito real. */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continúa al respaldo con textarea temporal si el navegador lo permite
    }
  }

  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';

  try {
    document.body.appendChild(textarea);
    textarea.select();
    return document.execCommand('copy') === true;
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

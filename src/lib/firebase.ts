import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

/**
 * El frontend solo usa Firebase Authentication para iniciar sesión.
 * Los datos del perfil siempre pasan por la API (nunca se consulta Firestore desde aquí).
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** En las pruebas unitarias no hay variables de Firebase: la app funciona como «sin sesión». */
export const firebaseConfigurado = Boolean(config.apiKey && config.authDomain && config.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function obtenerAuth(): Auth {
  if (!firebaseConfigurado) {
    throw new Error('Faltan las variables VITE_FIREBASE_* para conectar con Firebase.');
  }
  if (!auth) {
    app = initializeApp(config);
    auth = getAuth(app);
    auth.languageCode = 'es';
  }
  return auth;
}

export function proveedorGoogle(): GoogleAuthProvider {
  const proveedor = new GoogleAuthProvider();
  // Siempre deja elegir la cuenta (permite «Usar otra cuenta de Google»).
  proveedor.setCustomParameters({ prompt: 'select_account' });
  return proveedor;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  AuthApiError,
  createStudentProfile,
  getMyProfile,
  type StudentProfile,
} from '../services/authApi';
import { firebaseAuth, googleProvider, hasFirebaseConfig } from '../services/firebase';
import { markReturningUser } from '../content/saludos';

export type AuthStatus = 'loading' | 'unauthenticated' | 'needs_username' | 'authenticated';

export interface PendingGoogleUser {
  uid: string;
  nombres: string;
  apellidos: string;
  correo: string;
  avatar: string;
}

export interface RegisterInput {
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string;
  correo: string;
  password: string;
}

export interface AuthSessionAdapter {
  registerWithEmail(input: RegisterInput): Promise<StudentProfile>;
  loginWithEmail(correo: string, password: string): Promise<{ status: AuthStatus; user?: StudentProfile; pending?: PendingGoogleUser }>;
  loginWithGoogle(): Promise<{ status: AuthStatus; user?: StudentProfile; pending?: PendingGoogleUser }>;
  completeGoogleUsername(payload: Omit<RegisterInput, 'password'>): Promise<StudentProfile>;
  logout(): Promise<void>;
}

interface AuthContextValue {
  status: AuthStatus;
  user: StudentProfile | null;
  pendingGoogleUser: PendingGoogleUser | null;
  idToken: string | null;
  registerWithEmail: (input: RegisterInput) => Promise<StudentProfile>;
  loginWithEmail: (correo: string, password: string) => Promise<AuthStatus>;
  loginWithGoogle: () => Promise<AuthStatus>;
  completeGoogleUsername: (payload: {
    nombres: string;
    apellidos: string;
    username: string;
    avatar: string;
  }) => Promise<StudentProfile>;
  logout: () => Promise<void>;
}

const defaultAuthContext: AuthContextValue = {
  status: 'unauthenticated',
  user: null,
  pendingGoogleUser: null,
  idToken: null,
  registerWithEmail: async () => {
    throw new Error('AuthProvider no inicializado');
  },
  loginWithEmail: async () => 'unauthenticated',
  loginWithGoogle: async () => 'unauthenticated',
  completeGoogleUsername: async () => {
    throw new Error('AuthProvider no inicializado');
  },
  logout: async () => {},
};

const AuthContext = createContext<AuthContextValue>(defaultAuthContext);

function splitDisplayName(displayName: string | null): { nombres: string; apellidos: string } {
  const cleaned = (displayName || '').trim();
  if (!cleaned) return { nombres: 'Estudiante', apellidos: 'Univalle' };
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { nombres: parts[0], apellidos: 'Univalle' };
  const mid = Math.ceil(parts.length / 2);
  return {
    nombres: parts.slice(0, mid).join(' '),
    apellidos: parts.slice(mid).join(' '),
  };
}

function buildPendingFromFirebase(fbUser: FirebaseUser): PendingGoogleUser {
  const { nombres, apellidos } = splitDisplayName(fbUser.displayName);
  return {
    uid: fbUser.uid,
    nombres,
    apellidos,
    correo: fbUser.email || '',
    avatar: fbUser.photoURL || '🚀',
  };
}

function getFirebaseErrorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code?: string }).code || '');
  }
  return '';
}

export interface AuthProviderProps {
  children: ReactNode;
  initialStatus?: AuthStatus;
  initialUser?: StudentProfile | null;
  initialPendingGoogle?: PendingGoogleUser | null;
  adapter?: AuthSessionAdapter;
}

export function AuthProvider({
  children,
  initialStatus,
  initialUser = null,
  initialPendingGoogle = null,
  adapter,
}: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>(() => {
    if (initialStatus) return initialStatus;
    return hasFirebaseConfig && firebaseAuth && !adapter ? 'loading' : 'unauthenticated';
  });
  const [user, setUser] = useState<StudentProfile | null>(initialUser);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<PendingGoogleUser | null>(
    initialPendingGoogle
  );
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    if (adapter || initialStatus || !hasFirebaseConfig || !firebaseAuth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (!fbUser) {
        setStatus('unauthenticated');
        setUser(null);
        setPendingGoogleUser(null);
        setIdToken(null);
        return;
      }

      try {
        const token = await fbUser.getIdToken();
        setIdToken(token);
        const profileResp = await getMyProfile(token);
        if (profileResp.profileComplete && profileResp.user) {
          setUser(profileResp.user);
          setPendingGoogleUser(null);
          setStatus('authenticated');
        } else {
          setUser(null);
          setPendingGoogleUser(buildPendingFromFirebase(fbUser));
          setStatus('needs_username');
        }
      } catch {
        setUser(null);
        setPendingGoogleUser(buildPendingFromFirebase(fbUser));
        setStatus('needs_username');
      }
    });

    return () => unsubscribe();
  }, [adapter, initialStatus]);

  const registerWithEmail = useCallback(
    async (input: RegisterInput): Promise<StudentProfile> => {
      if (adapter) {
        const created = await adapter.registerWithEmail(input);
        setUser(created);
        setPendingGoogleUser(null);
        setStatus('authenticated');
        return created;
      }

      if (!firebaseAuth) {
        throw new AuthApiError(
          'Configuración de autenticación no disponible en este entorno.',
          503,
          'AUTH_NOT_CONFIGURED'
        );
      }

      let createdFbUser: FirebaseUser | null = null;
      try {
        const cred = await createUserWithEmailAndPassword(
          firebaseAuth,
          input.correo.trim(),
          input.password
        );
        createdFbUser = cred.user;
        await updateProfile(cred.user, {
          displayName: `${input.nombres.trim()} ${input.apellidos.trim()}`,
        });
        const token = await cred.user.getIdToken();
        const profile = await createStudentProfile(token, {
          nombres: input.nombres.trim(),
          apellidos: input.apellidos.trim(),
          username: input.username.trim().toLowerCase(),
          avatar: input.avatar,
          correo: input.correo.trim(),
          provider: 'password',
        });

        setIdToken(token);
        setUser(profile);
        setPendingGoogleUser(null);
        setStatus('authenticated');
        return profile;
      } catch (err) {
        // Si falló la validación de servidor (ej. 409 username ocupado), revierte la cuenta huérfana
        if (createdFbUser) {
          try {
            await createdFbUser.delete();
          } catch {
            await signOut(firebaseAuth).catch(() => {});
          }
        }
        const fbCode = getFirebaseErrorCode(err);
        if (fbCode === 'auth/email-already-in-use') {
          throw new AuthApiError(
            'Este correo ya tiene una cuenta registrada. Puedes ir a Ingresar.',
            409,
            'EMAIL_TAKEN',
            'email'
          );
        }
        if (fbCode === 'auth/weak-password') {
          throw new AuthApiError(
            'La contraseña debe cumplir la política mínima de seguridad.',
            400,
            'WEAK_PASSWORD'
          );
        }
        throw err;
      }
    },
    [adapter]
  );

  const loginWithEmail = useCallback(
    async (correo: string, password: string): Promise<AuthStatus> => {
      if (adapter) {
        const res = await adapter.loginWithEmail(correo, password);
        setUser(res.user ?? null);
        setPendingGoogleUser(res.pending ?? null);
        setStatus(res.status);
        return res.status;
      }

      if (!firebaseAuth) {
        throw new AuthApiError(
          'Configuración de autenticación no disponible en este entorno.',
          503,
          'AUTH_NOT_CONFIGURED'
        );
      }

      try {
        const cred = await signInWithEmailAndPassword(firebaseAuth, correo.trim(), password);
        const token = await cred.user.getIdToken();
        setIdToken(token);
        const profileResp = await getMyProfile(token);
        if (profileResp.profileComplete && profileResp.user) {
          setUser(profileResp.user);
          setPendingGoogleUser(null);
          setStatus('authenticated');
          return 'authenticated';
        }
        setUser(null);
        setPendingGoogleUser(buildPendingFromFirebase(cred.user));
        setStatus('needs_username');
        return 'needs_username';
      } catch (err) {
        if (err instanceof AuthApiError) throw err;
        // Mensaje genérico obligatorio para US-03 (anti-enumeración)
        throw new AuthApiError('Correo o contraseña incorrectos.', 401, 'INVALID_CREDENTIALS');
      }
    },
    [adapter]
  );

  const loginWithGoogle = useCallback(async (): Promise<AuthStatus> => {
    if (adapter) {
      const res = await adapter.loginWithGoogle();
      setUser(res.user ?? null);
      setPendingGoogleUser(res.pending ?? null);
      setStatus(res.status);
      return res.status;
    }

    if (!firebaseAuth || !googleProvider) {
      throw new AuthApiError(
        'El acceso con Google no está configurado en este entorno.',
        503,
        'AUTH_NOT_CONFIGURED'
      );
    }

    try {
      const cred = await signInWithPopup(firebaseAuth, googleProvider);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      const profileResp = await getMyProfile(token);
      if (profileResp.profileComplete && profileResp.user) {
        setUser(profileResp.user);
        setPendingGoogleUser(null);
        setStatus('authenticated');
        return 'authenticated';
      }
      const pending = buildPendingFromFirebase(cred.user);
      setUser(null);
      setPendingGoogleUser(pending);
      setStatus('needs_username');
      return 'needs_username';
    } catch (err) {
      const fbCode = getFirebaseErrorCode(err);
      if (
        fbCode === 'auth/popup-closed-by-user' ||
        fbCode === 'auth/cancelled-popup-request'
      ) {
        throw new AuthApiError(
          'Se canceló el acceso con Google. Puedes intentarlo de nuevo o ingresar con tu correo.',
          400,
          'GOOGLE_CANCELLED'
        );
      }
      if (err instanceof AuthApiError) throw err;
      throw new AuthApiError(
        'No fue posible autenticar con Google. Intenta de nuevo.',
        500,
        'GOOGLE_ERROR'
      );
    }
  }, [adapter]);

  const completeGoogleUsername = useCallback(
    async (payload: {
      nombres: string;
      apellidos: string;
      username: string;
      avatar: string;
    }): Promise<StudentProfile> => {
      const correo = pendingGoogleUser?.correo || firebaseAuth?.currentUser?.email || '';
      if (adapter) {
        const profile = await adapter.completeGoogleUsername({ ...payload, correo });
        setUser(profile);
        setPendingGoogleUser(null);
        setStatus('authenticated');
        return profile;
      }

      if (!firebaseAuth?.currentUser) {
        throw new AuthApiError(
          'Tu sesión de Google expiró. Vuelve a iniciar sesión.',
          401,
          'SESSION_EXPIRED'
        );
      }

      const token = await firebaseAuth.currentUser.getIdToken();
      let profile: StudentProfile;
      try {
        profile = await createStudentProfile(token, {
          nombres: payload.nombres.trim(),
          apellidos: payload.apellidos.trim(),
          username: payload.username.trim().toLowerCase(),
          avatar: payload.avatar,
          correo,
          provider: 'google',
        });
      } catch (err) {
        if (err instanceof AuthApiError && err.code === 'PROFILE_ALREADY_EXISTS') {
          const existing = await getMyProfile(token);
          if (existing.profileComplete && existing.user) {
            profile = existing.user;
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      setIdToken(token);
      setUser(profile);
      setPendingGoogleUser(null);
      setStatus('authenticated');
      return profile;
    },
    [adapter, pendingGoogleUser]
  );

  const logout = useCallback(async () => {
    if (adapter) {
      await adapter.logout();
    } else if (firebaseAuth) {
      await signOut(firebaseAuth);
    }
    markReturningUser();
    setUser(null);
    setPendingGoogleUser(null);
    setIdToken(null);
    setStatus('unauthenticated');
  }, [adapter]);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        pendingGoogleUser,
        idToken,
        registerWithEmail,
        loginWithEmail,
        loginWithGoogle,
        completeGoogleUsername,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

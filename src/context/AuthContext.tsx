import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { firebaseConfigurado, obtenerAuth } from '../lib/firebase';
import { ErrorApi, MENSAJE_SIN_CONEXION } from '../services/http';
import { obtenerMiPerfil, type PerfilUsuario } from '../services/usuarios';

/**
 * cargando          → Firebase aún confirma si hay sesión
 * sin-sesion        → nadie ha ingresado
 * perfil-incompleto → hay sesión, pero falta elegir el nombre de usuario (GET /me = 404)
 * con-perfil        → sesión y perfil completos
 * error             → no se pudo consultar el perfil en la API
 */
export type EstadoSesion = 'cargando' | 'sin-sesion' | 'perfil-incompleto' | 'con-perfil' | 'error';

interface ValorAuth {
  estado: EstadoSesion;
  /** false solo mientras se resuelve la sesión al abrir la aplicación. */
  listo: boolean;
  usuario: User | null;
  perfil: PerfilUsuario | null;
  error: string | null;
  /** Vuelve a consultar GET /api/usuarios/me y devuelve el perfil (o null si falta). */
  sincronizarPerfil: () => Promise<PerfilUsuario | null>;
  /** Guarda el perfil recién creado sin volver a consultar la API. */
  establecerPerfil: (perfil: PerfilUsuario) => void;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<ValorAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>(firebaseConfigurado ? 'cargando' : 'sin-sesion');
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(!firebaseConfigurado);
  // Evita que una respuesta vieja de GET /me pise un estado más reciente
  // (por ejemplo, el perfil que se acaba de crear en el registro).
  const version = useRef(0);

  const cargarPerfil = useCallback(async (actual: User): Promise<PerfilUsuario | null> => {
    const miVersion = ++version.current;
    try {
      const encontrado = await obtenerMiPerfil(actual);
      if (miVersion === version.current) {
        setPerfil(encontrado);
        setError(null);
        setEstado(encontrado ? 'con-perfil' : 'perfil-incompleto');
      }
      return encontrado;
    } catch (err) {
      if (miVersion === version.current) {
        setPerfil(null);
        setError(err instanceof ErrorApi ? err.message : MENSAJE_SIN_CONEXION);
        setEstado('error');
      }
      throw err;
    } finally {
      if (miVersion === version.current) setListo(true);
    }
  }, []);

  useEffect(() => {
    if (!firebaseConfigurado) return undefined;
    return onAuthStateChanged(obtenerAuth(), (actual) => {
      setUsuario(actual);
      if (!actual) {
        version.current++;
        setPerfil(null);
        setError(null);
        setEstado('sin-sesion');
        setListo(true);
        return;
      }
      setEstado('cargando');
      cargarPerfil(actual).catch(() => {
        // El estado «error» ya quedó registrado; la pantalla ofrece «Reintentar».
      });
    });
  }, [cargarPerfil]);

  const sincronizarPerfil = useCallback(async () => {
    const actual = firebaseConfigurado ? obtenerAuth().currentUser : null;
    if (!actual) return null;
    setUsuario(actual);
    return cargarPerfil(actual);
  }, [cargarPerfil]);

  const establecerPerfil = useCallback((nuevo: PerfilUsuario) => {
    version.current++;
    setPerfil(nuevo);
    setError(null);
    setEstado('con-perfil');
    setListo(true);
  }, []);

  const cerrarSesion = useCallback(async () => {
    version.current++;
    await signOut(obtenerAuth());
    setUsuario(null);
    setPerfil(null);
    setEstado('sin-sesion');
  }, []);

  const valor = useMemo(
    () => ({ estado, listo, usuario, perfil, error, sincronizarPerfil, establecerPerfil, cerrarSesion }),
    [estado, listo, usuario, perfil, error, sincronizarPerfil, establecerPerfil, cerrarSesion]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValorAuth {
  const valor = useContext(AuthContext);
  if (!valor) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return valor;
}

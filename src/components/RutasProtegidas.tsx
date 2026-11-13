import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alerta } from './ui/Alerta';
import { Boton } from './ui/Boton';
import { EstadoCarga } from './ui/EstadoCarga';

export interface EstadoNavegacion {
  /** Ruta privada que se pidió sin sesión; se vuelve a ella después de ingresar. */
  desde?: string;
  motivo?: 'privada' | 'cerro-sesion';
  bienvenida?: boolean;
}

/** Destino tras ingresar: la ruta privada que se pidió o el Panel. */
export function destinoTrasIngresar(estado: unknown): string {
  const desde = (estado as EstadoNavegacion | null)?.desde;
  return desde && desde.startsWith('/') && !desde.startsWith('//') ? desde : '/panel';
}

/** Panel, Perfil y Salas: exigen sesión y perfil completo. */
export function RutaPrivada() {
  const { estado, listo, error, sincronizarPerfil } = useAuth();
  const location = useLocation();

  if (!listo || estado === 'cargando') {
    return <EstadoCarga mensaje="Cargando tu información…" />;
  }

  if (estado === 'sin-sesion') {
    const desde = `${location.pathname}${location.search}`;
    return <Navigate to="/ingresar" replace state={{ desde, motivo: 'privada' } satisfies EstadoNavegacion} />;
  }

  if (estado === 'perfil-incompleto') {
    return <Navigate to="/registro/usuario" replace />;
  }

  if (estado === 'error') {
    return (
      <div className="mx-auto max-w-md space-y-4 py-8">
        <Alerta tipo="error" titulo="No pudimos cargar tu información">
          {error}
        </Alerta>
        <Boton onClick={() => void sincronizarPerfil().catch(() => undefined)}>Reintentar</Boton>
      </div>
    );
  }

  return <Outlet />;
}

/** Ingresar y Registro: si ya hay sesión con perfil, llevan al destino (Panel o ruta pedida). */
export function RutaPublica() {
  const { estado, listo } = useAuth();
  const location = useLocation();

  if (!listo) return <EstadoCarga />;
  if (estado === 'con-perfil') {
    return <Navigate to={destinoTrasIngresar(location.state)} replace />;
  }
  return <Outlet />;
}

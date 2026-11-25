import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/** Protege rutas privadas (/panel, /perfil, /salas/:id) y bloquea omitir username en Google. */
export function ProtectedRoute() {
  const { status, pendingDeleteRedirect } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <section
        role="status"
        aria-live="polite"
        className={`rounded-2xl p-8 text-center border ${
          theme === 'dark'
            ? 'bg-[#120c18]/80 border-rose-500/25 text-slate-100'
            : 'bg-white/90 border-rose-200 text-slate-900'
        }`}
      >
        <p className="text-base font-semibold">Verificando sesión de Estudiante...</p>
      </section>
    );
  }

  if (status === 'needs_username') {
    return <Navigate to="/registro/google-username" replace />;
  }

  if (status !== 'authenticated') {
    if (pendingDeleteRedirect) {
      // Tras eliminar la cuenta se vuelve al inicio (rúbrica US-05) con el aviso.
      return <Navigate to="/" replace state={{ accountDeleted: true }} />;
    }
    return <Navigate to="/ingresar" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

/** Solo se vuelve a rutas internas de la app (p. ej. /salas/ABCD1234 tras abrir un enlace directo). */
function destinoSeguro(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && from !== '/ingresar'
    ? from
    : '/panel';
}

/** Redirige usuarios ya autenticados fuera de /ingresar o /registro hacia la ruta pedida, el Panel o el paso pendiente. */
export function PublicAuthRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'needs_username') {
    return <Navigate to="/registro/google-username" replace />;
  }

  if (status === 'authenticated') {
    const from = (location.state as { from?: unknown } | null)?.from;
    return <Navigate to={destinoSeguro(from)} replace />;
  }

  return <Outlet />;
}

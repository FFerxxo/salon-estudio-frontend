import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/** Protege rutas privadas (/panel, /perfil, /salas/:id) y bloquea omitir username en Google. */
export function ProtectedRoute() {
  const { status } = useAuth();
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
    return <Navigate to="/ingresar" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

/** Redirige usuarios ya autenticados fuera de /ingresar o /registro hacia el Panel o paso pendiente. */
export function PublicAuthRoute() {
  const { status } = useAuth();

  if (status === 'needs_username') {
    return <Navigate to="/registro/google-username" replace />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/panel" replace />;
  }

  return <Outlet />;
}

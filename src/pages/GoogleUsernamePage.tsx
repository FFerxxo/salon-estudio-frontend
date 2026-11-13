import { useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { UsernameField } from '../components/UsernameField';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { AuthApiError } from '../services/authApi';
import { validateUsername } from '../utils/authValidation';
import {
  getErrorAlertClasses,
  getGlassCardClasses,
  getLinkClasses,
  getPrimaryCtaClasses,
} from '../utils/themeStyles';

function toTitleCase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Paso obligatorio post-Google para elegir un @usuario antes de entrar al Salón. */
export function GoogleUsernamePage() {
  useDocumentTitle('Elegir usuario');
  const navigate = useNavigate();
  const { status, pendingGoogleUser, completeGoogleUsername, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/panel" replace />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/ingresar" replace />;
  }

  const resolvedNombres = toTitleCase(pendingGoogleUser?.nombres || '') || 'Estudiante';
  const resolvedApellidos = toTitleCase(pendingGoogleUser?.apellidos || '') || 'Univalle';
  const resolvedAvatar = pendingGoogleUser?.avatar || '🚀';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userErr = validateUsername(username);
    if (userErr) {
      setUsernameError(userErr);
      return;
    }

    setUsernameError(null);
    setGeneralError(null);
    setSubmitting(true);

    try {
      await completeGoogleUsername({
        nombres: resolvedNombres,
        apellidos: resolvedApellidos,
        username,
        avatar: resolvedAvatar,
      });
      navigate('/panel', { replace: true });
    } catch (err) {
      if (err instanceof AuthApiError) {
        if (err.fieldErrors?.username || err.field === 'username') {
          setUsernameError(err.fieldErrors?.username || err.message);
        } else {
          setGeneralError(err.message);
        }
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError('No se pudo completar tu registro. Intenta nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    navigate('/ingresar', { replace: true });
  };

  return (
    <section
      aria-labelledby="google-username-heading"
      className={`w-full max-w-[420px] mx-auto rounded-[16px] p-6 sm:p-7 space-y-5 ${getGlassCardClasses(
        theme
      )}`}
    >
      <div
        role="progressbar"
        aria-label="Progreso del registro con Google"
        aria-valuemin={1}
        aria-valuemax={2}
        aria-valuenow={2}
        aria-valuetext="Paso 2 de 2"
        className="space-y-1.5"
      >
        <p
          className={`text-xs font-medium tabular-nums ${
            isDark ? 'text-[#cbd5e1]' : 'text-[#475569]'
          }`}
        >
          Paso 2 de 2
        </p>
        <div
          aria-hidden="true"
          className={`h-1 w-full rounded-full overflow-hidden ${
            isDark ? 'bg-slate-700/70' : 'bg-slate-200'
          }`}
        >
          <div
            className={`h-full w-full rounded-full ${
              isDark ? 'bg-[#38bdf8]' : 'bg-[#075985]'
            }`}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <h1
          id="google-username-heading"
          className="text-2xl sm:text-[26px] font-bold tracking-tight text-balance"
        >
          Elige tu @usuario
        </h1>
        <p className={`text-sm text-pretty ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
          Entraste con Google como{' '}
          <strong className="font-semibold break-words">
            {pendingGoogleUser?.correo || 'tu cuenta de Google'}
          </strong>
          .
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          className={`rounded-[10px] p-3 text-sm font-semibold flex items-center gap-2 ${getErrorAlertClasses(
            theme
          )}`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{generalError}</span>
        </div>
      )}

      <form noValidate onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <UsernameField
          id="google-username-input"
          label="@usuario"
          value={username}
          onChange={(val) => {
            setUsername(val);
            if (usernameError) setUsernameError(null);
          }}
          error={usernameError}
        />

        <div className="space-y-2 pt-1 text-center">
          <button
            type="submit"
            disabled={submitting}
            className={`${getPrimaryCtaClasses(
              theme
            )} active:scale-[0.96] motion-reduce:active:scale-100 motion-reduce:transition-none transition-[background-color,color,transform] duration-150 ease-out`}
          >
            {submitting ? 'Entrando...' : 'Entrar al Salón'}
          </button>

          <button
            type="button"
            onClick={() => void handleSwitchAccount()}
            disabled={submitting}
            className={`min-h-[44px] px-3 inline-flex items-center justify-center rounded-lg text-sm ${getLinkClasses(
              theme
            )}`}
          >
            Usar otra cuenta
          </button>
        </div>
      </form>
    </section>
  );
}

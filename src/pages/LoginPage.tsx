import { useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { PasswordField } from '../components/PasswordField';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { validateEmail, validateUsername } from '../utils/authValidation';
import {
  getErrorAlertClasses,
  getGlassCardClasses,
  getInlineErrorClasses,
  getInputClasses,
  getLinkClasses,
} from '../utils/themeStyles';

interface LocationState {
  from?: string;
}

export function LoginPage() {
  useDocumentTitle('Ingresar');
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const state = (location.state as LocationState | null) ?? null;
  const redirectTarget = state?.from && state.from !== '/ingresar' ? state.from : '/panel';

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showRecoveryNote, setShowRecoveryNote] = useState(false);

  const validateIdentifier = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return 'Ingresa tu correo institucional o usuario.';
    }
    if (trimmed.includes('@') && !trimmed.startsWith('@')) {
      return validateEmail(trimmed);
    }
    return validateUsername(trimmed);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const mailErr = validateIdentifier(correo);
    if (mailErr || !password) {
      setEmailError(mailErr);
      setAuthError(!password ? 'Ingresa tu contraseña para continuar.' : null);
      return;
    }

    setEmailError(null);
    setAuthError(null);
    setSubmitting(true);

    try {
      const nextStatus = await loginWithEmail(correo, password);
      if (nextStatus === 'needs_username') {
        navigate('/registro/google-username', { replace: true });
      } else {
        navigate(redirectTarget, { replace: true });
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Correo o contraseña incorrectos.';
      setAuthError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setEmailError(null);
    setAuthError(null);
    setSubmitting(true);

    try {
      const nextStatus = await loginWithGoogle();
      if (nextStatus === 'needs_username') {
        navigate('/registro/google-username', { replace: true });
      } else if (nextStatus === 'authenticated') {
        navigate(redirectTarget, { replace: true });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No pudimos completar el ingreso con Google. Intenta nuevamente.';
      setAuthError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const secondaryButtonClasses = `w-full min-h-[48px] px-5 py-3 rounded-xl font-semibold text-base border-[1.5px] border-[#64748b] inline-flex items-center justify-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
    isDark
      ? 'bg-[#0b1220] text-[#f8fafc] hover:bg-white/10'
      : 'bg-white text-[#0f172a] hover:bg-slate-100'
  }`;

  return (
    <section
      aria-labelledby="ingresar-heading"
      className={`w-full max-w-[400px] mx-auto rounded-[16px] p-6 sm:p-8 space-y-5 ${getGlassCardClasses(
        theme
      )}`}
    >
      <h1 id="ingresar-heading" className="sr-only">
        Ingresar
      </h1>

      {authError && (
        <div
          role="alert"
          className={`rounded-[10px] p-3.5 text-sm font-semibold flex items-center gap-2 ${getErrorAlertClasses(
            theme
          )}`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{authError}</span>
        </div>
      )}

      <GoogleAuthButton
        variant="primaryPill"
        onClick={() => void handleGoogleLogin()}
        disabled={submitting}
        label="Continuar con Google"
      />

      <div className="relative flex py-0.5 items-center" aria-hidden="true">
        <div className="flex-grow border-t border-[#64748b]/50" />
        <span
          className={`mx-3 text-xs font-semibold ${
            isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
          }`}
        >
          o
        </span>
        <div className="flex-grow border-t border-[#64748b]/50" />
      </div>

      <form noValidate onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-correo" className="block text-sm font-semibold">
            Correo o usuario
          </label>
          <input
            id="login-correo"
            type="text"
            value={correo}
            onChange={(e) => {
              setCorreo(e.target.value);
              if (emailError) setEmailError(null);
            }}
            autoComplete="username"
            placeholder="Correo o usuario"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'login-correo-error' : undefined}
            className={getInputClasses(theme, Boolean(emailError))}
          />
          {emailError && (
            <p id="login-correo-error" role="alert" className={getInlineErrorClasses(theme)}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{emailError}</span>
            </p>
          )}
        </div>

        <PasswordField
          id="login-password"
          label="Contraseña"
          value={password}
          onChange={(val) => {
            setPassword(val);
            if (authError) setAuthError(null);
          }}
          placeholder="Contraseña"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowRecoveryNote((prev) => !prev)}
            className={`text-xs font-medium min-h-[44px] inline-flex items-center ${getLinkClasses(
              theme
            )}`}
          >
            ¿Olvidaste tu contraseña o usuario?
          </button>
        </div>

        {showRecoveryNote && (
          <p
            role="status"
            className={`rounded-[10px] p-3 text-xs font-medium border border-[#64748b] ${
              isDark ? 'bg-[#0b1220] text-[#cbd5e1]' : 'bg-white text-[#334155]'
            }`}
          >
            La recuperación de contraseña y usuario depende de la conexión del servicio de cuentas
            (TS-01).
          </p>
        )}

        <button type="submit" disabled={submitting} className={secondaryButtonClasses}>
          {submitting ? 'Ingresando...' : 'Ingresar con correo'}
        </button>
      </form>

      <div className="pt-1 text-center">
        <Link to="/registro" className={`text-xs font-medium ${getLinkClasses(theme)}`}>
          Crear cuenta
        </Link>
      </div>
    </section>
  );
}

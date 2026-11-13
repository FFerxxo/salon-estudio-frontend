import { useState, type FormEvent } from 'react';
import { AlertCircle, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { PasswordField } from '../components/PasswordField';
import { selectLoginGreeting } from '../content/saludos';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { validateEmail } from '../utils/authValidation';
import {
  getErrorAlertClasses,
  getGlassCardClasses,
  getInlineErrorClasses,
  getInputClasses,
  getLinkClasses,
  getPrimaryCtaClasses,
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

  const [greeting] = useState(() => selectLoginGreeting());
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showRecoveryNote, setShowRecoveryNote] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const mailErr = validateEmail(correo);
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

  return (
    <section
      aria-labelledby="ingresar-heading"
      className={`marea-morph-card w-full max-w-[360px] mx-auto rounded-[18px] p-6 space-y-3.5 ${getGlassCardClasses(
        theme
      )}`}
    >
      <h1 id="ingresar-heading" className="sr-only">
        Ingresar
      </h1>

      <p
        lang={greeting.lang === 'en' ? 'en' : undefined}
        className="text-[18px] sm:text-[19px] font-bold tracking-tight leading-snug text-center text-balance"
      >
        {greeting.text}
      </p>

      {authError && (
        <div
          role="alert"
          className={`rounded-[10px] p-3 text-xs font-semibold flex items-center gap-2 ${getErrorAlertClasses(
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

      <div className="relative flex items-center" aria-hidden="true">
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

      <form noValidate onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="login-correo" className="block text-sm font-semibold">
            Correo
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-[#94a3b8]' : 'text-[#475569]'
              }`}
            >
              <Mail className="w-4 h-4" />
            </span>
            <input
              id="login-correo"
              type="email"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                if (emailError) setEmailError(null);
              }}
              autoComplete="email"
              placeholder="nombre@correo.com"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'login-correo-error' : undefined}
              className={`${getInputClasses(theme, Boolean(emailError))} pl-10`}
            />
          </div>
          {emailError && (
            <p id="login-correo-error" role="alert" className={getInlineErrorClasses(theme)}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{emailError}</span>
            </p>
          )}
        </div>

        <div>
          <PasswordField
            id="login-password"
            label="Contraseña"
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (authError) setAuthError(null);
            }}
            placeholder="Tu contraseña"
            showLockIcon
          />

          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setShowRecoveryNote((prev) => !prev)}
              className={`text-xs font-medium min-h-[44px] -my-1.5 inline-flex items-center ${getLinkClasses(
                theme
              )}`}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        {showRecoveryNote && (
          <p
            role="status"
            className={`rounded-[10px] p-2.5 text-xs font-medium border border-[#64748b] ${
              isDark ? 'bg-[#0b1220] text-[#cbd5e1]' : 'bg-white text-[#334155]'
            }`}
          >
            La recuperación de contraseña depende de la conexión del servicio de cuentas (TS-01).
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`${getPrimaryCtaClasses(
            theme
          )} !min-h-[44px] h-[44px] !py-2 !text-sm active:scale-[0.97] motion-reduce:active:scale-100 motion-reduce:transition-none transition-[background-color,color,transform] duration-150`}
        >
          {submitting ? 'Ingresando...' : 'Ingresar con correo'}
        </button>
      </form>

      <p className={`text-center text-xs ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
        ¿No tienes cuenta?{' '}
        <Link
          to="/registro"
          className={`font-semibold inline-flex items-center min-h-[44px] -my-2 px-1 ${getLinkClasses(
            theme
          )}`}
        >
          Crear cuenta
        </Link>
      </p>
    </section>
  );
}

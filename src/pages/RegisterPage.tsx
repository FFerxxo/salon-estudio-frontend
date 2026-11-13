import { useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AvatarPicker } from '../components/AvatarPicker';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { PasswordField } from '../components/PasswordField';
import { UsernameField } from '../components/UsernameField';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { AuthApiError } from '../services/authApi';
import {
  evaluatePasswordPolicy,
  validateEmail,
  validatePersonName,
  validateUsername,
} from '../utils/authValidation';
import {
  getErrorAlertClasses,
  getGlassCardClasses,
  getInlineErrorClasses,
  getInputClasses,
  getLinkClasses,
  getPrimaryCtaClasses,
} from '../utils/themeStyles';

interface RegisterErrors {
  nombres?: string | null;
  apellidos?: string | null;
  username?: string | null;
  correo?: string | null;
  password?: string | null;
  general?: string | null;
  emailRegistered?: boolean;
}

export function RegisterPage() {
  useDocumentTitle('Registro');
  const navigate = useNavigate();
  const { registerWithEmail, loginWithGoogle } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('🚀');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const hasIdentityStep =
    Boolean(nombres.trim()) && Boolean(apellidos.trim()) && Boolean(username.trim());
  const currentStep = hasIdentityStep ? 2 : 1;
  const totalSteps = 2;

  const validateAll = (): RegisterErrors => {
    const nextErrors: RegisterErrors = {};
    const nombresErr = validatePersonName(nombres, 'nombres');
    const apellidosErr = validatePersonName(apellidos, 'apellidos');
    const userErr = validateUsername(username);
    const emailErr = validateEmail(correo);
    const passEval = evaluatePasswordPolicy(password);

    if (nombresErr) nextErrors.nombres = nombresErr;
    if (apellidosErr) nextErrors.apellidos = apellidosErr;
    if (userErr) nextErrors.username = userErr;
    if (emailErr) nextErrors.correo = emailErr;
    if (!passEval.isValid) {
      nextErrors.password =
        'La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula y número.';
    }
    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateAll();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await registerWithEmail({
        nombres,
        apellidos,
        username,
        avatar,
        correo,
        password,
      });
      navigate('/panel', { replace: true });
    } catch (err) {
      if (err instanceof AuthApiError) {
        const mapped: RegisterErrors = {};
        if (err.fieldErrors?.nombres) mapped.nombres = err.fieldErrors.nombres;
        if (err.fieldErrors?.apellidos) mapped.apellidos = err.fieldErrors.apellidos;
        if (err.fieldErrors?.username) mapped.username = err.fieldErrors.username;
        if (err.fieldErrors?.email) {
          mapped.correo = err.fieldErrors.email;
          if (err.code === 'EMAIL_TAKEN') mapped.emailRegistered = true;
        }
        if (err.fieldErrors?.avatarUrl) mapped.general = err.fieldErrors.avatarUrl;

        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
        } else if (err.field === 'username') {
          setErrors({ username: err.message });
        } else if (err.field === 'email' || err.code === 'EMAIL_TAKEN') {
          setErrors({ correo: err.message, emailRegistered: true });
        } else {
          setErrors({ general: err.message });
        }
      } else {
        setErrors({ general: 'Ocurrió un error al crear tu cuenta. Intenta nuevamente.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleContinue = async () => {
    setErrors({});
    setSubmitting(true);
    try {
      const nextStatus = await loginWithGoogle();
      if (nextStatus === 'needs_username') {
        navigate('/registro/google-username', { replace: true });
      } else if (nextStatus === 'authenticated') {
        navigate('/panel', { replace: true });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No pudimos completar el acceso con Google. Intenta de nuevo.';
      setErrors({ general: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="registro-heading"
      className={`w-full max-w-[480px] mx-auto rounded-[16px] p-6 sm:p-8 space-y-5 ${getGlassCardClasses(
        theme
      )}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Link to="/" className="inline-flex items-center gap-2.5 rounded-lg">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#990000] font-extrabold text-white text-xs"
          >
            UV
          </span>
          <span className="font-bold text-sm tracking-tight">Salón de Estudio</span>
        </Link>
      </div>

      {/* Barra de progreso accesible con role="progressbar", valor y texto Paso N de M */}
      <div
        role="progressbar"
        aria-label="Progreso del registro"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep}
        aria-valuetext={`Paso ${currentStep} de ${totalSteps}`}
        className="space-y-2"
      >
        <div className="flex items-center justify-between text-xs font-bold">
          <span className={isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}>
            Paso {currentStep} de {totalSteps}
          </span>
          <span className={isDark ? 'text-[#7dd3fc]' : 'text-[#075985]'}>
            {currentStep === 1 ? 'Identidad y @username' : 'Credenciales de acceso'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2" aria-hidden="true">
          <div
            className={`h-2 rounded-full ${
              isDark ? 'bg-[#38bdf8]' : 'bg-[#075985]'
            }`}
          />
          <div
            className={`h-2 rounded-full ${
              currentStep >= 2
                ? isDark
                  ? 'bg-[#38bdf8]'
                  : 'bg-[#075985]'
                : isDark
                  ? 'bg-slate-700'
                  : 'bg-slate-200'
            }`}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <h1 id="registro-heading" className="text-2xl sm:text-[26px] font-bold tracking-tight">
          Crea tu cuenta en el Salón de Estudio
        </h1>
        <p className={`text-sm ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
          Regístrate con tu correo institucional o continúa con Google y elige un{' '}
          <span className="font-mono font-semibold">@username</span> único.
        </p>
      </div>

      <GoogleAuthButton
        onClick={() => void handleGoogleContinue()}
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
          o registro manual
        </span>
        <div className="flex-grow border-t border-[#64748b]/50" />
      </div>

      {errors.general && (
        <div
          role="alert"
          className={`rounded-[10px] p-3.5 text-sm font-semibold flex items-center gap-2 ${getErrorAlertClasses(
            theme
          )}`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{errors.general}</span>
        </div>
      )}

      <form noValidate onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <AvatarPicker value={avatar} onChange={setAvatar} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="reg-nombres" className="block text-sm font-semibold">
              Nombres
            </label>
            <input
              id="reg-nombres"
              type="text"
              value={nombres}
              onChange={(e) => {
                setNombres(e.target.value);
                if (errors.nombres) setErrors((prev) => ({ ...prev, nombres: null }));
              }}
              autoComplete="given-name"
              placeholder="Andrés Fernando"
              aria-invalid={Boolean(errors.nombres)}
              aria-describedby={errors.nombres ? 'reg-nombres-error' : undefined}
              className={getInputClasses(theme, Boolean(errors.nombres))}
            />
            {errors.nombres && (
              <p id="reg-nombres-error" role="alert" className={getInlineErrorClasses(theme)}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.nombres}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-apellidos" className="block text-sm font-semibold">
              Apellidos
            </label>
            <input
              id="reg-apellidos"
              type="text"
              value={apellidos}
              onChange={(e) => {
                setApellidos(e.target.value);
                if (errors.apellidos) setErrors((prev) => ({ ...prev, apellidos: null }));
              }}
              autoComplete="family-name"
              placeholder="Barbosa Salazar"
              aria-invalid={Boolean(errors.apellidos)}
              aria-describedby={errors.apellidos ? 'reg-apellidos-error' : undefined}
              className={getInputClasses(theme, Boolean(errors.apellidos))}
            />
            {errors.apellidos && (
              <p id="reg-apellidos-error" role="alert" className={getInlineErrorClasses(theme)}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.apellidos}</span>
              </p>
            )}
          </div>
        </div>

        <UsernameField
          id="reg-username"
          value={username}
          onChange={(val) => {
            setUsername(val);
            if (errors.username) setErrors((prev) => ({ ...prev, username: null }));
          }}
          error={errors.username}
        />

        <div className="space-y-1.5">
          <label htmlFor="reg-correo" className="block text-sm font-semibold">
            Correo institucional
          </label>
          <input
            id="reg-correo"
            type="email"
            value={correo}
            onChange={(e) => {
              setCorreo(e.target.value);
              if (errors.correo) {
                setErrors((prev) => ({ ...prev, correo: null, emailRegistered: false }));
              }
            }}
            autoComplete="email"
            placeholder="estudiante@correounivalle.edu.co"
            aria-invalid={Boolean(errors.correo)}
            aria-describedby={errors.correo ? 'reg-correo-error' : undefined}
            className={getInputClasses(theme, Boolean(errors.correo))}
          />
          {errors.correo && (
            <p id="reg-correo-error" role="alert" className={getInlineErrorClasses(theme)}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {errors.correo}{' '}
                {errors.emailRegistered && (
                  <Link to="/ingresar" className={getLinkClasses(theme)}>
                    Ir a Ingresar
                  </Link>
                )}
              </span>
            </p>
          )}
        </div>

        <PasswordField
          id="reg-password"
          label="Contraseña"
          value={password}
          onChange={(val) => {
            setPassword(val);
            if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
          }}
          error={errors.password}
          autoComplete="new-password"
          showStrengthMeter
        />

        <button type="submit" disabled={submitting} className={getPrimaryCtaClasses(theme)}>
          {submitting ? 'Creando cuenta de Estudiante...' : 'Crear cuenta e ingresar al Panel'}
        </button>
      </form>

      <p className={`text-sm text-center ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
        ¿Ya tienes una cuenta?{' '}
        <Link to="/ingresar" className={getLinkClasses(theme)}>
          Ingresar al Salón
        </Link>
      </p>
    </section>
  );
}

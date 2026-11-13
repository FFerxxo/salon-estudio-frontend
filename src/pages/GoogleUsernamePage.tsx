import { useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AvatarPicker } from '../components/AvatarPicker';
import { UsernameField } from '../components/UsernameField';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { AuthApiError } from '../services/authApi';
import { validatePersonName, validateUsername } from '../utils/authValidation';
import {
  getErrorAlertClasses,
  getGlassCardClasses,
  getInlineErrorClasses,
  getInputClasses,
  getPrimaryCtaClasses,
} from '../utils/themeStyles';

/** Paso obligatorio post-Google para elegir un nombre de usuario único antes de abrir rutas privadas. */
export function GoogleUsernamePage() {
  useDocumentTitle('Elegir usuario');
  const navigate = useNavigate();
  const { status, pendingGoogleUser, completeGoogleUsername, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [nombres, setNombres] = useState(pendingGoogleUser?.nombres || 'Estudiante');
  const [apellidos, setApellidos] = useState(pendingGoogleUser?.apellidos || 'Univalle');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('🚀');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/panel" replace />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/ingresar" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userErr = validateUsername(username);
    const nErr =
      validatePersonName(nombres, 'nombres') || validatePersonName(apellidos, 'apellidos');

    if (userErr || nErr) {
      setUsernameError(userErr);
      setNameError(nErr);
      return;
    }

    setUsernameError(null);
    setNameError(null);
    setGeneralError(null);
    setSubmitting(true);

    try {
      await completeGoogleUsername({
        nombres,
        apellidos,
        username,
        avatar,
      });
      navigate('/panel', { replace: true });
    } catch (err) {
      if (err instanceof AuthApiError) {
        const combinedNameErr = [err.fieldErrors?.nombres, err.fieldErrors?.apellidos]
          .filter(Boolean)
          .join(' ');
        if (combinedNameErr) setNameError(combinedNameErr);
        if (err.fieldErrors?.username || err.field === 'username') {
          setUsernameError(err.fieldErrors?.username || err.message);
        }
        if (err.fieldErrors?.avatarUrl) {
          setGeneralError(err.fieldErrors.avatarUrl);
        } else if (!combinedNameErr && !err.fieldErrors?.username && err.field !== 'username') {
          setGeneralError(err.message);
        }
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError('No se pudo completar tu Perfil. Intenta nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    await logout();
    navigate('/ingresar', { replace: true });
  };

  return (
    <section
      aria-labelledby="google-username-heading"
      className={`w-full max-w-[460px] mx-auto rounded-[16px] p-6 sm:p-8 space-y-5 ${getGlassCardClasses(
        theme
      )}`}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#990000] font-extrabold text-white text-xs"
        >
          UV
        </span>
        <span className="font-bold text-sm tracking-tight">Salón de Estudio</span>
      </div>

      <div
        role="progressbar"
        aria-label="Progreso del registro con Google"
        aria-valuemin={1}
        aria-valuemax={2}
        aria-valuenow={2}
        aria-valuetext="Paso 2 de 2"
        className="space-y-2"
      >
        <div className="flex items-center justify-between text-xs font-bold">
          <span className={isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}>Paso 2 de 2</span>
          <span className={isDark ? 'text-[#7dd3fc]' : 'text-[#075985]'}>
            Cuenta Google verificada · Elige tu @username
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2" aria-hidden="true">
          <div className={`h-2 rounded-full ${isDark ? 'bg-[#38bdf8]' : 'bg-[#075985]'}`} />
          <div className={`h-2 rounded-full ${isDark ? 'bg-[#38bdf8]' : 'bg-[#075985]'}`} />
        </div>
      </div>

      <div className="space-y-1.5">
        <h1
          id="google-username-heading"
          className="text-2xl sm:text-[26px] font-bold tracking-tight"
        >
          Elige tu nombre de usuario único
        </h1>
        <p className={`text-sm ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
          Iniciaste con Google como{' '}
          <strong className="font-mono">
            {pendingGoogleUser?.correo || 'cuenta verificada'}
          </strong>
          . Define tu <span className="font-mono">@username</span> para acceder al Panel y las
          Salas.
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          className={`rounded-[10px] p-3.5 text-sm font-semibold flex items-center gap-2 ${getErrorAlertClasses(
            theme
          )}`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{generalError}</span>
        </div>
      )}

      <form noValidate onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <AvatarPicker value={avatar} onChange={setAvatar} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="google-nombres" className="block text-sm font-semibold">
              Nombres
            </label>
            <input
              id="google-nombres"
              type="text"
              value={nombres}
              onChange={(e) => {
                setNombres(e.target.value);
                if (nameError) setNameError(null);
              }}
              className={getInputClasses(theme, Boolean(nameError))}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="google-apellidos" className="block text-sm font-semibold">
              Apellidos
            </label>
            <input
              id="google-apellidos"
              type="text"
              value={apellidos}
              onChange={(e) => {
                setApellidos(e.target.value);
                if (nameError) setNameError(null);
              }}
              className={getInputClasses(theme, Boolean(nameError))}
            />
          </div>
        </div>

        {nameError && (
          <p role="alert" className={getInlineErrorClasses(theme)}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{nameError}</span>
          </p>
        )}

        <UsernameField
          id="google-username-input"
          value={username}
          onChange={(val) => {
            setUsername(val);
            if (usernameError) setUsernameError(null);
          }}
          error={usernameError}
        />

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={submitting} className={getPrimaryCtaClasses(theme)}>
            {submitting ? 'Guardando Perfil...' : 'Confirmar usuario y entrar al Panel'}
          </button>
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={submitting}
            className={`min-h-[48px] px-4 py-3 rounded-xl text-sm font-semibold border-[1.5px] border-[#64748b] transition-colors ${
              isDark
                ? 'bg-[#0b1220] text-[#f8fafc] hover:bg-white/10'
                : 'bg-white text-[#0f172a] hover:bg-slate-100'
            }`}
          >
            Cancelar y volver
          </button>
        </div>
      </form>
    </section>
  );
}

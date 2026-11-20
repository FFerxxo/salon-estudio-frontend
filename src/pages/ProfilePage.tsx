import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Globe,
  KeyRound,
  Mail,
  Pencil,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { AppDialog } from '../components/AppDialog';
import { AvatarPicker } from '../components/AvatarPicker';
import { StatusBanner } from '../components/StatusBanner';
import { UsernameField } from '../components/UsernameField';
import { useAuth } from '../context/AuthContext';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { AuthApiError, type StudentProfile, type UpdateProfilePayload } from '../services/authApi';
import { firebaseAuth } from '../services/firebase';
import {
  normalizeUsername,
  validateEmail,
  validatePersonName,
  validateUsername,
} from '../utils/authValidation';
import {
  getDangerOutlineBtnClasses,
  getErrorAlertClasses,
  getFormActionGroupClasses,
  getInlineErrorClasses,
  getInputClasses,
  getPrimaryCtaClasses,
  getSecondaryBtnClasses,
  getSolidSurfaceClasses,
} from '../utils/themeStyles';

interface ProfileDraft {
  nombres: string;
  apellidos: string;
  username: string;
  correo: string;
  avatar: string;
}

interface ProfileErrors {
  nombres?: string | null;
  apellidos?: string | null;
  username?: string | null;
  correo?: string | null;
  general?: string | null;
}

function resolveProvider(user: StudentProfile | null): 'google' | 'password' | undefined {
  const providerIds = firebaseAuth?.currentUser?.providerData.map((p) => p.providerId) ?? [];
  return (
    user?.provider ??
    (providerIds.includes('google.com')
      ? 'google'
      : providerIds.includes('password')
        ? 'password'
        : undefined)
  );
}

function buildDraftFromUser(user: StudentProfile): ProfileDraft {
  return {
    nombres: user.nombres,
    apellidos: user.apellidos,
    username: user.username,
    correo: user.correo,
    avatar: user.avatar || '🚀',
  };
}

function mapSaveError(err: unknown): ProfileErrors {
  if (!(err instanceof AuthApiError)) {
    return { general: 'No pudimos guardar tus cambios. Intenta nuevamente.' };
  }

  const mapped: ProfileErrors = {};
  if (err.fieldErrors?.nombres) mapped.nombres = err.fieldErrors.nombres;
  if (err.fieldErrors?.apellidos) mapped.apellidos = err.fieldErrors.apellidos;
  if (err.fieldErrors?.username) mapped.username = err.fieldErrors.username;
  if (err.fieldErrors?.email) mapped.correo = err.fieldErrors.email;
  if (err.fieldErrors?.avatarUrl) mapped.general = err.fieldErrors.avatarUrl;

  if (Object.keys(mapped).length > 0) {
    return mapped;
  }

  const lowerMsg = err.message.toLowerCase();

  if (err.status === 409) {
    if (
      err.field === 'email' ||
      err.code === 'EMAIL_TAKEN' ||
      lowerMsg.includes('correo') ||
      lowerMsg.includes('email')
    ) {
      return { correo: err.message || 'Ese correo ya tiene una cuenta.' };
    }
    return {
      username: err.message || 'Ese nombre de usuario ya está en uso. Prueba con otro.',
    };
  }

  if (err.code === 'CORREO_GOOGLE' || err.status === 403) {
    return { general: err.message || 'Tu correo lo administra Google.' };
  }

  if (err.field === 'username') {
    return { username: err.message };
  }
  if (err.field === 'email') {
    return { correo: err.message };
  }

  return { general: err.message };
}

function ProfileAvatar({ user, isDark }: { user: StudentProfile; isDark: boolean }) {
  const initial = (user.nombres || user.username || 'E').trim().charAt(0).toUpperCase();
  const hasPhoto =
    Boolean(user.avatarUrl?.startsWith('https://')) &&
    (!user.avatar || user.avatar.startsWith('https://'));

  if (hasPhoto && user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className={`h-20 w-20 rounded-full object-cover outline outline-1 -outline-offset-1 ${
          isDark ? 'outline-white/10' : 'outline-black/10'
        }`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="h-20 w-20 rounded-full bg-[#0f766e] text-white text-3xl font-bold inline-flex items-center justify-center select-none"
    >
      {user.avatar || initial}
    </span>
  );
}

function ProfileSkeleton({ theme }: { theme: ThemeMode }) {
  const isDark = theme === 'dark';
  const blockBg = isDark ? 'bg-slate-700/60' : 'bg-slate-200';

  return (
    <section
      aria-busy="true"
      aria-labelledby="perfil-heading"
      className={`max-w-lg mx-auto rounded-[20px] p-6 sm:p-8 ${getSolidSurfaceClasses(theme)}`}
    >
      <h1 id="perfil-heading" className="sr-only">
        Perfil
      </h1>
      <div role="status" className="space-y-6">
        <span className="sr-only">Cargando perfil</span>
        <div aria-hidden="true" className="flex flex-col items-center gap-2.5">
          <div className={`h-20 w-20 rounded-full animate-pulse motion-reduce:animate-none ${blockBg}`} />
          <div className={`h-6 w-48 rounded-lg animate-pulse motion-reduce:animate-none ${blockBg}`} />
          <div className={`h-4 w-32 rounded-lg animate-pulse motion-reduce:animate-none ${blockBg}`} />
        </div>
        <div aria-hidden="true" className="space-y-3">
          <div className={`h-14 w-full rounded-[14px] animate-pulse motion-reduce:animate-none ${blockBg}`} />
          <div className={`h-14 w-full rounded-[14px] animate-pulse motion-reduce:animate-none ${blockBg}`} />
          <div className={`h-14 w-full rounded-[14px] animate-pulse motion-reduce:animate-none ${blockBg}`} />
        </div>
      </div>
    </section>
  );
}

function ProfileLoadError({
  theme,
  message,
  onRetry,
}: {
  theme: ThemeMode;
  message: string;
  onRetry: () => void;
}) {
  const isDark = theme === 'dark';

  return (
    <section
      aria-labelledby="perfil-heading"
      className={`max-w-lg mx-auto rounded-[20px] p-6 sm:p-8 ${getSolidSurfaceClasses(theme)}`}
    >
      <h1 id="perfil-heading" className="sr-only">
        Perfil
      </h1>
      <div
        role="alert"
        className={`rounded-xl p-4 text-sm font-semibold flex flex-wrap items-center justify-between gap-3 ${getErrorAlertClasses(
          theme
        )}`}
      >
        <span className="inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-pretty">{message}</span>
        </span>
        <button
          type="button"
          onClick={onRetry}
          className={`${getSecondaryBtnClasses(theme)} ${
            isDark ? '!bg-[#0f172a]' : '!bg-white'
          }`}
        >
          <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Reintentar</span>
        </button>
      </div>
    </section>
  );
}

export function ProfilePage() {
  useDocumentTitle('Perfil');
  const { user, status, updateProfile, refreshProfile, deleteAccount } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBannerVisible, setSavedBannerVisible] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const editHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const shouldRestoreEditBtnFocusRef = useRef(false);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const cancelDeleteBtnRef = useRef<HTMLButtonElement | null>(null);

  const [draft, setDraft] = useState<ProfileDraft>({
    nombres: '',
    apellidos: '',
    username: '',
    correo: '',
    avatar: '🚀',
  });
  const [errors, setErrors] = useState<ProfileErrors>({});

  useEffect(() => {
    if (mode === 'edit') {
      editHeadingRef.current?.focus();
    } else if (shouldRestoreEditBtnFocusRef.current) {
      shouldRestoreEditBtnFocusRef.current = false;
      editButtonRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    if (user || status !== 'authenticated') {
      return;
    }

    let active = true;
    setIsLoadingProfile(true);
    setLoadError(null);

    refreshProfile()
      .then((loaded) => {
        if (active && !loaded) {
          setLoadError('No pudimos cargar tu perfil.');
        }
      })
      .catch(() => {
        if (active) {
          setLoadError('No pudimos cargar tu perfil.');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, status, refreshProfile]);

  const handleRetryLoad = async () => {
    setIsLoadingProfile(true);
    setLoadError(null);
    try {
      const loaded = await refreshProfile();
      if (!loaded) {
        setLoadError('No pudimos cargar tu perfil.');
      }
    } catch {
      setLoadError('No pudimos cargar tu perfil.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  if (!user && isLoadingProfile) {
    return <ProfileSkeleton theme={theme} />;
  }

  if (!user && loadError) {
    return <ProfileLoadError theme={theme} message={loadError} onRetry={() => void handleRetryLoad()} />;
  }

  if (!user) {
    return (
      <section
        aria-labelledby="perfil-heading"
        className={`max-w-lg mx-auto rounded-[20px] p-6 sm:p-8 ${getSolidSurfaceClasses(theme)}`}
      >
        <h1 id="perfil-heading" className="sr-only">
          Perfil
        </h1>
      </section>
    );
  }

  const metodo = resolveProvider(user);
  const isGoogle = metodo === 'google';

  const handleEnterEdit = () => {
    setDraft(buildDraftFromUser(user));
    setErrors({});
    setSavedBannerVisible(false);
    setMode('edit');
  };

  const handleCancelEdit = () => {
    setDraft(buildDraftFromUser(user));
    setErrors({});
    shouldRestoreEditBtnFocusRef.current = true;
    setMode('view');
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedNombres = draft.nombres.trim();
    const trimmedApellidos = draft.apellidos.trim();
    const normalizedUsername = normalizeUsername(draft.username);
    const trimmedCorreo = draft.correo.trim();

    const nextErrors: ProfileErrors = {};
    const nombresErr = validatePersonName(trimmedNombres, 'nombres');
    const apellidosErr = validatePersonName(trimmedApellidos, 'apellidos');
    const usernameErr = validateUsername(normalizedUsername);
    const correoErr = !isGoogle ? validateEmail(trimmedCorreo) : null;

    if (nombresErr) nextErrors.nombres = nombresErr;
    if (apellidosErr) nextErrors.apellidos = apellidosErr;
    if (usernameErr) nextErrors.username = usernameErr;
    if (correoErr) nextErrors.correo = correoErr;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload: UpdateProfilePayload = {};
    if (trimmedNombres !== user.nombres.trim()) {
      payload.nombres = trimmedNombres;
    }
    if (trimmedApellidos !== user.apellidos.trim()) {
      payload.apellidos = trimmedApellidos;
    }
    if (normalizedUsername !== normalizeUsername(user.username)) {
      payload.username = normalizedUsername;
    }
    if (draft.avatar !== user.avatar) {
      payload.avatar = draft.avatar;
    }
    if (!isGoogle && trimmedCorreo.toLowerCase() !== (user.correo || '').trim().toLowerCase()) {
      payload.correo = trimmedCorreo;
    }

    if (Object.keys(payload).length === 0) {
      setErrors({});
      shouldRestoreEditBtnFocusRef.current = true;
      setMode('view');
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await updateProfile(payload);
      shouldRestoreEditBtnFocusRef.current = true;
      setMode('view');
      setSavedBannerVisible(true);
    } catch (err) {
      setErrors(mapSaveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      setDeleteOpen(false);
    } catch (err) {
      setDeleteError(
        err instanceof Error && err.message
          ? err.message
          : 'No pudimos eliminar tu cuenta. Intenta de nuevo.'
      );
    } finally {
      setDeleting(false);
    }
  };

  if (mode === 'edit') {
    return (
      <section
        aria-labelledby="perfil-heading"
        className={`max-w-lg mx-auto rounded-[20px] p-6 sm:p-8 ${getSolidSurfaceClasses(theme)}`}
      >
        <h1
          id="perfil-heading"
          ref={editHeadingRef}
          tabIndex={-1}
          className="text-xl sm:text-2xl font-bold tracking-tight text-balance mb-5 focus:outline-none"
        >
          Editar perfil
        </h1>

        {errors.general && (
          <div
            role="alert"
            className={`mb-4 rounded-xl p-3.5 text-sm font-semibold flex items-center gap-2 ${getErrorAlertClasses(
              theme
            )}`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-pretty">{errors.general}</span>
          </div>
        )}

        <form noValidate onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="profile-nombres"
                className={`block text-sm font-semibold ${isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}`}
              >
                Nombres
              </label>
              <input
                id="profile-nombres"
                type="text"
                autoComplete="given-name"
                value={draft.nombres}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({ ...prev, nombres: val }));
                  if (errors.nombres) setErrors((prev) => ({ ...prev, nombres: null }));
                }}
                aria-invalid={Boolean(errors.nombres)}
                aria-describedby={errors.nombres ? 'profile-nombres-error' : undefined}
                className={getInputClasses(theme, Boolean(errors.nombres))}
              />
              {errors.nombres && (
                <p id="profile-nombres-error" role="alert" className={getInlineErrorClasses(theme)}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.nombres}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-apellidos"
                className={`block text-sm font-semibold ${isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}`}
              >
                Apellidos
              </label>
              <input
                id="profile-apellidos"
                type="text"
                autoComplete="family-name"
                value={draft.apellidos}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({ ...prev, apellidos: val }));
                  if (errors.apellidos) setErrors((prev) => ({ ...prev, apellidos: null }));
                }}
                aria-invalid={Boolean(errors.apellidos)}
                aria-describedby={errors.apellidos ? 'profile-apellidos-error' : undefined}
                className={getInputClasses(theme, Boolean(errors.apellidos))}
              />
              {errors.apellidos && (
                <p id="profile-apellidos-error" role="alert" className={getInlineErrorClasses(theme)}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.apellidos}</span>
                </p>
              )}
            </div>
          </div>

          <UsernameField
            id="profile-username"
            label="Nombre de usuario"
            value={draft.username}
            currentUsername={user.username}
            onChange={(nextUsername) => {
              setDraft((prev) => ({ ...prev, username: nextUsername }));
              if (errors.username) setErrors((prev) => ({ ...prev, username: null }));
            }}
            error={errors.username}
          />

          <div className="space-y-1.5">
            <label
              htmlFor="profile-correo"
              className={`block text-sm font-semibold ${isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}`}
            >
              Correo
            </label>
            {isGoogle ? (
              <>
                <input
                  id="profile-correo"
                  type="email"
                  value={user.correo}
                  readOnly
                  aria-readonly="true"
                  aria-describedby="profile-correo-helper"
                  className={`w-full min-h-[44px] rounded-[10px] border-[1.5px] border-[#64748b] px-3.5 py-2.5 text-base cursor-not-allowed ${
                    isDark ? 'bg-[#162238] text-[#94a3b8]' : 'bg-slate-100 text-slate-600'
                  }`}
                />
                <p
                  id="profile-correo-helper"
                  className={`text-xs font-medium text-pretty ${
                    isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
                  }`}
                >
                  Tu correo lo administra Google. Para cambiarlo, hazlo en tu cuenta de Google.
                </p>
              </>
            ) : (
              <>
                <input
                  id="profile-correo"
                  type="email"
                  autoComplete="email"
                  value={draft.correo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraft((prev) => ({ ...prev, correo: val }));
                    if (errors.correo) setErrors((prev) => ({ ...prev, correo: null }));
                  }}
                  aria-invalid={Boolean(errors.correo)}
                  aria-describedby={errors.correo ? 'profile-correo-error' : undefined}
                  className={getInputClasses(theme, Boolean(errors.correo))}
                />
                {errors.correo && (
                  <p id="profile-correo-error" role="alert" className={getInlineErrorClasses(theme)}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.correo}</span>
                  </p>
                )}
              </>
            )}
          </div>

          <AvatarPicker
            value={draft.avatar}
            onChange={(nextAvatar) => setDraft((prev) => ({ ...prev, avatar: nextAvatar }))}
          />

          <div className={getFormActionGroupClasses()}>
            <button
              type="button"
              disabled={saving}
              onClick={handleCancelEdit}
              className={`${getSecondaryBtnClasses(theme)} w-full sm:w-auto sm:min-w-[130px]`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`${getPrimaryCtaClasses(
                theme
              )} !w-full sm:!w-auto sm:min-w-[160px] !min-h-[44px] !py-2.5 text-sm`}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </section>
    );
  }

  const correo = user.correo?.trim() || '';
  const dominio = correo.includes('@') ? correo.split('@')[1] : '';
  const esUnivalle = /(^|\.)(correo)?univalle\.edu\.co$/i.test(dominio);
  const fechaAlta = user.creadoEn ? new Date(user.creadoEn) : null;
  const miembroDesde =
    fechaAlta && !Number.isNaN(fechaAlta.getTime())
      ? fechaAlta.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

  const filas = [
    correo && { Icon: Mail, label: 'Correo', value: correo },
    dominio && {
      Icon: Globe,
      label: 'Dominio',
      value: esUnivalle ? `${dominio} · Universidad del Valle` : dominio,
    },
    metodo && {
      Icon: isGoogle ? ShieldCheck : KeyRound,
      label: 'Acceso',
      value: isGoogle ? 'Cuenta de Google' : 'Correo y contraseña',
    },
    miembroDesde && { Icon: CalendarDays, label: 'Miembro desde', value: miembroDesde },
  ].filter(Boolean) as { Icon: typeof Mail; label: string; value: string }[];

  return (
    <section
      aria-labelledby="perfil-heading"
      className={`max-w-lg mx-auto rounded-[20px] p-6 sm:p-8 ${getSolidSurfaceClasses(theme)}`}
    >
      <h1 id="perfil-heading" className="sr-only">
        Perfil
      </h1>

      {savedBannerVisible && (
        <StatusBanner
          message="Cambios guardados"
          onDismiss={() => setSavedBannerVisible(false)}
          className="mb-5"
        />
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        <ProfileAvatar user={user} isDark={isDark} />
        <p className="mt-1 text-2xl font-bold tracking-tight text-balance">
          {user.nombres} {user.apellidos}
        </p>
        <p className={`font-mono text-base ${isDark ? 'text-[#7dd3fc]' : 'text-[#075985]'}`}>
          @{user.username}
        </p>
        {isGoogle && (
          <span
            className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
              isDark
                ? 'bg-[#38bdf8]/15 text-[#7dd3fc] ring-[#38bdf8]/30'
                : 'bg-[#075985]/10 text-[#075985] ring-[#075985]/25'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Conectado con Google
          </span>
        )}
        <div className="mt-3">
          <button
            ref={editButtonRef}
            type="button"
            onClick={handleEnterEdit}
            className={`${getPrimaryCtaClasses(theme)} !w-auto !min-h-[44px] !py-2.5 text-sm active:scale-[0.96] transition-[transform,background-color]`}
          >
            <Pencil className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Editar perfil</span>
          </button>
        </div>
      </div>

      {filas.length > 0 && (
        <>
          <h2 className="mt-7 mb-3 text-sm font-bold uppercase tracking-wide">Mi cuenta</h2>
          <dl
            className={`divide-y rounded-[14px] border ${
              isDark ? 'divide-slate-400/20 border-slate-400/30' : 'divide-slate-200 border-slate-300'
            }`}
          >
            {filas.map(({ Icon, label, value }) => (
              <div key={label} className="px-4 py-3">
                <dt
                  className={`flex items-center gap-2.5 text-xs font-semibold ${
                    isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-7 w-7 shrink-0 rounded-full inline-flex items-center justify-center ${
                      isDark ? 'bg-[#38bdf8]/15 text-[#7dd3fc]' : 'bg-[#075985]/10 text-[#075985]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  {label}
                </dt>
                <dd className="mt-0.5 pl-[38px] text-sm font-semibold break-words text-pretty">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <section
        aria-labelledby="danger-zone-heading"
        className={`mt-7 rounded-[14px] border p-5 text-center space-y-2.5 ${
          isDark
            ? 'border-[#f87171]/60 bg-[#450a0a]/30'
            : 'border-[#b91c1c]/40 bg-[#fef2f2]/60'
        }`}
      >
        <div className="space-y-1">
          <h2
            id="danger-zone-heading"
            className="text-lg font-bold tracking-tight text-balance"
          >
            Eliminar cuenta
          </h2>
          <p
            className={`text-sm font-normal tracking-normal text-pretty ${
              isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
            }`}
          >
            Se borran tu perfil y tus salas. No se puede deshacer.
          </p>
        </div>

        <div className="flex justify-center pt-1">
          <button
            ref={deleteTriggerRef}
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
            className={getDangerOutlineBtnClasses(theme)}
          >
            Eliminar cuenta
          </button>
        </div>
      </section>

      <AppDialog
        open={deleteOpen}
        role="alertdialog"
        title="¿Eliminar tu cuenta?"
        descriptionId="delete-account-desc"
        initialFocusRef={cancelDeleteBtnRef}
        disableClose={deleting}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeleteError(null);
          }
        }}
      >
        <div className="space-y-3 text-sm">
          <div id="delete-account-desc" className="space-y-3">
            <p className={`text-pretty ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
              Al confirmar se perderá de forma permanente:
            </p>
            <ul
              className={`list-disc pl-5 space-y-1.5 text-pretty ${
                isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
              }`}
            >
              <li>Tu perfil y tu nombre de usuario.</li>
              <li>Las salas que creaste.</li>
              <li>Tus mensajes en salas de otras personas quedan como «Cuenta eliminada».</li>
            </ul>
            <p className="font-bold text-pretty">Esto no se puede deshacer.</p>
          </div>

          {deleteError && (
            <div
              role="alert"
              className={`rounded-xl p-3 text-sm font-semibold flex items-center gap-2 ${getErrorAlertClasses(
                theme
              )}`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-pretty">{deleteError}</span>
            </div>
          )}

          <div className={getFormActionGroupClasses()}>
            <button
              ref={cancelDeleteBtnRef}
              type="button"
              disabled={deleting}
              onClick={() => {
                setDeleteOpen(false);
                setDeleteError(null);
              }}
              className={`${getSecondaryBtnClasses(theme)} w-full sm:w-auto sm:min-w-[130px]`}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleConfirmDelete()}
              className="w-full sm:w-auto sm:min-w-[190px] min-h-[44px] px-4 py-2.5 rounded-xl bg-[#b91c1c] hover:bg-[#991b1b] text-white text-sm font-semibold active:scale-[0.96] transition-[transform,background-color] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
          </div>
        </div>
      </AppDialog>
    </section>
  );
}

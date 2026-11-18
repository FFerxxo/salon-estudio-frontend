import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Pause, Play } from 'lucide-react';
import { AMBIENTE_LIST, AMBIENTES, type AmbienteId } from '../content/ambientes';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { firebaseAuth } from '../services/firebase';
import { isMocksEnabled } from '../services/mockConfig';
import {
  createRoom,
  RoomsApiError,
  validateRoomName,
  type Room,
} from '../services/roomsApi';
import {
  getErrorAlertClasses,
  getInlineErrorClasses,
  getInputClasses,
  getPrimaryCtaClasses,
} from '../utils/themeStyles';
import { AppDialog } from './AppDialog';

export interface CreateRoomDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (room: Room) => void;
}

async function resolveAuthToken(idToken: string | null): Promise<string> {
  if (isMocksEnabled()) {
    return idToken ?? 'mock-token';
  }
  const fbToken = await firebaseAuth?.currentUser?.getIdToken().catch(() => null);
  return fbToken ?? idToken ?? '';
}

/** Ventana modal para crear una sala nueva con nombre validado y ambiente sonoro opcional. */
export function CreateRoomDialog({ open, onClose, onCreated }: CreateRoomDialogProps) {
  const { idToken } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const nameInputId = useId();
  const nameErrorId = useId();
  const nameCounterId = useId();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [nombre, setNombre] = useState('');
  const [ambiente, setAmbiente] = useState<AmbienteId>('ninguno');
  const [nombreError, setNombreError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState<Exclude<AmbienteId, 'ninguno'> | null>(null);

  const stopPreview = useCallback(() => {
    const audio = previewAudioRef.current;
    if (audio) {
      try {
        audio.pause();
      } catch {
        // Entorno sin implementación de medios
      }
      try {
        audio.currentTime = 0;
      } catch {
        // Ignorar si no hay pista cargada
      }
    }
    setPreviewing(null);
  }, []);

  useEffect(() => {
    if (!open) {
      stopPreview();
    }
  }, [open, stopPreview]);

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  const resetForm = () => {
    setNombre('');
    setAmbiente('ninguno');
    setNombreError(null);
    setServerError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    stopPreview();
    resetForm();
    onClose();
  };

  const handleTogglePreview = (ambId: Exclude<AmbienteId, 'ninguno'>) => {
    if (previewing === ambId) {
      stopPreview();
      return;
    }

    stopPreview();
    const firstTrack = AMBIENTES[ambId].tracks[0];
    if (!firstTrack) return;

    setPreviewing(ambId);
    const audio = previewAudioRef.current;
    if (audio) {
      audio.src = firstTrack.src;
      audio.volume = 0.5;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  };

  const handleSelectAmbiente = (nextAmbiente: AmbienteId) => {
    setAmbiente(nextAmbiente);
    if (previewing && previewing !== nextAmbiente) {
      stopPreview();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const validationError = validateRoomName(nombre);
    if (validationError) {
      setNombreError(validationError);
      setServerError(null);
      nameInputRef.current?.focus();
      return;
    }

    stopPreview();
    setNombreError(null);
    setServerError(null);
    setSubmitting(true);

    try {
      const token = await resolveAuthToken(idToken);
      const room = await createRoom(token, {
        nombre: nombre.trim(),
        ambiente,
      });
      resetForm();
      onCreated(room);
    } catch (err) {
      if (err instanceof RoomsApiError) {
        if (err.status === 400 && err.fieldErrors?.nombre) {
          setNombreError(err.fieldErrors.nombre);
          nameInputRef.current?.focus();
        } else {
          setServerError(err.message || 'No pudimos crear la sala. Intenta de nuevo.');
        }
      } else {
        setServerError('No pudimos crear la sala. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const counterExceeds = nombre.length > 50;
  const describedBy = nombreError ? `${nameErrorId} ${nameCounterId}` : nameCounterId;

  return (
    <AppDialog
      open={open}
      title="Crear sala"
      descriptionId="create-room-desc"
      initialFocusRef={nameInputRef}
      disableClose={submitting}
      onClose={handleClose}
    >
      <audio
        ref={previewAudioRef}
        preload="none"
        onEnded={() => setPreviewing(null)}
      />

      <p
        id="create-room-desc"
        className={`text-sm mb-4 text-pretty ${
          isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
        }`}
      >
        Elige un nombre y, si quieres, un ambiente sonoro para estudiar.
      </p>

      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        {serverError && (
          <div
            role="alert"
            className={`rounded-xl p-3 text-sm font-semibold flex items-center gap-2 ${getErrorAlertClasses(
              theme
            )}`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-pretty">{serverError}</span>
          </div>
        )}

        <div>
          <label
            htmlFor={nameInputId}
            className={`block text-sm font-semibold mb-1.5 ${
              isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'
            }`}
          >
            Nombre de la sala
          </label>
          <input
            id={nameInputId}
            ref={nameInputRef}
            type="text"
            value={nombre}
            placeholder="Ej. Cálculo II · parcial"
            onChange={(event) => {
              setNombre(event.target.value);
              if (nombreError) {
                setNombreError(null);
              }
            }}
            aria-invalid={Boolean(nombreError)}
            aria-describedby={describedBy}
            className={getInputClasses(theme, Boolean(nombreError))}
          />
          <div className="mt-1.5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              {nombreError && (
                <p id={nameErrorId} role="alert" className={getInlineErrorClasses(theme)}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{nombreError}</span>
                </p>
              )}
            </div>
            <span
              id={nameCounterId}
              className={`text-xs font-semibold tabular-nums shrink-0 ml-auto ${
                counterExceeds
                  ? isDark
                    ? 'text-[#fecaca]'
                    : 'text-[#b91c1c]'
                  : isDark
                    ? 'text-[#cbd5e1]'
                    : 'text-[#334155]'
              }`}
            >
              {nombre.length}/50
            </span>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend
            className={`text-sm font-semibold mb-1.5 ${
              isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'
            }`}
          >
            Ambiente sonoro
          </legend>

          <div role="radiogroup" aria-label="Ambiente sonoro" className="space-y-2">
            {AMBIENTE_LIST.map((amb) => {
              const checked = ambiente === amb.id;
              const isPreviewActive = previewing === amb.id;
              const hasPreview = amb.id === 'blue' || amb.id === 'green';

              return (
                <div
                  key={amb.id}
                  className={`flex items-center justify-between gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 transition-colors ${
                    checked
                      ? isDark
                        ? 'border-[#38bdf8] bg-[#38bdf8]/15'
                        : 'border-[#075985] bg-[#075985]/10'
                      : isDark
                        ? 'border-[#64748b] bg-[#0b1220]'
                        : 'border-[#64748b] bg-white'
                  }`}
                >
                  <label className="flex flex-1 items-center gap-2.5 min-h-[44px] cursor-pointer">
                    <input
                      type="radio"
                      name="ambiente"
                      value={amb.id}
                      checked={checked}
                      onChange={() => handleSelectAmbiente(amb.id)}
                      className={`size-4 shrink-0 ${
                        isDark ? 'accent-[#38bdf8]' : 'accent-[#075985]'
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{amb.label}</span>
                      <span
                        className={`block text-xs text-pretty ${
                          isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
                        }`}
                      >
                        {amb.description}
                      </span>
                    </span>
                  </label>

                  {hasPreview && (
                    <button
                      type="button"
                      onClick={() =>
                        handleTogglePreview(amb.id as Exclude<AmbienteId, 'ninguno'>)
                      }
                      aria-pressed={isPreviewActive}
                      aria-label={
                        isPreviewActive
                          ? `Detener muestra de ${amb.label}`
                          : `Escuchar muestra de ${amb.label}`
                      }
                      className={`min-h-[44px] px-3 py-2 rounded-xl border-[1.5px] border-[#64748b] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 active:scale-[0.96] transition-[transform,background-color] ${
                        isDark
                          ? 'text-[#f8fafc] hover:bg-white/10'
                          : 'text-[#0f172a] hover:bg-slate-100'
                      }`}
                    >
                      {isPreviewActive ? (
                        <>
                          <Pause className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>Detener</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>Escuchar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={handleClose}
            className={`min-h-[44px] px-4 py-2 rounded-xl border-[1.5px] border-[#64748b] text-sm font-semibold active:scale-[0.96] transition-[transform,background-color] disabled:opacity-60 disabled:cursor-not-allowed ${
              isDark
                ? 'text-[#f8fafc] hover:bg-white/10'
                : 'text-[#0f172a] hover:bg-slate-100'
            }`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`${getPrimaryCtaClasses(
              theme
            )} !w-auto !min-h-[44px] !py-2.5 text-sm active:scale-[0.96] transition-[transform,background-color]`}
          >
            {submitting ? 'Creando…' : 'Crear sala'}
          </button>
        </div>
      </form>
    </AppDialog>
  );
}

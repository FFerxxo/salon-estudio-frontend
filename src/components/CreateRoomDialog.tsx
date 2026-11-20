import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Leaf, VolumeX, Waves } from 'lucide-react';
import { AMBIENTE_LIST, type AmbienteId } from '../content/ambientes';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  createRoom,
  RoomsApiError,
  validateRoomName,
  type Room,
} from '../services/roomsApi';
import { resolveAuthToken } from '../utils/roomHelpers';
import {
  getCancelActionClasses,
  getErrorAlertClasses,
  getFormActionGroupClasses,
  getInlineErrorClasses,
  getInputClasses,
  getPrimaryCtaClasses,
} from '../utils/themeStyles';
import { AppDialog } from './AppDialog';

export interface CreateRoomDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (room: Room) => void;
  initialAmbiente?: AmbienteId;
}

function getAmbientePillLabel(ambiente: AmbienteId): string {
  if (ambiente === 'blue') return 'Focus';
  if (ambiente === 'green') return 'Chill';
  return 'Personalizado · sin sonido';
}

function AmbientePillIcon({ ambiente }: { ambiente: AmbienteId }) {
  if (ambiente === 'blue') {
    return <Waves className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  }
  if (ambiente === 'green') {
    return <Leaf className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  }
  return <VolumeX className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
}

/** Ventana modal rápida para nombrar y crear una sala de estudio. */
export function CreateRoomDialog({
  open,
  onClose,
  onCreated,
  initialAmbiente,
}: CreateRoomDialogProps) {
  const { idToken } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const nameInputId = useId();
  const nameErrorId = useId();
  const nameCounterId = useId();
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialAmbiente, setPrevInitialAmbiente] = useState(initialAmbiente);
  const [nombre, setNombre] = useState('');
  const [ambiente, setAmbiente] = useState<AmbienteId>(initialAmbiente ?? 'ninguno');
  const [nombreError, setNombreError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (open !== prevOpen || initialAmbiente !== prevInitialAmbiente) {
    setPrevOpen(open);
    setPrevInitialAmbiente(initialAmbiente);
    if (open) {
      setAmbiente(initialAmbiente ?? 'ninguno');
      setNombre('');
      setNombreError(null);
      setServerError(null);
    }
  }

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);

  const resetForm = () => {
    setNombre('');
    setAmbiente(initialAmbiente ?? 'ninguno');
    setNombreError(null);
    setServerError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
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
  const hasLockedPreset = initialAmbiente !== undefined;

  return (
    <AppDialog
      open={open}
      title="¿Cómo se llama tu sala?"
      initialFocusRef={nameInputRef}
      disableClose={submitting}
      onClose={handleClose}
    >
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
          <label htmlFor={nameInputId} className="sr-only">
            Nombre de la sala
          </label>
          <input
            id={nameInputId}
            ref={nameInputRef}
            type="text"
            maxLength={50}
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

        {!hasLockedPreset && (
          <fieldset className="space-y-1.5">
            <legend
              className={`text-xs font-semibold ${
                isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
              }`}
            >
              Ambiente
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ambiente">
              {AMBIENTE_LIST.map((amb) => {
                const selected = ambiente === amb.id;
                return (
                  <button
                    key={amb.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={submitting}
                    onClick={() => setAmbiente(amb.id)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-full border-[1.5px] text-xs font-bold inline-flex items-center gap-1.5 active:scale-[0.96] transition-[transform,background-color,border-color] disabled:opacity-60 ${
                      selected
                        ? isDark
                          ? 'border-[#38bdf8] bg-[#38bdf8]/20 text-[#bae6fd]'
                          : 'border-[#075985] bg-[#075985]/10 text-[#075985]'
                        : isDark
                          ? 'border-[#64748b] bg-[#0b1220] text-[#cbd5e1] hover:bg-white/10'
                          : 'border-[#64748b] bg-white text-[#334155] hover:bg-slate-100'
                    }`}
                  >
                    <AmbientePillIcon ambiente={amb.id} />
                    <span>{getAmbientePillLabel(amb.id)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className={getFormActionGroupClasses()}>
          <button
            type="button"
            disabled={submitting}
            onClick={handleClose}
            className={getCancelActionClasses(theme)}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={getPrimaryCtaClasses(theme)}
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </AppDialog>
  );
}

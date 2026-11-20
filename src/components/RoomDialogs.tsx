import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  deleteRoom,
  renameRoom,
  RoomsApiError,
  validateRoomName,
  type Room,
} from '../services/roomsApi';
import { resolveAuthToken } from '../utils/roomHelpers';
import {
  getCancelActionClasses,
  getDangerCtaClasses,
  getErrorAlertClasses,
  getFormActionGroupClasses,
  getInlineErrorClasses,
  getInputClasses,
  getPrimaryCtaClasses,
} from '../utils/themeStyles';
import { AppDialog } from './AppDialog';

export interface RenameRoomDialogProps {
  open: boolean;
  room: Room | null;
  onClose: () => void;
  onRenamed: (room: Room) => void;
}

/** Ventana modal para renombrar una sala propia con validación inline. */
export function RenameRoomDialog({
  open,
  room,
  onClose,
  onRenamed,
}: RenameRoomDialogProps) {
  const { idToken } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const inputId = useId();
  const errorId = useId();
  const counterId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevRoomKey, setPrevRoomKey] = useState<string | null>(
    room ? `${room.id}:${room.nombre}` : null
  );
  const [nombre, setNombre] = useState(room?.nombre ?? '');
  const [nombreError, setNombreError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentRoomKey = room ? `${room.id}:${room.nombre}` : null;
  if (open !== prevOpen || currentRoomKey !== prevRoomKey) {
    setPrevOpen(open);
    setPrevRoomKey(currentRoomKey);
    if (open && room) {
      setNombre(room.nombre);
      setNombreError(null);
      setServerError(null);
    }
  }

  useEffect(() => {
    if (open && room) {
      const frame = requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [open, room]);

  const handleClose = () => {
    if (submitting) return;
    setNombreError(null);
    setServerError(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !room) return;

    const validationError = validateRoomName(nombre);
    if (validationError) {
      setNombreError(validationError);
      setServerError(null);
      inputRef.current?.focus();
      return;
    }

    setNombreError(null);
    setServerError(null);
    setSubmitting(true);

    try {
      const token = await resolveAuthToken(idToken);
      const updated = await renameRoom(token, room.id, nombre.trim());
      onRenamed(updated);
    } catch (err) {
      if (err instanceof RoomsApiError) {
        if (err.status === 400 && err.fieldErrors?.nombre) {
          setNombreError(err.fieldErrors.nombre);
          inputRef.current?.focus();
        } else {
          setServerError(err.message || 'No pudimos renombrar la sala. Intenta de nuevo.');
        }
      } else {
        setServerError('No pudimos renombrar la sala. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const counterExceeds = nombre.length > 50;
  const describedBy = nombreError ? `${errorId} ${counterId}` : counterId;

  return (
    <AppDialog
      open={open && Boolean(room)}
      title="Renombrar sala"
      initialFocusRef={inputRef}
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
          <label htmlFor={inputId} className="sr-only">
            Nuevo nombre de la sala
          </label>
          <input
            id={inputId}
            ref={inputRef}
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
                <p id={errorId} role="alert" className={getInlineErrorClasses(theme)}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{nombreError}</span>
                </p>
              )}
            </div>
            <span
              id={counterId}
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
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </AppDialog>
  );
}

export interface DeleteRoomDialogProps {
  open: boolean;
  room: Room | null;
  onClose: () => void;
  onDeleted: (roomId: string) => void;
}

/** Diálogo de confirmación destructiva para eliminar una sala propia. */
export function DeleteRoomDialog({
  open,
  room,
  onClose,
  onDeleted,
}: DeleteRoomDialogProps) {
  const { idToken } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const descId = useId();
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevRoomId, setPrevRoomId] = useState<string | null>(room?.id ?? null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const currentRoomId = room?.id ?? null;
  if (open !== prevOpen || currentRoomId !== prevRoomId) {
    setPrevOpen(open);
    setPrevRoomId(currentRoomId);
    if (open) {
      setServerError(null);
    }
  }

  useEffect(() => {
    if (open && room) {
      const frame = requestAnimationFrame(() => {
        cancelBtnRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [open, room]);

  const handleClose = () => {
    if (deleting) return;
    setServerError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (deleting || !room) return;
    setServerError(null);
    setDeleting(true);

    try {
      const token = await resolveAuthToken(idToken);
      await deleteRoom(token, room.id);
      onDeleted(room.id);
    } catch (err) {
      if (err instanceof RoomsApiError) {
        setServerError(err.message || 'No pudimos eliminar la sala. Intenta de nuevo.');
      } else {
        setServerError('No pudimos eliminar la sala. Intenta de nuevo.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppDialog
      open={open && Boolean(room)}
      role="alertdialog"
      title="¿Eliminar esta sala?"
      descriptionId={descId}
      initialFocusRef={cancelBtnRef}
      disableClose={deleting}
      onClose={handleClose}
    >
      <div className="space-y-4 text-sm">
        <p
          id={descId}
          className={`leading-relaxed text-pretty ${
            isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
          }`}
        >
          Se eliminará{' '}
          <strong className={isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}>
            {room?.nombre}
          </strong>{' '}
          (
          <code className="font-mono font-semibold tabular-nums">
            {room?.id}
          </code>
          ) y su ID dejará de funcionar.
        </p>

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

        <div className={getFormActionGroupClasses()}>
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={deleting}
            onClick={handleClose}
            className={getCancelActionClasses(theme)}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleConfirm()}
            className={getDangerCtaClasses(theme)}
          >
            {deleting ? 'Eliminando…' : 'Eliminar sala'}
          </button>
        </div>
      </div>
    </AppDialog>
  );
}

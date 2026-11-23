import { useId, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getRoomById, RoomsApiError } from '../services/roomsApi';
import { resolveAuthToken } from '../utils/roomHelpers';
import {
  getInlineErrorClasses,
  getInputClasses,
  getPrimaryCtaClasses,
} from '../utils/themeStyles';

const ID_SALA_REGEX = /^[A-Z0-9]{8}$/;

/** Recorta espacios (también los del medio al pegar) y pasa a mayúsculas. */
export function normalizarIdSala(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/** Devuelve el mensaje de error del ID o null si es válido. */
export function validarIdSala(id: string): string | null {
  if (!id) return 'Escribe el ID de la sala para unirte.';
  if (!ID_SALA_REGEX.test(id)) {
    return 'El ID tiene 8 letras o números, sin espacios ni símbolos. Ejemplo: K7M2QX9A';
  }
  return null;
}

export const MENSAJE_SALA_NO_ENCONTRADA =
  'No encontramos una sala con ese ID. Revisa que esté bien escrito.';

/** Campo «¿Tienes un ID? Únete» de Inicio (US-08, SDECG6-51). */
export function JoinRoomForm() {
  const navigate = useNavigate();
  const { idToken } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const inputId = useId();
  const errorId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [valor, setValor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (entrando) return;

    const id = normalizarIdSala(valor);
    setValor(id);
    const errorValidacion = validarIdSala(id);
    if (errorValidacion) {
      setError(errorValidacion);
      inputRef.current?.focus();
      return;
    }

    setError(null);
    setEntrando(true);
    try {
      const token = await resolveAuthToken(idToken);
      const sala = await getRoomById(token, id);
      navigate(`/salas/${sala.id || id}`, { state: { room: sala } });
    } catch (err) {
      if (err instanceof RoomsApiError && err.status === 404) {
        setError(MENSAJE_SALA_NO_ENCONTRADA);
      } else {
        setError('No pudimos entrar a la sala. Revisa tu conexión e intenta de nuevo.');
      }
      setEntrando(false);
      inputRef.current?.focus();
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => void handleSubmit(e)}
      className="w-full max-w-[420px] mx-auto mt-10 sm:mt-14 space-y-2"
    >
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-center"
      >
        ¿Tienes un ID? Únete
      </label>
      <p
        id={hintId}
        className={`text-xs text-center ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}
      >
        Pídele el ID de 8 caracteres a quien creó la sala.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            if (error) setError(null);
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={24}
          placeholder="Ej. K7M2QX9A"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          className={`${getInputClasses(theme, Boolean(error))} font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal`}
        />
        <button
          type="submit"
          disabled={entrando}
          aria-busy={entrando}
          className={`${getPrimaryCtaClasses(theme)} sm:!w-auto !min-h-[44px] !py-2 !px-5 text-sm shrink-0`}
        >
          <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{entrando ? 'Entrando…' : 'Unirse'}</span>
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className={getInlineErrorClasses(theme)}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </form>
  );
}

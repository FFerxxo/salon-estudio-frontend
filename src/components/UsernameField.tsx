import { useEffect, useId, useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AuthApiError, checkUsernameAvailability } from '../services/authApi';
import { normalizeUsername, validateUsername } from '../utils/authValidation';
import { getInlineErrorClasses } from '../utils/themeStyles';

interface UsernameFieldProps {
  id?: string;
  label?: string;
  value: string;
  currentUsername?: string;
  onChange: (normalizedValue: string) => void;
  error?: string | null;
  checkAvailability?: boolean;
}

type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'offline';

/** Campo segmentado @username con verificación asíncrona en servidor y mensajes de error accesibles. */
export function UsernameField({
  id,
  label = 'Nombre de usuario único',
  value,
  currentUsername,
  onChange,
  error,
  checkAvailability = true,
}: UsernameFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  const statusId = `${fieldId}-status`;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [availability, setAvailability] = useState<AvailabilityState>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [adjustmentInfo, setAdjustmentInfo] = useState<{
    forValue: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const clean = normalizeUsername(value);
    const currentClean = currentUsername ? normalizeUsername(currentUsername) : '';
    setServerError(null);
    if (
      !checkAvailability ||
      !clean ||
      (currentClean && clean === currentClean) ||
      validateUsername(clean) !== null
    ) {
      setAvailability('idle');
      return;
    }

    let cancelled = false;
    setAvailability('checking');

    const timer = window.setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(clean);
        if (!cancelled) {
          setAvailability(result.available ? 'available' : 'taken');
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof AuthApiError && err.status === 400) {
            setServerError(err.message);
            setAvailability('idle');
          } else {
            setAvailability('offline');
          }
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, checkAvailability, currentUsername]);

  const effectiveError =
    error ||
    serverError ||
    (availability === 'taken'
      ? 'Ese nombre de usuario ya está en uso. Prueba con otro.'
      : null);

  const activeAdjustmentNotice =
    adjustmentInfo && adjustmentInfo.forValue === value ? adjustmentInfo.message : null;

  const showAvailabilityStatus =
    !effectiveError && (availability === 'checking' || availability === 'available');
  const hasVisibleStatus = Boolean(activeAdjustmentNotice) || showAvailabilityStatus;

  const handleInputChange = (raw: string) => {
    const normalized = normalizeUsername(raw);
    if (raw !== normalized) {
      setAdjustmentInfo({
        forValue: normalized,
        message: normalized
          ? `Se ajustó a minúsculas y sin espacios: @${normalized}`
          : 'Se ajustó a minúsculas y sin espacios.',
      });
    } else {
      setAdjustmentInfo(null);
    }
    onChange(normalized);
  };

  return (
    <div>
      <label
        htmlFor={fieldId}
        className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}`}
      >
        {label}
      </label>

      <div
        className={`flex items-center rounded-[10px] border-[1.5px] transition-colors ${
          isDark ? 'bg-[#0b1220]' : 'bg-[#f8fafc]'
        } ${
          effectiveError
            ? isDark
              ? 'border-[#f87171]'
              : 'border-[#b91c1c]'
            : 'border-[#64748b]'
        }`}
      >
        <span
          aria-hidden="true"
          className={`px-3.5 py-2.5 text-sm font-bold border-r border-[#64748b] rounded-l-[8px] select-none ${
            isDark ? 'bg-[#0f172a] text-[#cbd5e1]' : 'bg-[#eef4fa] text-[#0f172a]'
          }`}
        >
          @
        </span>
        <input
          id={fieldId}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="andres.salazar"
          autoComplete="username"
          aria-invalid={Boolean(effectiveError)}
          aria-describedby={[statusId, effectiveError ? errorId : null].filter(Boolean).join(' ')}
          className={`w-full min-h-[44px] bg-transparent rounded-r-[8px] px-3 py-2 text-base font-mono font-semibold ${
            isDark
              ? 'text-[#f8fafc] placeholder:text-[#94a3b8]'
              : 'text-[#0f172a] placeholder:text-[#475569]'
          }`}
        />
      </div>

      <div
        id={statusId}
        role="status"
        aria-live="polite"
        className={hasVisibleStatus ? 'mt-1.5 space-y-1 text-xs font-semibold leading-5' : 'sr-only'}
      >
        {activeAdjustmentNotice && (
          <p className={isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}>{activeAdjustmentNotice}</p>
        )}
        {!effectiveError && availability === 'checking' && (
          <p className={isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}>
            Comprobando disponibilidad en el servidor...
          </p>
        )}
        {!effectiveError && availability === 'available' && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
              isDark
                ? 'bg-[#022c22] text-[#6ee7b7] border-[#6ee7b7]'
                : 'bg-[#ecfdf5] text-[#047857] border-[#047857]'
            }`}
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Disponible en el Salón de Estudio</span>
          </span>
        )}
      </div>

      {effectiveError && (
        <p id={errorId} role="alert" className={`mt-1.5 ${getInlineErrorClasses(theme)}`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{effectiveError}</span>
        </p>
      )}
    </div>
  );
}

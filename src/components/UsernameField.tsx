import { useEffect, useId, useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { checkUsernameAvailability } from '../services/authApi';
import { normalizeUsername, validateUsername } from '../utils/authValidation';
import { getInlineErrorClasses } from '../utils/themeStyles';

interface UsernameFieldProps {
  id?: string;
  label?: string;
  value: string;
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

  useEffect(() => {
    const clean = normalizeUsername(value);
    if (!checkAvailability || !clean || validateUsername(clean) !== null) {
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
      } catch {
        if (!cancelled) {
          setAvailability('offline');
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, checkAvailability]);

  const effectiveError =
    error ||
    (availability === 'taken'
      ? `El nombre de usuario @${normalizeUsername(value)} ya está en uso. Elige otro para continuar.`
      : null);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className={`block text-sm font-semibold ${isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}`}
      >
        {label}
      </label>

      <div
        className={`flex items-center rounded-[10px] border-[1.5px] overflow-hidden transition-colors ${
          isDark ? 'bg-[#0b1220]' : 'bg-white'
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
          className={`px-3.5 py-2.5 text-sm font-bold border-r border-[#64748b] select-none ${
            isDark ? 'bg-[#0f172a] text-[#cbd5e1]' : 'bg-slate-100 text-[#0f172a]'
          }`}
        >
          @
        </span>
        <input
          id={fieldId}
          type="text"
          value={value}
          onChange={(e) => onChange(normalizeUsername(e.target.value))}
          placeholder="andres.salazar"
          autoComplete="username"
          aria-invalid={Boolean(effectiveError)}
          aria-describedby={[statusId, effectiveError ? errorId : null].filter(Boolean).join(' ')}
          className={`w-full min-h-[44px] bg-transparent px-3 py-2 text-base font-mono font-semibold ${
            isDark
              ? 'text-[#f8fafc] placeholder:text-[#94a3b8]'
              : 'text-[#0f172a] placeholder:text-[#475569]'
          }`}
        />
      </div>

      <div id={statusId} aria-live="polite" className="min-h-[18px] text-xs font-semibold">
        {availability === 'checking' && !effectiveError && (
          <span className={isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}>
            Comprobando disponibilidad en el servidor...
          </span>
        )}
        {availability === 'available' && !effectiveError && (
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
        <p id={errorId} role="alert" className={getInlineErrorClasses(theme)}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{effectiveError}</span>
        </p>
      )}
    </div>
  );
}

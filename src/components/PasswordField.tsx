import { useId, useState, type ClipboardEvent } from 'react';
import { AlertCircle, Check, Eye, EyeOff, Lock, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { evaluatePasswordPolicy } from '../utils/authValidation';
import { getInlineErrorClasses } from '../utils/themeStyles';

interface PasswordFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  autoComplete?: string;
  placeholder?: string;
  showStrengthMeter?: boolean;
  showLockIcon?: boolean;
}

/** Campo de contraseña accesible con visibilidad conmutable, pegado habilitado y medidor de 5 criterios. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete = 'current-password',
  placeholder = 'Mínimo 8 caracteres, mayúscula, minúscula y número',
  showStrengthMeter = false,
  showLockIcon = false,
}: PasswordFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  const policyId = `${fieldId}-policy`;
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();

  const evaluation = evaluatePasswordPolicy(value);
  const isDark = theme === 'dark';

  const handlePaste = (_event: ClipboardEvent<HTMLInputElement>) => {
    // Pegado permitido explícitamente por criterio de accesibilidad S1-C09
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={fieldId}
          className={`text-sm font-semibold ${isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}`}
        >
          {label}
        </label>
        {showStrengthMeter && (
          <span
            className={`text-xs font-semibold ${
              evaluation.score >= 4
                ? isDark
                  ? 'text-[#6ee7b7]'
                  : 'text-[#047857]'
                : isDark
                  ? 'text-[#cbd5e1]'
                  : 'text-[#334155]'
            }`}
          >
            {evaluation.label}
          </span>
        )}
      </div>

      <div className="relative">
        {showLockIcon && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${
              isDark ? 'text-[#94a3b8]' : 'text-[#475569]'
            }`}
          >
            <Lock className="w-4 h-4" />
          </span>
        )}
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [error ? errorId : null, showStrengthMeter ? policyId : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={`w-full min-h-[44px] rounded-[10px] border-[1.5px] ${
            showLockIcon ? 'pl-10 pr-28' : 'px-3.5 pr-28'
          } py-2.5 text-base transition-colors ${
            isDark
              ? 'bg-[#0b1220] text-[#f8fafc] placeholder:text-[#94a3b8]'
              : 'bg-white text-[#0f172a] placeholder:text-[#475569]'
          } ${
            error
              ? isDark
                ? 'border-[#f87171]'
                : 'border-[#b91c1c]'
              : 'border-[#64748b]'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold border border-[#64748b] inline-flex items-center gap-1 transition-colors ${
            isDark
              ? 'bg-[#0f172a] text-[#f8fafc] hover:bg-white/10'
              : 'bg-slate-100 text-[#0f172a] hover:bg-slate-200'
          }`}
        >
          {visible ? (
            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{visible ? 'Ocultar' : 'Mostrar'}</span>
        </button>
      </div>

      {showStrengthMeter && (
        <div id={policyId} className="space-y-2">
          <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((bar) => (
              <div
                key={bar}
                className={`h-1.5 rounded-full transition-colors ${
                  bar <= evaluation.score
                    ? isDark
                      ? 'bg-[#38bdf8]'
                      : 'bg-[#075985]'
                    : isDark
                      ? 'bg-slate-700'
                      : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
            {evaluation.criteria.map((item) => (
              <li
                key={item.id}
                className={`flex items-center gap-1.5 ${
                  item.met
                    ? isDark
                      ? 'text-[#6ee7b7] font-semibold'
                      : 'text-[#047857] font-semibold'
                    : isDark
                      ? 'text-[#cbd5e1]'
                      : 'text-[#334155]'
                }`}
              >
                {item.met ? (
                  <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <X className="w-3.5 h-3.5 shrink-0 opacity-75" aria-hidden="true" />
                )}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className={getInlineErrorClasses(theme)}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

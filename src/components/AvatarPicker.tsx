import { useId } from 'react';
import { useTheme } from '../context/ThemeContext';

export interface AvatarOption {
  id: string;
  emoji: string;
  label: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'cohete', emoji: '🚀', label: 'Cohete' },
  { id: 'audifonos', emoji: '🎧', label: 'Audífonos' },
  { id: 'rayo', emoji: '⚡', label: 'Rayo' },
  { id: 'buho', emoji: '🦉', label: 'Búho' },
];

/** Resuelve un id o emoji de avatar a su emoji válido; devuelve null si no coincide con ninguno. */
export function resolveAvatarEmoji(raw?: string | null): string | null {
  const clean = raw?.trim();
  if (!clean) return null;
  const matched = AVATAR_OPTIONS.find((option) => option.id === clean || option.emoji === clean);
  return matched ? matched.emoji : null;
}

interface AvatarPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

/** Selector accesible de avatar para la identidad del Estudiante en las Salas. */
export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const labelId = useId();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-2">
      <span
        id={labelId}
        className={`block text-sm font-semibold ${isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}`}
      >
        Tu avatar
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
      >
        {AVATAR_OPTIONS.map((option) => {
          const selected = option.emoji === value || option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.emoji)}
              className={`flex flex-col items-center justify-center gap-1.5 min-h-[76px] px-2 py-3 rounded-xl border-[1.5px] text-center transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none ${
                selected
                  ? isDark
                    ? 'border-[#38bdf8] bg-[#38bdf8] text-[#0b1220] font-bold'
                    : 'border-[#075985] bg-[#075985] text-white font-bold'
                  : isDark
                    ? 'border-[#64748b] bg-[#0b1220] text-[#f8fafc] hover:bg-white/[0.07]'
                    : 'border-[#5b6e84] bg-[#f8fafc] text-[#0f172a] hover:bg-[#eef4fa]'
              }`}
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {option.emoji}
              </span>
              <span className="text-xs font-semibold whitespace-nowrap">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

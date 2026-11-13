import { useId } from 'react';
import { useTheme } from '../context/ThemeContext';

export interface AvatarOption {
  id: string;
  emoji: string;
  label: string;
  vibe: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'cohete', emoji: '🚀', label: 'Constructor', vibe: 'Enfoque Profundo' },
  { id: 'audifonos', emoji: '🎧', label: 'Marea Calma', vibe: 'Lectura y Apuntes' },
  { id: 'rayo', emoji: '⚡', label: 'Maratón UV', vibe: 'Cálculo y Código' },
  { id: 'buho', emoji: '🦉', label: 'Búho Nocturno', vibe: 'Repaso Nocturno' },
];

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
        Avatar en Sala
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
      >
        {AVATAR_OPTIONS.map((option) => {
          const selected = value === option.emoji;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.emoji)}
              className={`min-h-[48px] flex items-center gap-2 rounded-[10px] border-[1.5px] px-3 py-2 text-left transition-colors ${
                selected
                  ? isDark
                    ? 'border-[#38bdf8] bg-[#38bdf8] text-[#0b1220] font-bold'
                    : 'border-[#075985] bg-[#075985] text-white font-bold'
                  : isDark
                    ? 'border-[#64748b] bg-[#0b1220] text-[#f8fafc] hover:bg-white/10'
                    : 'border-[#64748b] bg-white text-[#0f172a] hover:bg-slate-50'
              }`}
            >
              <span className="text-lg" aria-hidden="true">
                {option.emoji}
              </span>
              <span className="text-xs font-bold leading-tight">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

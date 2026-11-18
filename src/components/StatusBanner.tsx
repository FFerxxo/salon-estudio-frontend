import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getSuccessAlertClasses } from '../utils/themeStyles';

interface StatusBannerProps {
  message?: string;
  children?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

/** Aviso accesible de confirmación con región viva educada y cierre opcional. */
export function StatusBanner({
  message,
  children,
  onDismiss,
  className = '',
}: StatusBannerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const content = children ?? message;

  if (!content) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-between gap-3 ${getSuccessAlertClasses(
        theme
      )} ${className}`.trim()}
    >
      <span className="inline-flex items-center gap-2 min-w-0">
        <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="text-pretty">{content}</span>
      </span>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className={`min-h-[44px] min-w-[44px] -mr-1.5 inline-flex items-center justify-center rounded-lg shrink-0 active:scale-[0.96] transition-[transform,background-color] ${
            isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
          }`}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

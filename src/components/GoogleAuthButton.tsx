import { useTheme } from '../context/ThemeContext';

interface GoogleAuthButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  variant?: 'default' | 'primaryPill';
}

/** Botón accesible para iniciar sesión o registrarse con cuenta de Google. */
export function GoogleAuthButton({
  onClick,
  disabled = false,
  label = 'Continuar con Google',
  variant = 'default',
}: GoogleAuthButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isPrimaryPill = variant === 'primaryPill';

  const buttonClasses = isPrimaryPill
    ? `w-full h-[44px] min-h-[44px] px-4 rounded-xl font-semibold text-sm bg-[#FFFFFF] text-[#0f172a] border-[1.5px] border-[#64748b] hover:bg-[#f8fafc] active:scale-[0.97] motion-reduce:active:scale-100 motion-reduce:transition-none inline-flex items-center justify-center gap-2.5 shadow-sm transition-[background-color,transform] duration-150 disabled:opacity-60 disabled:cursor-not-allowed`
    : `w-full min-h-[44px] px-4 py-2 rounded-xl font-semibold text-sm border-[1.5px] border-[#64748b] active:scale-[0.97] motion-reduce:active:scale-100 motion-reduce:transition-none inline-flex items-center justify-center gap-2.5 transition-[background-color,transform] duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${
        isDark
          ? 'bg-[#0b1220] text-[#f8fafc] hover:bg-white/10'
          : 'bg-white text-[#0f172a] hover:bg-slate-50 shadow-sm'
      }`;

  const iconSvg = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="w-5 h-5 aspect-square shrink-0"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.25 0-6.01-2.19-6.99-5.14H1.01v3.14C3.03 21.17 7.19 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.01 14.03c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.17H1.01C.37 7.45 0 8.88 0 10.67c0 1.79.37 3.22 1.01 4.5l4-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.19 0 3.03 2.83 1.01 6.83l4 3.14c.98-2.95 3.74-5.22 6.99-5.22z"
      />
    </svg>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {isPrimaryPill ? (
        iconSvg
      ) : (
        <span
          aria-hidden="true"
          className={`inline-flex items-center justify-center rounded-md shrink-0 ${
            isDark ? 'bg-white p-1 shadow-xs' : ''
          }`}
        >
          {iconSvg}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
}

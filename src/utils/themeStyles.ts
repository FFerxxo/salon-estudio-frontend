import type { ThemeMode } from '../context/ThemeContext';

/** Una sola capa de vidrio por pantalla (Guía visual v3 · Tema Marea). */
export function getGlassCardClasses(theme: ThemeMode): string {
  return theme === 'dark'
    ? 'marea-glass-card bg-[#0f172a]/85 text-[#f8fafc] border border-slate-400/35 shadow-[0_24px_60px_rgba(2,6,23,0.45)]'
    : 'bg-[#ffffff] text-[#0f172a] shadow-[0_8px_24px_rgba(15,23,42,0.18)]';
}

/** Superficie sólida sin blur para contenedores internos y pantallas de lectura larga. */
export function getSolidSurfaceClasses(theme: ThemeMode): string {
  return theme === 'dark'
    ? 'bg-[#0f172a] text-[#f8fafc] border border-[#64748b]'
    : 'bg-white text-[#0f172a] border border-[#64748b] shadow-sm';
}

/** Campos con borde #64748b (>= 3:1 en Noche y Día) y altura mínima táctil de 44px. */
export function getInputClasses(theme: ThemeMode, hasError = false): string {
  const base =
    theme === 'dark'
      ? 'bg-[#0b1220] text-[#f8fafc] placeholder:text-[#94a3b8]'
      : 'bg-white text-[#0f172a] placeholder:text-[#475569]';

  const border = hasError
    ? theme === 'dark'
      ? 'border-[#f87171]'
      : 'border-[#b91c1c]'
    : 'border-[#64748b]';

  return `w-full min-h-[44px] rounded-[10px] border-[1.5px] px-3.5 py-2.5 text-base transition-colors ${base} ${border}`;
}

/** Acción principal Marea v3: Noche #38bdf8 con texto #0b1220 (8.74:1); Día #075985 con texto #ffffff (7.56:1). */
export function getPrimaryCtaClasses(theme: ThemeMode = 'dark'): string {
  const palette =
    theme === 'dark'
      ? 'bg-[#38bdf8] text-[#0b1220] hover:bg-[#7dd3fc]'
      : 'bg-[#075985] text-white hover:bg-[#0369a1]';

  return `w-full min-h-[48px] px-5 py-3 rounded-xl font-semibold text-base ${palette} disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2`;
}

/** Enlaces con contraste verificado: Noche #7dd3fc (6.83:1); Día #075985 (7.56:1). */
export function getLinkClasses(theme: ThemeMode): string {
  return theme === 'dark'
    ? 'text-[#7dd3fc] underline underline-offset-4 font-semibold hover:text-[#bae6fd]'
    : 'text-[#075985] underline underline-offset-4 font-semibold hover:text-[#0369a1]';
}

/** Bloques de alerta de error con icono + texto (Guía visual v3). */
export function getErrorAlertClasses(theme: ThemeMode): string {
  return theme === 'dark'
    ? 'bg-[#450a0a] text-[#fecaca] border border-[#f87171]'
    : 'bg-[#fef2f2] text-[#b91c1c] border border-[#b91c1c]';
}

/** Texto de error inline junto al campo. */
export function getInlineErrorClasses(theme: ThemeMode): string {
  return theme === 'dark'
    ? 'text-xs font-semibold text-[#fecaca] bg-[#450a0a] border border-[#f87171] rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5'
    : 'text-xs font-semibold text-[#b91c1c] bg-[#fef2f2] border border-[#b91c1c] rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5';
}

/** Bloques de confirmación / éxito con icono + texto. */
export function getSuccessAlertClasses(theme: ThemeMode): string {
  return theme === 'dark'
    ? 'bg-[#022c22] text-[#6ee7b7] border border-[#6ee7b7]'
    : 'bg-[#ecfdf5] text-[#047857] border border-[#047857]';
}

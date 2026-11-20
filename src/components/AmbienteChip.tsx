import { Leaf, VolumeX, Waves } from 'lucide-react';
import { getAmbienteLabel, type AmbienteId } from '../content/ambientes';
import { type ThemeMode } from '../context/ThemeContext';

/** Devuelve las clases de color accesibles para la píldora del ambiente sonoro. */
export function getAmbienteChipClasses(ambiente: AmbienteId, theme: ThemeMode): string {
  const isDark = theme === 'dark';
  if (ambiente === 'blue') {
    return isDark
      ? 'bg-[#38bdf8]/15 text-[#7dd3fc] ring-1 ring-[#38bdf8]/30'
      : 'bg-[#075985]/10 text-[#075985] ring-1 ring-[#075985]/25';
  }
  if (ambiente === 'green') {
    return isDark
      ? 'bg-emerald-500/15 text-[#6ee7b7] ring-1 ring-[#6ee7b7]/35'
      : 'bg-[#ecfdf5] text-[#047857] ring-1 ring-[#047857]/30';
  }
  return isDark
    ? 'bg-slate-400/15 text-[#cbd5e1] ring-1 ring-slate-400/30'
    : 'bg-slate-200 text-[#334155] ring-1 ring-slate-400/40';
}

function AmbienteChipIcon({ ambiente }: { ambiente: AmbienteId }) {
  if (ambiente === 'blue') {
    return <Waves className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  }
  if (ambiente === 'green') {
    return <Leaf className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  }
  return <VolumeX className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
}

export interface AmbienteChipProps {
  ambiente: AmbienteId;
  theme: ThemeMode;
  className?: string;
}

/** Insignia reutilizable que muestra el icono y nombre del ambiente sonoro. */
export function AmbienteChip({ ambiente, theme, className = '' }: AmbienteChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${getAmbienteChipClasses(
        ambiente,
        theme
      )} ${className}`.trim()}
    >
      <AmbienteChipIcon ambiente={ambiente} />
      <span>{getAmbienteLabel(ambiente)}</span>
    </span>
  );
}

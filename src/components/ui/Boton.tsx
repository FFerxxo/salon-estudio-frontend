import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario';

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
  /** Texto que se muestra mientras la acción está en curso (por ejemplo «Ingresando…»). */
  textoCargando?: string;
  anchoCompleto?: boolean;
  children: ReactNode;
}

const ESTILOS: Record<Variante, string> = {
  primario: 'bg-sky-800 text-white hover:bg-sky-900 disabled:bg-slate-400',
  secundario:
    'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 disabled:text-slate-500',
};

export function Boton({
  variante = 'primario',
  cargando = false,
  textoCargando,
  anchoCompleto = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...resto
}: BotonProps) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed ${ESTILOS[variante]} ${anchoCompleto ? 'w-full' : ''} ${className}`}
      {...resto}
    >
      {cargando && (
        <span
          aria-hidden="true"
          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      )}
      {cargando && textoCargando ? textoCargando : children}
    </button>
  );
}

import { forwardRef, type ReactNode } from 'react';

type Tipo = 'error' | 'exito' | 'info';

const ESTILOS: Record<Tipo, string> = {
  error: 'border-red-800 bg-red-50 text-red-800',
  exito: 'border-green-800 bg-green-50 text-green-800',
  info: 'border-sky-800 bg-sky-50 text-sky-900',
};

const ICONOS: Record<Tipo, string> = {
  error: 'M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-.9 4h1.8v5.5H9.1V5.5Zm0 7.2h1.8v1.8H9.1v-1.8Z',
  exito: 'M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-1.2 12-3.6-3.6 1.3-1.3 2.3 2.3 4.9-4.9 1.3 1.3-6.2 6.2Z',
  info: 'M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm.9 13.5H9.1V9h1.8v6Zm0-7.7H9.1V5.5h1.8v1.8Z',
};

interface AlertaProps {
  tipo: Tipo;
  titulo?: string;
  children: ReactNode;
}

/** Errores con role="alert"; éxito e información con role="status". */
export const Alerta = forwardRef<HTMLDivElement, AlertaProps>(function Alerta(
  { tipo, titulo, children },
  ref
) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-md border-l-4 p-4 focus:outline focus:outline-2 focus:outline-sky-700 ${ESTILOS[tipo]}`}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 flex-none fill-current">
        <path d={ICONOS[tipo]} />
      </svg>
      <div className="space-y-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
});

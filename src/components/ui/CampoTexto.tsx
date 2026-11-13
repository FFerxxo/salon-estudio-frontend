import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface CampoTextoProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  etiqueta: string;
  /** Indicación que se ve siempre debajo del campo (formato, reglas). */
  ayuda?: ReactNode;
  error?: ReactNode;
  /** Mensaje de estado bajo el campo que se anuncia sin mover el foco (ej. «Disponible»). */
  estado?: ReactNode;
  /** Contenido a la derecha dentro del campo (ej. botón «Mostrar»). */
  accion?: ReactNode;
}

export const CampoTexto = forwardRef<HTMLInputElement, CampoTextoProps>(function CampoTexto(
  { id, etiqueta, ayuda, error, estado, accion, className = '', ...resto },
  ref
) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const idEstado = `${id}-estado`;
  const describedBy = [idError, idAyuda, estado !== undefined ? idEstado : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`block w-full min-h-11 rounded-md border bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-500 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-sky-700 ${
            error ? 'border-red-800' : 'border-slate-500'
          } ${accion ? 'pr-24' : ''} ${className}`}
          {...resto}
        />
        {accion && <div className="absolute inset-y-0 right-1 flex items-center">{accion}</div>}
      </div>
      {error && (
        <p id={idError} className="flex items-start gap-1.5 text-sm text-red-800">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 flex-none fill-current">
            <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-.9 4h1.8v5.5H9.1V5.5Zm0 7.2h1.8v1.8H9.1v-1.8Z" />
          </svg>
          <span>{error}</span>
        </p>
      )}
      {estado !== undefined && (
        <div id={idEstado} aria-live="polite" className="text-sm">
          {estado}
        </div>
      )}
      {ayuda && (
        <div id={idAyuda} className="text-sm text-slate-600">
          {ayuda}
        </div>
      )}
    </div>
  );
});

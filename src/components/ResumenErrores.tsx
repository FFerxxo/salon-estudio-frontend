import { useEffect, useRef } from 'react';
import { Alerta } from './ui/Alerta';

export interface ErrorResumen {
  campo: string;
  etiqueta: string;
}

/**
 * Resumen que aparece encima del formulario al enviar con errores.
 * Cada enlace lleva al campo; el foco va al primer campo con error.
 */
export function ResumenErrores({ errores, intento }: { errores: ErrorResumen[]; intento: number }) {
  const primero = errores[0]?.campo;
  const ultimoIntento = useRef(0);

  useEffect(() => {
    if (intento > ultimoIntento.current && primero) {
      ultimoIntento.current = intento;
      document.getElementById(primero)?.focus();
    }
  }, [intento, primero]);

  if (errores.length === 0) return null;

  return (
    <Alerta tipo="error" titulo="Revisa los campos marcados.">
      <ul className="list-disc space-y-0.5 pl-5">
        {errores.map((error) => (
          <li key={error.campo}>
            <a
              href={`#${error.campo}`}
              onClick={(evento) => {
                evento.preventDefault();
                document.getElementById(error.campo)?.focus();
              }}
              className="underline"
            >
              {error.etiqueta}
            </a>
          </li>
        ))}
      </ul>
    </Alerta>
  );
}

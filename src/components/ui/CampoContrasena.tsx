import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { reglasContrasena } from '../../lib/validacion';
import { CampoTexto } from './CampoTexto';

interface CampoContrasenaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  etiqueta: string;
  error?: ReactNode;
  /** Muestra la política de contraseña y marca cada regla al cumplirse (solo en Registro). */
  mostrarReglas?: boolean;
}

export const CampoContrasena = forwardRef<HTMLInputElement, CampoContrasenaProps>(
  function CampoContrasena({ mostrarReglas = false, value, ...resto }, ref) {
    const [visible, setVisible] = useState(false);
    const texto = typeof value === 'string' ? value : '';

    return (
      <CampoTexto
        ref={ref}
        type={visible ? 'text' : 'password'}
        value={value}
        // Se permite pegar y usar el gestor de contraseñas (WCAG 3.3.8).
        spellCheck={false}
        autoCapitalize="none"
        accion={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="min-h-9 rounded px-3 text-sm font-medium text-sky-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700"
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        }
        ayuda={
          mostrarReglas ? (
            <ul className="space-y-0.5" aria-label="Requisitos de la contraseña">
              {reglasContrasena(texto).map((regla) => (
                <li
                  key={regla.texto}
                  className={regla.cumple ? 'text-green-800' : 'text-slate-600'}
                >
                  <span aria-hidden="true">{regla.cumple ? '✓ ' : '• '}</span>
                  {regla.texto}
                  <span className="sr-only">{regla.cumple ? ' (cumplido)' : ' (pendiente)'}</span>
                </li>
              ))}
            </ul>
          ) : undefined
        }
        {...resto}
      />
    );
  }
);

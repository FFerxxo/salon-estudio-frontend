import { useEffect, useState } from 'react';
import { validarUsername } from '../lib/validacion';
import { consultarDisponibilidad } from '../services/usuarios';

export type Disponibilidad = 'inactivo' | 'verificando' | 'disponible' | 'ocupado' | 'sin-verificar';

/**
 * Consulta GET /api/usuarios/disponible cuando el estudiante deja de escribir (0,5 s).
 * Solo consulta si el formato ya es válido; el formato lo explica el error del campo.
 */
export function useDisponibilidadUsuario(username: string): Disponibilidad {
  const [estado, setEstado] = useState<Disponibilidad>('inactivo');

  useEffect(() => {
    const valor = username.trim();
    if (validarUsername(valor) !== null) {
      setEstado('inactivo');
      return undefined;
    }

    let vigente = true;
    setEstado('verificando');
    const temporizador = window.setTimeout(() => {
      consultarDisponibilidad(valor)
        .then((disponible) => {
          if (vigente) setEstado(disponible ? 'disponible' : 'ocupado');
        })
        .catch(() => {
          // Si la API no responde, no se bloquea el formulario: el servidor valida al enviar.
          if (vigente) setEstado('sin-verificar');
        });
    }, 500);

    return () => {
      vigente = false;
      window.clearTimeout(temporizador);
    };
  }, [username]);

  return estado;
}

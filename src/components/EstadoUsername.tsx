import type { Disponibilidad } from '../hooks/useDisponibilidadUsuario';

/** Texto bajo el campo de nombre de usuario; se anuncia con aria-live sin mover el foco. */
export function EstadoUsername({ estado }: { estado: Disponibilidad }) {
  switch (estado) {
    case 'verificando':
      return <span className="text-slate-700">Verificando disponibilidad…</span>;
    case 'disponible':
      return <span className="font-medium text-green-800">✓ Disponible</span>;
    case 'ocupado':
      return (
        <span className="font-medium text-red-800">
          Ese nombre de usuario ya está en uso. Prueba con otro.
        </span>
      );
    case 'sin-verificar':
      return (
        <span className="text-slate-700">
          No pudimos verificarlo ahora; lo revisaremos al crear tu cuenta.
        </span>
      );
    default:
      return null;
  }
}

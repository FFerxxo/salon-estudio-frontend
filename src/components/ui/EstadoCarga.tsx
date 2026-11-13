import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function EstadoCarga({ mensaje = 'Cargando…', titulo }: { mensaje?: string; titulo?: string }) {
  useDocumentTitle(titulo ?? 'Cargando');

  return (
    <div role="status" className="flex items-center gap-3 py-12 text-slate-700">
      <span
        aria-hidden="true"
        className="h-5 w-5 rounded-full border-2 border-sky-800 border-t-transparent animate-spin"
      />
      <span>{mensaje}</span>
    </div>
  );
}

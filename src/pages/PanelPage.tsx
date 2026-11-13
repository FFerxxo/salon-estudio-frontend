import { useLocation } from 'react-router-dom';
import type { EstadoNavegacion } from '../components/RutasProtegidas';
import { Alerta } from '../components/ui/Alerta';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function PanelPage() {
  useDocumentTitle('Panel');
  const { perfil } = useAuth();
  const location = useLocation();
  const bienvenida = (location.state as EstadoNavegacion | null)?.bienvenida;

  return (
    <section className="space-y-6" aria-labelledby="panel-titulo">
      {bienvenida && perfil && (
        <Alerta tipo="exito">¡Bienvenido al Salón de Estudio, {perfil.nombres}!</Alerta>
      )}

      <div className="flex items-center gap-4">
        {perfil?.avatarUrl && (
          <img
            src={perfil.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-14 w-14 rounded-full object-cover"
          />
        )}
        <div>
          <h1 id="panel-titulo" className="text-3xl font-bold text-slate-900">
            Tu Panel
          </h1>
          {perfil && (
            <p className="text-slate-700">
              Hola, {perfil.nombres} · <span className="font-medium">@{perfil.username}</span>
            </p>
          )}
        </div>
      </div>

      <section
        aria-labelledby="salas-titulo"
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4"
      >
        <h2 id="salas-titulo" className="text-xl font-semibold text-slate-900">
          Tus Salas
        </h2>
        <div className="space-y-1">
          <p className="text-slate-800 font-medium">Aún no tienes Salas.</p>
          <p className="text-slate-700">Cuando crees o te unas a una, aparecerá aquí.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled
            aria-describedby="salas-pronto"
            className="min-h-11 rounded-md bg-slate-300 px-4 py-2 font-medium text-slate-700 cursor-not-allowed"
          >
            Crear Sala
          </button>
          <button
            type="button"
            disabled
            aria-describedby="salas-pronto"
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-600 cursor-not-allowed"
          >
            Unirme a una Sala
          </button>
        </div>
        <p id="salas-pronto" className="text-sm text-slate-600">
          Disponible pronto: crear y unirte a Salas llegará en las próximas versiones.
        </p>
      </section>
    </section>
  );
}

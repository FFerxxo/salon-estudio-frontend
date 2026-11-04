import { Link, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function HomePage() {
  useDocumentTitle('Inicio');

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">
        Salón de Estudio Colaborativo en Tiempo Real
      </h1>
      <p className="text-lg text-slate-700">
        Espacio accesible para organizar sesiones de estudio en grupo, compartir objetivos y
        colaborar en una Sala.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link
          to="/base-tecnica"
          className="px-4 py-2 rounded-md bg-sky-800 text-white font-medium hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 transition-colors"
        >
          Ver Base técnica
        </Link>
        <Link
          to="/ingresar"
          className="px-4 py-2 rounded-md border border-slate-300 bg-white text-slate-800 font-medium hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 transition-colors"
        >
          Ingresar
        </Link>
      </div>
    </section>
  );
}

export function LoginPage() {
  useDocumentTitle('Ingresar');

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Ingresar</h1>
      <p className="text-slate-700">
        Maqueta de inicio de sesión (Sprint 0). La autenticación estará disponible en los siguientes
        sprints.
      </p>
    </section>
  );
}

export function RegisterPage() {
  useDocumentTitle('Registro');

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Registro</h1>
      <p className="text-slate-700">
        Maqueta de creación de cuenta (Sprint 0). El registro estará disponible en los siguientes
        sprints.
      </p>
    </section>
  );
}

export function DashboardPage() {
  useDocumentTitle('Panel');

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Panel</h1>
      <p className="text-slate-700">
        Maqueta del Panel principal de estudio (Sprint 0). Desde aquí podrás acceder a cada Sala.
      </p>
      <div>
        <Link
          to="/salas/demo-1"
          className="inline-block px-4 py-2 rounded-md bg-sky-800 text-white font-medium hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 transition-colors"
        >
          Explorar Sala de demostración
        </Link>
      </div>
    </section>
  );
}

export function ProfilePage() {
  useDocumentTitle('Perfil');

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Perfil</h1>
      <p className="text-slate-700">
        Maqueta de configuración de perfil y preferencias de accesibilidad (Sprint 0).
      </p>
    </section>
  );
}

export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  useDocumentTitle(id ? `Sala ${id}` : 'Sala');

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Sala: {id}</h1>
      <p className="text-slate-700">
        Maqueta de Sala de estudio colaborativo (Sprint 0). Identificador de la Sala: {id}.
      </p>
    </section>
  );
}

export function HelpPage() {
  useDocumentTitle('Ayuda');

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Ayuda</h1>
      <p className="text-slate-700">
        Guía de navegación por teclado, uso de lector de pantalla y preguntas frecuentes del Salón
        de Estudio.
      </p>
    </section>
  );
}

export function NotFoundPage() {
  useDocumentTitle('404 · Página no encontrada');

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">404 · Página no encontrada</h1>
      <p className="text-slate-700">
        La ruta que intentas visitar no existe en el mapa del sitio del Salón de Estudio.
      </p>
      <div>
        <Link
          to="/"
          className="inline-block px-4 py-2 rounded-md bg-sky-800 text-white font-medium hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 transition-colors"
        >
          Volver al Inicio
        </Link>
      </div>
    </section>
  );
}

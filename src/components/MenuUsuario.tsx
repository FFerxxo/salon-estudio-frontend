import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { EstadoNavegacion } from './RutasProtegidas';

/** Menú del avatar en el encabezado: Perfil y Cerrar sesión. Esc lo cierra y devuelve el foco. */
export function MenuUsuario() {
  const { perfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const idMenu = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    const alHacerClic = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener('keydown', alPresionar);
    document.addEventListener('mousedown', alHacerClic);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.removeEventListener('mousedown', alHacerClic);
    };
  }, [abierto]);

  async function salir() {
    setCerrando(true);
    try {
      await cerrarSesion();
      navigate('/ingresar', { replace: true, state: { motivo: 'cerro-sesion' } satisfies EstadoNavegacion });
    } finally {
      setCerrando(false);
      setAbierto(false);
    }
  }

  const nombre = perfil ? `@${perfil.username}` : 'Tu cuenta';

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        {perfil?.avatarUrl ? (
          <img
            src={perfil.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full bg-white object-cover"
          />
        ) : (
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-800">
            {perfil?.nombres.charAt(0).toUpperCase() ?? '?'}
          </span>
        )}
        <span>{nombre}</span>
        <span className="sr-only">: abrir menú de tu cuenta</span>
      </button>

      {abierto && (
        <ul
          id={idMenu}
          className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-slate-800 shadow-lg"
        >
          <li>
            <Link
              to="/perfil"
              onClick={() => setAbierto(false)}
              className="block px-4 py-2 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-700"
            >
              Perfil
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => void salir()}
              disabled={cerrando}
              className="block w-full px-4 py-2 text-left hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-700"
            >
              {cerrando ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

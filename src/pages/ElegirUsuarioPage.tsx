import type { User } from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { EstadoUsername } from '../components/EstadoUsername';
import { ResumenErrores } from '../components/ResumenErrores';
import { destinoTrasIngresar } from '../components/RutasProtegidas';
import { Alerta } from '../components/ui/Alerta';
import { Boton } from '../components/ui/Boton';
import { CampoTexto } from '../components/ui/CampoTexto';
import { EstadoCarga } from '../components/ui/EstadoCarga';
import { AVATARES, SelectorAvatar, urlAbsolutaAvatar } from '../components/ui/SelectorAvatar';
import { useAuth } from '../context/AuthContext';
import { useDisponibilidadUsuario } from '../hooks/useDisponibilidadUsuario';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useIngresoGoogle } from '../hooks/useIngresoGoogle';
import { MENSAJES, validarApellidos, validarNombres, validarUsername } from '../lib/validacion';
import { ErrorApi } from '../services/http';
import { consultarDisponibilidad, crearPerfil } from '../services/usuarios';

/** Solo para quien ya ingresó (por ejemplo con Google) y todavía no eligió su nombre de usuario. */
export function RutaElegirUsuario() {
  const { estado, listo } = useAuth();
  const location = useLocation();

  if (!listo) return <EstadoCarga />;
  if (estado === 'sin-sesion') return <Navigate to="/ingresar" replace />;
  if (estado === 'con-perfil') return <Navigate to={destinoTrasIngresar(location.state)} replace />;
  return <Outlet />;
}

type Campo = 'nombres' | 'apellidos' | 'username';
const ORDEN: Campo[] = ['nombres', 'apellidos', 'username'];
const ETIQUETAS: Record<Campo, string> = {
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  username: 'Nombre de usuario',
};

/** Google entrega un solo nombre completo; se reparte en nombres y apellidos (editables). */
function separarNombre(completo: string | null): { nombres: string; apellidos: string } {
  const partes = (completo ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { nombres: '', apellidos: '' };
  if (partes.length === 1) return { nombres: partes[0], apellidos: '' };
  const corte = partes.length >= 4 ? 2 : 1;
  return { nombres: partes.slice(0, corte).join(' '), apellidos: partes.slice(corte).join(' ') };
}

export function ElegirUsuarioPage() {
  useDocumentTitle('Elige tu nombre de usuario');
  const { usuario } = useAuth();
  if (!usuario) return <EstadoCarga />;
  // La clave reinicia el formulario si la persona cambia de cuenta de Google.
  return <FormularioUsuario key={usuario.uid} usuario={usuario} />;
}

function FormularioUsuario({ usuario }: { usuario: User }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { establecerPerfil } = useAuth();
  const google = useIngresoGoogle();

  const inicial = separarNombre(usuario.displayName);
  const [datos, setDatos] = useState<Record<Campo, string>>({ ...inicial, username: '' });
  const [avatar, setAvatar] = useState<string>(usuario.photoURL ?? AVATARES[0]);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [intento, setIntento] = useState(0);
  const disponibilidad = useDisponibilidadUsuario(datos.username);

  const cambiar = (campo: Campo) => (evento: { target: { value: string } }) => {
    setDatos((previo) => ({ ...previo, [campo]: evento.target.value }));
    if (errores[campo]) setErrores((previo) => ({ ...previo, [campo]: undefined }));
  };

  const validar = (campo: Campo, valor: string) =>
    campo === 'nombres'
      ? validarNombres(valor)
      : campo === 'apellidos'
        ? validarApellidos(valor)
        : validarUsername(valor);

  const alSalir = (campo: Campo) => () => {
    if (datos[campo] === '') return;
    setErrores((previo) => ({ ...previo, [campo]: validar(campo, datos[campo]) ?? undefined }));
  };

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErrorGeneral(null);

    const nuevos: Partial<Record<Campo, string>> = {};
    for (const campo of ORDEN) {
      const mensaje = validar(campo, datos[campo]);
      if (mensaje) nuevos[campo] = mensaje;
    }
    if (!nuevos.username && disponibilidad === 'ocupado') nuevos.username = MENSAJES.usernameOcupado;
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) {
      setIntento((n) => n + 1);
      return;
    }

    setEnviando(true);
    try {
      if (disponibilidad !== 'disponible') {
        const libre = await consultarDisponibilidad(datos.username).catch(() => true);
        if (!libre) {
          setErrores({ username: MENSAJES.usernameOcupado });
          setIntento((n) => n + 1);
          return;
        }
      }
      const perfil = await crearPerfil(usuario, {
        nombres: datos.nombres.trim(),
        apellidos: datos.apellidos.trim(),
        username: datos.username.trim(),
        avatarUrl: urlAbsolutaAvatar(avatar),
      });
      establecerPerfil(perfil);
      navigate(destinoTrasIngresar(location.state), { replace: true, state: { bienvenida: true } });
    } catch (error) {
      if (error instanceof ErrorApi && Object.keys(error.errores).length > 0) {
        const delServidor: Partial<Record<Campo, string>> = {};
        for (const campo of ORDEN) {
          if (error.errores[campo]) delServidor[campo] = error.errores[campo];
        }
        setErrores(delServidor);
        setIntento((n) => n + 1);
        if (Object.keys(delServidor).length === 0) setErrorGeneral(error.message);
      } else {
        setErrorGeneral(error instanceof Error ? error.message : 'Algo salió mal. Inténtalo de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  }

  const listaErrores = ORDEN.filter((campo) => errores[campo]).map((campo) => ({
    campo,
    etiqueta: `${ETIQUETAS[campo]}: ${errores[campo]}`,
  }));

  return (
    <section className="mx-auto max-w-md space-y-6" aria-labelledby="elegir-titulo">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-600">Paso 2 de 2</p>
        <h1 id="elegir-titulo" className="text-3xl font-bold text-slate-900">
          Elige tu nombre de usuario
        </h1>
        <p className="text-slate-700">
          Así te encontrarán tus compañeros en las Salas. Es el último paso para entrar.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        {usuario.photoURL ? (
          <img
            src={usuario.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <p className="text-sm text-slate-600">Ingresaste como</p>
          <p className="truncate font-medium text-slate-900">{usuario.email}</p>
        </div>
      </div>

      {(errorGeneral || google.error) && <Alerta tipo="error">{errorGeneral ?? google.error}</Alerta>}
      <ResumenErrores errores={listaErrores} intento={intento} />

      <form noValidate onSubmit={enviar} className="space-y-5">
        <CampoTexto
          id="username"
          etiqueta="Nombre de usuario"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={datos.username}
          onChange={cambiar('username')}
          onBlur={alSalir('username')}
          error={errores.username}
          estado={errores.username ? null : <EstadoUsername estado={disponibilidad} />}
          ayuda="Entre 3 y 20 letras, números o guion bajo (_), sin espacios."
          required
        />
        <CampoTexto
          id="nombres"
          etiqueta="Nombres"
          autoComplete="given-name"
          value={datos.nombres}
          onChange={cambiar('nombres')}
          onBlur={alSalir('nombres')}
          error={errores.nombres}
          required
        />
        <CampoTexto
          id="apellidos"
          etiqueta="Apellidos"
          autoComplete="family-name"
          value={datos.apellidos}
          onChange={cambiar('apellidos')}
          onBlur={alSalir('apellidos')}
          error={errores.apellidos}
          required
        />
        <SelectorAvatar valor={avatar} onCambio={setAvatar} fotoGoogle={usuario.photoURL} />

        <Boton type="submit" anchoCompleto cargando={enviando} textoCargando="Guardando…">
          Terminar registro
        </Boton>
      </form>

      {usuario.providerData.some((p) => p.providerId === 'google.com') && (
        <p className="text-center text-slate-700">
          ¿No es tu cuenta?{' '}
          <button
            type="button"
            onClick={() => void google.continuarConGoogle()}
            disabled={google.cargando}
            className="font-medium text-sky-800 underline hover:text-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700"
          >
            Usar otra cuenta de Google
          </button>
        </p>
      )}
    </section>
  );
}

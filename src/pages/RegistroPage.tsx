import { createUserWithEmailAndPassword, type User } from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EstadoUsername } from '../components/EstadoUsername';
import { ResumenErrores } from '../components/ResumenErrores';
import { Alerta } from '../components/ui/Alerta';
import { Boton } from '../components/ui/Boton';
import { CampoContrasena } from '../components/ui/CampoContrasena';
import { CampoTexto } from '../components/ui/CampoTexto';
import { AVATARES, SelectorAvatar, urlAbsolutaAvatar } from '../components/ui/SelectorAvatar';
import { useAuth } from '../context/AuthContext';
import { useDisponibilidadUsuario } from '../hooks/useDisponibilidadUsuario';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { obtenerAuth } from '../lib/firebase';
import {
  MENSAJES,
  validarApellidos,
  validarContrasenaNueva,
  validarCorreo,
  validarNombres,
  validarUsername,
} from '../lib/validacion';
import { codigoError, mensajeErrorAuth } from '../services/erroresAuth';
import { ErrorApi } from '../services/http';
import { consultarDisponibilidad, crearPerfil } from '../services/usuarios';

type Campo = 'nombres' | 'apellidos' | 'username' | 'correo' | 'contrasena';

const ETIQUETAS: Record<Campo, string> = {
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  username: 'Nombre de usuario',
  correo: 'Correo',
  contrasena: 'Contraseña',
};

const ORDEN: Campo[] = ['nombres', 'apellidos', 'username', 'correo', 'contrasena'];

const CORREO_REGISTRADO = 'auth/email-already-in-use';

export function RegistroPage() {
  useDocumentTitle('Crea tu cuenta');
  const navigate = useNavigate();
  const { establecerPerfil } = useAuth();

  const [datos, setDatos] = useState<Record<Campo, string>>({
    nombres: '',
    apellidos: '',
    username: '',
    correo: '',
    contrasena: '',
  });
  const [avatar, setAvatar] = useState<string>(AVATARES[0]);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [correoRegistrado, setCorreoRegistrado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [intento, setIntento] = useState(0);

  const disponibilidad = useDisponibilidadUsuario(datos.username);

  const cambiar = (campo: Campo) => (evento: { target: { value: string } }) => {
    setDatos((previo) => ({ ...previo, [campo]: evento.target.value }));
    if (errores[campo]) setErrores((previo) => ({ ...previo, [campo]: undefined }));
    if (campo === 'correo') setCorreoRegistrado(false);
  };

  const validarCampo = (campo: Campo, valor: string): string | null => {
    switch (campo) {
      case 'nombres':
        return validarNombres(valor);
      case 'apellidos':
        return validarApellidos(valor);
      case 'username':
        return validarUsername(valor);
      case 'correo':
        return validarCorreo(valor);
      case 'contrasena':
        return validarContrasenaNueva(valor);
    }
  };

  // Valida al salir del campo solo si ya tiene algo escrito (no regaña antes de escribir).
  const alSalir = (campo: Campo) => () => {
    if (datos[campo] === '') return;
    const mensaje = validarCampo(campo, datos[campo]);
    setErrores((previo) => ({ ...previo, [campo]: mensaje ?? undefined }));
  };

  async function crearCuentaFirebase(): Promise<User> {
    const auth = obtenerAuth();
    // Si un intento anterior ya creó la cuenta (pero el perfil falló), se reutiliza.
    const actual = auth.currentUser;
    if (actual && actual.email?.toLowerCase() === datos.correo.trim().toLowerCase()) return actual;
    const credencial = await createUserWithEmailAndPassword(auth, datos.correo.trim(), datos.contrasena);
    return credencial.user;
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErrorGeneral(null);
    setCorreoRegistrado(false);

    const nuevos: Partial<Record<Campo, string>> = {};
    for (const campo of ORDEN) {
      const mensaje = validarCampo(campo, datos[campo]);
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

      let usuario: User;
      try {
        usuario = await crearCuentaFirebase();
      } catch (error) {
        const codigo = codigoError(error);
        if (codigo === CORREO_REGISTRADO) {
          setCorreoRegistrado(true);
          setErrores({ correo: 'Este correo ya tiene una cuenta.' });
          setIntento((n) => n + 1);
        } else if (codigo === 'auth/invalid-email') {
          setErrores({ correo: MENSAJES.correoFormato });
          setIntento((n) => n + 1);
        } else if (codigo === 'auth/weak-password') {
          setErrores({ contrasena: MENSAJES.contrasenaDebil });
          setIntento((n) => n + 1);
        } else {
          setErrorGeneral(mensajeErrorAuth(error));
        }
        return;
      }

      // La unicidad del nombre de usuario la garantiza el servidor (409 si otra persona lo tomó).
      const perfil = await crearPerfil(usuario, {
        nombres: datos.nombres.trim(),
        apellidos: datos.apellidos.trim(),
        username: datos.username.trim(),
        avatarUrl: urlAbsolutaAvatar(avatar),
      });
      establecerPerfil(perfil);
      navigate('/panel', { replace: true, state: { bienvenida: true } });
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
        setErrorGeneral(mensajeErrorAuth(error));
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
    <section className="mx-auto max-w-md space-y-6" aria-labelledby="registro-titulo">
      <div className="space-y-2">
        <h1 id="registro-titulo" className="text-3xl font-bold text-slate-900">
          Crea tu cuenta
        </h1>
        <p className="text-slate-700">
          Regístrate para crear Salas de estudio y unirte a las de tus compañeros.
        </p>
      </div>

      {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}
      <ResumenErrores errores={listaErrores} intento={intento} />

      <form noValidate onSubmit={enviar} className="space-y-5">
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
        <SelectorAvatar valor={avatar} onCambio={setAvatar} />
        <CampoTexto
          id="correo"
          etiqueta="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={datos.correo}
          onChange={cambiar('correo')}
          onBlur={alSalir('correo')}
          error={
            errores.correo &&
            (correoRegistrado ? (
              <>
                Este correo ya tiene una cuenta.{' '}
                <Link to="/ingresar" className="font-medium underline">
                  Ingresar
                </Link>
              </>
            ) : (
              errores.correo
            ))
          }
          ayuda="Usa tu correo institucional, por ejemplo nombre@correounivalle.edu.co."
          required
        />
        <CampoContrasena
          id="contrasena"
          etiqueta="Contraseña"
          autoComplete="new-password"
          value={datos.contrasena}
          onChange={cambiar('contrasena')}
          onBlur={alSalir('contrasena')}
          error={errores.contrasena}
          mostrarReglas
          required
        />

        <Boton type="submit" anchoCompleto cargando={enviando} textoCargando="Creando tu cuenta…">
          Crear cuenta
        </Boton>
      </form>

      <p className="text-center text-slate-700">
        ¿Ya tienes cuenta?{' '}
        <Link to="/ingresar" className="font-medium text-sky-800 underline hover:text-sky-900">
          Ingresar
        </Link>
      </p>
    </section>
  );
}

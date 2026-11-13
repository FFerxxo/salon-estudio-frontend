import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ResumenErrores } from '../components/ResumenErrores';
import { destinoTrasIngresar, type EstadoNavegacion } from '../components/RutasProtegidas';
import { Alerta } from '../components/ui/Alerta';
import { Boton } from '../components/ui/Boton';
import { BotonGoogle, SeparadorCorreo } from '../components/ui/BotonGoogle';
import { CampoContrasena } from '../components/ui/CampoContrasena';
import { CampoTexto } from '../components/ui/CampoTexto';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useIngresoGoogle } from '../hooks/useIngresoGoogle';
import { obtenerAuth } from '../lib/firebase';
import { MENSAJES } from '../lib/validacion';
import { mensajeErrorAuth } from '../services/erroresAuth';

type Campo = 'correo' | 'contrasena';

export function IngresarPage() {
  useDocumentTitle('Ingresar');
  const navigate = useNavigate();
  const location = useLocation();
  const { sincronizarPerfil } = useAuth();
  const google = useIngresoGoogle();
  const motivo = (location.state as EstadoNavegacion | null)?.motivo;

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [intento, setIntento] = useState(0);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErrorGeneral(null);

    const nuevos: Partial<Record<Campo, string>> = {};
    if (correo.trim() === '') nuevos.correo = MENSAJES.correoVacio;
    if (contrasena === '') nuevos.contrasena = MENSAJES.contrasenaVacia;
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) {
      setIntento((n) => n + 1);
      return;
    }

    setEnviando(true);
    try {
      await signInWithEmailAndPassword(obtenerAuth(), correo.trim(), contrasena);
      const perfil = await sincronizarPerfil();
      if (perfil) {
        navigate(destinoTrasIngresar(location.state), { replace: true });
      } else {
        navigate('/registro/usuario', { replace: true, state: location.state });
      }
    } catch (error) {
      // Mensaje genérico: no revela si falló el correo o la contraseña.
      setErrorGeneral(mensajeErrorAuth(error));
    } finally {
      setEnviando(false);
    }
  }

  const listaErrores = (['correo', 'contrasena'] as Campo[])
    .filter((campo) => errores[campo])
    .map((campo) => ({
      campo,
      etiqueta: `${campo === 'correo' ? 'Correo' : 'Contraseña'}: ${errores[campo]}`,
    }));

  return (
    <section className="mx-auto max-w-md space-y-6" aria-labelledby="ingresar-titulo">
      <div className="space-y-2">
        <h1 id="ingresar-titulo" className="text-3xl font-bold text-slate-900">
          Ingresar
        </h1>
        <p className="text-slate-700">Entra a tu Panel para estudiar con tus compañeros.</p>
      </div>

      {motivo === 'privada' && <Alerta tipo="info">Ingresa para continuar a tu Panel.</Alerta>}
      {motivo === 'cerro-sesion' && <Alerta tipo="exito">Cerraste sesión. ¡Hasta pronto!</Alerta>}
      {(errorGeneral || google.error) && <Alerta tipo="error">{errorGeneral ?? google.error}</Alerta>}

      <BotonGoogle
        onClick={() => void google.continuarConGoogle()}
        cargando={google.cargando}
        disabled={enviando}
      />
      <SeparadorCorreo />

      <ResumenErrores errores={listaErrores} intento={intento} />

      <form noValidate onSubmit={enviar} className="space-y-5">
        <CampoTexto
          id="correo"
          etiqueta="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={correo}
          onChange={(e) => {
            setCorreo(e.target.value);
            if (errores.correo) setErrores((p) => ({ ...p, correo: undefined }));
          }}
          error={errores.correo}
          required
        />
        <CampoContrasena
          id="contrasena"
          etiqueta="Contraseña"
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => {
            setContrasena(e.target.value);
            if (errores.contrasena) setErrores((p) => ({ ...p, contrasena: undefined }));
          }}
          error={errores.contrasena}
          required
        />
        <Boton type="submit" anchoCompleto cargando={enviando} textoCargando="Ingresando…">
          Ingresar
        </Boton>
      </form>

      <p className="text-center text-slate-700">
        ¿No tienes cuenta?{' '}
        <Link
          to="/registro"
          state={location.state}
          className="font-medium text-sky-800 underline hover:text-sky-900"
        >
          Regístrate
        </Link>
      </p>
    </section>
  );
}

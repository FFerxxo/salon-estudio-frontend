import { signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { destinoTrasIngresar } from '../components/RutasProtegidas';
import { useAuth } from '../context/AuthContext';
import { obtenerAuth, proveedorGoogle } from '../lib/firebase';
import { mensajeErrorAuth } from '../services/erroresAuth';

/**
 * «Continuar con Google» (US-02 y US-03).
 * Primera vez: la API responde 404 en /me → pantalla para elegir el nombre de usuario.
 * Cuenta existente: entra directo al Panel (o a la ruta privada que se había pedido).
 */
export function useIngresoGoogle() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sincronizarPerfil } = useAuth();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continuarConGoogle() {
    setError(null);
    setCargando(true);
    try {
      await signInWithPopup(obtenerAuth(), proveedorGoogle());
      const perfil = await sincronizarPerfil();
      if (perfil) {
        navigate(destinoTrasIngresar(location.state), { replace: true });
      } else {
        navigate('/registro/usuario', { replace: true, state: location.state });
      }
    } catch (err) {
      setError(mensajeErrorAuth(err));
    } finally {
      setCargando(false);
    }
  }

  return { continuarConGoogle, cargando, error };
}

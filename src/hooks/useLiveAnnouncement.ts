import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Mantiene un texto para una región aria-live y fuerza una mutación real en el DOM
 * cuando el mismo anuncio llega dos veces seguidas, para que los lectores de pantalla lo vuelvan a leer.
 */
export function useLiveAnnouncement(delayMs = 20): [string, (mensaje: string) => void] {
  const [texto, setTexto] = useState('');
  const ultimoRef = useRef('');
  const timerRef = useRef<number | null>(null);

  const anunciar = useCallback(
    (siguiente: string) => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!siguiente) {
        ultimoRef.current = '';
        setTexto('');
        return;
      }
      if (ultimoRef.current === siguiente) {
        setTexto('');
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          ultimoRef.current = siguiente;
          setTexto(siguiente);
        }, delayMs);
        return;
      }
      ultimoRef.current = siguiente;
      setTexto(siguiente);
    },
    [delayMs]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return [texto, anunciar];
}

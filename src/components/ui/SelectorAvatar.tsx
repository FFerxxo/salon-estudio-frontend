export const AVATARES = Array.from({ length: 8 }, (_, i) => `/avatares/avatar-${i + 1}.svg`);

/**
 * La API solo acepta el avatar como enlace https. En producción (Vercel) la ruta
 * se convierte en https://<dominio>/avatares/...; en local (http) se envía null.
 */
export function urlAbsolutaAvatar(ruta: string | null): string | null {
  if (!ruta) return null;
  if (ruta.startsWith('https://')) return ruta;
  const url = new URL(ruta, window.location.origin);
  return url.protocol === 'https:' ? url.toString() : null;
}

interface SelectorAvatarProps {
  valor: string | null;
  onCambio: (ruta: string) => void;
  /** Foto de la cuenta de Google, que se ofrece como primera opción en el registro con Google. */
  fotoGoogle?: string | null;
}

export function SelectorAvatar({ valor, onCambio, fotoGoogle }: SelectorAvatarProps) {
  const opciones = [
    ...(fotoGoogle ? [{ ruta: fotoGoogle, nombre: 'Tu foto de Google' }] : []),
    ...AVATARES.map((ruta, i) => ({ ruta, nombre: `Ilustración ${i + 1}` })),
  ];

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-800">Avatar</legend>
      <p className="text-sm text-slate-600">Elige cómo te verán los demás en las Salas.</p>
      <div className="grid grid-cols-4 sm:grid-cols-9 gap-2">
        {opciones.map((opcion) => {
          const elegido = valor === opcion.ruta;
          return (
            <label
              key={opcion.ruta}
              className={`relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-700 ${
                elegido ? 'border-sky-800' : 'border-transparent hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="avatar"
                value={opcion.ruta}
                checked={elegido}
                onChange={() => onCambio(opcion.ruta)}
                className="sr-only"
              />
              <img
                src={opcion.ruta}
                alt={opcion.nombre}
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-full object-cover"
              />
              {elegido && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-800 text-xs text-white"
                >
                  ✓
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

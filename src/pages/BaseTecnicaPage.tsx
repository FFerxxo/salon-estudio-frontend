import { useCallback, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchAppInfo, type AppInfo } from '../services/api';
import {
  getErrorAlertClasses,
  getPrimaryCtaClasses,
  getSolidSurfaceClasses,
} from '../utils/themeStyles';

type Status = 'loading' | 'error' | 'success';

export function BaseTecnicaPage() {
  useDocumentTitle('Base técnica');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<AppInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadData = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const result = await fetchAppInfo();
      setData(result);
      setStatus('success');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo obtener la información del servidor.';
      setErrorMessage(message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <section className="space-y-6" aria-labelledby="base-tecnica-heading">
      <div className={`rounded-[20px] p-6 sm:p-8 space-y-6 ${getSolidSurfaceClasses(theme)}`}>
        <div className="space-y-2">
          <h1 id="base-tecnica-heading" className="text-3xl font-bold">
            Base técnica
          </h1>
          <p className={isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}>
            Verificación de extremo a extremo entre el frontend, la API en Node.js y Cloud
            Firestore.
          </p>
        </div>

        <div
          aria-live="polite"
          aria-atomic="true"
          className={`rounded-2xl border border-[#64748b] p-6 ${
            isDark ? 'bg-[#0b1220]' : 'bg-[#f8fafc]'
          }`}
        >
          {status === 'loading' && (
            <div role="status">
              <p className={`font-medium ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
                Cargando información desde la API...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div role="alert" className="space-y-4">
              <div
                className={`rounded-[10px] p-3.5 text-sm font-semibold flex items-center gap-2 ${getErrorAlertClasses(
                  theme
                )}`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Error al conectar con el servidor</span>
              </div>
              <p className={isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}>{errorMessage}</p>
              <button
                type="button"
                onClick={() => void loadData()}
                className={`${getPrimaryCtaClasses(theme)} !w-auto`}
              >
                Reintentar
              </button>
            </div>
          )}

          {status === 'success' && data && (
            <div role="status">
              <dl className="space-y-4">
                <div>
                  <dt className={`text-sm font-medium ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
                    Nombre de la aplicación
                  </dt>
                  <dd className="text-xl font-bold">{data.nombre}</dd>
                </div>
                <div>
                  <dt className={`text-sm font-medium ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
                    Mensaje desde Firestore
                  </dt>
                  <dd className={`text-lg ${isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}`}>
                    {data.mensaje}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

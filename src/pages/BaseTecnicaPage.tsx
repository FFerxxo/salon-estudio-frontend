import { useCallback, useEffect, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchAppInfo, type AppInfo } from '../services/api';

type Status = 'loading' | 'error' | 'success';

export function BaseTecnicaPage() {
  useDocumentTitle('Base técnica');

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
      <div className="space-y-2">
        <h1 id="base-tecnica-heading" className="text-3xl font-bold text-slate-900">
          Base técnica
        </h1>
        <p className="text-slate-700">
          Verificación de extremo a extremo entre el frontend, la API en Node.js y Cloud Firestore.
        </p>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm"
      >
        {status === 'loading' && (
          <div role="status">
            <p className="text-slate-700 font-medium">Cargando información desde la API...</p>
          </div>
        )}

        {status === 'error' && (
          <div role="alert" className="space-y-4">
            <p className="text-red-800 font-semibold">Error al conectar con el servidor</p>
            <p className="text-slate-700">{errorMessage}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="px-4 py-2 rounded-md bg-sky-800 text-white font-medium hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {status === 'success' && data && (
          <div role="status">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-slate-600">Nombre de la aplicación</dt>
                <dd className="text-xl font-bold text-slate-900">{data.nombre}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-600">Mensaje desde Firestore</dt>
                <dd className="text-lg text-slate-800">{data.mensaje}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}

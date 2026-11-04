export interface AppInfo {
  nombre: string;
  mensaje: string;
}

export async function fetchAppInfo(): Promise<AppInfo> {
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/app-info`);

  if (!response.ok) {
    let errorMessage = 'No se pudo obtener la información del servidor.';
    try {
      const errorData = (await response.json()) as { error?: string };
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Fallback to default message if JSON parsing fails
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<AppInfo>;
}

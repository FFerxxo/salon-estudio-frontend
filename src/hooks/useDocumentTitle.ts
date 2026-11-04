import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Salón de Estudio` : 'Salón de Estudio';
  }, [title]);
}

import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · EventSphere` : 'EventSphere — Event Management Platform';
    return () => { document.title = prev; };
  }, [title]);
}

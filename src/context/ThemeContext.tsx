import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface MareaBackdropMedia {
  posterUrl: string;
  video1080Url: string;
  video1440Url: string;
  video2160Url: string;
}

export const MAREA_MEDIA: MareaBackdropMedia = {
  posterUrl: '/assets/marea/marea-poster.jpg',
  video1080Url: '/assets/marea/marea-loop-1080p.mp4',
  video1440Url: '/assets/marea/marea-loop-1440p.mp4',
  video2160Url: '/assets/marea/marea-loop-2160p.mp4',
};

interface ThemeContextValue {
  theme: ThemeMode;
  motionPaused: boolean;
  prefersReducedMotion: boolean;
  toggleTheme: () => void;
  toggleMotionPaused: () => void;
}

const defaultThemeValue: ThemeContextValue = {
  theme: 'dark',
  motionPaused: false,
  prefersReducedMotion: false,
  toggleTheme: () => {},
  toggleMotionPaused: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(defaultThemeValue);

function detectReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readStoredValue<T extends string>(key: string, fallback: T): T {
  try {
    const val = window.localStorage.getItem(key);
    return (val as T) || fallback;
  } catch {
    return fallback;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() =>
    readStoredValue<ThemeMode>('uv_theme_mode', 'dark')
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(detectReducedMotion);
  const [motionPaused, setMotionPaused] = useState<boolean>(detectReducedMotion);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('uv_theme_mode', theme);
    } catch {
      // Sin persistencia disponible en entornos restringidos
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
      if (event.matches) setMotionPaused(true);
    };
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleMotionPaused = () => {
    setMotionPaused((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        motionPaused,
        prefersReducedMotion,
        toggleTheme,
        toggleMotionPaused,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

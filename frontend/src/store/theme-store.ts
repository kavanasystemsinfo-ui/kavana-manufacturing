import { create } from 'zustand';

export type Theme = 'classic' | 'modern';

const STORAGE_KEY = 'kavana_theme';

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'classic' || stored === 'modern') return stored;
  } catch {
    // localStorage no disponible (modo privado, SSR): fallback a classic
  }
  return 'classic';
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: getStoredTheme(),
  setTheme: (theme) => {
    set({ theme });
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Sin localStorage: el tema no persiste entre sesiones, solo en memoria
    }
  },
  toggleTheme: () => {
    set((prev) => {
      const next = prev.theme === 'classic' ? 'modern' : 'classic';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Sin localStorage: el tema no persiste entre sesiones, solo en memoria
      }
      return { theme: next };
    });
  },
}));

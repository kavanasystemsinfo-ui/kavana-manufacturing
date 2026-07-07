import { create } from 'zustand';

export type Theme = 'classic' | 'modern';

const STORAGE_KEY = 'kavana_theme';

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'classic' || stored === 'modern') return stored;
  } catch {}
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
    } catch {}
  },
  toggleTheme: () => {
    set((prev) => {
      const next = prev.theme === 'classic' ? 'modern' : 'classic';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return { theme: next };
    });
  },
}));

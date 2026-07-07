import { useThemeStore, type Theme } from '../store/theme-store.js';

interface ThemeToggleProps {
  /** Visual variant - 'header' for inline in headers, 'floating' for fixed position */
  variant?: 'header' | 'floating';
}

export function ThemeToggle({ variant = 'header' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isClassic = theme === 'classic';

  if (variant === 'floating') {
    return (
      <button
        onClick={toggleTheme}
        className="fixed bottom-4 right-4 z-50 rounded-full border shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          backgroundColor: isClassic ? '#1e293b' : '#ffffff',
          color: isClassic ? '#f1f5f9' : '#1e293b',
          borderColor: isClassic ? '#334155' : '#e2e8f0',
        }}
        title={`Cambiar a tema ${isClassic ? 'Moderno' : 'Clásico'}`}
      >
        <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium">
          <span>{isClassic ? '🖥️' : '🎮'}</span>
          <span>{isClassic ? 'Clásico' : 'Moderno'}</span>
        </div>
      </button>
    );
  }

  // Header variant: compact pill with two buttons
  if (isClassic) {
    return (
      <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-100 p-0.5">
        <button
          onClick={() => useThemeStore.getState().setTheme('classic')}
          className="rounded px-2.5 py-1 text-xs font-medium transition bg-white text-blue-700 shadow-sm"
        >
          Clásico
        </button>
        <button
          onClick={() => useThemeStore.getState().setTheme('modern')}
          className="rounded px-2.5 py-1 text-xs font-medium transition text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
        >
          Moderno
        </button>
      </div>
    );
  }

  // Modern header variant
  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-900/50 p-1">
      <button
        onClick={() => useThemeStore.getState().setTheme('classic')}
        className="rounded-md px-2.5 py-1 text-xs font-medium transition text-gray-400 hover:text-white hover:bg-gray-700"
      >
        Clásico
      </button>
      <button
        onClick={() => useThemeStore.getState().setTheme('modern')}
        className="rounded-md px-2.5 py-1 text-xs font-medium transition bg-indigo-600 text-white shadow-lg"
      >
        Moderno
      </button>
    </div>
  );
}

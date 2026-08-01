import { createContext, useContext, useMemo, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState('dark');

  const value = useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      theme,
      setTheme
    }),
    [sidebarOpen, theme]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used inside UIProvider');
  }
  return context;
}

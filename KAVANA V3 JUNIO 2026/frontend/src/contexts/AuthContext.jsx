import { createContext, useContext, useMemo, useState } from 'react';
import api from '../api/axios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('kavana_v3_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async ({ tenantSlug, username, password }) => {
    const { data } = await api.post('/auth/login', { tenantSlug, username, password });
    setUser(data.user);
    localStorage.setItem('kavana_v3_token', data.token);
    localStorage.setItem('kavana_v3_user', JSON.stringify(data.user));
    return data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kavana_v3_token');
    localStorage.removeItem('kavana_v3_user');
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

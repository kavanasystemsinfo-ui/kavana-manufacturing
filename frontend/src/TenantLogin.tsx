import { useState, useEffect } from 'react';
import { useThemeStore } from './store/theme-store.js';
import { ThemeToggle } from './components/ThemeToggle.js';

interface TenantLoginProps {
  subdomain: string;
  onLogin: (token: string, tenantId: string, userId: string, role: string, tenantName: string) => void;
}

export function TenantLogin({ subdomain, onLogin }: TenantLoginProps) {
  const theme = useThemeStore((s) => s.theme);
  const isClassic = theme === 'classic';

  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchTenant();
  }, [subdomain]);

  async function fetchTenant() {
    try {
      const res = await fetch(`/api/auth/tenant/${subdomain}`);
      const data = await res.json();
      if (data.found) {
        setTenantName(data.name);
      } else {
        setTenantName(null);
      }
    } catch {
      setTenantName(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login-by-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, username, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Credenciales inválidas');
      }

      const data = await res.json();
      localStorage.setItem('kavana_dev_token', data.token);
      localStorage.setItem('kavana_tenant_id', data.tenantId);
      localStorage.setItem('kavana_user_id', data.userId);
      localStorage.setItem('kavana_role', data.role);
      onLogin(data.token, data.tenantId, data.userId, data.role, data.tenantName);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isClassic ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'}`}>
        <div className={isClassic ? 'text-gray-500' : 'text-gray-400'}>Cargando...</div>
      </div>
    );
  }

  if (!tenantName) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isClassic ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'}`}>
        <div className={`text-center ${isClassic ? 'text-gray-800' : 'text-white'}`}>
          <h1 className="text-2xl font-bold mb-2">Tenant no encontrado</h1>
          <p className={isClassic ? 'text-gray-500' : 'text-gray-400'}>El subdominio <strong>{subdomain}</strong> no está registrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${isClassic ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'}`}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className={`w-full max-w-md rounded-xl border shadow-lg p-8 ${isClassic ? 'bg-white border-gray-200' : 'bg-gray-800/80 border-gray-700 backdrop-blur-sm'}`}>
        <div className="text-center mb-8">
          <div className="mb-4">
            <img src="/logo.png" alt="Kavana" className="h-12 mx-auto" />
          </div>
          <h1 className={`text-2xl font-bold ${isClassic ? 'text-gray-800' : 'text-white'}`}>{tenantName}</h1>
          <p className={`mt-1 ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Inicia sesión para continuar</p>
        </div>

        {error && (
          <div className={`mb-4 rounded-lg p-3 text-sm ${isClassic ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-red-900/50 border border-red-700 text-red-300'}`}>
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isClassic ? 'text-gray-700' : 'text-gray-300'}`}>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={`w-full rounded-lg px-4 py-3 text-sm border transition-colors ${
                isClassic
                  ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              }`}
              placeholder="admin"
              autoFocus
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isClassic ? 'text-gray-700' : 'text-gray-300'}`}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full rounded-lg px-4 py-3 text-sm border transition-colors ${
                isClassic
                  ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              }`}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !username.trim() || !password.trim()}
            className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors min-h-[48px] ${
              isClassic
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
            }`}
          >
            {submitting ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className={`mt-6 text-center text-xs ${isClassic ? 'text-gray-400' : 'text-gray-500'}`}>
          {subdomain}.kavana.app
        </div>
      </div>
    </div>
  );
}

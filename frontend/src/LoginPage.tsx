import { useState, useEffect } from 'react';
import { useThemeStore } from './store/theme-store.js';
import { ThemeToggle } from './components/ThemeToggle.js';

interface LoginPageProps {
  onLogin: (token: string, tenantId: string, userId: string, role: string, tenantName: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const theme = useThemeStore((s) => s.theme);
  const isClassic = theme === 'classic';

  const [tenantSlug, setTenantSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Smart login: remember last tenant slug
  useEffect(() => {
    const savedSlug = localStorage.getItem('kavana_tenant_slug');
    if (savedSlug) setTenantSlug(savedSlug);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const slug = tenantSlug.trim() || localStorage.getItem('kavana_tenant_slug') || '';

    try {
      const res = await fetch('/api/auth/login-by-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: slug, username: username.trim(), password }),
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
      localStorage.setItem('kavana_tenant_name', data.tenantName);
      localStorage.setItem('kavana_tenant_slug', slug);
      window.location.href = `/${slug}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isClassic ? 'bg-gray-50 text-gray-900' : 'bg-gray-900 text-gray-100'}`}>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className={`w-full max-w-md rounded-sm shadow-2xl overflow-hidden border ${isClassic ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
        <div className="p-8">
          <div className="flex flex-col items-center mb-10">
            <img
              src="/logo.png"
              alt="KAVANA"
              className={`h-20 w-auto object-contain mb-3 ${isClassic ? '' : 'brightness-110'}`}
            />
            <h1
              className={`text-lg font-black uppercase tracking-[3px] ${isClassic ? 'text-gray-800' : 'text-white'}`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              KAVANA MES
            </h1>
            <p className={`text-sm font-medium tracking-wide mt-1 ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>
              Inteligencia Industrial
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {error && (
              <div className={`rounded-sm px-4 py-3 text-sm ${isClassic ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-red-900/50 border border-red-500/50 text-red-200'}`}>
                {error}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-1 ${isClassic ? 'text-gray-700' : 'text-gray-400'}`}>
                Empresa (Slug)
              </label>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                required
                autoFocus
                placeholder="ej. megalux"
                className={`w-full rounded-sm py-3 px-4 text-sm border transition-colors ${
                  isClassic
                    ? 'border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'border-gray-700 bg-gray-900 text-gray-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder-gray-600'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isClassic ? 'text-gray-700' : 'text-gray-400'}`}>
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="admin"
                className={`w-full rounded-sm py-3 px-4 text-sm border transition-colors ${
                  isClassic
                    ? 'border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'border-gray-700 bg-gray-900 text-gray-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder-gray-600'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isClassic ? 'text-gray-700' : 'text-gray-400'}`}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={`w-full rounded-sm py-3 px-4 text-sm border transition-colors ${
                  isClassic
                    ? 'border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'border-gray-700 bg-gray-900 text-gray-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder-gray-600'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password.trim() || !tenantSlug.trim()}
              className={`w-full font-bold py-3 px-4 rounded-sm transition-all active:scale-95 flex items-center justify-center gap-2 min-h-[48px] ${
                isClassic
                  ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-600/20'
              }`}
            >
              {submitting ? (
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>Acceder al Sistema</span>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        <div className={`p-4 text-center text-xs ${isClassic ? 'text-gray-400 border-t border-gray-100' : 'text-gray-500 border-t border-gray-700'}`}>
          &copy; 2026 KAVANA SYSTEMS v3.0
        </div>
      </div>
    </div>
  );
}

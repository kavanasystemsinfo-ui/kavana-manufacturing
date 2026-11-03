import { useState, useEffect } from 'react';
import { useThemeStore } from './store/theme-store.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { DemoWakeNotice } from './components/DemoWakeNotice.js';
import { AiAdvisorFab } from './components/AiAdvisorFab.js';

interface LoginPageProps {
  onLogin: (token: string, tenantId: string, userId: string, role: string, tenantName: string) => void;
}

const DEMO_ROLES = [
  { key: 'operario', label: 'Operario', description: 'Registra producción en la tablet del puesto' },
  { key: 'supervisor', label: 'Supervisor', description: 'Ve la planta entera, paradas y OEE' },
  { key: 'administrador', label: 'Administrador', description: 'Configura puestos, usuarios y catálogos' },
] as const;

type DemoRoleKey = typeof DEMO_ROLES[number]['key'];

export function LoginPage({ onLogin }: LoginPageProps) {
  const theme = useThemeStore((s) => s.theme);
  const isClassic = theme === 'classic';

  const [tenantSlug, setTenantSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [demoLoggingIn, setDemoLoggingIn] = useState<string | null>(null);

  // Smart login: remember last tenant slug
  useEffect(() => {
    const savedSlug = localStorage.getItem('kavana_tenant_slug');
    if (savedSlug) setTenantSlug(savedSlug);
  }, []);

  // Auto demo login from query param ?demo=<role>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demoRole = params.get('demo');
    if (demoRole && DEMO_ROLES.some(r => r.key === demoRole)) {
      handleDemoLogin(demoRole as DemoRoleKey);
      // Clean URL so refresh doesn't re-trigger
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function handleDemoLogin(role: DemoRoleKey) {
    setError('');
    setDemoLoggingIn(role);

    try {
      const res = await fetch('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Acceso demo desactivado. Contacta con el administrador.');
        }
        if (res.status === 400) {
          throw new Error('Rol no permitido para demo.');
        }
        if (res.status === 429) {
          throw new Error('Demasiados intentos. Espera un momento.');
        }
        const err = await res.json();
        throw new Error(err.message || 'Error en demo-login');
      }

      const data = await res.json();
      localStorage.setItem('kavana_dev_token', data.token);
      localStorage.setItem('kavana_tenant_id', data.tenantId);
      localStorage.setItem('kavana_user_id', data.userId);
      localStorage.setItem('kavana_role', data.role);
      localStorage.setItem('kavana_tenant_name', data.tenantName);
      localStorage.setItem('kavana_tenant_slug', 'demo');
      if (data.workstation_name) {
        localStorage.setItem('kavana_workstation_name', data.workstation_name);
      } else {
        localStorage.removeItem('kavana_workstation_name');
      }
      window.location.href = `/demo`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDemoLoggingIn(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const slug = tenantSlug.trim() || localStorage.getItem('kavana_tenant_slug') || '';

    try {
      const res = await fetch('/api/v1/auth/login-by-tenant', {
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
      if (data.workstation_name) {
        localStorage.setItem('kavana_workstation_name', data.workstation_name);
      } else {
        localStorage.removeItem('kavana_workstation_name');
      }
      window.location.href = `/${slug}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isClassic ? 'bg-gray-50 text-gray-900' : 'bg-gray-900 text-gray-100'}`}>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle onLight={isClassic} />
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

          {/* Demo role buttons */}
          <div className="space-y-3 mb-6">
            <p className={`text-sm font-medium text-center ${isClassic ? 'text-gray-700' : 'text-gray-300'}`}>
              Acceso rápido a la demo (sin credenciales)
            </p>
            <div className="space-y-2" role="group" aria-label="Roles de demo">
              {DEMO_ROLES.map(({ key, label, description }) => (
                <button
                  key={key}
                  type="button"
                  disabled={demoLoggingIn === key}
                  onClick={() => handleDemoLogin(key)}
                  className={`w-full text-left rounded-sm p-4 border transition-all active:scale-[0.99] flex items-center gap-3 ${
                    isClassic
                      ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600 text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                  aria-busy={demoLoggingIn === key}
                >
                  <span className={`font-bold text-base ${isClassic ? 'text-gray-900' : 'text-white'}`}>
                    {label}
                  </span>
                  <span className={`text-sm ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>
                    {description}
                  </span>
                  {demoLoggingIn === key && (
                    <span className="ml-auto animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className={`relative mb-6 ${isClassic ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className={`bg-white px-2 ${isClassic ? '' : 'bg-gray-800'}`}>
                O
              </span>
            </div>
          </div>

          {/* Foldable credentials form */}
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => setShowCredentials(!showCredentials)}
              className={`w-full flex items-center justify-between font-medium text-sm rounded-sm py-2 px-3 transition-colors ${
                isClassic
                  ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
              aria-expanded={showCredentials}
            >
              <span>Tengo cuenta propia</span>
              <svg
                className={`h-5 w-5 transition-transform ${showCredentials ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCredentials && (
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 animate-slide-down">
                <DemoWakeNotice isClassic={isClassic} />
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
                  className={`w-full font-bold py-3 px-4 rounded-sm transition-all active:scale-95 flex items-center justify-center gap-2 min-h-[64px] ${
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
            )}
          </div>
        </div>

        <div className={`p-4 text-center text-xs ${isClassic ? 'text-gray-500 border-t border-gray-100' : 'text-gray-400 border-t border-gray-700'}`}>
          &copy; 2026 KAVANA MANUFACTURING v1.0
        </div>
      </div>
    </div>
    <AiAdvisorFab />
    </>
  );
}
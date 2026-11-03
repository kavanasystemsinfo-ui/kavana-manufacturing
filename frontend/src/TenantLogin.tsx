import { useState, useEffect } from 'react';
import { useThemeStore } from './store/theme-store.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { DemoWakeNotice } from './components/DemoWakeNotice.js';
import { AiAdvisorFab } from './components/AiAdvisorFab.js';

interface TenantLoginProps {
  subdomain: string;
  onLogin: (
    token: string,
    tenantId: string,
    userId: string,
    role: string,
    tenantName: string,
    workstationName?: string | null,
  ) => void;
}

const DEMO_ROLES = [
  { key: 'operario', label: 'Operario', description: 'Registra producción en la tablet del puesto' },
  { key: 'supervisor', label: 'Supervisor', description: 'Ve la planta entera, paradas y OEE' },
  { key: 'administrador', label: 'Administrador', description: 'Configura puestos, usuarios y catálogos' },
] as const;

type DemoRoleKey = typeof DEMO_ROLES[number]['key'];

export function TenantLogin({ subdomain, onLogin }: TenantLoginProps) {
  const theme = useThemeStore((s) => s.theme);
  const isClassic = theme === 'classic';

  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [demoLoggingIn, setDemoLoggingIn] = useState<string | null>(null);

  useEffect(() => {
    void fetchTenant();
  }, [subdomain]);

  // Auto demo login from query param ?demo=<role> (only for demo subdomain)
  useEffect(() => {
    if (subdomain !== 'demo') return;
    const params = new URLSearchParams(window.location.search);
    const demoRole = params.get('demo');
    if (demoRole && DEMO_ROLES.some(r => r.key === demoRole)) {
      handleDemoLogin(demoRole as DemoRoleKey);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [subdomain]);

  async function fetchTenant() {
    try {
      const res = await fetch(`/api/v1/auth/tenant/${subdomain}`);
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

  async function handleDemoLogin(role: DemoRoleKey) {
    setError(null);
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
      if (data.workstation_name) {
        localStorage.setItem('kavana_workstation_name', data.workstation_name);
      } else {
        localStorage.removeItem('kavana_workstation_name');
      }
      onLogin(data.token, data.tenantId, data.userId, data.role, data.tenantName, data.workstation_name ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDemoLoggingIn(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/login-by-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, username: username.trim(), password }),
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
      if (data.workstation_name) {
        localStorage.setItem('kavana_workstation_name', data.workstation_name);
      } else {
        localStorage.removeItem('kavana_workstation_name');
      }
      onLogin(data.token, data.tenantId, data.userId, data.role, data.tenantName, data.workstation_name ?? null);
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
          <h1 className="text-2xl font-bold mb-2">Empresa no encontrada</h1>
          <p className={isClassic ? 'text-gray-500' : 'text-gray-400'}>El subdominio <strong>{subdomain}</strong> no está registrado.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`min-h-screen flex items-center justify-center ${isClassic ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'}`}>
        <div className="absolute top-4 right-4">
        <ThemeToggle onLight={isClassic} />
      </div>

      <div className={`w-full max-w-md rounded-xl border shadow-lg p-8 ${isClassic ? 'bg-white border-gray-200' : 'bg-gray-800/80 border-gray-700 backdrop-blur-sm'}`}>
        <div className="text-center mb-8">
          <div className="mb-4">
            <img src="/logo.png" alt="Kavana" className="h-12 mx-auto" />
          </div>
          <h1 className={`text-2xl font-bold ${isClassic ? 'text-gray-800' : 'text-white'}`}>{tenantName}</h1>
          <p className={`mt-1 ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Inicia sesión para continuar</p>
        </div>

        {/* Demo role buttons - only for demo subdomain */}
        {subdomain === 'demo' && (
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
        )}

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
                  autoFocus
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
                disabled={submitting || !username.trim() || !password.trim()}
                className={`w-full font-bold py-3 px-4 rounded-sm transition-all active:scale-95 flex items-center justify-center gap-2 min-h-[64px] ${
                  isClassic
                    ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-600/20'
                }`}
              >
                {submitting ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <span>Iniciar Sesión</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
    <AiAdvisorFab />
    </>
  );
}
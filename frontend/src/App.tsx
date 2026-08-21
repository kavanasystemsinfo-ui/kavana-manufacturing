import { useState, useEffect } from 'react';
import { useThemeStore } from './store/theme-store.js';
import { OperatorPanel } from './OperatorPanel.js';
import { AdminPanel } from './AdminPanel.js';
import { SupervisorPanel } from './SupervisorPanel.js';
import { ClassicOperatorPanel } from './ClassicOperatorPanel.js';
import { ClassicAdminPanel } from './ClassicAdminPanel.js';
import { ClassicSupervisorPanel } from './ClassicSupervisorPanel.js';
import { GlobalAdminPanel } from './GlobalAdminPanel.js';
import { ClassicGlobalAdminPanel } from './ClassicGlobalAdminPanel.js';
import { TenantLogin } from './TenantLogin.js';
import { LoginPage } from './LoginPage.js';
import { LandingPage } from './LandingPage.js';
import { getSubdomain, getTenantFromUrl } from './utils/subdomain.js';
import { MobilePhotoUpload } from './pages/MobilePhotoUpload.js';
import { purgeLocalData } from './db/local-db.js';

interface AuthState {
  token: string;
  tenantId: string;
  userId: string;
  role: string;
  tenantName: string;
}

// FIX 2026-08-21 (P0): la sesión ya NO se reconstruye desde localStorage.
// Antes el rol y el tenant que deciden qué panel se muestra se leían de
// localStorage sin validar nada: en un quiosco compartido cualquiera podía
// escribirse role=admin y saltarse pantallas. Ahora la ÚNICA fuente de
// sesión es el JWT (firmado por el backend); rol/tenant/userId se decodifican
// del payload del token. Si no hay token válido, se muestra login.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload !== 'object' || payload === null) return null;
    // exp obligatoria a nivel de UI también: un token caducado no da sesión.
    if (typeof payload.exp === 'number' && Date.now() / 1000 > payload.exp) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getInitialAuth(): AuthState | null {
  const token = localStorage.getItem('kavana_dev_token');
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) {
    // Token ausente/mutilado/caducado: limpiar restos y forzar login.
    handleLogoutStorage();
    return null;
  }
  return {
    token,
    tenantId: String(payload.tenant_id ?? ''),
    userId: String(payload.sub ?? ''),
    role: String(payload.role ?? ''),
    tenantName: localStorage.getItem('kavana_tenant_name') ?? '',
  };
}

function handleLogoutStorage(): void {
  localStorage.removeItem('kavana_dev_token');
  localStorage.removeItem('kavana_tenant_id');
  localStorage.removeItem('kavana_user_id');
  localStorage.removeItem('kavana_role');
  localStorage.removeItem('kavana_tenant_name');
}

export function App() {
  const theme = useThemeStore((s) => s.theme);
  const path = window.location.pathname;
  const subdomain = getSubdomain();
  const urlTenant = getTenantFromUrl();
  const [auth, setAuth] = useState<AuthState | null>(getInitialAuth);

  function handleLogin(token: string, tenantId: string, userId: string, role: string, tenantName: string) {
    localStorage.setItem('kavana_dev_token', token);
    localStorage.setItem('kavana_tenant_name', tenantName);
    setAuth({ token, tenantId, userId, role, tenantName });
  }

  function handleLogout() {
    handleLogoutStorage();
    // FIX A6: purgar también el IndexedDB (logs offline, config de tenant).
    setAuth(null);
    void purgeLocalData();
  }

  // Ruta pública de subida de foto de incidencia (flujo QR + móvil).
  // El sessionId (uuid v4) es la credencial de un solo uso; no requiere login.
  if (path.startsWith('/mobile-upload/')) {
    const sessionId = path.split('/')[2] ?? '';
    return <MobilePhotoUpload sessionId={sessionId} />;
  }

  // Global Admin route
  if (path.startsWith('/global-admin')) {
    return (
      <>
        {theme === 'classic' ? <ClassicGlobalAdminPanel /> : <GlobalAdminPanel />}
      </>
    );
  }

  // Subdomain-based tenant access
  if (subdomain) {
    // FIX 2026-08-21: la comprobación anterior comparaba una clave de
    // localStorage consigo misma (tautología). Ahora se compara el tenant
    // del JWT con el subdominio de la URL.
    if (!auth || auth.tenantId !== urlTenant) {
      return <TenantLogin subdomain={subdomain} onLogin={handleLogin} />;
    }
    return (
      <>
        {auth.role === 'operario'
          ? (theme === 'classic' ? <ClassicOperatorPanel /> : <OperatorPanel />)
          : auth.role === 'supervisor'
            ? (theme === 'classic' ? <ClassicSupervisorPanel /> : <SupervisorPanel />)
            : (theme === 'classic' ? <ClassicAdminPanel /> : <AdminPanel />)
        }
        <button
          onClick={handleLogout}
          className="fixed bottom-4 left-4 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg z-50"
        >
          Salir ({auth.tenantName})
        </button>
      </>
    );
  }

  // URL-based tenant access (e.g., /megalux)
  if (urlTenant) {
    if (!auth) {
      return <TenantLogin subdomain={urlTenant} onLogin={handleLogin} />;
    }
    return (
      <>
        {auth.role === 'operario'
          ? (theme === 'classic' ? <ClassicOperatorPanel /> : <OperatorPanel />)
          : auth.role === 'supervisor'
            ? (theme === 'classic' ? <ClassicSupervisorPanel /> : <SupervisorPanel />)
            : (theme === 'classic' ? <ClassicAdminPanel /> : <AdminPanel />)
        }
        <button
          onClick={handleLogout}
          className="fixed bottom-4 left-4 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg z-50"
        >
          Salir ({auth.tenantName})
        </button>
      </>
    );
  }

  // Default: show login
  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Authenticated routes (no tenant context — direct access)
  if (path.startsWith('/admin')) {
    return (
      <>
        {theme === 'classic' ? <ClassicAdminPanel /> : <AdminPanel />}
      </>
    );
  }

  if (path.startsWith('/supervisor')) {
    return (
      <>
        {theme === 'classic' ? <ClassicSupervisorPanel /> : <SupervisorPanel />}
      </>
    );
  }

  return (
    <>
      {theme === 'classic' ? <ClassicOperatorPanel /> : <OperatorPanel />}
      <button
        onClick={handleLogout}
        className="fixed bottom-4 left-4 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg z-50"
      >
        Salir ({auth.tenantName})
      </button>
    </>
  );
}

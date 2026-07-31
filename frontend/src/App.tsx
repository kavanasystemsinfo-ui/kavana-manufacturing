import { useState, useEffect } from 'react';
import { useThemeStore } from './store/theme-store.js';
import { ThemeToggle } from './components/ThemeToggle.js';
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

interface AuthState {
  token: string;
  tenantId: string;
  userId: string;
  role: string;
  tenantName: string;
}

function getInitialAuth(): AuthState | null {
  const token = localStorage.getItem('kavana_dev_token');
  const tenantId = localStorage.getItem('kavana_tenant_id');
  const userId = localStorage.getItem('kavana_user_id');
  const role = localStorage.getItem('kavana_role');
  const tenantName = localStorage.getItem('kavana_tenant_name');
  if (token && tenantId && userId && role) {
    return { token, tenantId, userId, role, tenantName: tenantName ?? '' };
  }
  return null;
}

export function App() {
  const theme = useThemeStore((s) => s.theme);
  const path = window.location.pathname;
  const subdomain = getSubdomain();
  const urlTenant = getTenantFromUrl();
  const [auth, setAuth] = useState<AuthState | null>(getInitialAuth);

  function handleLogin(token: string, tenantId: string, userId: string, role: string, tenantName: string) {
    localStorage.setItem('kavana_tenant_name', tenantName);
    setAuth({ token, tenantId, userId, role, tenantName });
  }

  function handleLogout() {
    localStorage.removeItem('kavana_dev_token');
    localStorage.removeItem('kavana_tenant_id');
    localStorage.removeItem('kavana_user_id');
    localStorage.removeItem('kavana_role');
    localStorage.removeItem('kavana_tenant_name');
    setAuth(null);
  }

  // Global Admin route
  if (path.startsWith('/global-admin')) {
    return (
      <>
        {theme === 'classic' ? <ClassicGlobalAdminPanel /> : <GlobalAdminPanel />}
        <ThemeToggle variant="floating" />
      </>
    );
  }

  // Subdomain-based tenant access
  if (subdomain) {
    if (!auth || auth.tenantId !== localStorage.getItem('kavana_tenant_id')) {
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
        <ThemeToggle variant="floating" />
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
        <ThemeToggle variant="floating" />
        <button
          onClick={handleLogout}
          className="fixed bottom-4 left-4 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg z-50"
        >
          Salir ({auth.tenantName})
        </button>
      </>
    );
  }

  // Default: show landing page or login
  if (!auth) {
    if (path === '/' || path === '') {
      // On manufacturing subdomain, show login directly
      if (window.location.hostname === 'www.manufacturing.kavanasystems.com') {
        return <LoginPage onLogin={handleLogin} />;
      }
      return <LandingPage />;
    }
    return <LoginPage onLogin={handleLogin} />;
  }

  // Authenticated routes (no tenant context — direct access)
  if (path.startsWith('/admin')) {
    return (
      <>
        {theme === 'classic' ? <ClassicAdminPanel /> : <AdminPanel />}
        <ThemeToggle variant="floating" />
      </>
    );
  }

  if (path.startsWith('/supervisor')) {
    return (
      <>
        {theme === 'classic' ? <ClassicSupervisorPanel /> : <SupervisorPanel />}
        <ThemeToggle variant="floating" />
      </>
    );
  }

  return (
    <>
      {theme === 'classic' ? <ClassicOperatorPanel /> : <OperatorPanel />}
      <ThemeToggle variant="floating" />
      <button
        onClick={handleLogout}
        className="fixed bottom-4 left-4 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg z-50"
      >
        Salir ({auth.tenantName})
      </button>
    </>
  );
}

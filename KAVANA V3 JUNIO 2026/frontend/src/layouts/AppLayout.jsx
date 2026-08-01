import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, PackageCheck, ShieldCheck, BarChart3, Settings, BrainCircuit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useUI } from '../contexts/UIContext.jsx';

const roleConfig = {
  operator: {
    label: 'Operario',
    icon: PackageCheck,
    nav: [
      { label: 'Producción', to: '/operator' },
      { label: 'Material', to: '/operator/material' },
      { label: 'Calidad', to: '/operator/quality' }
    ]
  },
  supervisor: {
    label: 'Supervisor',
    icon: ShieldCheck,
    nav: [
      { label: 'Planta', to: '/supervisor' },
      { label: 'Stock', to: '/supervisor/stock' },
      { label: 'Mantenimiento', to: '/supervisor/maintenance' }
    ]
  },
  manager: {
    label: 'Gerencia',
    icon: BarChart3,
    nav: [
      { label: 'Dashboard', to: '/manager' },
      { label: 'KPIs', to: '/manager/kpis' },
      { label: 'Costes', to: '/manager/costs' }
    ]
  },
  admin: {
    label: 'Administración',
    icon: Settings,
    nav: [
      { label: 'Configuración', to: '/admin' },
      { label: 'Catálogo', to: '/admin/catalog' },
      { label: 'Usuarios', to: '/admin/users' }
    ]
  }
};

export function AppLayout({ role = 'operator' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const config = roleConfig[role] || roleConfig.operator;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-kavana-navy text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-white/10 bg-slate-950/95 transition-all duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link to="/" className="text-lg font-black uppercase tracking-widest text-kavana-copper">
            KAVANA V3
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-sm border border-white/10 px-3 py-1 text-xs uppercase text-slate-300"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-1 p-4">
          {config.nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`block rounded-sm px-3 py-2 text-sm font-bold uppercase tracking-wide ${
                location.pathname === item.to
                  ? 'bg-kavana-copper text-white'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            {config.label}
          </div>
          <div className="mb-3 text-sm font-bold">{user?.username || 'Usuario KAVANA'}</div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex w-full items-center gap-2 rounded-sm border border-white/10 px-3 py-2 text-sm font-bold uppercase text-slate-200 hover:bg-white/10"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className={`transition-all duration-200 ${sidebarOpen ? 'pl-72' : 'pl-0'}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/80 px-5 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-sm border border-white/10 p-2 text-slate-200 hover:bg-white/10"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <BrainCircuit size={20} className="text-kavana-copper" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-300">
              {config.label}
            </span>
          </div>
        </header>

        <main className="p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

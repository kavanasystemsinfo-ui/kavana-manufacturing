import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    tenantSlug: 'kavana',
    username: 'admin',
    password: ''
  });
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      await login(form);
      navigate('/operator');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo iniciar sesión');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-kavana-navy px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-sm border border-white/10 bg-slate-950 p-8 shadow-2xl"
      >
        <h1 className="text-3xl font-black uppercase tracking-widest text-kavana-copper">
          KAVANA V3
        </h1>
        <p className="mt-2 text-sm font-bold uppercase tracking-wide text-slate-400">
          MES industrial modular
        </p>

        {error && <div className="mt-5 rounded-sm border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Tenant</span>
            <input
              value={form.tenantSlug}
              onChange={(event) => setForm({ ...form, tenantSlug: event.target.value })}
              className="mt-2 w-full rounded-sm border border-white/10 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-kavana-copper"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Usuario</span>
            <input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              className="mt-2 w-full rounded-sm border border-white/10 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-kavana-copper"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Contraseña</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="mt-2 w-full rounded-sm border border-white/10 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-kavana-copper"
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-sm bg-kavana-copper px-4 py-3 font-black uppercase tracking-widest text-white transition hover:bg-orange-500"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

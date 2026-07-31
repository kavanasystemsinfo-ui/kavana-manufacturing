import { useState } from 'react';

const products = [
  {
    name: 'Kavana Manufacturing',
    tag: 'MES Industrial',
    desc: 'Sistema de ejecución de manufactura multi-tenant con offline-first, AI Advisor, OEE y trazabilidad completa para plantas de producción.',
    url: 'https://kavana-systems-v3-frontend.vercel.app',
    github: 'https://github.com/kavanasystemsinfo-ui/kavana-systems-v3',
    features: ['Multi-tenant RLS', 'Offline-first', 'AI Industrial', '225 tests'],
  },
  {
    name: 'CleanStock',
    tag: 'Trazabilidad de Stock',
    desc: 'SaaS de trazabilidad de consumo para empresas de limpieza con centros descentralizados. Recuento físico desde app móvil + dashboard supervisor.',
    url: 'https://cleanstock.kavanasystems.com',
    github: 'https://github.com/kavanasystemsinfo-ui/clean-stock',
    features: ['Multi-tenant', 'App móvil', 'Alertas stock', '26 tests'],
  },
  {
    name: 'RouteFleet',
    tag: 'Gestión de Repartos',
    desc: 'Plataforma PWA para gestión de repartos con firma digital (POD), escaneo OCR de albaranes y panel de control con KPIs en tiempo real.',
    url: 'https://routefleet.kavanasystems.com',
    github: 'https://github.com/kavanasystemsinfo-ui/kavana-RouteFleet',
    features: ['PWA offline', 'Firma digital', 'OCR', '40 tests'],
  },
];

export function LandingPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
      {/* Hero */}
      <header className="border-b border-gray-800/60">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h1 className="text-5xl font-black tracking-tight md:text-7xl">
            Kavana<span className="text-orange-500"> Systems</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
            Ingeniería de producto con criterio arquitectónico.
            SaaS multi-tenant, offline-first, TDD, ADRs.
          </p>
          <a
            href="https://github.com/kavanasystemsinfo-ui"
            target="_blank"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gray-800 px-6 py-3 text-sm font-bold text-gray-300 ring-1 ring-gray-700 hover:bg-gray-700 hover:text-white"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            GitHub
          </a>
        </div>
      </header>

      {/* Products */}
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.name}
              className="group relative rounded-2xl border border-gray-800 bg-gray-900/50 p-6 transition hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/5"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{p.name}</h2>
                  <span className="text-xs font-bold uppercase tracking-widest text-orange-400">{p.tag}</span>
                </div>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-gray-400">{p.desc}</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {p.features.map((f) => (
                  <span key={f} className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300">
                    {f}
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                <a
                  href={p.url}
                  target="_blank"
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500"
                >
                  Demo
                </a>
                <a
                  href={p.github}
                  target="_blank"
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-bold text-gray-300 hover:bg-gray-700"
                >
                  Código
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Philosophy */}
        <div className="mt-20 rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
          <h2 className="text-2xl font-bold text-white">Filosofía de Ingeniería</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: 'Problema primero', d: 'Cada tecnología se justifica por el problema que resuelve, no por su popularidad' },
              { t: 'Decisiones humanas', d: 'El arquitecto diseña. La IA ejecuta como par de programación' },
              { t: 'TDD + ADRs', d: 'Tests antes del código. Decisiones documentadas con alternativas evaluadas' },
              { t: 'Transparencia', d: '✅ implementado · 🚧 pendiente · ❌ descartado — todo visible' },
            ].map((item) => (
              <div key={item.t} className="rounded-xl bg-gray-800/50 p-4">
                <p className="font-bold text-orange-400">{item.t}</p>
                <p className="mt-1 text-sm text-gray-400">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800/60 py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Jorge Adán Rodríguez — Kavana Systems</p>
        <p className="mt-1">Ingeniería de producto con criterio arquitectónico</p>
      </footer>
    </div>
  );
}

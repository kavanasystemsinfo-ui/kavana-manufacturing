import { useEffect, useState } from 'react';
import { callApiWithTimeout } from '../api/client.js';
import { useThemeStore } from '../store/theme-store.js';

interface OeeByWorkstation {
  workstation_id: string;
  workstation_name: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

interface OeeSummary {
  workstation_id: string;
  workstation_name: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  total_production_time_ms: number;
  total_downtime_ms: number;
  total_produced: number;
  total_defects: number;
  period_start: string;
  period_end: string;
}

export function OeeDashboard() {
  const theme = useThemeStore((s) => s.theme);
  const isClassic = theme === 'classic';

  const [data, setData] = useState<OeeByWorkstation[]>([]);
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [summary, setSummary] = useState<OeeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const startDate = `${today}T00:00:00Z`;
  const endDate = `${today}T23:59:59Z`;

  useEffect(() => {
    void loadOeeData();
  }, []);

  useEffect(() => {
    if (selectedWs) {
      void loadSummary(selectedWs);
    }
  }, [selectedWs]);

  async function loadOeeData() {
    try {
      setLoading(true);
      const result = await callApiWithTimeout<OeeByWorkstation[]>(
        `/oee/workstations?startDate=${startDate}&endDate=${endDate}`,
      );
      setData(result ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading OEE data');
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary(wsId: string) {
    try {
      const result = await callApiWithTimeout<OeeSummary>(
        `/oee/workstation/${wsId}?startDate=${startDate}&endDate=${endDate}`,
      );
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading summary');
    }
  }

  function getOeeColor(oee: number): string {
    if (oee >= 85) return isClassic ? 'text-green-600' : 'text-green-400';
    if (oee >= 60) return isClassic ? 'text-amber-600' : 'text-amber-400';
    return isClassic ? 'text-red-600' : 'text-red-400';
  }

  function getOeeBg(oee: number): string {
    if (oee >= 85) return isClassic ? 'bg-green-50 border-green-200' : 'bg-green-900/30 border-green-500/30';
    if (oee >= 60) return isClassic ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/30 border-amber-500/30';
    return isClassic ? 'bg-red-50 border-red-200' : 'bg-red-900/30 border-red-500/30';
  }

  if (loading) {
    return (
      <div className={`p-6 ${isClassic ? 'bg-slate-50' : 'bg-kavana-dark'}`}>
        <div className="flex items-center gap-3">
          <div className={`h-4 w-4 animate-spin rounded-full border-2 ${isClassic ? 'border-slate-300 border-t-blue-600' : 'border-kavana-steel border-t-kavana-orange'}`}></div>
          <p className={`text-sm ${isClassic ? 'text-slate-500' : 'text-slate-400'}`}>Cargando dashboard OEE...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-lg border ${isClassic ? 'bg-red-50 border-red-200 text-red-700' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
        <p className="font-medium">Error: {error}</p>
        <button onClick={() => { setError(null); void loadOeeData(); }} className="mt-2 text-sm underline">Reintentar</button>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${isClassic ? 'bg-slate-50 text-slate-900' : 'bg-kavana-dark text-slate-100'}`}>
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-bold ${isClassic ? 'text-slate-900' : 'text-white'}`}>
          Dashboard OEE
        </h2>
        <span className={`text-xs ${isClassic ? 'text-slate-500' : 'text-slate-400'}`}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* OEE Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((ws) => (
          <button
            key={ws.workstation_id}
            onClick={() => setSelectedWs(ws.workstation_id)}
            className={`rounded-xl border p-4 text-left transition-all hover:scale-[1.02] ${
              selectedWs === ws.workstation_id
                ? `ring-2 ${isClassic ? 'ring-blue-500' : 'ring-kavana-orange'} ${getOeeBg(ws.oee)}`
                : `${getOeeBg(ws.oee)}`
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-bold ${isClassic ? 'text-slate-800' : 'text-white'}`}>{ws.workstation_name}</h3>
              <span className={`text-2xl font-black ${getOeeColor(ws.oee)}`}>{ws.oee}%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className={isClassic ? 'text-slate-500' : 'text-slate-400'}>Disponibilidad</p>
                <p className={`font-bold ${getOeeColor(ws.availability)}`}>{ws.availability}%</p>
              </div>
              <div>
                <p className={isClassic ? 'text-slate-500' : 'text-slate-400'}>Rendimiento</p>
                <p className={`font-bold ${getOeeColor(ws.performance)}`}>{ws.performance}%</p>
              </div>
              <div>
                <p className={isClassic ? 'text-slate-500' : 'text-slate-400'}>Calidad</p>
                <p className={`font-bold ${getOeeColor(ws.quality)}`}>{ws.quality}%</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {data.length === 0 && (
        <div className={`rounded-xl border p-8 text-center ${isClassic ? 'bg-white border-slate-200 text-slate-500' : 'bg-kavana-surface/50 border-kavana-steel/30 text-slate-400'}`}>
          No hay datos OEE disponibles. Active el módulo OEE en administración y registre bloques de trabajo.
        </div>
      )}

      {/* Detail Panel */}
      {summary && (
        <div className={`rounded-xl border p-6 ${isClassic ? 'bg-white border-slate-200' : 'bg-kavana-surface/50 border-kavana-steel/30'}`}>
          <h3 className={`text-lg font-bold mb-4 ${isClassic ? 'text-slate-900' : 'text-white'}`}>
            {summary.workstation_name} — Detalle
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className={`rounded-lg p-3 ${isClassic ? 'bg-slate-50' : 'bg-kavana-dark/50'}`}>
              <p className={`text-xs ${isClassic ? 'text-slate-500' : 'text-slate-400'}`}>Producción total</p>
              <p className={`text-lg font-bold ${isClassic ? 'text-slate-900' : 'text-white'}`}>{summary.total_produced}</p>
            </div>
            <div className={`rounded-lg p-3 ${isClassic ? 'bg-slate-50' : 'bg-kavana-dark/50'}`}>
              <p className={`text-xs ${isClassic ? 'text-slate-500' : 'text-slate-400'}`}>Defectos</p>
              <p className={`text-lg font-bold ${summary.total_defects > 0 ? 'text-red-500' : isClassic ? 'text-slate-900' : 'text-white'}`}>{summary.total_defects}</p>
            </div>
            <div className={`rounded-lg p-3 ${isClassic ? 'bg-slate-50' : 'bg-kavana-dark/50'}`}>
              <p className={`text-xs ${isClassic ? 'text-slate-500' : 'text-slate-400'}`}>Tiempo producción</p>
              <p className={`text-lg font-bold ${isClassic ? 'text-slate-900' : 'text-white'}`}>
                {Math.round(summary.total_production_time_ms / 3600000 * 10) / 10}h
              </p>
            </div>
            <div className={`rounded-lg p-3 ${isClassic ? 'bg-slate-50' : 'bg-kavana-dark/50'}`}>
              <p className={`text-xs ${isClassic ? 'text-slate-500' : 'text-slate-400'}`}>Tiempo parada</p>
              <p className={`text-lg font-bold ${summary.total_downtime_ms > 0 ? 'text-amber-500' : isClassic ? 'text-slate-900' : 'text-white'}`}>
                {Math.round(summary.total_downtime_ms / 3600000 * 10) / 10}h
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

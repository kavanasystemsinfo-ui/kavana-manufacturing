import { useState, useEffect, useCallback, useRef } from 'react';
import { listIncidencias, createIncidencia, updateIncidencia, deleteIncidencia, getIncidenciaStats } from '../../../api/admin-entities.js';
import type { Incidencia, IncidenciaStats } from '../../../api/admin-entities.js';


const thStyle = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200';
const tdStyle = 'px-4 py-3 text-sm border-b border-gray-100';
const inputStyle = 'w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-kavana-orange focus:border-kavana-orange outline-none bg-white text-gray-900';
const selectStyle = 'border border-gray-300 rounded px-2 py-1 text-sm focus:ring-kavana-orange focus:border-kavana-orange outline-none bg-white';
const btnSm = 'text-xs font-medium px-2 py-1 rounded transition-colors';
const btnPrimary = btnSm + ' bg-kavana-orange text-white hover:bg-kavana-orange-light';
const btnSuccess = btnSm + ' bg-green-600 text-white hover:bg-green-700';
const btnDanger = btnSm + ' text-red-600 hover:text-red-800 hover:bg-red-50';
const btnGhost = btnSm + ' text-gray-500 hover:text-gray-700 hover:bg-gray-100';
const roleLabels: Record<string, string> = { tenant_admin: 'Admin', supervisor: 'Supervisor', operario: 'Operario' };
const catLabels: Record<string, string> = { peon_especialista: 'Pe\u00f3n Especialista', oficial_3: 'Oficial 3', oficial_2: 'Oficial 2', oficial_1: 'Oficial 1' };

export function IncidenciasTab() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [stats, setStats] = useState<IncidenciaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const emptyForm = { title: '', type: 'produccion', severity: 'media', description: '', assigned_to: '' };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      const [data, s] = await Promise.all([listIncidencias(), getIncidenciaStats()]);
      setIncidencias(data);
      setStats(s);
    } catch { setError('Error al cargar incidencias'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    try {
      await createIncidencia({
        reported_by: '00000000-0000-0000-0000-000000000000',
        type: form.type,
        severity: form.severity,
        title: form.title,
        description: form.description || undefined,
        assigned_to: form.assigned_to || undefined,
      });
      setShowCreate(false);
      setForm(emptyForm);
      void load();
    } catch { setError('Error al crear incidencia'); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await updateIncidencia(editing, {
        type: form.type,
        severity: form.severity,
        title: form.title,
        description: form.description || undefined,
      });
      setEditing(null);
      setForm(emptyForm);
      void load();
    } catch { setError('Error al actualizar incidencia'); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateIncidencia(id, { status });
      void load();
    } catch { setError('Error al cambiar estado'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta incidencia?')) return;
    try {
      await deleteIncidencia(id);
      void load();
    } catch { setError('Error al eliminar incidencia'); }
  };

  const startEdit = (inc: Incidencia) => {
    setEditing(inc.id);
    setForm({
      title: inc.title,
      type: inc.type,
      severity: inc.severity,
      description: inc.description || '',
      assigned_to: inc.assigned_to || '',
    });
  };

  const filtered = filterStatus === 'all' ? incidencias : incidencias.filter(i => i.status === filterStatus);

  const getSeverityBadge = (severity: string) => {
    if (severity === 'critica') return 'bg-red-100 text-red-800 border border-red-200';
    if (severity === 'alta') return 'bg-orange-100 text-orange-800 border border-orange-200';
    if (severity === 'media') return 'bg-amber-100 text-amber-800 border border-amber-200';
    return 'bg-gray-100 text-gray-500 border border-gray-200';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'abierto') return 'bg-red-100 text-red-800 border border-red-200';
    if (status === 'en_progreso') return 'bg-orange-100 text-orange-800 border border-orange-200';
    if (status === 'resuelto') return 'bg-green-100 text-green-800 border border-green-200';
    return 'bg-gray-100 text-gray-500 border border-gray-200';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { calidad: 'Calidad', seguridad: 'Seguridad', mantenimiento: 'Mantenimiento', produccion: 'Producción', otro: 'Otro' };
    return labels[type] || type;
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando incidencias...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Incidencias</h2>
          <p className="text-sm text-kavana-orange mt-1">Registro y seguimiento de incidencias</p>
        </div>
        <button onClick={() => { setShowCreate(true); setEditing(null); setForm(emptyForm); }} className="px-4 py-2 bg-kavana-orange hover:bg-kavana-orange-light rounded-lg text-sm font-medium transition-colors text-white">
          + Nueva Incidencia
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.abiertas}</div>
            <div className="text-xs text-red-600">Abiertas</div>
          </div>
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-3 text-center">
            <div className="text-2xl font-bold text-kavana-orange">{stats.en_progreso}</div>
            <div className="text-xs text-kavana-orange">En Progreso</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.resueltas + stats.cerradas}</div>
            <div className="text-xs text-green-600">Resueltas</div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {['all', 'abierto', 'en_progreso', 'resuelto', 'cerrado'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-kavana-orange text-white' : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200'}`}
          >
            {s === 'all' ? 'Todas' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((inc) => (
          <div key={inc.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-900 font-semibold">{inc.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityBadge(inc.severity)}`}>
                    {inc.severity}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(inc.status)}`}>
                    {inc.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {getTypeLabel(inc.type)} · {new Date(inc.created_at).toLocaleDateString()}
                </div>
                {inc.description && (
                  <div className="text-sm text-gray-600 mb-2">{inc.description}</div>
                )}
              </div>
              <div className="flex gap-1 ml-4">
                <button onClick={() => startEdit(inc)} className="text-gray-400 hover:text-kavana-orange text-sm px-1">✏️</button>
                <button onClick={() => handleDelete(inc.id)} className="text-gray-400 hover:text-red-600 text-sm px-1">🗑️</button>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              {inc.status === 'abierto' && (
                <button onClick={() => handleStatusChange(inc.id, 'en_progreso')} className="px-3 py-1 bg-kavana-orange hover:bg-kavana-orange-light rounded text-xs font-medium transition-colors text-white">
                  Iniciar
                </button>
              )}
              {inc.status === 'en_progreso' && (
                <button onClick={() => handleStatusChange(inc.id, 'resuelto')} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition-colors text-white">
                  Resolver
                </button>
              )}
              {inc.status === 'resuelto' && (
                <button onClick={() => handleStatusChange(inc.id, 'cerrado')} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-medium transition-colors text-gray-700">
                  Cerrar
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No hay incidencias{filterStatus !== 'all' ? ` con estado "${filterStatus}"` : ''}.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreate || editing) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editing ? 'Editar Incidencia' : 'Nueva Incidencia'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Título *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputStyle} placeholder="Descripción breve..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={selectStyle}>
                    <option value="produccion">Producción</option>
                    <option value="calidad">Calidad</option>
                    <option value="seguridad">Seguridad</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Severidad</label>
                  <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={selectStyle}>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputStyle} rows={3} placeholder="Detalles adicionales..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowCreate(false); setEditing(null); setForm(emptyForm); }} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
                <button onClick={editing ? handleUpdate : handleCreate} disabled={!form.title} className="flex-1 px-4 py-2 bg-kavana-orange hover:bg-kavana-orange-light rounded-lg text-sm font-medium transition-colors disabled:opacity-50 text-white">
                  {editing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



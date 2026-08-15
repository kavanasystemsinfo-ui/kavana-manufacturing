import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { listIncidencias, createIncidencia, updateIncidencia, deleteIncidencia, getIncidenciaStats } from '../../api/admin-entities.js';
import type { Incidencia, IncidenciaStats } from '../../api/admin-entities.js';
import { IncidenciaPhoto } from '../IncidenciaPhoto.js';

interface Props { isClassic?: boolean; }

export function IncidenciasTab({ isClassic }: Props) {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [stats, setStats] = useState<IncidenciaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const emptyForm = { title: '', type: 'produccion', description: '', assigned_to: '' };
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
      description: inc.description || '',
      assigned_to: inc.assigned_to || '',
    });
  };

  const filtered = filterStatus === 'all' ? incidencias : incidencias.filter(i => i.status === filterStatus);

  const getStatusBadge = (status: string) => {
    if (status === 'abierto') return 'bg-red-900/50 text-red-300 border border-red-700';
    if (status === 'en_progreso') return 'bg-blue-900/50 text-blue-300 border border-blue-700';
    if (status === 'resuelto') return 'bg-emerald-900/50 text-emerald-300 border border-emerald-700';
    return 'bg-gray-700/50 text-gray-400 border border-gray-600';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { calidad: 'Calidad', seguridad: 'Seguridad', mantenimiento: 'Mantenimiento', produccion: 'Producción', otro: 'Otro' };
    return labels[type] || type;
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando incidencias...</div>;

  const btn = isClassic ? "text-xs font-medium px-2 py-1 rounded transition-colors" : "text-sm";
  const btnPrimary = isClassic ? btn + " bg-kavana-orange text-white hover:bg-kavana-orange-light" : "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors";
  const btnSuccess = isClassic ? btn + " bg-green-600 text-white hover:bg-green-700" : "px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors";
  const btnGhost = isClassic ? btn + " text-gray-500 hover:text-gray-700 hover:bg-gray-100" : "px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors";
  const btnDanger = isClassic ? btn + " text-red-600 hover:text-red-800 hover:bg-red-50" : "text-red-400 hover:text-red-300 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Incidencias</h2>
          <p className="text-sm text-indigo-400/80 mt-1">Registro y seguimiento de incidencias</p>
        </div>
        <button onClick={() => { setShowCreate(true); setEditing(null); setForm(emptyForm); }} className={isClassic ? btnPrimary : "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"}>
          + Nueva Incidencia
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
          <div className="bg-red-900/20 rounded-lg border border-red-700 p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.abiertas}</div>
            <div className="text-xs text-red-300">Abiertas</div>
          </div>
          <div className="bg-blue-900/20 rounded-lg border border-blue-700 p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.en_progreso}</div>
            <div className="text-xs text-blue-300">En Progreso</div>
          </div>
          <div className="bg-emerald-900/20 rounded-lg border border-emerald-700 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.resueltas + stats.cerradas}</div>
            <div className="text-xs text-emerald-300">Resueltas</div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {['all', 'abierto', 'en_progreso', 'resuelto', 'cerrado'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}
          >
            {s === 'all' ? 'Todas' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((inc) => (
          <div key={inc.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-indigo-500/50 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-semibold">{inc.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(inc.status)}`}>
                    {inc.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  {getTypeLabel(inc.type)} · {new Date(inc.created_at).toLocaleDateString()}
                </div>
                {inc.description && (
                  <div className="text-sm text-gray-300 mb-2">{inc.description}</div>
                )}
                {inc.photo_data_url && (
                  <div className="mt-3">
                    <IncidenciaPhoto src={inc.photo_data_url} alt="Evidencia de la incidencia" isClassic={isClassic} />
                  </div>
                )}
              </div>
              <div className="flex gap-1 ml-4">
                <button onClick={() => startEdit(inc)} className="text-gray-500 hover:text-indigo-400 text-sm px-1">✏️</button>
                <button onClick={() => handleDelete(inc.id)} className="text-gray-500 hover:text-red-400 text-sm px-1">🗑️</button>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              {inc.status === 'abierto' && (
                <button onClick={() => handleStatusChange(inc.id, 'en_progreso')} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors">
                  Iniciar
                </button>
              )}
              {inc.status === 'en_progreso' && (
                <button onClick={() => handleStatusChange(inc.id, 'resuelto')} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-medium transition-colors">
                  Resolver
                </button>
              )}
              {inc.status === 'resuelto' && (
                <button onClick={() => handleStatusChange(inc.id, 'cerrado')} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs font-medium transition-colors">
                  Cerrar
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay incidencias{filterStatus !== 'all' ? ` con estado "${filterStatus}"` : ''}.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreate || editing) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">{editing ? 'Editar Incidencia' : 'Nueva Incidencia'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Título *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Descripción breve..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="produccion">Producción</option>
                    <option value="calidad">Calidad</option>
                    <option value="seguridad">Seguridad</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Severidad (asignada por el supervisor)</label>
                  <p className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-500">—</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" rows={3} placeholder="Detalles adicionales..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowCreate(false); setEditing(null); setForm(emptyForm); }} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
                <button onClick={editing ? handleUpdate : handleCreate} disabled={!form.title} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
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


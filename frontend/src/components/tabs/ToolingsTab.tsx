import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { listToolings, createTooling, updateTooling, deleteTooling, incrementToolingByPieces, fetchToolingTypes, saveToolingTypes } from '../../api/admin-entities.js';
import type { Tooling } from '../../api/admin-entities.js';

interface Props { isClassic?: boolean; }

export function ToolingsTab({ isClassic }: Props) {
  const [toolings, setToolings] = useState<Tooling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toolingTypes, setToolingTypes] = useState<string[]>(['troquel', 'molde', 'punzon', 'rodillo', 'matriz', 'otro']);
  const [showTypeConfig, setShowTypeConfig] = useState(false);
  const [newType, setNewType] = useState('');
  const [produceModal, setProduceModal] = useState<string | null>(null);
  const [producePieces, setProducePieces] = useState('');
  const emptyForm = { code: '', name: '', type: 'troquel', location: '', max_cycles: '100000', warning_pct: '80', cycles_per_piece: '0', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      const [data, types] = await Promise.all([listToolings(), fetchToolingTypes()]);
      setToolings(data);
      if (types.length > 0) setToolingTypes(types);
    } catch { setError('Error al cargar utillajes'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    try {
      await createTooling({
        code: form.code,
        name: form.name,
        type: form.type,
        location: form.location || undefined,
        max_cycles: parseInt(form.max_cycles) || 100000,
        warning_pct: parseInt(form.warning_pct) || 80,
        cycles_per_piece: parseFloat(form.cycles_per_piece) || 0,
        notes: form.notes || undefined,
      });
      setShowCreate(false);
      setForm(emptyForm);
      void load();
    } catch { setError('Error al crear utillaje'); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await updateTooling(editing, {
        code: form.code,
        name: form.name,
        type: form.type,
        location: form.location || undefined,
        max_cycles: parseInt(form.max_cycles) || 100000,
        warning_pct: parseInt(form.warning_pct) || 80,
        cycles_per_piece: parseFloat(form.cycles_per_piece) || 0,
        notes: form.notes || undefined,
      });
      setEditing(null);
      setForm(emptyForm);
      void load();
    } catch { setError('Error al actualizar utillaje'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este utillaje?')) return;
    try {
      await deleteTooling(id);
      void load();
    } catch { setError('Error al eliminar utillaje'); }
  };

  const handleProduce = async () => {
    if (!produceModal || !producePieces) return;
    try {
      await incrementToolingByPieces(produceModal, parseInt(producePieces));
      setProduceModal(null);
      setProducePieces('');
      void load();
    } catch { setError('Error al registrar producción'); }
  };

  const startEdit = (t: Tooling) => {
    setEditing(t.id);
    setForm({
      code: t.code,
      name: t.name,
      type: t.type,
      location: t.location || '',
      max_cycles: String(t.max_cycles),
      warning_pct: String(t.warning_pct),
      cycles_per_piece: String(t.cycles_per_piece),
      notes: t.notes || '',
    });
  };

  const saveTypes = async () => {
    try {
      await saveToolingTypes(toolingTypes);
      setShowTypeConfig(false);
    } catch { setError('Error al guardar tipos'); }
  };

  const addType = () => {
    if (newType && !toolingTypes.includes(newType)) {
      setToolingTypes([...toolingTypes, newType]);
      setNewType('');
    }
  };

  const removeType = (type: string) => {
    setToolingTypes(toolingTypes.filter(t => t !== type));
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'activo') return 'bg-emerald-900/50 text-emerald-300 border border-emerald-700';
    if (status === 'mantenimiento') return 'bg-amber-900/50 text-amber-300 border border-amber-700';
    return 'bg-gray-700/50 text-gray-400 border border-gray-600';
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando utillajes...</div>;

  const btn = isClassic ? "text-xs font-medium px-2 py-1 rounded transition-colors" : "text-sm";
  const btnPrimary = isClassic ? btn + " bg-kavana-orange text-white hover:bg-kavana-orange-light" : "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors";
  const btnSuccess = isClassic ? btn + " bg-green-600 text-white hover:bg-green-700" : "px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors";
  const btnGhost = isClassic ? btn + " text-gray-500 hover:text-gray-700 hover:bg-gray-100" : "px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors";
  const btnDanger = isClassic ? btn + " text-red-600 hover:text-red-800 hover:bg-red-50" : "text-red-400 hover:text-red-300 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Utillajes</h2>
          <p className="text-sm text-indigo-400/80 mt-1">Herramienta de estimación preventiva de vida útil</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTypeConfig(true)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
            ⚙️ Configurar tipos
          </button>
          <button onClick={() => { setShowCreate(true); setEditing(null); setForm(emptyForm); }} className={isClassic ? btnPrimary : "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"}>
            + Nuevo Utillaje
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg px-4 py-3 text-blue-300 text-sm">
        ℹ️ Los ciclos se estiman automáticamente: <code className="bg-blue-800/30 px-1 rounded">cycles_per_piece × piezas_producidas</code>. Registra producción con el botón ▶ Producción.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {toolings.map((t) => {
          const pct = t.max_cycles > 0 ? (t.current_cycles / t.max_cycles) * 100 : 0;
          const isWarning = pct >= t.warning_pct;
          return (
            <div key={t.id} className={`bg-gray-800 rounded-xl border p-5 transition-all hover:border-indigo-500/50 ${isWarning ? 'border-amber-500' : 'border-gray-700'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{t.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{t.code} · {t.type}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(t)} className="text-gray-500 hover:text-indigo-400 text-sm px-1">✏️</button>
                  <button onClick={() => handleDelete(t.id)} className="text-gray-500 hover:text-red-400 text-sm px-1">🗑️</button>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Ciclos: {Math.round(t.current_cycles).toLocaleString()} / {t.max_cycles.toLocaleString()}</span>
                  <span className={isWarning ? 'text-amber-400 font-semibold' : ''}>{Math.round(pct)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${getProgressColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>

              {t.cycles_per_piece > 0 && (
                <div className="text-xs text-gray-400 mb-3">
                  <span className="text-indigo-400">⚡ {t.cycles_per_piece} ciclos/pieza</span>
                  {t.estimated_pieces !== null && t.estimated_pieces > 0 && (
                    <span className="ml-2">· ~{t.estimated_pieces.toLocaleString()} piezas</span>
                  )}
                </div>
              )}

              {t.location && (
                <div className="text-xs text-gray-500 mb-3">📍 {t.location}</div>
              )}

              <button
                onClick={() => { setProduceModal(t.id); setProducePieces(''); }}
                className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-medium transition-colors"
              >
                ▶ Producción
              </button>
            </div>
          );
        })}
        {toolings.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No hay utillajes configurados. Crea uno para empezar.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreate || editing) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">{editing ? 'Editar Utillaje' : 'Nuevo Utillaje'}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Código *</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="TROQ-001" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
                  <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: troquel, molde, punzón..." />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Troquel principal línea 1" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ubicación</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Línea 1, Zona A" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Vida útil (ciclos)</label>
                  <input type="number" value={form.max_cycles} onChange={(e) => setForm({ ...form, max_cycles: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Alerta %</label>
                  <input type="number" value={form.warning_pct} onChange={(e) => setForm({ ...form, warning_pct: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Ciclos/pieza</label>
                  <input type="number" step="0.1" value={form.cycles_per_piece} onChange={(e) => setForm({ ...form, cycles_per_piece: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <p className="text-[10px] text-gray-500 mt-1">Se multiplica × piezas producidas</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" rows={2} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowCreate(false); setEditing(null); setForm(emptyForm); }} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
                <button onClick={editing ? handleUpdate : handleCreate} disabled={!form.code || !form.name} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {editing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Produce Modal */}
      {produceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-2">Registrar Producción</h3>
            <p className="text-sm text-gray-400 mb-4">Las piezas se multiplican automáticamente por los ciclos/pieza del utillaje.</p>
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-1 block">Piezas producidas</label>
              <input type="number" value={producePieces} onChange={(e) => setProducePieces(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="100" autoFocus />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setProduceModal(null)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
              <button onClick={handleProduce} disabled={!producePieces || parseInt(producePieces) <= 0} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Type Config Modal */}
      {showTypeConfig && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Configurar Tipos de Utillaje</h3>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {toolingTypes.map(t => (
                  <span key={t} className="bg-indigo-900/50 text-indigo-300 border border-indigo-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {t}
                    <button onClick={() => removeType(t)} className="text-indigo-400 hover:text-white">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newType} onChange={(e) => setNewType(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addType()} className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nuevo tipo..." />
                <button onClick={addType} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">+</button>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowTypeConfig(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
                <button onClick={saveTypes} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

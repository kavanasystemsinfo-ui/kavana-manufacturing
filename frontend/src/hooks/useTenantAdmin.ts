import { useEffect, useState } from 'react';
import { useHmiStore } from '../store/hmi-store.js';
import { fetchCapabilities, toggleModuleCapability, updateCustomFieldsSchema, type TenantCapabilities } from '../api/admin.js';

export interface EditableField {
  key: string; label: string; type: 'string' | 'number' | 'boolean'; required: boolean;
}

export function useTenantAdmin() {
  const [capabilities, setCapabilities] = useState<TenantCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [editableFields, setEditableFields] = useState<EditableField[]>([]);
  const { loadCapabilities } = useHmiStore();

  async function loadData() {
    try { setIsLoading(true); setError(null); setCapabilities(await fetchCapabilities()); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void loadData(); }, []);

  useEffect(() => {
    if (capabilities) {
      const s = (capabilities.customFieldsSchema as any)?.production_orders;
      setEditableFields(Array.isArray(s?.fields) ? s.fields : []);
    }
  }, [capabilities]);

  async function handleToggle(key: string, enabled: boolean) {
    if (key === 'core_mes') return;
    try { setIsMutating(true); setError(null); await toggleModuleCapability(key, !enabled); await loadCapabilities(); await loadData(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setIsMutating(false); }
  }

  const handleKeyChange = (i: number, v: string) => { const u = [...editableFields]; u[i].key = v.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,''); setEditableFields(u); };
  const handleTypeChange = (i: number, v: 'string'|'number'|'boolean') => { const u = [...editableFields]; u[i].type = v; setEditableFields(u); };
  const handleRequiredChange = (i: number, v: boolean) => { const u = [...editableFields]; u[i].required = v; setEditableFields(u); };
  const handleAddField = () => setEditableFields([...editableFields, { key:'', label:'', type:'string', required:false }]);
  const handleRemoveField = (i: number) => setEditableFields(editableFields.filter((_,j) => j !== i));

  const handleSaveSchema = async () => {
    const keys = editableFields.map(f => f.key.trim());
    if (keys.some(k => !k)) { setError('Todas las llaves deben tener nombre.'); return; }
    if (new Set(keys).size !== keys.length) { setError('No se permiten llaves duplicadas.'); return; }
    try { setIsMutating(true); setError(null); await updateCustomFieldsSchema({ fields:editableFields }); await loadCapabilities(); await loadData(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setIsMutating(false); }
  };

  const moduleNames: Record<string, string> = {
    core_mes:'Core MES Production', oee_monitoring:'OEE & Machine Monitoring',
    quality_assurance:'Quality Assurance', cost_management:'Cost & Capex Management',
    materials_management:'Materials Management',
  };

  return { capabilities, error, setError, isLoading, isMutating, editableFields, setEditableFields, loadData,
    handleToggle, handleKeyChange, handleTypeChange, handleRequiredChange,
    handleAddField, handleRemoveField, handleSaveSchema, moduleNames };
}

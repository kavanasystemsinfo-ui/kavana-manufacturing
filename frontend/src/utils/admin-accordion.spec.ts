import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the accordion logic in isolation - extracted from AdminPanel
interface TabGroup {
  key: string;
  label: string;
  icon: string;
  tabs: { key: string; label: string; module?: string }[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    key: 'gestion',
    label: 'Gestión',
    icon: '⚙️',
    tabs: [
      { key: 'users', label: 'Usuarios' },
      { key: 'workstations', label: 'Puestos' },
      { key: 'models', label: 'Modelos' },
      { key: 'materials', label: 'Materias Primas' },
    ],
  },
  {
    key: 'produccion',
    label: 'Producción',
    icon: '🏭',
    tabs: [
      { key: 'orders', label: 'Órdenes' },
      { key: 'toolings', label: 'Utillajes' },
    ],
  },
  {
    key: 'calidad',
    label: 'Calidad',
    icon: '🔍',
    tabs: [
      { key: 'incidencias', label: 'Incidencias' },
      { key: 'quality', label: 'Calidad', module: 'quality_assurance' },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: '📊',
    tabs: [
      { key: 'oee', label: 'OEE', module: 'oee_monitoring' },
      { key: 'cost', label: 'Costes', module: 'cost_management' },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    icon: '🔧',
    tabs: [
      { key: 'modules', label: 'Módulos' },
      { key: 'custom-fields', label: 'Campos' },
      { key: 'auditoria', label: 'Auditoría' },
    ],
  },
];

const STORAGE_KEY = 'kavana_admin_expanded_groups';

function getInitialExpanded(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // localStorage no disponible: fallback a estado por defecto
  }
  // Por defecto: solo "Gestión" expandido
  return { gestion: true };
}

function filterVisibleTabs(group: TabGroup, capabilities: Record<string, { enabled: boolean }> | null): { key: string; label: string; module?: string }[] {
  return group.tabs.filter((t) => !t.module || capabilities?.[t.module]?.enabled === true);
}

describe('AdminPanel — accordion logic (mobile <768px) + localStorage persist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('getInitialExpanded devuelve solo Gestión expandido por defecto', () => {
    const result = getInitialExpanded();
    expect(result.gestion).toBe(true);
    expect(result.produccion).toBeUndefined();
    expect(result.calidad).toBeUndefined();
    expect(result.analytics).toBeUndefined();
    expect(result.configuracion).toBeUndefined();
  });

  it('getInitialExpanded restaura estado desde localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ gestion: true, produccion: true, calidad: false }));
    const result = getInitialExpanded();
    expect(result.gestion).toBe(true);
    expect(result.produccion).toBe(true);
    expect(result.calidad).toBe(false);
  });

  it('getInitialExpanded maneja localStorage corrupto', () => {
    localStorage.setItem(STORAGE_KEY, 'no-es-json-valido');
    const result = getInitialExpanded();
    expect(result.gestion).toBe(true);
  });

  it('filterVisibleTabs filtra tabs por módulo habilitado', () => {
    const capabilities = {
      quality_assurance: { enabled: true },
      oee_monitoring: { enabled: false },
      cost_management: { enabled: true },
    };

    const calidadGroup = TAB_GROUPS.find(g => g.key === 'calidad')!;
    const visible = filterVisibleTabs(calidadGroup, capabilities);
    expect(visible.map(v => v.key)).toEqual(['incidencias', 'quality']);

    const analyticsGroup = TAB_GROUPS.find(g => g.key === 'analytics')!;
    const visibleAnalytics = filterVisibleTabs(analyticsGroup, capabilities);
    expect(visibleAnalytics.map(v => v.key)).toEqual(['cost']);
  });

  it('filterVisibleTabs sin capabilities muestra tabs sin módulo', () => {
    const gestionGroup = TAB_GROUPS.find(g => g.key === 'gestion')!;
    const visible = filterVisibleTabs(gestionGroup, null);
    expect(visible.map(v => v.key)).toEqual(['users', 'workstations', 'models', 'materials']);
  });

  it('TAB_GROUPS tiene exactamente 5 grupos', () => {
    expect(TAB_GROUPS.length).toBe(5);
    const keys = TAB_GROUPS.map(g => g.key);
    expect(keys).toEqual(['gestion', 'produccion', 'calidad', 'analytics', 'configuracion']);
  });

  it('cada grupo tiene al menos un tab visible por defecto', () => {
    const capabilities = {
      quality_assurance: { enabled: true },
      oee_monitoring: { enabled: true },
      cost_management: { enabled: true },
    };
    TAB_GROUPS.forEach(group => {
      const visible = filterVisibleTabs(group, capabilities);
      expect(visible.length).toBeGreaterThan(0);
    });
  });

  it('simula toggle de grupo: expandir colapsado', () => {
    let expandedGroups = getInitialExpanded(); // { gestion: true }
    expect(expandedGroups.produccion).toBeFalsy();

    // Simular click en producción
    expandedGroups = { ...expandedGroups, produccion: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedGroups));

    const restored = getInitialExpanded();
    expect(restored.produccion).toBe(true);
    expect(restored.gestion).toBe(true);
  });

  it('simula toggle de grupo: colapsar expandido', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ gestion: true, produccion: true }));
    let expandedGroups = getInitialExpanded();
    expect(expandedGroups.gestion).toBe(true);

    // Simular click en gestión
    expandedGroups = { ...expandedGroups, gestion: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedGroups));

    const restored = getInitialExpanded();
    expect(restored.gestion).toBe(false);
    expect(restored.produccion).toBe(true);
  });

  it('localStorage persiste múltiples grupos expandidos', () => {
    const state = { gestion: true, produccion: true, calidad: true, analytics: false, configuracion: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const restored = getInitialExpanded();
    expect(restored.gestion).toBe(true);
    expect(restored.produccion).toBe(true);
    expect(restored.calidad).toBe(true);
    expect(restored.analytics).toBe(false);
    expect(restored.configuracion).toBe(true);
  });
});
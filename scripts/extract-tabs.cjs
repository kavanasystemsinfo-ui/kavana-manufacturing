const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../frontend/src');
const adminPath = path.join(src, 'AdminPanel.tsx');
const tabsDir = path.join(src, 'components/tabs');
if (!fs.existsSync(tabsDir)) fs.mkdirSync(tabsDir, { recursive: true });

const content = fs.readFileSync(adminPath, 'utf8');
const lines = content.split('\n');

// Mapa de pestañas: { name, start (1-indexed), end (1-indexed), componentName }
const tabs = [];
let currentTab = null;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^function (\w+Tab)\b/);
  if (m && ['UsersTab','WorkstationsTab','ModelsTab','OrdersTab','ModulesTab','CustomFieldsTab','ToolingsTab','IncidenciasTab','MaterialsTab'].includes(m[1])) {
    if (currentTab) { currentTab.end = i - 1; tabs.push(currentTab); }
    currentTab = { componentName: m[1], startLine: i + 1 };
  }
}
if (currentTab) { currentTab.end = lines.length; tabs.push(currentTab); }

// Determinar qué imports necesita cada pestaña analizando su cuerpo
function getTabImports(tabLines, name) {
  const body = tabLines.join('\n');
  const needs = new Set();
  // React hooks
  if (body.includes('useState(')) needs.add('useState');
  if (body.includes('useCallback(')) needs.add('useCallback');
  if (body.includes('useEffect(')) needs.add('useEffect');
  if (body.includes('useRef(')) needs.add('useRef');
  if (body.includes('useMemo(')) needs.add('useMemo');
  const reactHooks = [...needs].join(', ');
  const reactImport = reactHooks ? `import { ${reactHooks} } from 'react';` : '';

  // Tipos
  const typesNeeded = [];
  if (body.includes(': User[') || body.includes('<User>') || body.includes('User[]')) typesNeeded.push('User');
  if (body.includes(': Workstation[') || body.includes('<Workstation>') || body.includes('Workstation[]')) typesNeeded.push('Workstation');
  if (body.includes(': ManufacturingModel[') || body.includes('ManufacturingModel')) typesNeeded.push('ManufacturingModel');
  if (body.includes(': Order[') || body.includes('Order')) typesNeeded.push('Order');
  if (body.includes(': Incidencia[') || body.includes('Incidencia')) typesNeeded.push('Incidencia');
  if (body.includes(': Tooling[') || body.includes('Tooling')) typesNeeded.push('Tooling');
  if (body.includes(': Material[') || body.includes('Material')) typesNeeded.push('Material');
  if (body.includes(': BomItem[') || body.includes('BomItem')) typesNeeded.push('BomItem');
  const typeImport = typesNeeded.length ? `import type { ${typesNeeded.join(', ')} } from '../api/admin-entities.js';` : '';

  // API functions
  const apiFuncs = [];
  const allApiFuncs = [
    'listUsers','createUser','updateUser','deleteUser',
    'listWorkstations','createWorkstation','updateWorkstation','deleteWorkstation',
    'listModels','createModel','updateModel','deleteModel',
    'listOrders','updateOrder',
    'listIncidencias','createIncidencia','updateIncidencia','deleteIncidencia',
    'listToolings','createTooling','updateTooling','deleteTooling',
    'listMaterials','createMaterial','updateMaterial','deleteMaterial',
    'listBomItems','createBomItem','deleteBomItem',
    'fetchTenants','createTenant','toggleTenantStatus','updateTenantModules',
    'getCustomFields','updateCustomFields','validateCustomFields',
  ];
  for (const f of allApiFuncs) {
    if (body.includes(f + '(')) apiFuncs.push(f);
  }
  const apiImport = apiFuncs.length ? `import { ${apiFuncs.join(', ')} } from '../api/admin-entities.js';` : '';

  // Help content
  const helpVars = [];
  const helpMap = {
    'UsersTab': 'USERS_HELP', 'WorkstationsTab': 'WORKSTATIONS_HELP', 'ModelsTab': 'MODELS_HELP',
    'OrdersTab': 'ORDERS_HELP', 'ModulesTab': 'MODULES_HELP', 'CustomFieldsTab': 'CUSTOM_FIELDS_HELP',
  };
  if (helpMap[name]) helpVars.push(helpMap[name]);

  const needsHelpModal = body.includes('HelpModal');
  const helpModalImport = needsHelpModal ? "import { HelpModal } from './HelpModal.js';" : '';
  const helpContentImport = helpVars.length ? `import { ${helpVars.join(', ')} } from '../help-content.js';` : '';

  // Chained effects
  const needsFetchAll = body.includes('fetchAllChained');

  return [
    reactImport,
    '', typeImport, '', apiImport, '', helpModalImport, helpContentImport,
  ].filter(Boolean).join('\n');
}

// Escribir cada pestaña y generar el nuevo AdminPanel
let newAdminPanel = lines.slice(0, 104).join('\n') + '\n\n'; // hasta antes de UsersTab
let newImports = `import { UsersTab } from './components/tabs/UsersTab.js';\nimport { WorkstationsTab } from './components/tabs/WorkstationsTab.js';\nimport { ModelsTab } from './components/tabs/ModelsTab.js';\nimport { OrdersTab } from './components/tabs/OrdersTab.js';\nimport { ModulesTab } from './components/tabs/ModulesTab.js';\nimport { CustomFieldsTab } from './components/tabs/CustomFieldsTab.js';\nimport { ToolingsTab } from './components/tabs/ToolingsTab.js';\nimport { IncidenciasTab } from './components/tabs/IncidenciasTab.js';\nimport { MaterialsTab } from './components/tabs/MaterialsTab.js';\n`;

let created = 0;
for (const tab of tabs) {
  const tabLines = lines.slice(tab.startLine - 1, tab.end);
  const imports = getTabImports(tabLines, tab.componentName);
  
  const filePath = path.join(tabsDir, tab.componentName + '.tsx');
  fs.writeFileSync(filePath, imports + '\n\n' + 'export ' + tabLines.join('\n') + '\n', 'utf8');
  created++;
  console.log(`  ✅ ${tab.componentName}.tsx (${tabLines.length} líneas)`);
}

// Reconstruir AdminPanel con imports + función principal + AiAdvisorFab + cierre
const adminImportsEnd = 30; // después de los imports originales
let adminRest = lines.slice(adminImportsEnd, 104).join('\n'); // línea 31-104 = AdminPanel() shell
adminRest = adminRest.replace(/import \{.*\} from '.*admin-entities.*'/g, '').trim();

// Insertar nuevos imports después de los existentes (antes del export function)
const importInsertIdx = 30; // posición aproximada
let final = lines.slice(0, importInsertIdx).join('\n') + '\n';
final += [newImports].join('\n') + '\n';
final += adminRest + '\n';
final += [''].join('\n');

fs.writeFileSync(adminPath, final, 'utf8');
console.log(`\n✅ AdminPanel.tsx regenerado (${final.split('\n').length} líneas)`);
console.log(`📦 ${created} pestañas extraídas a ${tabsDir}/`);

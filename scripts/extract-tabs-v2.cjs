const fs = require('fs');
const path = require('path');
const src = path.resolve(__dirname, '../frontend/src');
const adminPath = path.join(src, 'AdminPanel.tsx');
const tabsDir = path.join(src, 'components/tabs');
fs.mkdirSync(tabsDir, { recursive: true });

const content = fs.readFileSync(adminPath, 'utf8');
const lines = content.split('\n');
const tabs = [
  { fn: 'UsersTab',      start: 106, end: 335 },
  { fn: 'WorkstationsTab', start: 338, end: 483 },
  { fn: 'ModelsTab',      start: 485, end: 672 },
  { fn: 'OrdersTab',      start: 674, end: 731 },
  { fn: 'ModulesTab',     start: 733, end: 805 },
  { fn: 'CustomFieldsTab',start: 807, end: 892 },
  { fn: 'ToolingsTab',    start: 894, end: 1212 },
  { fn: 'IncidenciasTab', start: 1214, end: 1470 },
  { fn: 'MaterialsTab',   start: 1471, end: 1667 },
];

// Cada pestaña: extraer sus líneas tal cual (sin modificar)
for (const tab of tabs) {
  const tabLines = lines.slice(tab.start - 1, tab.end);
  const body = tabLines.join('\n');
  
  // Análisis rápido de imports que necesita
  const needs = [];
  if (/useState\(|useCallback\(|useEffect\(|useRef\(|useMemo\(/.test(body)) needs.push("import { useState, useEffect, useCallback, useRef, useMemo } from 'react';");
  if (/User/.test(body)) needs.push("import type { User, Workstation, ManufacturingModel, Order, Tooling, Incidencia, IncidenciaStats, TenantCapabilities, Material, BomItem } from '../../api/admin-entities.js';");
  
  // API functions: intentar detectar las que se usan
  const apiFuncs = [];
  for (const f of ['listUsers','createUser','updateUser','deleteUser','listWorkstations','createWorkstation','updateWorkstation','deleteWorkstation','listManufacturingModels','createManufacturingModel','updateManufacturingModel','deleteManufacturingModel','listOrders','updateOrder','fetchCapabilities','toggleModuleCapability','updateCustomFieldsSchema','validateCustomFields','getCustomFields','listToolings','createTooling','updateTooling','deleteTooling','incrementToolingByPieces','fetchToolingTypes','saveToolingTypes','listIncidencias','createIncidencia','updateIncidencia','deleteIncidencia','getIncidenciaStats','listMaterials','createMaterial','updateMaterial','deleteMaterial','listBomItems','createBomItem','deleteBomItem','fetchTenants','createTenant','toggleTenantStatus','updateTenantModules']) {
    if (body.includes(f + '(')) apiFuncs.push(f);
  }
  if (apiFuncs.length) needs.push(`import { ${apiFuncs.join(', ')} } from '../../api/admin-entities.js';`);
  
  if (body.includes('HelpModal')) needs.push("import { HelpModal } from '../HelpModal.js';");
  
  // Help vars
  const h = { UsersTab: 'USERS_HELP', WorkstationsTab: 'WORKSTATIONS_HELP', ModelsTab: 'MODELS_HELP', OrdersTab: 'ORDERS_HELP', ModulesTab: 'MODULES_HELP', CustomFieldsTab: 'CUSTOM_FIELDS_HELP' };
  if (h[tab.fn]) needs.push(`import { ${h[tab.fn]} } from '../../help-content.js';`);

  // EditableField (solo CustomFieldsTab)
  if (tab.fn === 'CustomFieldsTab') {
    needs.push('\ninterface EditableField { key: string; label: string; type: "string" | "number" | "boolean"; required: boolean; }');
  }

  const file = needs.join('\n') + '\n\n' + tabLines.map(l => l.startsWith('function ') ? 'export ' + l : l).join('\n');
  fs.writeFileSync(path.join(tabsDir, tab.fn + '.tsx'), file);
  console.log(`  ${tab.fn}.tsx (${tabLines.length} líneas)`);
}

// Reconstruir AdminPanel: líneas 1-105 + imports de pestañas + resto (funciones de pestaña eliminadas)
const head = lines.slice(0, 105).join('\n'); // hasta antes de UsersTab
const tail = ''; // las pestañas ya no van inline

// Añadir imports de las pestañas después de los imports existentes
const importInsert = '\n// ── Pestañas extraídas a components/tabs/ ──\n' +
  tabs.map(t => `import { ${t.fn} } from './components/tabs/${t.fn}.js';`).join('\n');

// Insertar los nuevos imports después de la línea 20 (último import de help-content)
const newContent = lines.slice(0, 20).join('\n') + '\n' + importInsert + '\n' + lines.slice(20, 105).join('\n');
fs.writeFileSync(adminPath, newContent);

console.log(`\nAdminPanel: ${newContent.split('\n').length} líneas`);
console.log(`${tabs.length} pestañas en ${tabsDir}/`);

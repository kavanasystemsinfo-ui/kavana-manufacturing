const fs = require('fs');
const path = require('path');
const src = path.resolve(__dirname, '../frontend/src');
const adminPath = path.join(src, 'ClassicAdminPanel.tsx');
const tabsDir = path.join(src, 'components/tabs/classic');
fs.mkdirSync(tabsDir, { recursive: true });

const content = fs.readFileSync(adminPath, 'utf8');
const lines = content.split('\n');
const tabs = [
  { fn: 'UsersTab',      start: 128, end: 351 },
  { fn: 'WorkstationsTab', start: 352, end: 495 },
  { fn: 'ModelsTab',      start: 496, end: 662 },
  { fn: 'OrdersTab',      start: 663, end: 725 },
  { fn: 'ModulesTab',     start: 726, end: 801 },
  { fn: 'CustomFieldsTab',start: 802, end: 886 },
  { fn: 'ToolingsTab',    start: 887, end: 1206 },
  { fn: 'IncidenciasTab', start: 1207, end: 1463 },
  { fn: 'MaterialsTab',   start: 1464, end: 1598 },
];

for (const tab of tabs) {
  const tabLines = lines.slice(tab.start - 1, tab.end);
  const body = tabLines.join('\n');
  
  const needs = [];
  if (/useState\(|useCallback\(|useEffect\(|useRef\(/.test(body)) needs.push("import { useState, useEffect, useCallback, useRef } from 'react';");
  
  const apiFuncs = [];
  for (const f of ['listUsers','createUser','updateUser','deleteUser','listWorkstations','createWorkstation','updateWorkstation','deleteWorkstation','listManufacturingModels','createManufacturingModel','updateManufacturingModel','deleteManufacturingModel','listOrders','updateOrder','fetchCapabilities','toggleModuleCapability','updateCustomFieldsSchema','listToolings','createTooling','updateTooling','deleteTooling','incrementToolingByPieces','fetchToolingTypes','saveToolingTypes','listIncidencias','createIncidencia','updateIncidencia','deleteIncidencia','getIncidenciaStats','listMaterials','createMaterial','updateMaterial','deleteMaterial','listBomItems','createBomItem','deleteBomItem']) {
    if (body.includes(f + '(')) apiFuncs.push(f);
  }
  if (apiFuncs.length) needs.push(`import { ${apiFuncs.join(', ')} } from '../../../api/admin-entities.js';`);

  // Add type imports based on what the body uses
  const types = [];
  for (const t of ['User','Workstation','ManufacturingModel','Order','Tooling','Incidencia','IncidenciaStats','TenantCapabilities','Material','BomItem']) {
    if (body.includes('<' + t + '>') || body.includes(': ' + t + '[') || body.includes(t + '[]') || body.includes('as ' + t)) types.push(t);
  }
  if (types.length) needs.push(`import type { ${types.join(', ')} } from '../../../api/admin-entities.js';`);
  
  if (body.includes('HelpModal')) needs.push("import { HelpModal } from '../../HelpModal.js';");
  if (body.includes('useHmiStore')) needs.push("import { useHmiStore } from '../../../store/hmi-store.js';");
  
  const h = { UsersTab: 'USERS_HELP', WorkstationsTab: 'WORKSTATIONS_HELP', ModelsTab: 'MODELS_HELP', OrdersTab: 'ORDERS_HELP', ModulesTab: 'MODULES_HELP', CustomFieldsTab: 'CUSTOM_FIELDS_HELP' };
  if (h[tab.fn]) needs.push(`import { ${h[tab.fn]} } from '../../../help-content.js';`);

  if (tab.fn === 'CustomFieldsTab') needs.push('\ninterface EditableField { key: string; label: string; type: "string" | "number" | "boolean"; required: boolean; }');

  const file = needs.join('\n') + '\n\n' + tabLines.map(l => l.startsWith('function ') ? 'export ' + l : l).join('\n');
  fs.writeFileSync(path.join(tabsDir, tab.fn + '.tsx'), file);
  console.log(`  ${tab.fn}.tsx (${tabLines.length} líneas)`);
}

// Reconstruir ClassicAdminPanel: mantener imports originales + añadir imports de pestañas
const importInsert = '\n// ── Pestañas extraídas a components/tabs/classic/ ──\n' +
  tabs.map(t => `import { ${t.fn} } from './components/tabs/classic/${t.fn}.js';`).join('\n');

const newContent = lines.slice(0, 21).join('
') + '

' + importInsert + '
' + lines.slice(21, 127).join('
');
fs.writeFileSync(adminPath, newContent);

console.log(`\nClassicAdminPanel: ${newContent.split('\n').length} líneas, ${tabs.length} pestañas`);

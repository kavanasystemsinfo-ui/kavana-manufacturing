// Fusiona los 6 tabs restantes añadiendo isClassic prop y estilos condicionales.
// Cada tab resultante acepta { isClassic?: boolean } y usa estilos clásicos o dark.
const fs = require('fs');
const path = require('path');
const src = path.resolve(__dirname, '../frontend/src');
const tabsDir = path.join(src, 'components/tabs');
const classicDir = path.join(tabsDir, 'classic');

const remaining = ['WorkstationsTab', 'ModelsTab', 'ToolingsTab', 'IncidenciasTab', 'MaterialsTab', 'UsersTab'];

for (const name of remaining) {
  const darkPath = path.join(tabsDir, name + '.tsx');
  const classicPath = path.join(classicDir, name + '.tsx');
  if (!fs.existsSync(darkPath) || !fs.existsSync(classicPath)) continue;
  
  let dark = fs.readFileSync(darkPath, 'utf8');
  
  // 1. Add isClassic prop to function signature
  dark = dark.replace(
    `export function ${name}()`,
    `interface Props { isClassic?: boolean; }\n\nexport function ${name}({ isClassic }: Props)`
  );
  
  // 2. Replace all HelpModal instances to pass theme prop
  dark = dark.replace(
    /<HelpModal \{\.\.\.([A-Z_]+)\} \/>/g,
    '<HelpModal {...$1} theme={isClassic ? "classic" : undefined} />'
  );
  
  fs.writeFileSync(darkPath, dark);
  
  // 3. Update ClassicAdminPanel import
  let classicAdmin = fs.readFileSync(path.join(src, 'ClassicAdminPanel.tsx'), 'utf8');
  classicAdmin = classicAdmin.replace(
    `import { ${name} } from './components/tabs/classic/${name}.js';`,
    `import { ${name} } from './components/tabs/${name}.js';`
  );
  classicAdmin = classicAdmin.replace(
    new RegExp(`<${name} />`, 'g'),
    `<${name} isClassic />`
  );
  fs.writeFileSync(path.join(src, 'ClassicAdminPanel.tsx'), classicAdmin);
  
  // 4. Delete classic version
  const classicFile = path.join(classicDir, name + '.tsx');
  if (fs.existsSync(classicFile)) fs.unlinkSync(classicFile);
  
  console.log(`  ${name}: added isClassic prop + deleted classic`);
}
console.log('done');

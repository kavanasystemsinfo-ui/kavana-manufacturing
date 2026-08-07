// OrdersTab ya unificado. Los demás 8 tabs se unifican igual: aceptan
// isClassic?: boolean y usan estilos condicionales en el JSX.
//
// Enfoque: hacer que ClassicAdminPanel importe de components/tabs/ (no /classic/)
// y pase isClassic a cada tab. Los tabs de classic/ se eliminan tras la unificación.
//
// Este script aplica el patrón a los 8 tabs restantes de una sentada.

const fs = require('fs');
const path = require('path');
const src = path.resolve(__dirname, '../frontend/src');
const tabsDir = path.join(src, 'components/tabs');
const classicDir = path.join(tabsDir, 'classic');

const tabsToUnify = ['ModulesTab', 'CustomFieldsTab'];  // empezar con los más pequeños

for (const name of tabsToUnify) {
  const darkPath = path.join(tabsDir, name + '.tsx');
  const classicPath = path.join(classicDir, name + '.tsx');
  if (!fs.existsSync(darkPath) || !fs.existsSync(classicPath)) continue;
  
  let dark = fs.readFileSync(darkPath, 'utf8');
  
  // 1. Update function signature to accept isClassic prop
  dark = dark.replace(
    `export function ${name}()`,
    `interface Props { isClassic?: boolean; }\n\nexport function ${name}({ isClassic }: Props)`
  );
  
  // 2. Add HelpModal theme prop if HelpModal is used
  if (dark.includes('HelpModal') && !dark.includes('theme=')) {
    dark = dark.replace(
      /<HelpModal \{\.\.\.([A-Z_]+)\} \/>/g,
      '<HelpModal {...$1} theme={isClassic ? "classic" : undefined} />'
    );
  }
  
  fs.writeFileSync(darkPath, dark);
  console.log(`  updated ${name}.tsx`);
}

// Update ClassicAdminPanel to import from tabs/ (not classic/) for these
let classicAdmin = fs.readFileSync(path.join(src, 'ClassicAdminPanel.tsx'), 'utf8');
for (const name of tabsToUnify) {
  classicAdmin = classicAdmin.replace(
    `import { ${name} } from './components/tabs/classic/${name}.js';`,
    `import { ${name} } from './components/tabs/${name}.js';`
  );
  // Add isClassic prop
  classicAdmin = classicAdmin.replace(
    new RegExp(`<${name}\\s*/>`, 'g'),
    `<${name} isClassic />`
  );
  classicAdmin = classicAdmin.replace(
    new RegExp(`<${name}\\s*>`, 'g'),
    `<${name} isClassic>`
  );
  // Delete classic version
  const classicFile = path.join(classicDir, name + '.tsx');
  if (fs.existsSync(classicFile)) fs.unlinkSync(classicFile);
  console.log(`  deleted classic/${name}.tsx`);
}
fs.writeFileSync(path.join(src, 'ClassicAdminPanel.tsx'), classicAdmin);

console.log('\ndone');

const { Client } = require("pg");
const crypto = require("crypto");

const c = new Client({
  host: "ep-steep-cell-a21rlab1.eu-central-1.aws.neon.tech",
  port: 5432, database: "neondb",
  user: "neondb_owner",
  password: "npg_dqTRbj8nE2MB",
  ssl: { rejectUnauthorized: false }
});

function uuid() { return crypto.randomUUID(); }

async function main() {
  await c.connect();
  
  await c.query("DELETE FROM workstations WHERE tenant_id=1 AND id NOT IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')");
  await c.query("DELETE FROM manufacturing_models WHERE tenant_id=1");
  await c.query("DELETE FROM toolings WHERE tenant_id=1");
  await c.query("DELETE FROM incidencias WHERE tenant_id=1");
  console.log("Cleaned old data\n");

  // WORKSTATIONS
  const wsList = [
    ["Sierra de Corte Multi-hilo", "SC-01"],
    ["Limpieza Ultrasónica", "CL-01"],
    ["Texturizado Químico", "TX-01"],
    ["Horno de Difusión", "DF-01"],
    ["Línea PECVD", "PV-01"],
    ["Impresora de Contactos", "SP-01"],
    ["Horno de Sinterizado", "FR-01"],
    ["Stringer Automático", "ST-01"],
    ["Mesa de Layup", "LY-01"],
    ["Laminadora al Vacío", "LM-01"],
    ["Enmarcadora Automática", "FR-02"],
    ["Junction Box", "JB-01"],
    ["Inspección EL", "EL-01"],
    ["Flash Tester", "FT-01"],
    ["Test de Aislamiento", "HV-01"],
  ];
  for (const [name, code] of wsList) {
    await c.query("INSERT INTO workstations (id, tenant_id, name, code, status) VALUES ($1,1,$2,$3,'active')", [uuid(), name, code]);
  }
  console.log("15 workstations created");

  // MODELS
  const modList = [
    ["Panel Monocristalino 400W 72c", 12, "72 células M6 166mm | 400Wp | Eficiencia 20.1% | 22kg | Vidrio 3.2mm"],
    ["Panel Bifacial 550W 144hc", 8, "144 half-cells N-type | 550Wp | Eficiencia 21.8% | Marco negro"],
    ["Panel Policristalino 330W 60c", 15, "60 células poli | 330Wp | Eficiencia 18.5% | Bajo coste"],
    ["Panel TOPCon 450W 108hc", 10, "108 half-cells N-TOPCon | 450Wp | Eficiencia 22.5%"],
    ["Panel Flexible 200W ETFE", 6, "200Wp | 5.5kg | ETFE | Plegable"],
    ["Panel Vidrio-Vidrio 400W", 9, "Doble vidrio 2+2mm | 400Wp | 30 años"],
  ];
  for (const [name, rate, desc] of modList) {
    await c.query("INSERT INTO manufacturing_models (id, tenant_id, name, description, unit_of_measure, target_rate) VALUES ($1,1,$2,$3,'piezas/h',$4)", [uuid(), name, desc, rate]);
  }
  console.log("6 models created");

  // TOOLINGS
  const toolList = [
    ["TQ-001", "Troquel Célula M6 166mm", "troquel", 50000, 500000, 85],
    ["TQ-002", "Troquel Half-Cut M6", "troquel", 12000, 500000, 85],
    ["TQ-003", "Molde Marco 2278mm", "molde", 35000, 200000, 80],
    ["TQ-004", "Molde Marco 2465mm", "molde", 2000, 200000, 80],
    ["MS-001", "Máscara Serigrafía Ag", "utilaje", 15000, 100000, 90],
  ];
  for (const [code, name, type, cycles, max, warn] of toolList) {
    await c.query("INSERT INTO toolings (id, tenant_id, code, name, type, location, status, current_cycles, max_cycles, warning_pct, notes) VALUES ($1,1,$2,$3,$4,'Estante A','activo',$5,$6,$7,'')", [uuid(), code, name, type, cycles, max, warn]);
  }
  console.log("5 toolings created");

  await c.query("UPDATE tenants SET name='Fabrica de Placas Solares DEMO' WHERE id=1");
  console.log("Tenant renamed\n");

  for (const t of ["workstations","manufacturing_models","toolings"]) {
    const r = await c.query("SELECT COUNT(*) FROM " + t + " WHERE tenant_id=1");
    console.log("  " + t + ": " + r.rows[0].count);
  }
  await c.end();
  console.log("\n✅ Fabrica solar lista!");
}

main().catch(e => console.log("FATAL:", e.message.slice(0,200)));

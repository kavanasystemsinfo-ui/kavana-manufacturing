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
  
  await c.query("DELETE FROM manufacturing_models WHERE tenant_id=1");
  console.log("Cleaned models\n");

  // === MONOCRISTALINO STANDARD (Línea de células M6) ===
  const models = [
    // Serie Monocristalino Standard — 5BB, vidrio plateado
    ["Panel Monocristalino 330W 60c", 16, "60 células M6 5BB | 330Wp | Eficiencia 19.8% | Vidrio plateado 3.2mm | Marco plateado | 18.5kg | 1650x992mm"],
    ["Panel Monocristalino 350W 60c", 15, "60 células M6 5BB | 350Wp | Eficiencia 20.3% | Half-cut | Vidrio plateado | 18.8kg"],
    ["Panel Monocristalino 400W 72c", 12, "72 células M6 5BB | 400Wp | Eficiencia 20.1% | Vidrio plateado 3.2mm | Marco plateado | 22kg | 1956x992mm"],
    ["Panel Monocristalino 420W 72c", 11, "72 células M6 5BB | 420Wp | Eficiencia 20.8% | Half-cut | Vidrio plateado | 22.5kg"],
    ["Panel Monocristalino 450W 72c", 10, "72 células M6 9BB | 450Wp | Eficiencia 21.3% | Multi-busbar | Half-cut | Vidrio plateado"],
    
    // Serie Full Black — marco negro, backsheet negro
    ["Panel Full Black 360W 60c", 14, "60 células M6 5BB | 360Wp | Todo negro | Marco negro anodizado | Backsheet negro | 19kg"],
    ["Panel Full Black 410W 72c", 11, "72 células M6 5BB | 410Wp | Todo negro | Marco negro | Backsheet negro | 22.5kg"],
    ["Panel Full Black 440W 72c HC", 10, "72 half-cells M6 9BB | 440Wp | Todo negro | Alta eficiencia estética"],
    
    // Serie Bifacial — doble vidrio
    ["Panel Bifacial 500W 144hc", 8, "144 half-cells M6 | 500Wp (+25% trasera) | Vidrio-vidrio 2.0mm | Marco negro | 28kg"],
    ["Panel Bifacial 550W 144hc", 7, "144 half-cells M10 | 550Wp (+30% trasera) | Vidrio-vidrio 2.0mm | Sin marco | 31kg"],
    ["Panel Bifacial 600W 156hc", 6, "156 half-cells M10 | 600Wp (+30% trasera) | Vidrio-vidrio 2.5mm | Marco plata | 33kg"],
    
    // Serie N-Type TOPCon — alta eficiencia
    ["Panel TOPCon 430W 108hc", 9, "108 half-cells N-TOPCon | 430Wp | Eficiencia 22.1% | Vidrio plateado | 23kg"],
    ["Panel TOPCon 460W 108hc", 8, "108 half-cells N-TOPCon | 460Wp | Eficiencia 22.8% | Half-cut 9BB | Baja LID"],
    ["Panel TOPCon 580W 144hc", 6, "144 half-cells N-TOPCon | 580Wp | Eficiencia 22.5% | Bifacial | Gran escala"],
    
    // Serie Policristalino — bajo coste
    ["Panel Policristalino 280W 60c", 18, "60 células poli M6 | 280Wp | Eficiencia 17.1% | Marco plata | 17.5kg"],
    ["Panel Policristalino 330W 72c", 15, "72 células poli M6 | 330Wp | Eficiencia 17.8% | Marco plata | 21.5kg"],
    
    // Especiales
    ["Panel Flexible 200W ETFE", 6, "200Wp | 5.5kg | ETFE polymer | Plegable | 30mm grosor | Fuera de red"],
    ["Panel Vidrio-Vidrio 400W", 9, "Doble vidrio 2+2mm | 400Wp | 30 años garantía | Sin marco | Cubiertas industriales"],
  ];
  
  for (const [name, rate, desc] of models) {
    await c.query("INSERT INTO manufacturing_models (id, tenant_id, name, description, unit_of_measure, target_rate) VALUES ($1,1,$2,$3,'piezas/h',$4)", [uuid(), name, desc, rate]);
  }
  console.log(models.length + " models created");

  const r = await c.query("SELECT COUNT(*) FROM manufacturing_models WHERE tenant_id=1");
  console.log("Total: " + r.rows[0].count + " modelos");
  
  await c.end();
  console.log("\n✅ Recarga la web!");
}

main().catch(e => console.log("FATAL:", e.message.slice(0,300)));

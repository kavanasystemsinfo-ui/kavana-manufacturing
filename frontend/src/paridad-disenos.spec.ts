import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

/**
 * Paridad entre los dos diseños del panel de operario (Clásico y Moderno).
 *
 * Se quiere que se vean muy distintos pero que hagan lo mismo. La comprobación es
 * estática, como la de rutas-api-v1: lee las dos pantallas y exige que cada una use
 * los mismos componentes y hooks compartidos. Si se añade una función a un diseño
 * y se olvida el otro, este test falla en el CI.
 */
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const DISENOS = {
  Clásico: fs.readFileSync(path.join(__dirname, 'ClassicOperatorPanel.tsx'), 'utf8'),
  Moderno: fs.readFileSync(path.join(__dirname, 'OperatorPanel.tsx'), 'utf8'),
};

/** Piezas que deben estar en los dos diseños: cada una es una función del panel. */
const COMPARTIDO: Array<[string, string]> = [
  ['<OrderQueue', 'cola de órdenes'],
  ['<OrderSummary', 'resumen de la orden'],
  ['<QuickBlockForm', 'registro rápido de bloques'],
  ['<ShiftClose', 'cierre de turno'],
  ['<PauseModal', 'pausa con motivo de un toque'],
  ['<IncidenciaModal', 'aviso de incidencia'],
  ['<FailedEventsModal', 'registros con error'],
  ['<HelpModal', 'ayuda'],
  ['<ThemeToggle', 'selector de diseño'],
  ['useOperatorPanel(', 'lógica del panel'],
  ['useOperatorActions(', 'pausar, reanudar y cierre de turno'],
  ['useOrderLogs(', 'bloques de la orden'],
];

describe('paridad entre los diseños del panel de operario', () => {
  for (const [diseno, source] of Object.entries(DISENOS)) {
    for (const [marca, funcion] of COMPARTIDO) {
      it(`${diseno} incluye ${funcion}`, () => {
        expect(source).toContain(marca);
      });
    }
  }

  it('ningún diseño registra bloques por su cuenta: pausar y reanudar salen del hook común', () => {
    for (const source of Object.values(DISENOS)) {
      expect(source).not.toContain("'parada'");
      expect(source).not.toContain("registerWorkBlock(\n      'produccion'");
    }
  });
});

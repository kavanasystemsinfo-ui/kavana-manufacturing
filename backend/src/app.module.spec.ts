import { describe, it, expect } from 'vitest';
import { AppModule } from './app.module.js';
import { DemoReadOnlyMiddleware } from './auth/demo-readonly.middleware.js';
import { TenantContextMiddleware } from './auth/tenant-context.middleware.js';

/**
 * El blindaje de la demo es un middleware que lee el tenant del contexto, así
 * que solo funciona en las rutas donde se ha aplicado. Olvidar una ruta aquí no
 * rompe nada visible: simplemente deja de proteger (fue el caso de incidencias).
 * Este spec fija el cableado real de `AppModule.configure`.
 */
function rutasAplicadas(): { middleware: unknown; rutas: string[] }[] {
  const calls: { middleware: unknown; rutas: string[] }[] = [];
  const consumer = {
    apply: (...middleware: unknown[]) => ({
      forRoutes: (...rutas: unknown[]) => {
        calls.push({
          middleware: middleware[0],
          rutas: rutas.map((r) => (typeof r === 'string' ? r : String(r))),
        });
        return consumer;
      },
    }),
  };
  new AppModule().configure(consumer as never);
  return calls;
}

function rutasDe(middleware: unknown): string[] {
  return rutasAplicadas().find((c) => c.middleware === middleware)?.rutas ?? [];
}

describe('AppModule — cableado del blindaje de la demo', () => {
  it('protege incidencias además de órdenes (el intento escrito en el código)', () => {
    const rutas = rutasDe(DemoReadOnlyMiddleware);
    expect(rutas).toContain('orders');
    expect(rutas).toContain('incidencias');
  });

  it('no repite rutas en la lista', () => {
    const rutas = rutasDe(TenantContextMiddleware);
    expect(new Set(rutas).size).toBe(rutas.length);
  });

  it('toda ruta blindada lee antes el contexto de tenant (sin él no ve el tenant y deja pasar)', () => {
    const conContexto = new Set(rutasDe(TenantContextMiddleware));
    for (const ruta of rutasDe(DemoReadOnlyMiddleware)) {
      expect(conContexto.has(ruta)).toBe(true);
    }
  });
});

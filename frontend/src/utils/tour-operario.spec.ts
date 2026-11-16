import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { toursOperario } from './tour-operario.js';

/**
 * Cada paso del tour del operario nombra un ancla (data-tour-step); este
 * contrato comprueba que existe en el código, que los dos diseños la llevan y
 * que los tours se encadenan: cola → orden → cierre de turno.
 */

const RAIZ = resolve(__dirname, '..');

function fuentes(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return fuentes(ruta);
    return /\.tsx$/.test(nombre) && !/\.spec\./.test(nombre) ? [ruta] : [];
  });
}

const todo = fuentes(RAIZ).map((f) => readFileSync(f, 'utf-8')).join('\n');
const moderno = readFileSync(join(RAIZ, 'OperatorPanel.tsx'), 'utf-8');
const clasico = readFileSync(join(RAIZ, 'ClassicOperatorPanel.tsx'), 'utf-8');

const accionesVacias = { irACola: () => {}, abrirOrden: () => {}, abrirCierre: () => {} };
const anclasDe = (anchor: string | string[] | undefined) => (Array.isArray(anchor) ? anchor : anchor ? [anchor] : []);
const contiene = (texto: string, ancla: string) => texto.includes(`"${ancla}"`) || texto.includes(`'${ancla}'`);
/** Anclas que viven en la cabecera de cada panel y por tanto tienen que estar en los dos diseños. */
const DE_CABECERA = new Set(['header-title', 'header-theme', 'header-help', 'header-tour', 'cola-buscar', 'cola-cerrar-turno', 'orden-conexion', 'orden-incidencia']);

describe('toursOperario', () => {
  for (const esModerno of [true, false]) {
    const tours = toursOperario({ moderno: esModerno, hayOrdenes: true, ...accionesVacias });
    const diseno = esModerno ? 'Moderno' : 'Clásico';

    it(`${diseno}: cada paso tiene título, texto y ancla (salvo la pregunta final sin ancla)`, () => {
      for (const [clave, pasos] of Object.entries(tours)) {
        const ids = pasos.map((p) => p.id);
        expect(new Set(ids).size, `ids repetidos en ${clave}`).toBe(ids.length);
        for (const p of pasos) {
          expect(p.title.length).toBeGreaterThan(0);
          expect(p.content.length).toBeGreaterThan(0);
          if (!p.siguiente) expect(anclasDe(p.anchor).length, `el paso ${clave}/${p.id} no tiene ancla`).toBeGreaterThan(0);
        }
      }
    });

    it(`${diseno}: todas las anclas existen en el código y las de la cabecera, en los dos paneles`, () => {
      for (const [clave, pasos] of Object.entries(tours)) {
        for (const p of pasos) {
          for (const ancla of anclasDe(p.anchor)) {
            expect(contiene(todo, ancla), `falta el ancla ${ancla} (${clave}/${p.id})`).toBe(true);
            if (DE_CABECERA.has(ancla) && ancla !== 'header-tour') {
              expect(contiene(moderno, ancla), `el Moderno no tiene ${ancla}`).toBe(true);
              expect(contiene(clasico, ancla), `el Clásico no tiene ${ancla}`).toBe(true);
            }
          }
        }
      }
    });
  }

  it('la tarjeta «Mi turno hoy» solo se explica en el diseño Moderno', () => {
    const ids = (m: boolean) => toursOperario({ moderno: m, hayOrdenes: true, ...accionesVacias }).orden.map((p) => p.id);
    expect(ids(true)).toContain('orden-mi-turno');
    expect(ids(false)).not.toContain('orden-mi-turno');
  });

  it('los tours se encadenan: cola → orden → cierre de turno', () => {
    const t = toursOperario({ moderno: true, hayOrdenes: true, ...accionesVacias });
    expect(t.cola[t.cola.length - 1].siguiente).toBe('orden');
    expect(t.orden[t.orden.length - 1].siguiente).toBe('turno');
    expect(t.turno[t.turno.length - 1].siguiente).toBeUndefined();
    for (const pasos of Object.values(t)) expect(pasos.slice(0, -1).every((p) => !p.siguiente)).toBe(true);
  });

  it('sin órdenes en la cola no se ofrece ver cómo se trabaja una', () => {
    const t = toursOperario({ moderno: true, hayOrdenes: false, ...accionesVacias });
    expect(t.cola.some((p) => p.siguiente)).toBe(false);
  });

  it('el primer paso de cada tour lleva a su pantalla', () => {
    const acciones = { irACola: vi.fn(), abrirOrden: vi.fn(), abrirCierre: vi.fn() };
    const t = toursOperario({ moderno: true, hayOrdenes: true, ...acciones });
    t.cola[0].action?.();
    t.orden[0].action?.();
    t.turno[0].action?.();
    expect(acciones.irACola).toHaveBeenCalledTimes(1);
    expect(acciones.abrirOrden).toHaveBeenCalledTimes(1);
    expect(acciones.abrirCierre).toHaveBeenCalledTimes(1);
  });

  it('los dos paneles llevan el botón del tour y el componente del tour en cada pantalla', () => {
    for (const panel of [moderno, clasico]) {
      expect(panel.match(/<TourButton /g)?.length).toBeGreaterThanOrEqual(2);
      expect(panel.match(/<TourComponent /g)?.length).toBeGreaterThanOrEqual(3);
    }
  });
});

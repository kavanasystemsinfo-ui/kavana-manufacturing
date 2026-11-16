import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { RUTA_TOUR, toursSupervisor, type PestanaTour } from './tour-supervisor.js';

/**
 * El tour antiguo buscaba sus elementos por clases CSS que no existían: la
 * mitad de los pasos no señalaban nada y el recuadro se quedaba en el paso
 * anterior. Ahora cada paso nombra un ancla (data-tour-step), y este contrato
 * comprueba que esa ancla existe de verdad, que cada pestaña tiene su tour y que
 * los tours se encadenan en el orden de la ruta.
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
const moderno = readFileSync(join(RAIZ, 'SupervisorPanel.tsx'), 'utf-8');
const clasico = readFileSync(join(RAIZ, 'ClassicSupervisorPanel.tsx'), 'utf-8');
const tourButton = readFileSync(join(RAIZ, 'components/TourButton.tsx'), 'utf-8');

const tours = toursSupervisor(() => {});
const anclasDe = (anchor: string | string[] | undefined) => (Array.isArray(anchor) ? anchor : anchor ? [anchor] : []);
const contiene = (texto: string, ancla: string) => texto.includes(`"${ancla}"`) || texto.includes(`'${ancla}'`);
const ANCLAS_DE_CABECERA = /^(header-|tabs$|.*-tab$)/;

describe('toursSupervisor', () => {
  it('hay un tour por cada pestaña de la ruta', () => {
    expect(Object.keys(tours).sort()).toEqual(RUTA_TOUR.map((p) => p.clave).sort());
  });

  it('cada paso tiene id único dentro de su tour, título, texto y ancla', () => {
    for (const [clave, pasos] of Object.entries(tours)) {
      const ids = pasos.map((p) => p.id);
      expect(new Set(ids).size, `ids repetidos en ${clave}`).toBe(ids.length);
      for (const p of pasos) {
        expect(p.title.length).toBeGreaterThan(0);
        expect(p.content.length).toBeGreaterThan(0);
        expect(anclasDe(p.anchor).length, `el paso ${clave}/${p.id} no tiene ancla`).toBeGreaterThan(0);
      }
    }
  });

  it('todas las anclas existen, y las de la cabecera y las pestañas, en los dos diseños', () => {
    for (const [clave, pasos] of Object.entries(tours)) {
      for (const p of pasos) {
        for (const ancla of anclasDe(p.anchor)) {
          expect(contiene(todo, ancla), `falta el ancla ${ancla} (${clave}/${p.id})`).toBe(true);
          if (ANCLAS_DE_CABECERA.test(ancla)) {
            if (ancla === 'header-tour') {
              expect(contiene(tourButton, ancla), 'el botón del tour no lleva su ancla').toBe(true);
              continue;
            }
            expect(contiene(moderno, ancla), `el Moderno no tiene el ancla ${ancla}`).toBe(true);
            expect(contiene(clasico, ancla), `el Clásico no tiene el ancla ${ancla}`).toBe(true);
          }
        }
      }
    }
  });

  it('cada tour, salvo el último, termina preguntando por la pestaña siguiente de la ruta', () => {
    RUTA_TOUR.forEach((pestana, i) => {
      const pasos = tours[pestana.clave];
      const ultimo = pasos[pasos.length - 1];
      const siguiente = RUTA_TOUR[i + 1];
      if (siguiente) {
        expect(ultimo.siguiente, `${pestana.clave} no enlaza con la siguiente`).toBe(siguiente.clave);
        expect(ultimo.title).toContain(siguiente.nombre);
      } else {
        expect(ultimo.siguiente).toBeUndefined();
      }
      // Solo el último paso pregunta.
      expect(pasos.slice(0, -1).every((p) => !p.siguiente)).toBe(true);
    });
  });

  it('el primer paso de cada tour abre su pestaña antes de buscar el elemento', () => {
    const irA = vi.fn<(p: PestanaTour) => void>();
    const conAccion = toursSupervisor(irA);
    for (const { clave } of RUTA_TOUR) {
      irA.mockClear();
      conAccion[clave][0].action?.();
      expect(irA.mock.calls.map((c) => c[0]), `el tour ${clave} no abre su pestaña`).toEqual([clave]);
    }
  });

  it('el paso 5 del dashboard avisa de que las pestañas se explican más adelante', () => {
    expect(tours.resumen[4].content).toContain('Te guiaré sobre ellas más adelante');
  });

  it('no menciona funciones que ya no existen', () => {
    const texto = Object.values(tours).flat().map((p) => `${p.title} ${p.content}`).join(' ');
    for (const viejo of ['CMMS', 'running', 'stopped', 'idle', 'Kavana)', 'módulo reportes']) {
      expect(texto).not.toContain(viejo);
    }
  });
});

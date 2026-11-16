import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { pasosTourSupervisor, type PestanaTour } from './tour-supervisor.js';

/**
 * El tour antiguo buscaba sus elementos por clases CSS que no existían: la
 * mitad de los pasos no señalaban nada y el recuadro se quedaba en el paso
 * anterior. Ahora cada paso nombra un ancla (data-tour-step), y este contrato
 * comprueba que esa ancla existe de verdad en los dos diseños.
 */

const src = (ruta: string) => readFileSync(resolve(__dirname, '..', ruta), 'utf-8');
const moderno = src('SupervisorPanel.tsx');
const clasico = src('ClassicSupervisorPanel.tsx');
const contenido = [
  src('components/EstadoPlanta.tsx'),
  src('components/KpiCardsRow.tsx'),
  src('components/LiveLineTab.tsx'),
].join('\n');

const ANCLAS_DE_CONTENIDO = new Set(['resumen-estado', 'resumen-kpis', 'linea-en-vivo']);
const pasos = pasosTourSupervisor(() => {});

describe('pasosTourSupervisor', () => {
  it('cada paso tiene id único, título, texto y ancla', () => {
    const ids = pasos.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of pasos) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.content.length).toBeGreaterThan(0);
      expect(p.anchor, `el paso ${p.id} no tiene ancla`).toBeTruthy();
    }
  });

  it('todas las anclas existen en el diseño Moderno y en el Clásico', () => {
    for (const p of pasos) {
      const ancla = p.anchor as string;
      if (ANCLAS_DE_CONTENIDO.has(ancla)) {
        expect(contenido, `falta el ancla ${ancla} en los componentes`).toContain(`"${ancla}"`);
        continue;
      }
      const enModerno = moderno.includes(`"${ancla}"`) || moderno.includes(`'${ancla}'`);
      const enClasico = clasico.includes(`"${ancla}"`) || clasico.includes(`'${ancla}'`);
      expect(enModerno, `el Moderno no tiene el ancla ${ancla}`).toBe(true);
      expect(enClasico, `el Clásico no tiene el ancla ${ancla}`).toBe(true);
    }
  });

  it('los pasos de cada pestaña la abren antes de buscar su elemento', () => {
    const irA = vi.fn<(p: PestanaTour) => void>();
    const conAccion = pasosTourSupervisor(irA);
    const abre = (id: string): PestanaTour[] => {
      irA.mockClear();
      conAccion.find((p) => p.id === id)?.action?.();
      return irA.mock.calls.map((c) => c[0]);
    };
    expect(abre('linea-en-vivo')).toEqual(['live']);
    expect(abre('oee')).toEqual(['oee']);
    expect(abre('puestos')).toEqual(['workstations']);
    expect(abre('incidencias')).toEqual(['incidencias']);
    expect(abre('ordenes')).toEqual(['orders']);
    expect(abre('resumen-estado')).toEqual(['resumen']);
  });

  it('no menciona funciones que ya no existen', () => {
    const texto = pasos.map((p) => `${p.title} ${p.content}`).join(' ');
    for (const viejo of ['CMMS', 'Pareto', 'running', 'stopped', 'idle', 'Kavana)', 'módulo reportes']) {
      expect(texto).not.toContain(viejo);
    }
  });
});

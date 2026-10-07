import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

/**
 * Contrato de rutas del frontend tras la migración a /api/v1 (tarea 3.2).
 *
 * El backend sirve TODO bajo el prefijo global api/v1 (main.ts:
 * setGlobalPrefix('api/v1')). El frontend no debe:
 *   - dejar rutas legacy sin prefijo (/production/..., /tenant/..., /api/users)
 *   - duplicar el prefijo (${API_BASE}/api/... → /api/v1/api/...)
 * porque con el prefijo global el backend ya añade /api/v1 una sola vez y
 * /api/v1/api/users responde 404 real (verificado contra el backend vivo).
 *
 * La verificación es estática (grep de los fuentes reales) a propósito: un
 * mock de fetch probaría el mock, y el E2E ya cubre la integración.
 */

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
// La spec vive en src/api: la raíz de src es un nivel arriba.
const SRC = path.resolve(__dirname, '..');
const FRONTEND_ROOT = path.resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

function readRepo(rel: string): string {
  return fs.readFileSync(path.join(FRONTEND_ROOT, rel), 'utf8');
}

const PROD_FILES = [
  'api/admin.ts',
  'api/admin-entities.ts',
  'api/supervisor.ts',
  'api/incidencias.ts',
  'api/my-time-logs.ts',
  'api/analytics.ts',
  'store/hmi-store.ts',
  'LoginPage.tsx',
  'TenantLogin.tsx',
  'components/AiAdvisorChat.tsx',
];

describe('Contrato de rutas /api/v1 en todo el frontend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no existe vite.config.js fantasma compilado junto al vite.config.ts', () => {
    // Vite resuelve .js ANTES que .ts: un artefacto compilado viejo pisa la
    // config real y el proxy reescribe /api→'' en lugar de pasar /api/v1.
    // Fue la causa raíz del E2E en rojo (7/9 specs, run 36235801359).
    expect(fs.existsSync(path.resolve(__dirname, '../vite.config.js'))).toBe(false);
  });

  it('todas las rutas de los clientes API usan el prefijo api/v1', () => {
    // Contrato: o la ruta se construye sobre ${API_BASE} (='/api/v1') con un
    // segmento de dominio detrás, o es literal y ya empieza por /api/v1/.
    // Lo que se prohíbe es la ruta legacy sin versionar (/production/..., /api/users).
    for (const file of PROD_FILES) {
      const src = readSrc(file);
      const apiBaseRoutes = [...src.matchAll(/\$\{API_BASE\}([^`'"]*)/g)].map((m) => m[1]);
      // La definición de la constante API_BASE ('/api/v1') no es una ruta:
      // se exige rutas literales con al menos un segmento detrás de /api/v1/.
      const literalRoutes = [...src.matchAll(/['"`](\/(?:api\/v1|production|tenant|users|workstations|manufacturing-models|toolings|materials|orders|incidencias|oee|quality|costs|cost|ai-advisor|global-admin|health|api)\/[^'"`]*)/g)].map((m) => m[1]);
      expect(
        apiBaseRoutes.length + literalRoutes.length,
        `${file} no tiene rutas API reconocidas`,
      ).toBeGreaterThan(0);
      for (const route of apiBaseRoutes) {
        expect(
          route,
          `${file}: ruta sin prefijo: "${route}"`,
        ).toMatch(/^\/(users|workstations|manufacturing-models|toolings|materials|orders|incidencias|tenant|oee|quality|costs|production|ai-advisor|health|docs|global-admin|analytics)/);
      }
      for (const route of literalRoutes) {
        // '/api/v1' a secas es la definición de la constante, no una ruta.
        if (route === '/api/v1') continue;
        expect(
          route,
          `${file}: ruta literal sin versionar: "${route}"`,
        ).toMatch(/^\/api\/v1\//);
      }
    }
  });

  it('ninguna ruta contiene el doble prefijo /api/v1/api/', () => {
    for (const file of PROD_FILES) {
      const src = readSrc(file);
      expect(src, `${file} contiene doble prefijo`).not.toContain('/api/v1/api/');
      expect(src, `${file} contiene doble prefijo`).not.toContain('${API_BASE}/api/');
    }
  });

  it('el store HMI y el asistente usan rutas versionadas, no legacy', () => {
    const hmi = readSrc('store/hmi-store.ts');
    // Antes de la migración llamaba /production/... y /api/orders/available.
    expect(hmi).toContain("callApiWithTimeout<AvailableOrder[]>('/api/v1/orders/available')");
    expect(hmi).toContain("callApiWithTimeout('/api/v1/production/time-logs/sync'");
    const advisor = readSrc('components/AiAdvisorChat.tsx');
    expect(advisor).toContain("isTech ? '/api/v1/ai-advisor/ask-tech' : '/api/v1/ai-advisor/ask'");
  });

  it('las páginas de login llaman a /api/v1/auth/...', () => {
    expect(readSrc('LoginPage.tsx')).toContain("fetch('/api/v1/auth/login-by-tenant'");
    expect(readSrc('TenantLogin.tsx')).toContain("fetch(`/api/v1/auth/tenant/${subdomain}`)");
  });

  it('el E2E del wizard no llama a la ruta legacy /api/auth sin versionar', () => {
    const spec = readRepo('e2e/tenant-wizard.spec.ts');
    expect(spec).not.toMatch(/['"`]\/api\/auth/);
    expect(spec).toContain("'/api/v1/auth/login-by-tenant'");
  });

  it('el proxy de Vite solo expone /api/v1 (sin rewrites legacy)', () => {
    const vite = readRepo('vite.config.ts');
    expect(vite).not.toContain("'/api':");
    expect(vite).toContain("'/api/v1'");
  });
});

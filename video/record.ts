import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPT_PATH = path.join(__dirname, 'script.manufacturing.json');
const OUTPUT_DIR = path.join(__dirname, 'recordings');
const CLICKS_FILE = path.join(OUTPUT_DIR, 'click-positions.json');
const TIMELINE_FILE = path.join(OUTPUT_DIR, 'timeline.json');

// Demo pública: CON www (el dominio sin www no resuelve).
const BASE_URL = process.env.BASE_URL || 'https://www.manufacturing.kavanasystems.com';

interface Scene {
  id: string;
  start: number;
  end: number;
  duration: number;
  label: string;
  description: string;
  action: string;
  target: string;
  url?: string;
  waitAfter?: number;
  value?: string;
  zoomArea?: { x: number; y: number; width: number; height: number };
}

interface ClickPosition {
  sceneId: string;
  timestampMs: number;
  x: number;
  y: number;
  selector: string;
}

interface TimelineEntry {
  id: string;
  startMs: number;
  endMs: number;
}

const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf-8')) as {
  scenes: Scene[];
  demo: { baseUrl: string; roles: Record<string, string> };
};

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Espera a que el backend de Render despierte y la SPA pinte contenido real. */
async function waitForApp(page: import('@playwright/test').Page, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = (await page.locator('body').innerText().catch(() => '')) || '';
    if (text.trim().length > 40 && !/Cargando|Loading|Conectando/i.test(text)) return true;
    await wait(2000);
  }
  return false;
}

test.describe.configure({ retries: 0 });

test('record manufacturing demo video', async ({ browser }) => {
  fs.mkdirSync(path.join(OUTPUT_DIR, 'videos'), { recursive: true });

  const clicks: ClickPosition[] = [];
  const timeline: TimelineEntry[] = [];
  const viewport = { width: 1920, height: 1080 };

  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: path.join(OUTPUT_DIR, 'videos'), size: viewport },
  });
  const page = await context.newPage();
  await page.setViewportSize(viewport);

  const recordStart = Date.now();

  /** Clic lento con registro de posición para los zooms. */
  async function slowClick(sceneId: string, selector: string, opts: { timeout?: number } = {}) {
    const loc = page.locator(selector).first();
    await loc.waitFor({ state: 'visible', timeout: opts.timeout ?? 20000 });
    await loc.scrollIntoViewIfNeeded();
    const box = await loc.boundingBox();
    if (box) {
      clicks.push({
        sceneId,
        timestampMs: Date.now() - recordStart,
        x: Math.round(box.x + box.width / 2),
        y: Math.round(box.y + box.height / 2),
        selector,
      });
    }
    const t = Date.now() - recordStart;
    await loc.hover();
    await wait(350);
    await loc.click();
    console.log(`  [${(t / 1000).toFixed(1)}s] click ${selector}`);
    await wait(900);
  }

  async function enterDemo() {
    // Limpiar sesión previa: si ya hay login, /demo no muestra los botones de rol.
    await context.clearCookies();
    await page.goto(`${BASE_URL}/demo`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await page.goto(`${BASE_URL}/demo`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitForApp(page);
    await wait(1500);
  }

  async function loginAs(role: 'Operario' | 'Supervisor' | 'Administrador', sceneId: string) {
    await enterDemo();
    await slowClick(sceneId, `button:has-text("${role}")`);
    await wait(9000);
  }

  for (const scene of script.scenes) {
    console.log(`\n=== ${scene.id} (${scene.start}-${scene.end}s) — ${scene.action} ===`);
    const sceneStartMs = Date.now() - recordStart;
    const sceneStartTime = Date.now();

    try {
      switch (scene.id) {
        // 1) Portada de la demo con selección de rol.
        case 'intro':
          await enterDemo();
          await page.mouse.move(960, 540);
          await wait(3000);
          break;

        // 2) Login demo como operario (flujo real de la página, sin tokens).
        case 'demo-login-operario':
          await loginAs('Operario', scene.id);
          await page.mouse.move(700, 500);
          break;

        // 3) Cola de órdenes del operario + búsqueda.
        case 'operator-panel-orders': {
          const search = page.locator('input[placeholder*="Buscar"]').first();
          await search.waitFor({ state: 'visible', timeout: 20000 });
          await search.click();
          await search.type('pellets', { delay: 120 });
          await wait(1500);
          await search.fill('');
          await wait(1200);
          break;
        }

        // 4) Formulario de bloque de producción (NO se envía nada).
        case 'operator-block-registration': {
          await slowClick(scene.id, 'button:has-text("Orden 4484")');
          await wait(2500);
          await slowClick(scene.id, 'button:has-text("+100")');
          await wait(800);
          await slowClick(scene.id, 'button:has-text("+1 palet")');
          await wait(1200);
          const buenas = page.locator('input[type="number"]').first();
          if (await buenas.count()) await buenas.hover().catch(() => {});
          await wait(1500);
          break;
        }

        // 5) Panel de supervisión: KPIs y alertas.
        case 'supervisor-panel-resumen':
          await loginAs('Supervisor', scene.id);
          await page.mouse.move(960, 700);
          await page.mouse.wheel(0, 500);
          await wait(1500);
          await page.mouse.wheel(0, -300);
          await wait(1000);
          break;

        // 6) Línea en vivo: timeline del turno.
        case 'supervisor-live-line':
          await slowClick(scene.id, 'button:has-text("LÍNEA EN VIVO")');
          await wait(4000);
          await page.mouse.wheel(0, 250);
          await wait(1200);
          break;

        // 7) Panel de administración: pestaña Puestos.
        case 'admin-panel-capabilities': {
          await loginAs('Administrador', scene.id);
          await slowClick(scene.id, 'button:has-text("Puestos")');
          await wait(2500);
          break;
        }

        // 8) Cierre: volver a la portada de la demo (el CTA lo pinta Remotion).
        case 'outro-cta':
          await enterDemo();
          await wait(2500);
          break;

        default:
          await wait(2000);
      }
    } catch (e) {
      console.warn(`  !! escena ${scene.id}: ${(e as Error).message}`);
    }

    // Cuadrar la duración de la escena con el guion.
    const elapsed = Date.now() - sceneStartTime;
    const target = scene.duration * 1000;
    if (elapsed < target) await wait(target - elapsed);

    timeline.push({ id: scene.id, startMs: sceneStartMs, endMs: Date.now() - recordStart });
    const shot = path.join(OUTPUT_DIR, `frame-${scene.id}.png`);
    await page.screenshot({ path: shot });
    console.log(`  → ${((Date.now() - recordStart) / 1000).toFixed(1)}s ${shot}`);
  }

  fs.writeFileSync(CLICKS_FILE, JSON.stringify(clicks, null, 2));
  fs.writeFileSync(TIMELINE_FILE, JSON.stringify(timeline, null, 2));
  console.log(`\nTimeline: ${TIMELINE_FILE} | clicks: ${clicks.length}`);

  await context.close();

  const videos = fs
    .readdirSync(path.join(OUTPUT_DIR, 'videos'))
    .filter(f => f.endsWith('.webm'))
    .map(f => ({ f, size: fs.statSync(path.join(OUTPUT_DIR, 'videos', f)).size, mtime: fs.statSync(path.join(OUTPUT_DIR, 'videos', f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  console.log(`VIDEO=${path.join(OUTPUT_DIR, 'videos', videos[0].f)} size=${videos[0].size}`);
});

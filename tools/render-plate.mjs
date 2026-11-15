/**
 * RENDERIZADOR DE PLANCHAS.
 *
 * Renderiza una capa de compositing con el motor que ya existe, en modo offline
 * determinista, y la encodea a H.264.
 *
 * Esto NO es "generar una escena 3D compleja": son las perspectivas secundarias
 * del plano (techo y ambiente), que necesitan contenido PROPIO para no ser una
 * copia del clip principal. El motor ya sabe hacer peces, partículas, rayos de
 * luz, cáusticas y superficie de agua, así que se reutiliza en vez de inventar
 * nada nuevo.
 *
 * Uso:
 *   node tools/render-plate.mjs --shot production/ocean-test/shot.json --plate ceiling
 *   node tools/render-plate.mjs --shot ... --plate standin --out source/_standin-whale.mp4
 */
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pw;
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d; };

const shotPath = resolve(arg('shot', 'production/ocean-test/shot.json'));
const shot = JSON.parse(readFileSync(shotPath, 'utf8'));
const base = dirname(shotPath);
const which = arg('plate', 'ceiling');
const BASE_URL = arg('base', 'http://127.0.0.1:5173');

const cfg = which === 'standin'
  ? { ...shot.main.standInPlate, role: 'MAIN (sustituto para validar el flujo)' }
  : shot.plates[which];
if (!cfg) { console.error(`Plancha desconocida: ${which}`); process.exit(1); }

const outRel = arg('out', which === 'standin'
  ? shot.main.standIn
  : `out/_plate-${which}.mp4`);
const outPath = join(base, outRel);

const { width: W, height: H, fps: FPS, duration: DUR, crf } = shot.format;
const frames = Math.round(DUR * FPS);
const tmp = join(base, 'out', '.frames-' + which);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
mkdirSync(dirname(outPath), { recursive: true });

console.log(`PLANCHA · ${which} · ${cfg.role || cfg.world}`);
console.log(`  ${frames} fotogramas · ${W}x${H} @ ${FPS} fps`);

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars']
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(`${BASE_URL}/output.html?surface=story&quality=high&offline=1`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__offlineReady === true, { timeout: 30000 });
await page.evaluate(() => window.__ready());

await page.evaluate((c) => window.__plate(c), {
  world: cfg.world, variant: cfg.variant, params: cfg.params,
  camera: cfg.camera, drift: cfg.drift
});
// margen para que el mundo se asiente antes del primer fotograma
const warm = cfg.timeOffset ?? 40;
await page.evaluate((w) => { for (let i = 0; i < 90; i++) window.__frame(w - 3 + i / 30, 1 / 30); }, warm);

const dt = 1 / FPS;
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  // Desfase temporal por plancha: así las capas no laten al unísono.
  const t = (cfg.timeOffset ?? 40) + i * dt;
  await page.evaluate(([tt, d]) => window.__frame(tt, d), [t, dt]);
  await page.screenshot({ path: join(tmp, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 95 });
  if ((i + 1) % 30 === 0) {
    const el = (Date.now() - t0) / 1000;
    process.stdout.write(`\r  ${i + 1}/${frames}  ${((i + 1) / el).toFixed(1)} fps  ETA ${Math.round((el / (i + 1)) * (frames - i - 1))}s   `);
  }
}
process.stdout.write(`\r  ${frames}/${frames} fotogramas` + ' '.repeat(30) + '\n');
if (errs.length) console.log(`  ⚠ ${[...new Set(errs)].slice(0, 2).join(' | ')}`);
await browser.close();

execFileSync('ffmpeg', [
  '-y', '-framerate', String(FPS), '-i', join(tmp, '%05d.jpg'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf ?? 18),
  '-pix_fmt', shot.format.pixelFormat || 'yuv420p', '-movflags', '+faststart', outPath
], { stdio: ['ignore', 'ignore', 'ignore'] });
rmSync(tmp, { recursive: true, force: true });
console.log(`  → ${outPath}`);

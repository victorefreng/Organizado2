/**
 * RENDER DE UN ELEMENTO REUTILIZABLE sobre negro.
 *
 * Los elementos de luz (la estrella, destellos, partículas) se renderizan sobre
 * negro en vez de con canal alfa. Razón: H.264 no lleva alfa, y la estrella es
 * luz aditiva pura, así que componerla con modo 'screen' da exactamente el mismo
 * resultado y queda compatible con cualquier metraje sin recodificar nada.
 *
 * Uso: node tools/render-asset.mjs production/assets/star/asset.json cross-main
 */
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pw;
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { videoEncodeArgs } from './lib/contract.mjs';

const assetPath = resolve(process.argv[2]);
const name = process.argv[3];
const BASE = process.env.UNIVERSO_BASE || 'http://127.0.0.1:5173';
const asset = JSON.parse(readFileSync(assetPath, 'utf8'));
const dir = dirname(assetPath);
const el = asset.elements[name];
if (!el) { console.error(`Elemento desconocido: ${name}`); process.exit(1); }

const { width: W, height: H, fps: FPS } = asset.format;
const frames = Math.round((el.to - el.from) * FPS);
const tmp = join(dir, '.frames-' + name);
const out = join(dir, `${asset.id.toLowerCase()}-${name}.mp4`);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

console.log(`${asset.id} · ${name} · ${el.role}`);
console.log(`  ${frames} fotogramas (${(el.to - el.from).toFixed(1)}s)`);

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars']
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`${BASE}/output.html?surface=story&quality=high&offline=1`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__offlineReady === true, { timeout: 30000 });
await page.evaluate(() => window.__ready());
await page.evaluate((c) => window.__plate(c), {
  world: el.world, variant: el.variant, params: el.params || {},
  camera: el.camera, drift: el.drift
});
// El elemento vive en la línea de tiempo del mundo VOID: hay que situarse en
// su momento, no en el tiempo ambiental.
await page.evaluate((f) => { for (let i = 0; i < 60; i++) window.__frame(f - 2 + i / 30, 1 / 30); }, el.from);

const dt = 1 / FPS;
for (let i = 0; i < frames; i++) {
  await page.evaluate(([t, d]) => window.__frame(t, d), [el.from + i * dt, dt]);
  await page.screenshot({ path: join(tmp, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 96 });
  if ((i + 1) % 60 === 0) process.stdout.write(`\r  ${i + 1}/${frames}   `);
}
process.stdout.write(`\r  ${frames}/${frames} fotogramas\n`);
await browser.close();

execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
  '-framerate', String(FPS), '-i', join(tmp, '%05d.jpg'),
  ...videoEncodeArgs(asset.format), out], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
console.log(`  → ${out}`);

/**
 * RENDER DE UNA PANTALLA de una pieza, con bucle perfecto.
 *
 * Renderiza loopSeconds + overlapSeconds con el motor en modo offline
 * determinista, y después cruza la cola sobre la cabeza para que el último
 * fotograma enlace con el primero sin fundido a negro (Brief §5.6).
 *
 * Uso: node tools/render-screen.mjs production/pieces/AMBIENT-002/piece.json main
 */
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pw;
import { readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { videoEncodeArgs } from './lib/contract.mjs';

const piecePath = resolve(process.argv[2]);
const screenName = process.argv[3];
const BASE = process.env.UNIVERSO_BASE || 'http://127.0.0.1:5173';
const piece = JSON.parse(readFileSync(piecePath, 'utf8'));
const dir = dirname(piecePath);
const cfg = piece.screens[screenName];
if (!cfg) { console.error(`Pantalla desconocida: ${screenName}`); process.exit(1); }

const { width: W, height: H, fps: FPS } = piece.format;
const loopS = cfg.loopSeconds, ovS = cfg.overlapSeconds ?? 8;
const totalS = loopS + ovS;
const frames = Math.round(totalS * FPS);
const tmp = join(dir, '.frames-' + screenName);
const rawOut = join(dir, `_raw-${screenName}.mp4`);
const loopOut = join(dir, `_loop-${screenName}.mp4`);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

console.log(`PANTALLA ${screenName} · ${cfg.role}`);
console.log(`  bucle ${loopS}s (+${ovS}s de solape) · ${frames} fotogramas · ${W}x${H} @ ${FPS} fps`);

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars']
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(`${BASE}/output.html?surface=story&quality=high&offline=1`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__offlineReady === true, { timeout: 30000 });
await page.evaluate(() => window.__ready());
await page.evaluate((c) => window.__plate(c), {
  world: cfg.world, variant: cfg.variant, params: cfg.params, camera: cfg.camera, drift: cfg.drift
});
const t0off = cfg.timeOffset ?? 0;
await page.evaluate((w) => { for (let i = 0; i < 120; i++) window.__frame(w - 4 + i / 30, 1 / 30); }, t0off);

const dt = 1 / FPS;
const started = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate(([t, d]) => window.__frame(t, d), [t0off + i * dt, dt]);
  await page.screenshot({ path: join(tmp, String(i).padStart(6, '0') + '.jpg'), type: 'jpeg', quality: 95 });
  if ((i + 1) % 120 === 0) {
    const el = (Date.now() - started) / 1000;
    process.stdout.write(`\r  ${i + 1}/${frames}  ${((i + 1) / el).toFixed(1)} fps  ETA ${Math.round((el / (i + 1)) * (frames - i - 1) / 60)} min   `);
  }
}
process.stdout.write(`\r  ${frames}/${frames} fotogramas` + ' '.repeat(34) + '\n');
if (errs.length) console.log(`  ⚠ ${[...new Set(errs)].slice(0, 2).join(' | ')}`);
await browser.close();

// 1. secuencia → vídeo crudo (con el solape incluido)
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
  '-framerate', String(FPS), '-i', join(tmp, '%06d.jpg'),
  ...videoEncodeArgs(piece.format), rawOut], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });

// 2. bucle perfecto: cola cruzada sobre cabeza, salida de loopS exactos
const g = piece.format.gop ?? 30;
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
  '-i', rawOut,
  '-filter_complex',
  `[0:v]trim=0:${ovS},setpts=PTS-STARTPTS[head];` +
  `[0:v]trim=${loopS}:${loopS + ovS},setpts=PTS-STARTPTS[tail];` +
  `[0:v]trim=${ovS}:${loopS},setpts=PTS-STARTPTS[mid];` +
  `[tail][head]xfade=transition=fade:duration=${ovS}:offset=0[cf];` +
  `[cf][mid]concat=n=2:v=1:a=0[v]`,
  '-map', '[v]', ...videoEncodeArgs(piece.format), '-t', String(loopS), loopOut],
  { stdio: 'inherit' });
rmSync(rawOut, { force: true });

const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'default=nw=1:nk=1', loopOut]).toString().trim();
console.log(`  → ${loopOut}  (${(+dur).toFixed(2)}s, bucle perfecto)`);

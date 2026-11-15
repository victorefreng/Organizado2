/**
 * EXPORTADOR DE VÍDEO (CINEMATIC MODE, punto 14 del brief).
 *
 * Renderiza el show fotograma a fotograma en modo offline determinista y los
 * encadena con ffmpeg. Como no depende de que la máquina dé tiempo real, la
 * pista sale fluida aunque se renderice en una GPU lenta o por software.
 *
 * Exporta cada superficie por separado, conservando la sincronía temporal:
 * todas las pistas se generan a partir de los mismos tiempos de show.
 *
 * Uso:
 *   node tools/export-video.mjs --segments "55-70,75-95" --fps 24 --surfaces story,environment,ceiling
 *   node tools/export-video.mjs --full --fps 24 --surfaces story
 */
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pw;
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : def;
};
const flag = (name) => process.argv.includes('--' + name);

const BASE = arg('base', 'http://127.0.0.1:5173');
const FPS = parseInt(arg('fps', '24'), 10);
const QUALITY = arg('quality', 'balanced');
const W = parseInt(arg('width', '1280'), 10);
const H = parseInt(arg('height', '720'), 10);
const SURFACES = arg('surfaces', 'story,environment,ceiling').split(',');
const OUT = resolve(__dirname, '..', arg('out', 'exports'));
const TMP = resolve(OUT, '.frames');

const segments = flag('full')
  ? [[0, 300]]
  : arg('segments', '55-70,75-95,130-150,205-218,232-248,288-300')
      .split(',').map((s) => s.split('-').map(Number));

mkdirSync(OUT, { recursive: true });

const totalFrames = segments.reduce((a, [f, t]) => a + Math.round((t - f) * FPS), 0);
console.log(`Segmentos: ${segments.map(([a, b]) => `${a}-${b}s`).join(', ')}`);
console.log(`${totalFrames} fotogramas por superficie a ${FPS} fps · ${W}x${H} · calidad ${QUALITY}`);

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
         '--disable-frame-rate-limit', '--hide-scrollbars']
});

const tracks = {};
for (const surface of SURFACES) {
  const dir = resolve(TMP, surface);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`${BASE}/output.html?surface=${surface}&quality=${QUALITY}&offline=1`,
                  { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__offlineReady === true, { timeout: 30000 });
  const ready = await page.evaluate(() => window.__ready());
  console.log(`\n${surface}: listo (assets ausentes: ${ready.missing})`);

  const dt = 1 / FPS;
  let n = 0;
  const t0 = Date.now();
  for (const [from, to] of segments) {
    await page.evaluate((t) => window.__seek(t), from);
    const count = Math.round((to - from) * FPS);
    for (let i = 0; i < count; i++) {
      const t = from + i * dt;
      await page.evaluate(([tt, d]) => window.__frame(tt, d), [t, dt]);
      await page.screenshot({
        path: resolve(dir, String(n).padStart(5, '0') + '.jpg'),
        type: 'jpeg', quality: 92
      });
      n++;
      if (n % 50 === 0) {
        const el = (Date.now() - t0) / 1000;
        const eta = (el / n) * (totalFrames - n);
        process.stdout.write(`\r  ${n}/${totalFrames}  ${(n / el).toFixed(1)} fps render  ETA ${Math.round(eta)}s   `);
      }
    }
  }
  process.stdout.write(`\r  ${n}/${totalFrames} fotogramas listos` + ' '.repeat(28) + '\n');
  if (errs.length) console.log(`  ⚠ errores: ${[...new Set(errs)].slice(0, 3).join(' | ')}`);
  await ctx.close();

  const mp4 = resolve(OUT, `universo-${surface}.mp4`);
  execFileSync('ffmpeg', [
    '-y', '-framerate', String(FPS), '-i', resolve(dir, '%05d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
  console.log(`  → ${mp4}`);
  tracks[surface] = mp4;
}

// Tríptico: las tres superficies lado a lado, en el mismo instante
if (SURFACES.length === 3) {
  const trip = resolve(OUT, 'universo-triptico.mp4');
  execFileSync('ffmpeg', [
    '-y',
    '-i', tracks.ceiling, '-i', tracks.environment, '-i', tracks.story,
    '-filter_complex',
    '[0:v]scale=640:-1,drawtext=text=P1 CEILING:x=14:y=12:fontsize=17:fontcolor=0xFFD9A0:alpha=0.85[a];' +
    '[1:v]scale=640:-1,drawtext=text=P2 ENVIRONMENT:x=14:y=12:fontsize=17:fontcolor=0xFFD9A0:alpha=0.85[b];' +
    '[2:v]scale=640:-1,drawtext=text=P3 STORY:x=14:y=12:fontsize=17:fontcolor=0xFFD9A0:alpha=0.85[c];' +
    '[a][b][c]vstack=inputs=3[v]',
    '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', trip
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  console.log(`\n→ tríptico: ${trip}`);
}

rmSync(TMP, { recursive: true, force: true });
await browser.close();
console.log('\nListo.');

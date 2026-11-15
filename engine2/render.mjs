/**
 * RENDER DE MUNDOS con el motor de lienzo nativo.
 *
 *   node engine2/render.mjs OCEAN main                       → dist/packages/AMBIENT-002/main.mp4
 *   node engine2/render.mjs OCEAN main --still 0,900 --out x → fotogramas sueltos, para revisar
 *   node engine2/render.mjs OCEAN main --seconds 20          → duración distinta a la de piece.json
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderVideo, renderStill, FPS } from './lib.mjs';

const WORLDS = { OCEAN: 'ocean', CLOUDS: 'clouds', JUNGLE: 'jungle', GALAXY: 'galaxy', REDROOM: 'redroom' };
const [name, screen] = process.argv.slice(2);
const opt = (k, d = null) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
if (!WORLDS[name] || !['main', 'ceiling', 'side'].includes(screen)) {
  console.error('Uso: node engine2/render.mjs <OCEAN|CLOUDS|JUNGLE|GALAXY|REDROOM> <main|ceiling|side> [--still n,n] [--seconds s] [--out ruta]');
  process.exit(1);
}
const world = (await import(`./worlds/${WORLDS[name]}.mjs`)).default;
const piece = JSON.parse(readFileSync(join(resolve('.'), 'production/pieces', world.id, 'piece.json'), 'utf8'));
const seconds = Number(opt('seconds', piece.screens[screen].loopSeconds));
const frames = Math.round(seconds * FPS);
const t0 = Date.now();
const draw = world.screens[screen]();
const setup = (Date.now() - t0) / 1000;

if (opt('still')) {
  const base = opt('out', `dist/.stills/${name}-${screen}`);
  for (const n of opt('still').split(',').map(Number)) {
    await renderStill({ out: `${base}-${String(n).padStart(5, '0')}.png`, frame: n, frames, draw });
  }
  console.log(`${name} ${screen}: fotogramas en ${base}-*.png (preparación ${setup.toFixed(1)} s)`);
} else {
  const out = opt('out', `dist/packages/${world.id}/${screen}.mp4`);
  const r = await renderVideo({ out, frames, draw, preset: opt('preset', 'medium'),
    onProgress: (n, t, fps) => console.log(`  ${name} ${screen} ${n}/${t} · ${fps.toFixed(1)} fps`) });
  console.log(`✓ ${name} ${screen}: ${seconds} s en ${r.seconds.toFixed(0)} s (${r.fps.toFixed(1)} fps) → ${out}`);
}

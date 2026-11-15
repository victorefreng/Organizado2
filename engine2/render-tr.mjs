/**
 * RENDER DE TRANSICIONES.
 *
 *   node engine2/render-tr.mjs TR-002 main                  → dist/packages/TR-002/main.mp4
 *   node engine2/render-tr.mjs TR-002 main --still 40,120   → fotogramas sueltos
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderVideo, renderStill, FPS } from './lib.mjs';
import { makeTransition } from './transition.mjs';

const [id, screen] = process.argv.slice(2);
const opt = (k, d = null) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const root = resolve('.');
const piece = JSON.parse(readFileSync(join(root, 'production/pieces', id, 'piece.json'), 'utf8'));
const world = (await import(`./worlds/${piece.worldModule}.mjs`)).default;
const wpiece = JSON.parse(readFileSync(join(root, 'production/pieces', world.id, 'piece.json'), 'utf8'));
const frames = Math.round(piece.durationSeconds * FPS);
const draw = makeTransition({
  worldDraw: world.screens[screen](), worldFrames: Math.round(wpiece.screens[screen].loopSeconds * FPS),
  screen, frames, seed: id
});

if (opt('still')) {
  const base = opt('out', `dist/.stills/${id}-${screen}`);
  for (const n of opt('still').split(',').map(Number)) await renderStill({ out: `${base}-${String(n).padStart(5, '0')}.png`, frame: n, frames, draw });
  console.log(`${id} ${screen}: fotogramas en ${base}-*.png`);
} else {
  const out = opt('out', `dist/packages/${id}/${screen}.mp4`);
  const r = await renderVideo({ out, frames, draw });
  console.log(`✓ ${id} ${screen}: ${piece.durationSeconds} s en ${r.seconds.toFixed(0)} s (${r.fps.toFixed(1)} fps) → ${out}`);
}

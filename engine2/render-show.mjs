/**
 * RENDER DE CAPÍTULOS.
 *
 *   node engine2/render-show.mjs SH-001 main                       → dist/packages/SH-001/main.mp4
 *   node engine2/render-show.mjs SH-001 main --still 12,50,80      → fotogramas, en SEGUNDOS
 */
import { renderVideo, renderStill, FPS } from './lib.mjs';

const [id, screen] = process.argv.slice(2);
const opt = (k, d = null) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const mod = await import(`./shows/${id.toLowerCase().replace('-', '')}.mjs`);
const frames = Math.round(mod.DURATION * FPS);
const draw = await mod.make(screen);
if (opt('still')) {
  const base = opt('out', `dist/.stills/${id}-${screen}`);
  for (const s of opt('still').split(',').map(Number)) await renderStill({ out: `${base}-${String(Math.round(s * 10)).padStart(5, '0')}.png`, frame: Math.round(s * FPS), frames, draw });
  console.log(`${id} ${screen}: fotogramas en ${base}-*.png`);
} else {
  const out = opt('out', `dist/packages/${id}/${screen}.mp4`);
  const r = await renderVideo({ out, frames, draw, onProgress: (n, t, fps) => console.log(`  ${id} ${screen} ${n}/${t} · ${fps.toFixed(1)} fps`) });
  console.log(`✓ ${id} ${screen}: ${mod.DURATION} s en ${r.seconds.toFixed(0)} s (${r.fps.toFixed(1)} fps) → ${out}`);
}

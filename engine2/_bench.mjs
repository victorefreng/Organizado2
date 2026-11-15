// Prueba de velocidad: ¿cuántos fotogramas por segundo da un lienzo nativo
// dibujando ~900 sprites pre-desenfocados y mandando RGBA crudo a ffmpeg?
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';

const W = 1280, H = 720, FPS = 30, FRAMES = 450;

// sprite precalculado: el desenfoque se paga UNA vez, no en cada fotograma
function sprite(size, color) {
  const c = createCanvas(size, size); const g = c.getContext('2d');
  const r = g.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  r.addColorStop(0, color); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, size, size);
  return c;
}
const dot = sprite(32, 'rgba(232,247,255,1)');
const blob = sprite(512, 'rgba(127,227,255,0.5)');

const canvas = createCanvas(W, H); const ctx = canvas.getContext('2d');
const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
  '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-g', '30', '-keyint_min', '30', '-sc_threshold', '0', '-movflags', '+faststart',
  'engine2/_bench.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });

let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const ps = Array.from({ length: 900 }, () => ({ x: rnd() * W, y: rnd() * H, s: 4 + rnd() * 26, a: 0.1 + rnd() * 0.5, ph: rnd(), c: 1 + Math.floor(rnd() * 4) }));
const bl = Array.from({ length: 24 }, () => ({ x: rnd() * W, y: rnd() * H, s: 200 + rnd() * 500, a: 0.1 + rnd() * 0.3, ph: rnd() }));

const t0 = Date.now();
for (let f = 0; f < FRAMES; f++) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0A6E8C'); g.addColorStop(0.4, '#063D56'); g.addColorStop(1, '#000507');
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  const k = (f / FRAMES) * Math.PI * 2;
  for (const b of bl) { ctx.globalAlpha = b.a; ctx.drawImage(blob, b.x + Math.sin(k + b.ph * 6.28) * 40 - b.s / 2, b.y - b.s / 2, b.s, b.s); }
  for (const p of ps) { ctx.globalAlpha = p.a; ctx.drawImage(dot, p.x + Math.sin(k * p.c + p.ph * 6.28) * 30 - p.s / 2, p.y + Math.cos(k * p.c + p.ph * 9) * 18 - p.s / 2, p.s, p.s); }
  const buf = canvas.data();           // RGBA crudo, sin codificar a imagen
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
const s = (Date.now() - t0) / 1000;
console.log(`${FRAMES} fotogramas en ${s.toFixed(1)} s  →  ${(FRAMES / s).toFixed(1)} fps`);

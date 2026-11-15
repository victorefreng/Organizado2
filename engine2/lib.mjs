/**
 * MOTOR DE LIENZO NATIVO.
 *
 * Por qué existe: renderizar los mundos con un navegador sin GPU daba entre 1,2
 * y 2,2 fotogramas por segundo, porque el navegador repinta cientos de
 * elementos desenfocados por software en cada fotograma. Aquí no hay navegador:
 * se dibuja en un lienzo Skia nativo y los fotogramas van crudos a ffmpeg.
 *
 * La regla que lo hace rápido es la que recomienda la propia documentación de
 * Remotion para máquinas sin GPU: todo desenfoque se paga UNA vez, al crear el
 * sprite, y nunca en el fotograma.
 */
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const TAU = Math.PI * 2;
export const W = 1280, H = 720, FPS = 30;

// ─────────────────────────── azar determinista ───────────────────────────

export function makeRng(seed) {
  let a = typeof seed === 'string'
    ? [...seed].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261)
    : seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + r() * (hi - lo);
  r.int = (lo, hi) => Math.floor(r.range(lo, hi + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.gauss = () => (r() + r() + r() + r() - 2) / 0.82;
  return r;
}

// ─────────────────────────── bucle perfecto ───────────────────────────

/**
 * Toda animación usa estas funciones, y `c` (ciclos) es SIEMPRE un entero:
 * la capa da un número entero de vueltas en la duración del bucle, así que el
 * fotograma T es idéntico al fotograma 0. El bucle cierra por matemática.
 */
export const lsin = (f, T, c = 1, ph = 0) => Math.sin(((f / T) * c + ph) * TAU);
export const lcos = (f, T, c = 1, ph = 0) => Math.cos(((f / T) * c + ph) * TAU);
/** Avance 0→1 en una sola dirección que reentra: para nubes y polvo. */
export const lramp = (f, T, c = 1, ph = 0) => ((((f / T) * c + ph) % 1) + 1) % 1;

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

export function rgba(hex, a = 1) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

// ─────────────────────────── sprites precalculados ───────────────────────────

/** Resplandor radial. `power` controla lo concentrado que está el núcleo. */
export function glow(size, hex, { power = 2, alpha = 1 } = {}) {
  const c = createCanvas(size, size), g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    grad.addColorStop(t, rgba(hex, alpha * Math.pow(1 - t, power)));
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Fondo estático por gradiente lineal: se dibuja una vez y se reutiliza. */
export function bgLinear(stops, angleDeg = 180, w = W, h = H) {
  const c = createCanvas(w, h), g = c.getContext('2d');
  const a = (angleDeg - 90) * Math.PI / 180;
  const cx = w / 2, cy = h / 2, L = Math.abs(w * Math.cos(a)) / 2 + Math.abs(h * Math.sin(a)) / 2;
  const grad = g.createLinearGradient(cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
  for (const [t, col] of stops) grad.addColorStop(t, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  return c;
}

export function bgRadial(cxp, cyp, rp, stops, w = W, h = H) {
  const c = createCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = stops[stops.length - 1][1];
  g.fillRect(0, 0, w, h);
  const grad = g.createRadialGradient(w * cxp, h * cyp, 0, w * cxp, h * cyp, Math.hypot(w, h) * rp);
  for (const [t, col] of stops) grad.addColorStop(t, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  return c;
}

/**
 * Viñeta que llega a negro real. En proyección, un negro levantado se ve como
 * un velo gris sobre toda la imagen, así que los bordes tienen que cerrar.
 */
export function vignette(strength = 0.85, rgb = '0,2,4', inner = 0.3, cy = 0.46) {
  const c = createCanvas(W, H), g = c.getContext('2d');
  const grad = g.createRadialGradient(W / 2, H * cy, H * inner, W / 2, H * cy, Math.hypot(W, H) * 0.58);
  grad.addColorStop(0, `rgba(${rgb},0)`);
  grad.addColorStop(0.55, `rgba(${rgb},${strength * 0.45})`);
  grad.addColorStop(1, `rgba(${rgb},${strength})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  return c;
}

/** Grano fino: rompe el bandeo de los degradados oscuros en 8 bits. */
export function grainTile(size = 256, seed = 91, amp = 26) {
  const c = createCanvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const r = makeRng(seed);
  for (let i = 0; i < size * size; i++) {
    const v = 128 + (r() - 0.5) * amp * 2;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Dibuja una textura en mosaico con desplazamiento. */
export function tile(ctx, tex, size, ox, oy, w = W, h = H) {
  const sx = (((ox % size) + size) % size) - size;
  const sy = (((oy % size) + size) % size) - size;
  for (let y = sy; y < h; y += size) {
    for (let x = sx; x < w; x += size) ctx.drawImage(tex, x, y, size, size);
  }
}

/** Aplica la deriva de cámara: un empuje lentísimo que cierra en ciclo. */
export function drift(ctx, f, T, amp = 0.02, fn) {
  const s = 1.08 + lsin(f, T, 1, 0.4) * 0.015;
  const dx = lsin(f, T, 1) * amp * W;
  const dy = lcos(f, T, 1, 0.17) * amp * 0.5 * H;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(s, s);
  ctx.translate(-W / 2 + dx, -H / 2 + dy);
  fn();
  ctx.restore();
}

/** Cierre común de todo fotograma: viñeta y grano. */
export function finish(ctx, f, vig, grain) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(vig, 0, 0);
  if (grain) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.11;
    // el desplazamiento depende solo del índice de fotograma: idéntico en cada vuelta
    tile(ctx, grain, 256, (f * 73) % 256, (f * 151) % 256);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────── salida ───────────────────────────

function resetCtx(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Renderiza a H.264 cumpliendo el contrato de entrega: yuv420p, 30 fps
 * constantes, un fotograma clave por segundo, sin audio y con faststart.
 */
export async function renderVideo({ out, frames, draw, fps = FPS, crf = 18, preset = 'medium', onProgress = null }) {
  mkdirSync(dirname(out), { recursive: true });
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-r', String(fps), '-g', String(fps), '-keyint_min', String(fps), '-sc_threshold', '0',
    '-x264-params', `keyint=${fps}:min-keyint=${fps}:scenecut=0`,
    '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    resetCtx(ctx);
    draw(ctx, f, frames);
    if (!ff.stdin.write(canvas.data())) await new Promise((r) => ff.stdin.once('drain', r));
    if (onProgress && f % 300 === 299) onProgress(f + 1, frames, (f + 1) / ((Date.now() - t0) / 1000));
  }
  ff.stdin.end();
  const code = await new Promise((r) => ff.on('close', r));
  if (code !== 0) throw new Error(`ffmpeg terminó con código ${code}`);
  return { seconds: (Date.now() - t0) / 1000, fps: frames / ((Date.now() - t0) / 1000) };
}

/** Un solo fotograma a PNG: para verificar sin renderizar el vídeo entero. */
export async function renderStill({ out, frame, frames, draw }) {
  mkdirSync(dirname(out), { recursive: true });
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  resetCtx(ctx);
  draw(ctx, frame, frames);
  writeFileSync(out, await canvas.encode('png'));
}

export { createCanvas };

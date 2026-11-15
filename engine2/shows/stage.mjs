/**
 * ESCENARIO DE LOS CAPÍTULOS: lo que todos comparten.
 *
 * Un capítulo es una pila de escenas (cada una entra fundiéndose sobre la
 * anterior) más una capa de acción encima. Todos empiezan con un destello
 * dorado, que tapa el fundido de entrada venga del mundo que venga, y todos
 * terminan en el final exacto del bucle del mundo donde aterrizan.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { W, H, TAU, FPS, makeRng, glow, createCanvas, clamp01 } from '../lib.mjs';
import { ss, eo } from './kit.mjs';

export const P = 900;                                    // periodo de las capas de partículas: 30 s
export const WORLD_COLORS = ['#5FD8FF', '#8FD6A8', '#B06BFF', '#FFD9A0', '#FF9AB8'];
const root = resolve('.');
export const J = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
export const rootPath = (...p) => join(root, ...p);
const MODS = { clouds: ['clouds', 'AMBIENT-001'], ocean: ['ocean', 'AMBIENT-002'], jungle: ['jungle', 'AMBIENT-003'], galaxy: ['galaxy', 'AMBIENT-004'], redroom: ['redroom', 'AMBIENT-005'], capsule: ['capsule', 'AMBIENT-106'] };

/** Carga un mundo listo para dibujar: { draw, T }. */
export async function world(name, screen) {
  const [mod, id] = MODS[name];
  const w = (await import(`../worlds/${mod}.mjs`)).default;
  return { draw: w.screens[screen](), T: Math.round(J(`production/pieces/${id}/piece.json`).screens[screen].loopSeconds * FPS), name };
}

export function sceneStack(scenes) {
  const tmp = createCanvas(W, H), tg = tmp.getContext('2d');
  return (ctx, t, f) => {
    let top = 0;
    for (let i = 0; i < scenes.length; i++) if (t >= scenes[i].at + scenes[i].fade) top = i;
    scenes[top].draw(ctx, t, f);
    for (let i = top + 1; i < scenes.length; i++) {
      const a = ss(scenes[i].at, scenes[i].at + scenes[i].fade, t);
      if (a <= 0.001) continue;
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalAlpha = 1; tg.globalCompositeOperation = 'source-over';
      scenes[i].draw(tg, t, f);
      ctx.globalAlpha = a; ctx.drawImage(tmp, 0, 0); ctx.globalAlpha = 1;
    }
  };
}

export const worldScene = (w, { dim = 1, push = null, frameOf = null, tint = null, post = null } = {}) => (ctx, t, f) => {
  const s = push ? push(t) : 1;
  if (s !== 1) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); }
  w.draw(ctx, frameOf ? frameOf(f) : f % w.T, w.T);
  if (s !== 1) ctx.restore();
  if (tint) { ctx.globalCompositeOperation = tint[1] || 'overlay'; ctx.fillStyle = tint[0]; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  if (post) post(ctx, t, f);
  if (dim < 1) { ctx.fillStyle = `rgba(2,2,8,${1 - dim})`; ctx.fillRect(0, 0, W, H); }
};

/** Escena de aterrizaje: el mundo de destino colocado para acabar en su último fotograma. */
export const landing = (w, seconds) => { const TT = Math.round(seconds * FPS); return worldScene(w, { frameOf: (f) => (w.T - (TT - f) % w.T) % w.T }); };

const flashSpr = glow(1800, '#FFF3D8', { power: 1.7 });
export function flash(ctx, t, t0, rise, fall, strength = 1, cx = 0.5, cy = 0.55, tint = '#FFE9C2') {
  const k = t < t0 ? ss(t0 - rise, t0, t) : 1 - ss(t0, t0 + fall, t);
  if (k <= 0.002) return;
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(1, k * strength); ctx.drawImage(flashSpr, W * cx - 900, H * cy - 900, 1800, 1800);
  ctx.globalAlpha = Math.min(1, k * strength * 0.5); ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
/** El destello de entrada de todo capítulo. */
export const intro = (ctx, t, strength = 0.8) => flash(ctx, t, 0.38, 0.38, 1.7, strength);

export function ring(ctx, cx, cy, rx, ry, alpha, width = 5, color = '255,226,176') {
  if (alpha <= 0.003 || rx < 2) return;
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, a] of [[width * 5, 0.12], [width * 2.2, 0.3], [width, 0.9]]) {
    ctx.strokeStyle = `rgba(${color},${Math.min(1, a * alpha)})`; ctx.lineWidth = w;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Partículas que acuden a un punto (k 0→1) o salen de él (reverse). */
export function gather({ seed, n, cx = 0.5, cy = 0.5, colors = WORLD_COLORS, far = [760, 1150], size = [6, 18] }) {
  const r = makeRng(seed), dots = colors.map((c) => glow(48, c, { power: 2.2 }));
  const ps = Array.from({ length: n }, () => ({ a: r() * TAU, d: r.range(far[0], far[1]), delay: r() * 0.55, s: r.range(size[0], size[1]), spr: dots[Math.floor(r() * dots.length)], sw: r.range(0.8, 2.2) * (r() < 0.5 ? -1 : 1) }));
  return (ctx, k, { reverse = false, x = cx * W, y = cy * H, alpha = 1 } = {}) => {
    if (k <= 0 || k >= 1) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of ps) {
      let l = clamp01((k - p.delay * 0.6) / (1 - p.delay * 0.6));
      if (l <= 0 || l >= 1) continue;
      const e = reverse ? 1 - eo(l) : Math.pow(l, 2.4), ang = p.a + e * p.sw, d = p.d * (1 - e);
      ctx.globalAlpha = alpha * Math.min(1, l * 5) * (1 - ss(0.9, 1, l));
      const s = p.s * (1 - e * 0.5);
      ctx.drawImage(p.spr, x + Math.cos(ang) * d - s / 2, y + Math.sin(ang) * d * 0.62 - s / 2, s, s);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}

/** Fondo de escenario oscuro con un color dominante, para capítulos que no viven en un mundo. */
export function voidStage(inner, mid, outer = '#040308', cx = 0.5, cy = 0.5) {
  const c = createCanvas(W, H), g = c.getContext('2d');
  const gr = g.createRadialGradient(W * cx, H * cy, 0, W * cx, H * cy, Math.hypot(W, H) * 0.62);
  gr.addColorStop(0, inner); gr.addColorStop(0.5, mid); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return c;
}

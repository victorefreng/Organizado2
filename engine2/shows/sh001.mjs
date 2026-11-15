/**
 * SH-001 · THE AWAKENING — 3:40, el opening.
 *
 * Tres vídeos sincronizados. La línea de tiempo es la del guion técnico
 * (docs/08-SH-001-storyboard.md); los textos salen de production/config/textos.json
 * y las fotos de production/config/fotos.json, así que cambiar una palabra o
 * una foto es volver a renderizar, no volver a animar.
 *
 * Los últimos fotogramas son el final exacto del bucle de CLOUDS: al terminar,
 * AMBIENT-001 arranca en su fotograma cero y no hay empalme.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { W, H, TAU, FPS, makeRng, glow, bgRadial, bgLinear, vignette, grainTile, finish, createCanvas, clamp01 } from '../lib.mjs';
import { blurred, raySprite, flareSprite } from '../tex.mjs';
import { motes, rays } from '../layers.mjs';
import { goldenStar } from '../star.mjs';
import jungle, { state as jungleState, leafSet, STYLE } from '../worlds/jungle.mjs';
import ocean from '../worlds/ocean.mjs';
import clouds from '../worlds/clouds.mjs';
import galaxy from '../worlds/galaxy.mjs';
import { ss, prog, eo, back, win, textFx, flowers, flowerSprite, photoCard, drawCard, butterfly, whaleSide, whaleBelow } from './kit.mjs';

export const DURATION = 220;
const TT = DURATION * FPS;
const root = resolve('.');
const J = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const loopFrames = (id, screen) => Math.round(J(`production/pieces/${id}/piece.json`).screens[screen].loopSeconds * FPS);
const P = 900;                                   // periodo de las capas de partículas: 30 s
const WORLD_COLORS = ['#5FD8FF', '#8FD6A8', '#B06BFF', '#FFD9A0', '#FF9AB8'];

// ─────────────────────────── utilidades de escena ───────────────────────────

/** Pila de escenas: cada una entra fundiéndose sobre la anterior, que sigue entera debajo. */
function sceneStack(scenes) {
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

const worldScene = (w, { dim = 1, push = null, frameOf = null, pre = null, post = null } = {}) => (ctx, t, f) => {
  const s = push ? push(t) : 1;
  if (pre) pre(t);
  if (s !== 1) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); }
  w.draw(ctx, frameOf ? frameOf(f) : f % w.T, w.T);
  if (s !== 1) ctx.restore();
  if (post) post(ctx, t, f);
  if (dim < 1) { ctx.fillStyle = `rgba(2,2,8,${1 - dim})`; ctx.fillRect(0, 0, W, H); }
};

function flash(ctx, t, t0, rise, fall, strength = 1, spr = null, cx = 0.5, cy = 0.55) {
  const k = t < t0 ? ss(t0 - rise, t0, t) : 1 - ss(t0, t0 + fall, t);
  if (k <= 0.002) return;
  ctx.globalCompositeOperation = 'screen';
  if (spr) { ctx.globalAlpha = Math.min(1, k * strength); ctx.drawImage(spr, W * cx - 900, H * cy - 900, 1800, 1800); }
  ctx.globalAlpha = Math.min(1, k * strength * 0.5); ctx.fillStyle = '#FFE9C2'; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function ring(ctx, cx, cy, rx, ry, alpha, width = 5, color = '255,226,176') {
  if (alpha <= 0.003 || rx < 2) return;
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, a] of [[width * 5, 0.12], [width * 2.2, 0.3], [width, 0.9]]) {
    ctx.strokeStyle = `rgba(${color},${Math.min(1, a * alpha)})`; ctx.lineWidth = w;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Partículas de todos los mundos que acuden al centro. */
function gather({ seed, n, cx = 0.5, cy = 0.48 }) {
  const r = makeRng(seed), dots = WORLD_COLORS.map((c) => glow(48, c, { power: 2.2 }));
  const ps = Array.from({ length: n }, () => ({ a: r() * TAU, d: r.range(760, 1150), delay: r() * 0.55, s: r.range(6, 18), spr: dots[Math.floor(r() * dots.length)], sw: r.range(0.8, 2.2) * (r() < 0.5 ? -1 : 1) }));
  return (ctx, k) => {
    if (k <= 0 || k >= 1) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of ps) {
      const l = clamp01((k - p.delay * 0.6) / (1 - p.delay * 0.6));
      if (l <= 0 || l >= 1) continue;
      const e = Math.pow(l, 2.4), ang = p.a + e * p.sw, d = p.d * (1 - e);
      ctx.globalAlpha = Math.min(1, l * 5) * (1 - ss(0.9, 1, l));
      const s = p.s * (1 - e * 0.5);
      ctx.drawImage(p.spr, cx * W + Math.cos(ang) * d - s / 2, cy * H + Math.sin(ang) * d * 0.62 - s / 2, s, s);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}

/** El lago: orilla de selva a contraluz y su reflejo, que tiembla por franjas. */
function lake({ seed, moonX = 0.7, y0 = 418 }) {
  const r = makeRng(seed);
  const shore = createCanvas(W, y0), g = shore.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, y0);
  sky.addColorStop(0, '#081A36'); sky.addColorStop(0.55, '#16425A'); sky.addColorStop(1, '#3F8780');
  g.fillStyle = sky; g.fillRect(0, 0, W, y0);
  g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.8;
  g.drawImage(glow(700, '#CFEFFF', { power: 2.6 }), W * moonX - 350, 130 - 350); g.globalAlpha = 1;
  g.drawImage(glow(90, '#FFFFFF', { power: 1.4 }), W * moonX - 45, 130 - 45);
  g.globalCompositeOperation = 'source-over';
  const line = (base, amp, col, blurPx, edge = 0) => {
    const ph = [r() * TAU, r() * TAU, r() * TAU];
    const c = blurred(W, y0, blurPx, (q) => {
      q.fillStyle = col; q.beginPath(); q.moveTo(0, y0);
      for (let x = 0; x <= W; x += 5) {
        const u = x / W, rise = edge * Math.pow(Math.abs(u - 0.5) * 2, 2.2);
        q.lineTo(x, base - rise - Math.abs(Math.sin(u * 13 + ph[0])) * amp - Math.sin(u * 41 + ph[1]) * amp * 0.35 - Math.sin(u * 97 + ph[2]) * amp * 0.16);
      }
      q.lineTo(W, y0); q.fill();
    });
    g.drawImage(c, 0, 0);
  };
  line(y0 - 46, 38, '#12443F', 3); line(y0 - 22, 46, '#082A26', 2, 150); line(y0 - 4, 30, '#031512', 1.5, 250);
  const water = bgLinear([[0, '#0F4048'], [0.5, '#06222C'], [1, '#02090E']], 180, W, H - y0);
  const glints = motes({ n: 90, seed: seed + '-brillos', color: '#D8F4FF', size: [3, 9], alpha: [0.2, 0.8], amp: [4, 14], blink: 3, region: [0, y0 / H + 0.02, 1, 1] });
  const vig = vignette(0.85, '1,5,8', 0.4, 0.5);
  return {
    y0,
    draw(ctx, t, f) {
      ctx.drawImage(shore, 0, 0);
      ctx.drawImage(water, 0, y0);
      ctx.globalAlpha = 0.5;
      for (let y = 0; y < H - y0; y += 6) {
        const dx = Math.sin(y * 0.11 + f * 0.06) * (1.5 + y * 0.05);
        ctx.drawImage(shore, 0, Math.max(0, y0 - 6 - y * 1.25), W, 7, dx, y0 + y, W, 6.5);
      }
      ctx.globalAlpha = 1;
      glints(ctx, f % P, P);
    },
    finish(ctx, f) { ctx.drawImage(vig, 0, 0); }
  };
}

/** El portal: un anillo de luz que se abre sobre el agua y deja ver la galaxia dentro. */
function portal(ctx, k, cx, cy, y0, inside, rxMax = 1000) {
  if (k <= 0) return;
  const rx = eo(k) * rxMax, ry = rx * 0.3;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y0, W, H - y0); ctx.clip();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip();
  ctx.globalAlpha = Math.min(1, k * 2.2);
  ctx.drawImage(inside, 0, y0 - 60, W, H - y0 + 120);
  ctx.restore(); ctx.globalAlpha = 1;
  ring(ctx, cx, cy, rx, ry, 1 - ss(0.75, 1, k), 4, '190,226,255');
  ring(ctx, cx, cy, rx * 0.7, ry * 0.7, (1 - ss(0.5, 0.9, k)) * 0.5, 3, '200,170,255');
}

// ─────────────────────────── el capítulo ───────────────────────────

export async function make(screen) {
  const T = J('production/config/textos.json'), F = J('production/config/fotos.json');
  const foto = (id) => join(root, 'production/fotos', [...F.protagonistas, ...F.secundarias].find((x) => x.id === id).archivo);
  const Wd = {
    jungle: { draw: jungle.screens[screen](), T: loopFrames('AMBIENT-003', screen) },
    ocean: { draw: ocean.screens[screen](), T: loopFrames('AMBIENT-002', screen) },
    clouds: { draw: clouds.screens[screen](), T: loopFrames('AMBIENT-001', screen) },
    galaxy: { draw: galaxy.screens[screen](), T: loopFrames('AMBIENT-004', screen) }
  };
  const star = goldenStar('sh001-' + screen);
  const flashSpr = glow(1800, '#FFF3D8', { power: 1.7 }), goldGlow = glow(600, '#FFD08A', { power: 2.3 }), whiteGlow = glow(300, '#FFFFFF', { power: 2.2 });
  const shade = glow(1200, '#02060A', { power: 1.2 });
  const vig = vignette(0.9, '2,2,6', 0.36, 0.5), grain = grainTile();
  const tmpG = createCanvas(W, H), tgG = tmpG.getContext('2d');
  const bubbles = motes({ n: 150, seed: 'sh1-burbujas-' + screen, color: '#E4FAFF', size: [4, 16], alpha: [0.2, 0.75], amp: [6, 26], rise: 5 });
  const embers = motes({ n: 150, seed: 'sh1-brasas-' + screen, color: '#FFC870', size: [3, 10], alpha: [0.2, 0.9], amp: [8, 36], rise: 3, blink: 2 });
  const gatherFx = gather({ seed: 'sh1-reunir-' + screen, n: screen === 'main' ? 300 : 170 });
  const landing = worldScene(Wd.clouds, { frameOf: (f) => (Wd.clouds.T - (TT - f) % Wd.clouds.T) % Wd.clouds.T });
  const growJungle = (t) => { jungleState.grow = t < 70 ? Math.max(0.02, eo(prog(t, 59.2, 69)) * 0.999) : 1; };
  const warmTint = (ctx, t) => {
    const a = 0.1 + 0.36 * (1 - ss(60, 78, t));
    ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,186,90,${a})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; jungleState.grow = 1;
  };
  const black = { at: 0, fade: 0, draw: (ctx) => { ctx.fillStyle = '#020204'; ctx.fillRect(0, 0, W, H); } };
  const washes = (ctx, t, f) => {
    // inmersión (2:06) y salida a la superficie (2:42): el mismo lavado de luz y burbujas
    const b = win(t, 126.3, 140, 1.4, 5) + win(t, 159.5, 167.5, 1.6, 2.4);
    if (b > 0.003) bubbles(ctx, f % P, P, Math.min(1, b));
    const dive = win(t, 126.2, 131.5, 2.2, 2.6);
    if (dive > 0.003) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(170,232,255,${0.6 * dive})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
    const up = win(t, 162.2, 168, 2.2, 2.6);
    if (up > 0.003) {
      ctx.globalCompositeOperation = 'screen';
      const s = 900 + 2600 * ss(161.5, 165.5, t);
      ctx.globalAlpha = up; ctx.drawImage(goldGlow, W / 2 - s / 2, -s * 0.42, s, s);
      ctx.globalAlpha = 1; ctx.fillStyle = `rgba(255,246,224,${0.8 * up})`; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  // ═════════════════════════ MAIN ═════════════════════════
  if (screen === 'main') {
    const hills = blurred(W, 260, 2.4, (g) => {
      g.fillStyle = '#03050A'; g.beginPath(); g.moveTo(0, 260);
      for (let x = 0; x <= W; x += 6) { const u = x / W; g.lineTo(x, 120 - Math.sin(u * 5.2 + 0.6) * 26 - Math.sin(u * 13 + 2) * 10 + Math.pow(Math.abs(u - 0.5) * 2, 2) * -46); }
      g.lineTo(W, 260); g.fill();
    });
    const soil = bgRadial(0.5, 0.84, 0.5, [[0, '#8A5416'], [0.2, '#462A0A'], [0.55, '#150D05'], [1, '#040302']]);
    const GX = W / 2, GY = H * 0.8;
    const leaf = blurred(180, 90, 0.8, (g) => {
      const gr = g.createLinearGradient(0, 45, 180, 45);
      gr.addColorStop(0, '#2E8A4E'); gr.addColorStop(0.6, '#8FE08A'); gr.addColorStop(1, '#E9FFB0');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 45); g.bezierCurveTo(50, -6, 130, 0, 178, 45); g.bezierCurveTo(130, 90, 50, 96, 0, 45); g.fill();
      g.strokeStyle = 'rgba(255,255,220,0.5)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(4, 45); g.lineTo(172, 45); g.stroke();
    });
    const lk = lake({ seed: 'sh1-lago-main', moonX: 0.72 });
    const TX = W / 2, TY = lk.y0 + 96;
    const fl = flowers({ seed: 'sh1-main-flores', n: 30, from: 69, to: 82, region: [0, 0.46, 1, 0.98], avoid: [0.5, 0.5, 0.3, 0.24] });
    const leaves = leafSet(71, STYLE.lit, ['fern', 'broad', 'fern']);
    const blooms = [flowerSprite('#FFB7C9', '#FF8FB0', 1), flowerSprite('#FFE3B0', '#FFC06A', 2), flowerSprite('#FFFFFF', '#FFD98A', 4)];
    const cards = {
      p01: await photoCard(foto('p01'), { maxW: 620, maxH: 500, leaves, blooms, seed: 1 }),
      p02: await photoCard(foto('p02'), { maxW: 620, maxH: 500, leaves, blooms, seed: 2 }),
      p04: await photoCard(foto('p04'), { maxW: 620, maxH: 500, leaves, blooms, seed: 4 })
    };
    const l1 = textFx({ text: T.paraTi.linea1, size: 74, y: H * 0.47, seed: 'l1', n: 700 });
    const l2 = textFx({ text: T.paraTi.linea2, size: 100, y: H * 0.47, seed: 'l2', tracking: 0.14, n: 700 });
    const title = textFx({ text: T.titulo, size: 138, y: H * 0.43, seed: 'titulo', tracking: 0.2, n: 950, colors: WORLD_COLORS, scatter: 640 });
    const sub = textFx({ text: T.mensajeFinal.texto, size: 40, y: H * 0.64, seed: 'final', italic: true, tracking: 0.06, n: 420, scatter: 220 });
    const fly = butterfly(), whale = whaleSide();

    const pathOut = (p) => [W * (0.5 + 0.66 * p), H * (0.5 - 0.72 * p - 0.1 * Math.sin(Math.PI * p))];
    const pathDown = (p) => [W * (1.06 - 0.56 * p), H * (-0.12 + 0.92 * Math.pow(p, 1.5))];
    const pathBack = (p) => { const th = 2.3 * Math.PI * (1 - p) + 0.6, rad = Math.pow(1 - p, 1.15) * 640; return [W / 2 + Math.cos(th) * rad, H * 0.48 + Math.sin(th) * rad * 0.58]; };

    const scenes = sceneStack([
      black,
      { at: 19.2, fade: 2.6, draw: (ctx, t, f) => {
        worldScene(Wd.galaxy, { dim: 0.8 })(ctx, t, f);
        const ga = ss(35.5, 40.5, t); if (ga > 0) { ctx.globalAlpha = ga; ctx.drawImage(hills, 0, H - 236); ctx.globalAlpha = 1; }
      } },
      { at: 45.15, fade: 2.6, draw: (ctx, t, f) => {
        const s = 1 + 0.12 * ss(49, 60, t);
        ctx.save(); ctx.translate(GX, H * 0.62); ctx.scale(s, s); ctx.translate(-GX, -H * 0.62);
        ctx.drawImage(soil, -40, -40, W + 80, H + 80);
        ctx.drawImage(hills, 0, H - 236);
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 0.8 + 0.2 * Math.sin(f * 0.16);
        ctx.globalAlpha = 0.9 * pulse; ctx.drawImage(goldGlow, GX - 420, GY - 300, 840, 600);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        // el brote: un tallo que sube y dos hojas que se abren
        const g = eo(prog(t, 49.4, 56.8)), n = 26, len = 310 * g;
        if (g > 0.005) {
          ctx.lineCap = 'round';
          for (let k = 0; k < n; k++) {
            const a = k / n, b = (k + 1) / n, px = (u) => GX + Math.sin(u * 2.4) * 30 * g, py = (u) => GY - u * len;
            ctx.strokeStyle = `rgb(${Math.round(60 + 110 * a)},${Math.round(150 + 80 * a)},${Math.round(80 + 60 * a)})`;
            ctx.lineWidth = 13 * (1 - a * 0.62) * Math.min(1, g * 3);
            ctx.beginPath(); ctx.moveTo(px(a), py(a)); ctx.lineTo(px(b), py(b)); ctx.stroke();
          }
          const tx = GX + Math.sin(2.4) * 30 * g, ty = GY - len;
          for (const [open, sc, yy] of [[back(prog(t, 53, 58)), 1, 0], [back(prog(t, 55.2, 59.6)), 0.62, 0.42]]) {
            if (open <= 0.01) continue;
            const bx = yy ? GX + Math.sin((1 - yy) * 2.4) * 30 * g : tx, by = yy ? GY - len * (1 - yy) : ty;
            for (const side of [-1, 1]) {
              ctx.save(); ctx.translate(bx, by); ctx.scale(side, 1); ctx.rotate(-1.35 + 1.02 * Math.min(1, open) + Math.sin(f * 0.05) * 0.03);
              ctx.drawImage(leaf, 0, -45 * sc * open, 180 * sc * open, 90 * sc * open); ctx.restore();
            }
          }
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7 * g;
          ctx.drawImage(goldGlow, tx - 150, ty - 150, 300, 300); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
        embers(ctx, f % P, P, 0.9);
        ctx.restore();
        finish(ctx, f, vig, grain);
      } },
      { at: 59, fade: 3.6, draw: worldScene(Wd.jungle, { push: (t) => 1 + 0.07 * ss(62, 110, t), pre: growJungle, post: warmTint }) },
      { at: 114, fade: 5.2, draw: (ctx, t, f) => {
        const s = 1 + 1.7 * Math.pow(ss(126, 130.2, t), 2);
        ctx.save(); ctx.translate(TX, TY); ctx.scale(s, s); ctx.translate(-TX, -TY);
        lk.draw(ctx, t, f);
        const k = prog(t, 120.3, 126.4);
        if (k > 0) {
          tgG.setTransform(1, 0, 0, 1, 0, 0); tgG.globalAlpha = 1; tgG.globalCompositeOperation = 'source-over';
          Wd.galaxy.draw(tgG, f % Wd.galaxy.T, Wd.galaxy.T);
          portal(ctx, k, TX, TY, lk.y0, tmpG);
        }
        ctx.restore();
        lk.finish(ctx, f);
      } },
      { at: 126.6, fade: 3.4, draw: worldScene(Wd.ocean) },
      { at: 163.6, fade: 4, draw: worldScene(Wd.clouds, { push: (t) => 1 + 0.05 * ss(168, 188, t) }) },
      { at: 180, fade: 8, draw: worldScene(Wd.galaxy, { push: (t) => 1 + 0.1 * ss(180, 216, t) }) },
      { at: 215.2, fade: 3.3, draw: landing }
    ]);

    return (ctx, f) => {
      const t = f / FPS;
      scenes(ctx, t, f);

      // 0:08 · el primer punto de luz, con latido
      if (t >= 8 && t < 19.5) {
        const a = ss(8, 12.5, t), beat = 1 + 0.3 * Math.pow(Math.max(0, Math.sin((t - 8) * TAU / 2.3)), 8) + 0.16 * Math.pow(Math.max(0, Math.sin((t - 8.35) * TAU / 2.3)), 8);
        const sz = (8 + 30 * ss(8, 17.5, t)) * beat * (1 - 0.86 * ss(18, 19.15, t));
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55 * a; ctx.drawImage(goldGlow, W / 2 - sz * 5, H * 0.5 - sz * 5, sz * 10, sz * 10);
        ctx.globalAlpha = a; ctx.drawImage(whiteGlow, W / 2 - sz, H * 0.5 - sz, sz * 2, sz * 2);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // 0:19 · estalla y nace la estrella
      flash(ctx, t, 19.25, 0.14, 2.6, 1, flashSpr, 0.5, 0.5);
      ring(ctx, W / 2, H * 0.5, eo(prog(t, 19.2, 21.6)) * 980, eo(prog(t, 19.2, 21.6)) * 980, (1 - prog(t, 19.2, 21.6)) * 0.9);
      if (t >= 19.2 && t < 29.4) {
        const p = eo(prog(t, 23, 29.2)) * 0.2 + Math.pow(prog(t, 23, 29.2), 2) * 0.8, [x, y] = pathOut(p);
        star.trail(ctx, pathOut, p, 1, 1, f);
        star.body(ctx, x, y, 0.22 + 0.4 * ss(19.2, 22.5, t), ss(19.2, 19.6, t), f);
      }
      // 0:37 · vuelve por arriba y cae hacia el suelo
      if (t >= 36.8 && t < 45.2) {
        const p = Math.pow(prog(t, 37, 45), 1.25), [x, y] = pathDown(p);
        star.trail(ctx, pathDown, p, 1, 1, f); star.body(ctx, x, y, 0.6, 1 - ss(44.9, 45.1, t), f);
      }
      // 0:45 · impacto
      flash(ctx, t, 45.08, 0.1, 3.6, 1, flashSpr, 0.5, 0.8);
      { const k = prog(t, 45, 49.4), rx = eo(k) * 1150; ring(ctx, GX, GY, rx, rx * 0.16, (1 - k) * 0.95, 6); ring(ctx, GX, GY, rx * 0.62, rx * 0.1, (1 - k) * 0.5, 4); }

      // 1:09 · flores; 1:18 · PARA TI
      if (t > 68.5 && t < 119) fl(ctx, t, f, 1 - ss(113.5, 118.5, t));
      const dimA = 0.5 * win(t, 77.6, 108.6, 1.6, 1.6);
      if (dimA > 0.003) { ctx.globalAlpha = dimA; ctx.drawImage(shade, W / 2 - 720, H * 0.48 - 420, 1440, 840); ctx.globalAlpha = 1; }
      l1(ctx, prog(t, 78.5, 81.7), prog(t, 84.0, 85.5), f);
      l2(ctx, prog(t, 85.5, 87.9), prog(t, 88.9, 90.3), f);

      // 1:30 · los recuerdos
      drawCard(ctx, cards.p01, W / 2, H * 0.5, t, 90.3, 97.6, f, { tilt: -0.012 });
      drawCard(ctx, cards.p02, W / 2, H * 0.5, t, 97.3, 103.0, f, { tilt: 0.014 });
      drawCard(ctx, cards.p04, W / 2, H * 0.5, t, 102.7, 108.5, f, { tilt: -0.008 });

      // 1:48 · la mariposa nace de una flor y nos lleva al lago
      if (t >= 108 && t < 122.2) {
        const a = prog(t, 108, 114), b = ss(114, 120.2, t), c = ss(120.2, 121.2, t);
        let x = W * (0.4 + 0.22 * eo(a)), y = H * (0.72 - 0.36 * eo(a));
        x += (TX - x) * b; y += (TY - 46 - y) * b; y += 46 * c;
        x += Math.sin(t * 2.3) * 22 * (1 - b * 0.7); y += Math.sin(t * 3.7) * 14 * (1 - b * 0.7);
        fly(ctx, x, y, (0.55 * back(prog(t, 108, 109.6))) * (1 - 0.5 * b), f, 1 - ss(120.9, 122, t), Math.sin(t * 1.3) * 0.3);
      }
      { const k = prog(t, 120.25, 121.6); if (k > 0 && k < 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(Math.PI * k); ctx.drawImage(whiteGlow, TX - 190, TY - 190, 380, 380); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } }

      // 2:30 · la ballena se acerca
      if (t >= 148.5 && t < 167) {
        const k = eo(prog(t, 148.5, 166));
        whale(ctx, W * (1.34 - 0.92 * k), H * (0.5 - 0.05 * k) + Math.sin(t * 0.7) * 14, 0.42 + 0.56 * k, f, 0.9 * win(t, 148.5, 167, 3.5, 3));
      }
      washes(ctx, t, f);

      // 3:08 · la estrella vuelve; 3:21 · reúne partículas de todos los mundos y estalla
      if (t >= 188.4 && t < 208.7) {
        const p = eo(prog(t, 188.6, 200.8)), [x, y] = pathBack(p);
        star.trail(ctx, pathBack, p, 1, 1 - ss(200.5, 201.5, t), f);
        star.body(ctx, x, y, 0.16 + 0.5 * p + 0.5 * Math.pow(prog(t, 201, 208), 1.6), ss(188.4, 190, t) * (1 - ss(208, 208.6, t)), f);
      }
      gatherFx(ctx, prog(t, 201.2, 208.05));
      flash(ctx, t, 208.08, 0.12, 3.4, 1, flashSpr, 0.5, 0.48);
      { const k = prog(t, 208, 211.2), r = eo(k) * 1100; ring(ctx, W / 2, H * 0.48, r, r * 0.62, (1 - k) * 0.9, 6); }
      const tA = 0.34 * win(t, 208.2, 217, 1.5, 1.6);
      if (tA > 0.003) { ctx.globalAlpha = tA; ctx.drawImage(shade, W / 2 - 760, H * 0.5 - 420, 1520, 840); ctx.globalAlpha = 1; }
      title(ctx, prog(t, 208.15, 211.3), prog(t, 215.3, 217.5), f);
      sub(ctx, prog(t, 211.5, 213.6), prog(t, 215.0, 216.8), f);
    };
  }

  // ═════════════════════════ CEILING ═════════════════════════
  if (screen === 'ceiling') {
    const first = motes({ n: 110, seed: 'sh1-ceil-primeras', color: '#FFF3D6', size: [3, 9], alpha: [0.2, 0.9], amp: [0, 0], blink: 2 });
    const mistBg = bgRadial(0.5, 0.5, 0.6, [[0, '#9A6820'], [0.34, '#4A2E0A'], [0.7, '#150D05'], [1, '#050302']]);
    const mistRays = rays({ n: 12, seed: 'sh1-ceil-rayos', sprite: raySprite(192, 768, '#FFE2A0'), from: [0.5, 0.5], intensity: 1, alpha: [0.08, 0.24], len: [0.7, 1.1], width: [120, 320] });
    const petal = blurred(48, 48, 1, (g) => { g.fillStyle = '#FFC2D2'; g.beginPath(); g.ellipse(24, 24, 20, 11, 0.5, 0, TAU); g.fill(); });
    const petals = motes({ n: 70, seed: 'sh1-ceil-petalos', sprite: petal, size: [12, 30], alpha: [0.4, 0.95], amp: [20, 70], rise: -2, blend: 'source-over' });
    const fly = butterfly(), whale = whaleBelow();
    const fl = flareSprite(256, '#FFE9B0');
    const heart = Array.from({ length: 14 }, (_, i) => { const th = (i / 14) * TAU; return [W / 2 + 16 * Math.pow(Math.sin(th), 3) * 15, H * 0.46 - (13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)) * 15]; });
    const cross1 = (p) => [W * (-0.14 + 1.28 * p), H * (0.78 - 0.52 * p - 0.13 * Math.sin(Math.PI * p))];
    const cross2 = (p) => [W * (1.14 - 1.28 * p), H * (0.2 + 0.5 * p + 0.1 * Math.sin(Math.PI * p))];
    const scenes = sceneStack([
      black,
      { at: 19.2, fade: 2.6, draw: worldScene(Wd.galaxy, { dim: 0.85 }) },
      { at: 45.15, fade: 2.2, draw: (ctx, t, f) => { ctx.drawImage(mistBg, 0, 0); mistRays(ctx, f % P, P); embers(ctx, f % P, P, 0.8); finish(ctx, f, vig, grain); } },
      { at: 59, fade: 4, draw: worldScene(Wd.jungle, { pre: growJungle, post: warmTint }) },
      { at: 126.6, fade: 3.4, draw: worldScene(Wd.ocean) },
      { at: 163.6, fade: 4, draw: worldScene(Wd.clouds) },
      { at: 180, fade: 8, draw: worldScene(Wd.galaxy) },
      { at: 215.2, fade: 3.3, draw: landing }
    ]);
    return (ctx, f) => {
      const t = f / FPS;
      scenes(ctx, t, f);
      const fa = ss(8, 17, t) * (1 - ss(19.2, 22, t)) * 0.7;
      if (fa > 0.003) first(ctx, f % P, P, fa);
      flash(ctx, t, 19.25, 0.14, 2.4, 0.7, flashSpr);
      if (t >= 26.6 && t < 34.8) { const p = eo(prog(t, 26.8, 34.4)) * 0.4 + prog(t, 26.8, 34.4) * 0.6; const [x, y] = cross1(p); star.trail(ctx, cross1, p, 1.2, 1, f); star.body(ctx, x, y, 0.7, win(t, 26.6, 34.8, 0.5, 0.5), f); }
      flash(ctx, t, 45.08, 0.1, 3.4, 0.9, flashSpr);
      const pa = win(t, 76, 110, 3, 4); if (pa > 0.003) petals(ctx, f % P, P, pa);
      if (t >= 108.5 && t < 117) { const p = prog(t, 108.5, 117); fly(ctx, W * (-0.1 + 1.2 * p), H * (0.66 - 0.3 * p) + Math.sin(p * 11) * 46, 1.05, f, win(t, 108.5, 117, 0.8, 0.8), -0.5); }
      { const k = prog(t, 120.3, 126.6), r = eo(k) * 1100; ring(ctx, W / 2, H / 2, r, r, (1 - k) * 0.9, 5, '190,226,255'); ring(ctx, W / 2, H / 2, r * 0.6, r * 0.6, (1 - k) * 0.5, 4, '200,170,255'); }
      if (t >= 146.5 && t < 164) { const p = prog(t, 146.5, 164); whale(ctx, W * (-0.32 + 1.64 * p), H * (0.78 - 0.56 * p), 0.95, Math.atan2(-0.56 * H, 1.64 * W) + Math.PI, f, 0.82 * win(t, 146.5, 164, 2, 2)); }
      washes(ctx, t, f);
      if (t >= 189.6 && t < 197) { const p = eo(prog(t, 189.8, 196.6)) * 0.4 + prog(t, 189.8, 196.6) * 0.6; const [x, y] = cross2(p); star.trail(ctx, cross2, p, 1.2, 1, f); star.body(ctx, x, y, 0.7, win(t, 189.6, 197, 0.5, 0.5), f); }
      gatherFx(ctx, prog(t, 201.2, 208.05));
      flash(ctx, t, 208.08, 0.12, 3.2, 0.9, flashSpr);
      // 3:28 · una constelación sobre la cama
      const ca = win(t, 208.6, 217.2, 0.6, 2);
      if (ca > 0.003) {
        const k = prog(t, 209, 213.2) * heart.length;
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,226,176,${0.5 * ca})`; ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i <= Math.min(heart.length, Math.floor(k)); i++) { const q = heart[i % heart.length]; i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
        if (k < heart.length) { const i = Math.floor(k), a = heart[i % heart.length], b = heart[(i + 1) % heart.length], u = k - i; ctx.lineTo(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); }
        ctx.stroke();
        heart.forEach((q, i) => { const on = ss(i, i + 0.8, k + 0.8), s = (54 + 26 * Math.sin(f * 0.11 + i)) * on; ctx.globalAlpha = ca * on; ctx.drawImage(fl, q[0] - s / 2, q[1] - s / 2, s, s); });
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    };
  }

  // ═════════════════════════ SIDE ═════════════════════════
  const rootsBg = bgRadial(0.16, 0.92, 0.75, [[0, '#4A2C0A'], [0.4, '#160D05'], [1, '#040302']]);
  const rr2 = makeRng('sh1-raices');
  const roots = Array.from({ length: 22 }, () => {
    let x = rr2.range(-0.04, 0.3) * W, y = rr2.range(0.82, 1.02) * H, a = rr2.range(-1.2, -0.1);
    const pts = [[x, y]], n = rr2.int(70, 150);
    for (let i = 0; i < n; i++) { a += rr2.range(-0.22, 0.22); a = Math.max(-1.5, Math.min(0.35, a)); x += Math.cos(a) * 13; y += Math.sin(a) * 13; pts.push([x, y]); }
    return { pts, delay: rr2() * 0.3, w: rr2.range(1.4, 3.2) };
  });
  const fl = flowers({ seed: 'sh1-side-flores', n: 34, from: 69, to: 82, region: [0, 0.34, 1, 0.98], avoid: [0.5, 0.5, 0.26, 0.26] });
  const leaves = leafSet(91, STYLE.lit, ['fern', 'broad', 'fern']);
  const blooms = [flowerSprite('#FFB7C9', '#FF8FB0', 1), flowerSprite('#F4E9FF', '#C9A6FF', 3), flowerSprite('#FFFFFF', '#FFD98A', 4)];
  const cards = {
    p03: await photoCard(foto('p03'), { maxW: 640, maxH: 480, leaves, blooms, seed: 3 }),
    p05: await photoCard(foto('p05'), { maxW: 660, maxH: 480, leaves, blooms, seed: 5 })
  };
  const lk = lake({ seed: 'sh1-lago-side', moonX: 0.3 });
  const sparks = motes({ n: 140, seed: 'sh1-side-destellos', color: '#FFD9A0', size: [5, 18], alpha: [0.3, 1], amp: [10, 40], blink: 3 });
  const sparksV = motes({ n: 90, seed: 'sh1-side-destellos-v', color: '#C79BFF', size: [5, 16], alpha: [0.3, 0.9], amp: [10, 40], blink: 3 });
  const drops = motes({ n: 120, seed: 'sh1-side-gotas', color: '#F2FBFF', size: [3, 8], alpha: [0.3, 0.8], amp: [2, 8], rise: -9 });
  const cross = (p) => [W * (1.14 - 1.28 * p), H * (0.18 + 0.52 * p - 0.1 * Math.sin(Math.PI * p))];
  const scenes = sceneStack([
    black,
    { at: 19.2, fade: 2.6, draw: worldScene(Wd.galaxy, { dim: 0.8 }) },
    { at: 45.15, fade: 2.6, draw: (ctx, t, f) => {
      ctx.drawImage(rootsBg, 0, 0);
      // raíces de luz que corren desde donde cayó la estrella
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const rt of roots) {
        const k = clamp01((prog(t, 46.2, 58.5) - rt.delay) / (1 - rt.delay)), n = Math.floor(eo(k) * (rt.pts.length - 1));
        if (n < 1) continue;
        for (const [w, a] of [[rt.w * 4.5, 0.1], [rt.w, 0.8]]) {
          ctx.strokeStyle = `rgba(255,208,128,${a})`; ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(rt.pts[0][0], rt.pts[0][1]);
          for (let i = 1; i <= n; i++) ctx.lineTo(rt.pts[i][0], rt.pts[i][1]);
          ctx.stroke();
        }
        if (k < 1) { const h = rt.pts[n]; ctx.globalAlpha = 0.9; ctx.drawImage(whiteGlow, h[0] - 22, h[1] - 22, 44, 44); ctx.globalAlpha = 1; }
      }
      ctx.globalCompositeOperation = 'source-over';
      embers(ctx, f % P, P, 0.7);
      finish(ctx, f, vig, grain);
    } },
    { at: 59, fade: 4, draw: worldScene(Wd.jungle, { pre: growJungle, post: warmTint }) },
    { at: 108, fade: 6, draw: (ctx, t, f) => {
      lk.draw(ctx, t, f);
      const k = prog(t, 120.6, 126.6);
      if (k > 0) {
        tgG.setTransform(1, 0, 0, 1, 0, 0); tgG.globalAlpha = 1; tgG.globalCompositeOperation = 'source-over';
        Wd.galaxy.draw(tgG, f % Wd.galaxy.T, Wd.galaxy.T);
        portal(ctx, k, -W * 0.12, lk.y0 + 120, lk.y0, tmpG, 1900);     // la luz llega desde la pared de enfrente
      }
      lk.finish(ctx, f);
    } },
    { at: 126.6, fade: 3.4, draw: worldScene(Wd.ocean) },
    { at: 163.6, fade: 4, draw: worldScene(Wd.clouds) },
    { at: 180, fade: 8, draw: worldScene(Wd.galaxy) },
    { at: 215.2, fade: 3.3, draw: landing }
  ]);
  return (ctx, f) => {
    const t = f / FPS;
    scenes(ctx, t, f);
    flash(ctx, t, 19.25, 0.14, 2.4, 0.6, flashSpr);
    if (t >= 30.6 && t < 37.8) { const p = eo(prog(t, 30.8, 37.4)) * 0.4 + prog(t, 30.8, 37.4) * 0.6; const [x, y] = cross(p); star.trail(ctx, cross, p, 1, 1, f); star.body(ctx, x, y, 0.62, win(t, 30.6, 37.8, 0.5, 0.5), f); }
    flash(ctx, t, 45.08, 0.1, 3.4, 0.9, flashSpr, 0.1, 0.9);
    if (t > 68.5 && t < 114) fl(ctx, t, f, 1 - ss(108, 113, t));
    const dimA = 0.42 * win(t, 91.5, 108.6, 1.6, 1.6);
    if (dimA > 0.003) { ctx.globalAlpha = dimA; ctx.drawImage(shade, W / 2 - 720, H * 0.5 - 420, 1440, 840); ctx.globalAlpha = 1; }
    drawCard(ctx, cards.p03, W / 2, H * 0.5, t, 92.4, 100.2, f, { tilt: 0.012 });
    drawCard(ctx, cards.p05, W / 2, H * 0.5, t, 100.0, 108.4, f, { tilt: -0.01 });
    washes(ctx, t, f);
    const da = win(t, 164.5, 171, 1, 2.5); if (da > 0.003) drops(ctx, f % P, P, da);
    gatherFx(ctx, prog(t, 201.2, 208.05));
    flash(ctx, t, 208.08, 0.12, 3.2, 0.9, flashSpr);
    const sa = win(t, 208, 217, 0.3, 2.5); if (sa > 0.003) { sparks(ctx, f % P, P, sa); sparksV(ctx, f % P, P, sa); }
  };
}

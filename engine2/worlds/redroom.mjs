/**
 * AMBIENT-005 · RED ROOM — rojo vino, carmesí, negro y ámbar.
 *
 * La regla de este mundo: la luz es INDIRECTA y rasante. Lo que se ve son
 * sombras sobre terciopelo, nunca un plano rojo saturado. Sin magentas, sin
 * cian, sin destellos. Es lo que separa "íntimo y elegante" de "antro".
 *
 * El terciopelo no brilla donde mira a la luz, como el satén: brilla en los
 * cantos, donde la superficie queda de perfil. Esa es la fórmula de abajo.
 */
import { W, H, TAU, makeRng, lsin, lcos, glow, vignette, grainTile, finish, drift, createCanvas, smooth } from '../lib.mjs';
import { motes } from '../layers.mjs';

const PAL = { negro: '#0A0507', sombra: '#2B060D', vino: '#4A0D16', carmesi: '#8E1226', ambar: '#D98B3A', terciopelo: '#C9435A' };
const RAMP = [[0, [6, 2, 4]], [0.16, [28, 5, 10]], [0.36, [66, 10, 20]], [0.6, [132, 18, 36]], [0.82, [190, 52, 70]], [1, [232, 128, 96]]];
function ramp(v, out, o) {
  v = v < 0 ? 0 : v > 1 ? 1 : v;
  let k = 0; while (k < RAMP.length - 2 && v > RAMP[k + 1][0]) k++;
  const a = RAMP[k], b = RAMP[k + 1], t = (v - a[0]) / (b[0] - a[0]);
  out[o] = a[1][0] + (b[1][0] - a[1][0]) * t; out[o + 1] = a[1][1] + (b[1][1] - a[1][1]) * t; out[o + 2] = a[1][2] + (b[1][2] - a[1][2]) * t; out[o + 3] = 255;
}

/** Perfil de pliegues: suma de ondas de anchos muy distintos, nunca regular. */
function foldProfile(seed) {
  const r = makeRng(seed);
  const F = [[560, 0.6], [270, 1], [150, 0.5], [84, 0.2]].map(([wl, a]) => ({ k: TAU / (wl * r.range(0.82, 1.18)), a, p: r() * TAU }));
  const n = F.reduce((s, f) => s + f.a, 0);
  return (x) => { let s = 0; for (const f of F) s += f.a * Math.sin(x * f.k + f.p); return s / n; };
}

/** Perfil para el dosel: armónicos ENTEROS del ángulo, para que la vuelta cierre sin costura. */
function foldProfileRing(seed, per = 380) {
  const r = makeRng(seed);
  const F = [[4, 0.6], [9, 1], [17, 0.5], [29, 0.2]].map(([n, a]) => ({ k: n / per, a, p: r() * TAU }));
  const n = F.reduce((s, f) => s + f.a, 0);
  return (x) => { let s = 0; for (const f of F) s += f.a * Math.sin(x * f.k + f.p); return s / n; };
}

function shade(h0, h1, lamp, dir, gain, noise) {
  const slope = (h1 - h0) * 62, hgt = 0.5 + 0.5 * h0;
  const facing = Math.min(1, Math.max(0, 0.5 + 0.5 * slope * dir));   // media caída: nunca un corte duro
  const edge = Math.pow(Math.min(1, Math.abs(slope)), 2);             // el canto del pliegue, donde el pelo queda de perfil
  const body = 0.1 + 0.56 * Math.pow(hgt, 1.4);                       // el fondo de cada pliegue se hunde en sombra
  return (body * (0.3 + 0.9 * facing) + 0.2 * edge * facing) * (0.24 + 0.95 * lamp) * gain * (0.95 + 0.1 * noise);
}

/** Cortina colgada: pliegues verticales que ondulan un poco a lo largo de su caída. */
function curtainTex(seed, { w = 1536, h = 800, lamp = [0.24, 0.54], lampR = 0.46, dir = 1, gain = 1.05 }) {
  const P = foldProfile(seed), r = makeRng(seed + 5);
  const c = createCanvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const v = y / h, fall = 1 - 0.5 * smooth(0.55, 1, v);
    for (let x = 0; x < w; x++) {
      const xe = x + 16 * Math.sin(y * 0.0042 + 2.4 * Math.sin(x * 0.0021)) + 5 * Math.sin(y * 0.012 + x * 0.009);
      const u = x / w, dx = (u - lamp[0]) / lampR, dy = (v - lamp[1]) / (lampR * 0.95);
      const l = Math.exp(-(dx * dx + dy * dy) / 2);
      ramp(shade(P(xe), P(xe + 1.5), l, dir, gain, r()) * fall, img.data, (y * w + x) * 4);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Dosel: la tela recogida en un punto y cayendo en abanico hacia los bordes. */
function canopyTex(seed, { size = 1100, lampR = 0.4, dir = 1, gain = 1.1, twist = 0.22 }) {
  const P = foldProfileRing(seed), r = makeRng(seed + 5);
  const c = createCanvas(size, size), g = c.getContext('2d'), img = g.createImageData(size, size);
  const m = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - m, dy = y - m, rad = Math.sqrt(dx * dx + dy * dy) / m, th = Math.atan2(dy, dx);
      // los pliegues son radiales: el perfil se recorre con el ángulo
      const xe = (th + twist * rad) * 380 + 10 * Math.sin(rad * 9 + th * 3);
      const l = Math.exp(-(rad * rad) / (2 * lampR * lampR));
      let v = shade(P(xe), P(xe + 1.5), l, dir, gain, r());
      v *= 1 - 0.75 * Math.exp(-(rad * rad) / 0.0016);     // el nudo del centro queda en sombra
      ramp(v, img.data, (y * size + x) * 4);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Disco de desenfoque: más luz en el aro que en el centro, como una óptica real. */
function bokehSprite(hex, size = 160) {
  const c = createCanvas(size, size), g = c.getContext('2d');
  const rgb = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const k = (a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, k(0.42)); gr.addColorStop(0.72, k(0.52)); gr.addColorStop(0.88, k(0.85)); gr.addColorStop(0.96, k(0.3)); gr.addColorStop(1, k(0));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}

function bokeh({ n, seed, color = PAL.ambar, size = [40, 150], alpha = [0.05, 0.2], region = [0, 0, 1, 1] }) {
  const r = makeRng(seed), spr = bokehSprite(color);
  const bs = Array.from({ length: n }, () => ({
    x: (region[0] + r() * (region[2] - region[0])) * W, y: (region[1] + r() * (region[3] - region[1])) * H,
    s: r.range(size[0], size[1]), a: r.range(alpha[0], alpha[1]), ph: r(), amp: r.range(6, 30), fc: r.int(18, 44), fp: r()
  }));
  return (ctx, f, T) => {
    ctx.globalCompositeOperation = 'screen';
    for (const b of bs) {
      // temblor de vela: muy corto y muy leve
      ctx.globalAlpha = b.a * (0.8 + 0.2 * lsin(f, T, b.fc, b.fp)) * (0.75 + 0.25 * lsin(f, T, 2, b.ph));
      ctx.drawImage(spr, b.x + lsin(f, T, 1, b.ph) * b.amp - b.s / 2, b.y + lcos(f, T, 1, b.ph * 1.5) * b.amp * 0.6 - b.s / 2, b.s, b.s);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}

/**
 * Cortina viva: dos iluminaciones de la misma tela que se funden entre sí (la
 * luz resbala por los pliegues) y un vaivén por franjas que baja por la caída.
 */
function curtain({ a, b, waves = 6, amp = 4, band = 16, tw = 1536, th = 800 }) {
  const sx = tw / (W + 160), sy = th / (H + 100);
  return (ctx, f, T) => {
    const mix = 0.5 + 0.5 * lsin(f, T, 3, 0.1);
    for (let y = -50; y < H + 50; y += band) {
      const dx = Math.sin(TAU * ((y / H) * 1.25 - (f / T) * waves)) * amp * (0.35 + 0.65 * (y + 50) / (H + 100));
      const srcY = (y + 50) * sy;
      ctx.globalAlpha = 1;
      ctx.drawImage(a, 0, srcY, tw, band * sy, -80 + dx, y, W + 160, band + 0.6);
      ctx.globalAlpha = mix;
      ctx.drawImage(b, 0, srcY, tw, band * sy, -80 + dx, y, W + 160, band + 0.6);
    }
    ctx.globalAlpha = 1;
  };
}

// ─────────────────────────── pantallas ───────────────────────────

/** MAIN · la cortina de terciopelo, con una lámpara cálida fuera de centro. */
function main() {
  const A = curtainTex(3, { lamp: [0.26, 0.52], dir: 1 }), B = curtainTex(3, { lamp: [0.4, 0.46], dir: 1, gain: 1.2, lampR: 0.54 });
  const lamp = glow(1100, PAL.ambar, { power: 2.4 });
  const L = {
    cur: curtain({ a: A, b: B }),
    bokeh: bokeh({ n: 16, seed: 'red-main-bokeh', size: [50, 170], alpha: [0.05, 0.17], region: [0, 0.3, 1, 1] }),
    dust: motes({ n: 120, seed: 'red-main-polvo', color: '#FFC98A', size: [3, 8], alpha: [0.1, 0.45], amp: [12, 50], rise: 1 })
  };
  const vig = vignette(0.96, '6,2,4', 0.34, 0.5), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.negro; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.01, () => {
      L.cur(ctx, f, T);
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.2 + 0.035 * lsin(f, T, 5, 0.3);
      ctx.drawImage(lamp, W * 0.26 - 550, H * 0.56 - 550);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.bokeh(ctx, f, T); L.dust(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

/** CEILING · el dosel: la tela recogida en el centro, cayendo hacia los bordes. */
function ceiling() {
  const A = canopyTex(11, { dir: 1 }), B = canopyTex(11, { dir: -1, gain: 1.2, lampR: 0.46 });
  const lamp = glow(900, PAL.ambar, { power: 2.6 });
  const L = {
    bokeh: bokeh({ n: 20, seed: 'red-ceil-bokeh', size: [40, 140], alpha: [0.05, 0.18] }),
    dust: motes({ n: 80, seed: 'red-ceil-polvo', color: '#FFC98A', size: [3, 8], alpha: [0.1, 0.4], amp: [12, 50] })
  };
  const vig = vignette(0.97, '6,2,4', 0.36, 0.48), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.negro; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.008, () => {
      const mix = 0.5 + 0.5 * lsin(f, T, 3, 0.4);
      ctx.save(); ctx.translate(W / 2, H * 0.48); ctx.rotate(lsin(f, T, 1, 0.2) * 0.035);
      const s = 1560 * (1 + lsin(f, T, 2, 0.6) * 0.012);
      ctx.drawImage(A, -s / 2, -s / 2, s, s);
      ctx.globalAlpha = mix; ctx.drawImage(B, -s / 2, -s / 2, s, s); ctx.globalAlpha = 1;
      ctx.restore();
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.17 + 0.03 * lsin(f, T, 5, 0.1);
      ctx.drawImage(lamp, W / 2 - 450, H * 0.48 - 450);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.bokeh(ctx, f, T); L.dust(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

/** SIDE · la misma tela en penumbra, con más luces de vela fuera de foco. */
function side() {
  const A = curtainTex(23, { lamp: [0.74, 0.62], dir: -1, gain: 0.95, lampR: 0.4 }), B = curtainTex(23, { lamp: [0.62, 0.56], dir: -1, gain: 1.1, lampR: 0.48 });
  const lamp = glow(1000, PAL.ambar, { power: 2.5 });
  const L = {
    cur: curtain({ a: A, b: B, waves: 5, amp: 5 }),
    bokeh: bokeh({ n: 28, seed: 'red-side-bokeh', size: [36, 150], alpha: [0.06, 0.2], region: [0.2, 0.2, 1, 1] }),
    dust: motes({ n: 150, seed: 'red-side-polvo', color: '#FFC98A', size: [3, 8], alpha: [0.1, 0.45], amp: [12, 50], rise: 1 })
  };
  const vig = vignette(0.97, '6,2,4', 0.32, 0.52), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.negro; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.012, () => {
      L.cur(ctx, f, T);
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.18 + 0.03 * lsin(f, T, 5, 0.7);
      ctx.drawImage(lamp, W * 0.74 - 500, H * 0.64 - 500);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.bokeh(ctx, f, T); L.dust(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

export default { id: 'AMBIENT-005', name: 'RED ROOM', screens: { main, ceiling, side } };

/**
 * AMBIENT-001 · CLOUDS — dorado, lavanda y azul. Para platicar y para los recuerdos.
 *
 * Es la hora en que el sol ya está bajo: la luz llega desde abajo y de lado,
 * así que las panzas de las nubes se encienden en dorado y las cimas se quedan
 * en lavanda. Esa inversión es lo que separa este cielo de un cielo de mediodía.
 */
import { W, H, TAU, makeRng, lsin, lcos, glow, bgLinear, bgRadial, vignette, grainTile, finish, drift, createCanvas, rgba, smooth } from '../lib.mjs';
import { raySprite, fbm, worley } from '../tex.mjs';
import { motes, rays } from '../layers.mjs';

const PAL = { dorado: '#FFD9A0', amanecer: '#FFB27A', lavanda: '#A99BD6', azul: '#6FB4E8', tarde: '#2A3B6B', luz: '#FFF4E2' };
const mod = (a, n) => ((a % n) + n) % n;

const hex3 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/**
 * Banco de nubes volumétrico, teselable en horizontal.
 *
 * La densidad es ruido fractal más ruido celular invertido, que es lo que da
 * los abombamientos de un cúmulo. La luz se calcula por relieve: se compara la
 * densidad de cada punto con la del punto vecino en dirección al sol; si hacia
 * el sol hay menos nube, esa cara está iluminada.
 *
 *   profile(t)  sesgo de densidad según la altura (t = 0 arriba, 1 abajo)
 *   sun         vector hacia el sol, en píxeles de textura
 */
function cloudTex(seed, { size = 1024, h = 512, cells = 3, light, mid, shadow, cover = 0.52, soft = 0.16,
                          sun = [9, 13], relief = 2, profile = () => 0, puff = 0.34, rim = 0.3, gamma = 1.5, fade = 0.84 }) {
  const base = fbm(size, { cells, octaves: 4, seed });
  const w1 = worley(size, { cells: cells * 3, seed: seed + 3, warp: 0.5, mode: 'f1' });
  const w2 = worley(size, { cells: cells * 7, seed: seed + 8, warp: 0.4, mode: 'f1' });
  const d = new Float32Array(size * h);
  for (let y = 0; y < h; y++) {
    const pr = profile(y / h);
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      d[i] = base[i] * (1 - puff) + (1 - Math.min(1, w1[i] * 1.5)) * puff * 0.7 + (1 - Math.min(1, w2[i] * 1.6)) * puff * 0.3 + pr;
    }
  }
  const L = hex3(light), M = hex3(mid), S = hex3(shadow);
  const c = createCanvas(size, h), g = c.getContext('2d');
  const img = g.createImageData(size, h);
  for (let y = 0; y < h; y++) {
    const y2 = Math.min(h - 1, Math.max(0, y + sun[1]));
    for (let x = 0; x < size; x++) {
      const i = y * size + x, v = d[i];
      const a = smooth(cover, cover + soft, v);
      if (a <= 0) continue;
      const toSun = d[y2 * size + ((x + sun[0] + size) % size)];
      // A contraluz, la nube se enciende por el borde: cuanto más adentro, más sombra.
      // Encima va un relieve suave para que las panzas no queden planas.
      const depth = Math.min(1, Math.max(0, (v - cover) / rim));
      const sh = Math.min(1, Math.max(0, Math.pow(1 - depth, gamma) * 0.9 + (v - toSun) * relief + 0.06));
      let r, gg, b;
      if (sh < 0.5) { const t = sh * 2; r = S[0] + (M[0] - S[0]) * t; gg = S[1] + (M[1] - S[1]) * t; b = S[2] + (M[2] - S[2]) * t; }
      else { const t = (sh - 0.5) * 2; r = M[0] + (L[0] - M[0]) * t; gg = M[1] + (L[1] - M[1]) * t; b = M[2] + (L[2] - M[2]) * t; }
      img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = a * 255 * (fade >= 1 ? 1 : 1 - smooth(fade, 1, y / h));
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Una capa de nubes que cruza el encuadre `wraps` veces enteras por vuelta. */
function bank({ tex, width, y, h, wraps = 1, dir = 1, alpha = 1, bob = 0, ph = 0 }) {
  return (ctx, f, T) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    const ox = mod(dir * (f / T) * wraps * width + ph * width, width) - width;
    const yy = y + (bob ? lsin(f, T, 1, ph) * bob : 0);
    for (let x = ox; x < W + 80; x += width) ctx.drawImage(tex, x - 60, yy, width + 0.5, h);
    ctx.globalAlpha = 1;
  };
}

/** Perfil de banco: cielo limpio arriba, nube cerrada abajo. */
const rising = (top = -0.5, bottom = 0.34, knee = 0.8) => (t) => top + (bottom - top) * smooth(0, knee, t);
/** Perfil de franja: nube solo en una banda central. */
const band = (amp = 0.5) => (t) => -amp + amp * 1.5 * Math.sin(Math.PI * t);

// ─────────────────────────── pantallas ───────────────────────────

/** MAIN · el horizonte: sol bajo, bancos de nubes alejándose en capas. */
function main() {
  const bg = bgLinear([[0, '#141B44'], [0.22, '#34448A'], [0.46, '#8E86C8'], [0.66, '#F2B89C'], [0.8, PAL.dorado], [1, PAL.amanecer]], 180);
  const sun = glow(1300, '#FFE6B8', { power: 2.2 }), core = glow(300, '#FFFFFF', { power: 2.4 });
  const SX = 0.62, SY = 0.66;
  const tex = {
    cirrus: cloudTex(3, { cells: 2, h: 300, light: '#FFE9D0', mid: '#E7B7C4', shadow: '#9A8CCB', cover: 0.5, soft: 0.3, profile: band(0.34), puff: 0.1 }),
    far: cloudTex(7, { cells: 5, h: 300, light: '#FFF0D8', mid: '#F6BFA8', shadow: '#A397CF', cover: 0.5, soft: 0.14, profile: rising(-0.5, 0.3), sun: [6, 9] }),
    mid: cloudTex(12, { cells: 4, h: 512, light: '#FFF4E0', mid: '#FFC59A', shadow: '#8478BE', cover: 0.5, soft: 0.13, profile: rising(-0.52, 0.34), sun: [9, 13] }),
    near: cloudTex(19, { cells: 3, h: 512, light: '#FFF8EA', mid: '#FFBE8A', shadow: '#5F579C', cover: 0.5, soft: 0.12, profile: rising(-0.56, 0.4, 0.7), sun: [8, 12] })
  };
  const L = {
    stars: motes({ n: 80, seed: 'cl-main-est', color: '#FFF4E2', size: [3, 8], alpha: [0.2, 0.8], amp: [0, 0], region: [0, 0, 1, 0.36] }),
    rays: rays({ n: 12, seed: 'cl-main-rayos', sprite: raySprite(192, 768, '#FFE2B0'), from: [SX, SY], intensity: 1, alpha: [0.07, 0.2], len: [0.9, 1.4], width: [100, 300] }),
    cirrus: bank({ tex: tex.cirrus, width: 2600, y: 30, h: 250, wraps: 1, alpha: 0.5 }),
    far: bank({ tex: tex.far, width: 1100, y: H * 0.37, h: 300, wraps: 1, alpha: 0.92 }),
    mid: bank({ tex: tex.mid, width: 1900, y: H * 0.31, h: 560, wraps: 1, alpha: 1, bob: 5, ph: 0.3 }),
    near: bank({ tex: tex.near, width: 2800, y: H * 0.36, h: 700, wraps: 2, alpha: 1, bob: 8, ph: 0.7 }),
    dust: motes({ n: 80, seed: 'cl-main-polvo', color: PAL.dorado, size: [3, 9], alpha: [0.15, 0.6], amp: [14, 60], rise: 1 })
  };
  const vig = vignette(0.6, '20,14,40', 0.42, 0.52), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = '#141B44'; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.018, () => {
      ctx.drawImage(bg, -60, -60, W + 120, H + 120);
      L.stars(ctx, f, T);
      L.cirrus(ctx, f, T);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.9; ctx.drawImage(sun, W * SX - 650, H * SY - 650);
      ctx.globalAlpha = 0.85 + 0.1 * lsin(f, T, 3); ctx.drawImage(core, W * SX - 150, H * SY - 150);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.rays(ctx, f, T);
      L.far(ctx, f, T);
      L.mid(ctx, f, T);
      L.near(ctx, f, T);
      // el sol también vela lo que tiene delante
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.3;
      ctx.drawImage(sun, W * SX - 650, H * SY - 650);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.dust(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

/** CEILING · mirando hacia arriba: el claro queda en el centro y las nubes lo rodean. */
function ceiling() {
  const bg = bgRadial(0.5, 0.46, 0.56, [[0, '#FFE9C4'], [0.2, PAL.dorado], [0.44, '#C7A6D2'], [0.7, '#5E5EA8'], [1, '#1B2352']]);
  const sun = glow(1000, '#FFF2D6', { power: 2.4 });
  const far = cloudTex(41, { cells: 3, h: 1024, light: '#FFF2DC', mid: '#EFC0B4', shadow: '#9186C6', cover: 0.46, soft: 0.22, sun: [0, 0], puff: 0.26, rim: 0.55, gamma: 1.1, fade: 2 });
  const near = cloudTex(47, { cells: 2, h: 1024, light: '#FFFFFF', mid: '#FFD3AA', shadow: '#7B70B8', cover: 0.47, soft: 0.16, sun: [7, 9], puff: 0.3, rim: 0.5, gamma: 1.2, fade: 2 });
  const off = createCanvas(W, H), og = off.getContext('2d');
  const hole = (g, r0, r1) => {
    const gr = g.createRadialGradient(W / 2, H * 0.46, r0, W / 2, H * 0.46, r1);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
  };
  const layer = (ctx, tex, size, ox, oy, r0, r1, alpha) => {
    og.clearRect(0, 0, W, H);
    const sx = mod(ox, size) - size, sy = mod(oy, size) - size;
    for (let y = sy; y < H; y += size) for (let x = sx; x < W; x += size) og.drawImage(tex, x, y, size + 0.5, size + 0.5);
    hole(og, r0, r1);
    ctx.globalAlpha = alpha; ctx.drawImage(off, 0, 0); ctx.globalAlpha = 1;
  };
  const L = {
    rays: rays({ n: 14, seed: 'cl-ceil-rayos', sprite: raySprite(192, 768, '#FFEFCB'), from: [0.5, 0.46], intensity: 1, alpha: [0.07, 0.18], len: [0.7, 1.1], width: [140, 340] }),
    dust: motes({ n: 60, seed: 'cl-ceil-polvo', color: PAL.luz, size: [3, 9], alpha: [0.15, 0.55], amp: [14, 60] })
  };
  const vig = vignette(0.78, '16,12,40', 0.4, 0.46), grain = grainTile();
  return (ctx, f, T) => {
    const p = f / T;
    ctx.fillStyle = '#1B2352'; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.014, () => {
      ctx.drawImage(bg, -60, -60, W + 120, H + 120);
      L.rays(ctx, f, T);
      layer(ctx, far, 1300, p * 1300, 0, 40, 330, 0.85);
      layer(ctx, near, 2000, p * 2000 + 700, 300, 130, 470, 1);
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.42 + 0.06 * lsin(f, T, 3);
      ctx.drawImage(sun, W * 0.5 - 500, H * 0.46 - 500);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.dust(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

/** SIDE · pared lateral: el mismo cielo, más abierto y con menos peso. */
function side() {
  const bg = bgLinear([[0, '#2A3270'], [0.3, '#7E78BE'], [0.56, '#EFB6A2'], [0.8, PAL.dorado], [1, PAL.amanecer]], 192);
  const sun = glow(1200, '#FFE2B0', { power: 2.3 });
  const tex = {
    cirrus: cloudTex(63, { cells: 2, h: 300, light: '#FFE9D0', mid: '#E9B9C2', shadow: '#9A8CCB', cover: 0.5, soft: 0.3, profile: band(0.34), puff: 0.1 }),
    far: cloudTex(67, { cells: 5, h: 300, light: '#FFEED6', mid: '#F4BBA6', shadow: '#9E92CC', cover: 0.5, soft: 0.14, profile: rising(-0.5, 0.3), sun: [-6, 9] }),
    near: cloudTex(71, { cells: 3, h: 512, light: '#FFF6E6', mid: '#FFC190', shadow: '#6C62AC', cover: 0.5, soft: 0.12, profile: rising(-0.56, 0.38, 0.72), sun: [-9, 12] })
  };
  const L = {
    stars: motes({ n: 50, seed: 'cl-side-est', color: '#FFF4E2', size: [3, 7], alpha: [0.2, 0.7], amp: [0, 0], region: [0, 0, 1, 0.32] }),
    cirrus: bank({ tex: tex.cirrus, width: 2400, y: 40, h: 240, wraps: 1, dir: -1, alpha: 0.5 }),
    far: bank({ tex: tex.far, width: 1300, y: H * 0.42, h: 320, wraps: 1, dir: -1, alpha: 0.92 }),
    near: bank({ tex: tex.near, width: 2600, y: H * 0.38, h: 700, wraps: 1, dir: -1, alpha: 1, bob: 7, ph: 0.4 }),
    dust: motes({ n: 100, seed: 'cl-side-polvo', color: PAL.dorado, size: [3, 9], alpha: [0.15, 0.6], amp: [14, 60], rise: 1 })
  };
  const vig = vignette(0.66, '20,14,40', 0.4, 0.5), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = '#2A3270'; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.022, () => {
      ctx.drawImage(bg, -60, -60, W + 120, H + 120);
      L.stars(ctx, f, T);
      L.cirrus(ctx, f, T);
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.65;
      ctx.drawImage(sun, W * 0.2 - 600, H * 0.8 - 600);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.far(ctx, f, T);
      L.near(ctx, f, T);
      L.dust(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

export default { id: 'AMBIENT-001', name: 'CLOUDS', screens: { main, ceiling, side } };

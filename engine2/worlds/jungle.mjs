/**
 * AMBIENT-003 · JUNGLE — verde con destellos dorados. Para comer y descansar.
 *
 * Una selva se lee por CAPAS, no por cantidad de hojas: troncos lejanos lavados
 * por la bruma, follaje medio que recibe la luz y, delante, hojas casi negras y
 * desenfocadas que enmarcan. Con esas tres distancias ya hay profundidad.
 */
import { W, H, TAU, makeRng, lsin, lcos, glow, bgLinear, bgRadial, vignette, grainTile, finish, drift, createCanvas, smooth } from '../lib.mjs';
import { raySprite, blurred, fbm, fieldCanvas } from '../tex.mjs';
import { motes, rays, mist } from '../layers.mjs';

const PAL = { fondo: '#071509', medio: '#0E2B1C', hoja: '#2F6B4F', hojaLuz: '#8FD6A8', sol: '#FFD98A', bruma: '#1C4433' };

// ─────────────────────────── hojas ───────────────────────────
// Todas nacen en el centro del borde inferior del sprite y crecen hacia arriba,
// para poder girarlas alrededor de su pie.

function frond(g, w, h, r, { leaflet = 0.085, count = 26, spread = 1.25 }) {
  const cx = w / 2, len = h * 0.96, bend = r.range(-0.24, 0.24) * w;
  const P = (t) => [cx + bend * t * t, h - t * len];
  for (let k = 2; k <= count; k++) {
    const t = k / count, [x, y] = P(t);
    const L = w * 0.47 * Math.sin(Math.PI * Math.min(1, 0.12 + 0.86 * t)) * (1 - t * 0.2) + 6;
    const wl = L * leaflet + 2;
    for (const side of [-1, 1]) {
      g.save(); g.translate(x, y); g.rotate(side * (spread - 0.6 * t) + (2 * bend * t) / len);
      g.beginPath(); g.moveTo(0, 0);
      g.bezierCurveTo(wl * 1.4, -L * 0.3, wl, -L * 0.75, side * L * 0.1, -L);
      g.bezierCurveTo(-wl, -L * 0.75, -wl * 1.4, -L * 0.3, 0, 0);
      g.fill(); g.restore();
    }
  }
  g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, h);
  for (let k = 1; k <= 20; k++) { const [x, y] = P(k / 20); g.lineTo(x, y); }
  g.stroke();
}

function broad(g, w, h, r) {
  const cx = w / 2, len = h * 0.94, half = w * 0.4, lean = r.range(-0.14, 0.14) * w;
  g.beginPath(); g.moveTo(cx, h);
  g.bezierCurveTo(cx - half * 1.3, h - len * 0.28, cx - half * 0.95 + lean, h - len * 0.82, cx + lean, h - len);
  g.bezierCurveTo(cx + half * 0.95 + lean, h - len * 0.82, cx + half * 1.3, h - len * 0.28, cx, h);
  g.fill();
  // rasgaduras de hoja de plátano: cuñas que entran desde el borde
  g.globalCompositeOperation = 'destination-out';
  for (let k = 0, n = r.int(3, 6); k < n; k++) {
    const t = r.range(0.25, 0.85), side = r() < 0.5 ? -1 : 1, y = h - t * len, ex = cx + lean * t * t + side * half * 1.2;
    g.beginPath(); g.moveTo(ex, y - 10); g.lineTo(cx + lean * t * t + side * half * r.range(0.2, 0.5), y + 12); g.lineTo(ex, y + 14); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  // nervio central y nervios laterales
  g.lineWidth = 3; g.beginPath(); g.moveTo(cx, h); g.quadraticCurveTo(cx + lean * 0.3, h - len * 0.5, cx + lean, h - len); g.stroke();
  g.lineWidth = 1.1;
  for (let k = 1; k < 13; k++) {
    const t = k / 13, y = h - t * len, x = cx + lean * t * t, reach = half * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)) * 1.02;
    for (const side of [-1, 1]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + side * reach * 0.6, y - 14, x + side * reach, y - 34); g.stroke(); }
  }
}

function monstera(g, w, h, r) {
  const cx = w / 2, cy = h * 0.44, rx = w * 0.44, ry = h * 0.4;
  g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, h); g.quadraticCurveTo(cx + r.range(-30, 30), h * 0.9, cx, cy + ry * 0.55); g.stroke();
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill();
  g.globalCompositeOperation = 'destination-out';
  // el escote del pie y las hendiduras laterales
  g.beginPath(); g.moveTo(cx, cy + ry * 0.5); g.lineTo(cx - rx * 0.26, cy + ry * 1.1); g.lineTo(cx + rx * 0.26, cy + ry * 1.1); g.fill();
  for (const side of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const a = (-0.5 + k * 0.42 + r.range(-0.06, 0.06)), ca = Math.cos(a) * side, sa = Math.sin(a);
      g.beginPath();
      g.moveTo(cx + ca * rx * 1.1, cy - sa * ry * 1.1 - 9);
      g.lineTo(cx + ca * rx * r.range(0.3, 0.46), cy - sa * ry * 0.4);
      g.lineTo(cx + ca * rx * 1.1, cy - sa * ry * 1.1 + 13);
      g.fill();
    }
    for (let k = 0; k < 3; k++) {
      g.beginPath(); g.ellipse(cx + side * rx * r.range(0.14, 0.26), cy - ry * (-0.3 + k * 0.32), rx * 0.05, ry * 0.085, side * 0.5, 0, TAU); g.fill();
    }
  }
  g.globalCompositeOperation = 'source-over';
  g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, cy + ry * 0.5); g.lineTo(cx, cy - ry * 0.95); g.stroke();
}

/** Fabrica una hoja con relleno, nervios y un degradado de pie a punta. */
function leafSprite(kind, seed, { fill, vein, tip, blur = 1.2 }) {
  const r = makeRng(seed);
  const dims = { frond: [340, 560], fern: [240, 520], broad: [260, 500], monstera: [380, 430] }[kind];
  return blurred(dims[0], dims[1], blur, (g, w, h) => {
    g.fillStyle = fill; g.strokeStyle = vein;
    if (kind === 'frond') frond(g, w, h, r, {});
    else if (kind === 'fern') frond(g, w, h, r, { leaflet: 0.2, count: 18, spread: 1.1 });
    else if (kind === 'broad') broad(g, w, h, r);
    else monstera(g, w, h, r);
    if (tip) {
      // la punta recibe más luz que el pie
      g.globalCompositeOperation = 'source-atop';
      const gr = g.createLinearGradient(0, h, w * 0.3, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, tip);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    }
  });
}

function leafSet(seed, style, kinds = ['frond', 'broad', 'monstera', 'fern', 'frond', 'broad']) {
  return kinds.map((k, i) => ({ spr: leafSprite(k, seed * 31 + i * 7, style), ratio: { frond: 340 / 560, fern: 240 / 520, broad: 260 / 500, monstera: 380 / 430 }[k] }));
}

/**
 * Follaje: cada hoja nace en un borde y se mece alrededor de su pie con dos
 * vaivenes superpuestos, uno lento y amplio y otro rápido y corto.
 *   from  'bottom' | 'top' | 'left' | 'right' | 'ring' (alrededor, apuntando al centro)
 */
function foliage({ seed, n, set, from, size = [260, 520], alpha = 1, sway = 1, inset = 0, fan = 0.6, center = [0.5, 0.5] }) {
  const r = makeRng(seed);
  const ls = Array.from({ length: n }, (_, i) => {
    let x, y, ang;
    const u = (i + r.range(0.15, 0.85)) / n;
    if (from === 'bottom') { x = u * (W + 200) - 100; y = H + 40 - inset; ang = r.range(-fan, fan); }
    else if (from === 'top') { x = u * (W + 200) - 100; y = -40 + inset; ang = Math.PI + r.range(-fan, fan); }
    else if (from === 'left') { x = -40 + inset; y = u * (H + 160) - 80; ang = Math.PI / 2 + r.range(-fan, fan); }
    else if (from === 'right') { x = W + 40 - inset; y = u * (H + 160) - 80; ang = -Math.PI / 2 + r.range(-fan, fan); }
    else {
      const a = u * TAU, rx = W * 0.62 - inset, ry = H * 0.7 - inset;
      x = center[0] * W + Math.cos(a) * rx; y = center[1] * H + Math.sin(a) * ry;
      ang = Math.atan2(center[1] * H - y, center[0] * W - x) + Math.PI / 2 + r.range(-fan, fan);
    }
    const l = r.pick(set);
    return { x, y, ang, h: r.range(size[0], size[1]), l, a: alpha * r.range(0.82, 1), flip: r() < 0.5 ? -1 : 1,
             c1: r.int(2, 4), p1: r(), a1: r.range(0.02, 0.05) * sway, c2: r.int(14, 30), p2: r(), a2: r.range(0.004, 0.012) * sway };
  }).sort((p, q) => p.h - q.h);
  return (ctx, f, T) => {
    ctx.globalCompositeOperation = 'source-over';
    for (const l of ls) {
      const w = l.h * l.l.ratio;
      ctx.globalAlpha = l.a;
      ctx.save(); ctx.translate(l.x, l.y);
      ctx.rotate(l.ang + lsin(f, T, l.c1, l.p1) * l.a1 + lsin(f, T, l.c2, l.p2) * l.a2);
      ctx.scale(l.flip, 1);
      ctx.drawImage(l.l.spr, -w / 2, -l.h, w, l.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
}

/** Troncos lejanos con lianas: una sola imagen, pintada una vez. */
function trunks(seed, { n = 7, color = '#0A2216', light = '#16402B', blur = 6, lianas = 6 } = {}) {
  const r = makeRng(seed);
  const w = W + 240, h = H + 120;
  return blurred(w, h, blur, (g) => {
    const xs = [];
    for (let i = 0; i < n; i++) {
      const x = (i + r.range(0.2, 0.8)) / n * w, tw = r.range(26, 92), lean = r.range(-50, 50);
      xs.push(x);
      const gr = g.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0);
      gr.addColorStop(0, color); gr.addColorStop(0.45, light); gr.addColorStop(1, color);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(x - tw * 0.62, h); g.lineTo(x - tw * 0.42 + lean, 0); g.lineTo(x + tw * 0.42 + lean, 0); g.lineTo(x + tw * 0.62, h); g.fill();
    }
    g.strokeStyle = color; g.lineCap = 'round';
    for (let i = 0; i < lianas; i++) {
      const a = r.pick(xs), b = a + r.range(120, 360) * (r() < 0.5 ? -1 : 1), y0 = r.range(-20, 120), sag = r.range(140, 380);
      g.lineWidth = r.range(2, 5);
      g.beginPath(); g.moveTo(a, y0); g.quadraticCurveTo((a + b) / 2, y0 + sag, b, y0 + r.range(-30, 60)); g.stroke();
    }
  });
}

/** Troncos vistos desde abajo: convergen hacia el claro. */
function trunksUp(seed, { n = 7, color = '#07170D', center = [0.5, 0.46] } = {}) {
  const r = makeRng(seed);
  return blurred(W + 200, H + 200, 3.5, (g) => {
    const cx = center[0] * W + 100, cy = center[1] * H + 100;
    for (let i = 0; i < n; i++) {
      const a = (i + r.range(0.2, 0.8)) / n * TAU, far = 1100, near = r.range(120, 230), wo = r.range(70, 150), wi = r.range(8, 20);
      const px = -Math.sin(a), py = Math.cos(a);
      const gr = g.createLinearGradient(cx + Math.cos(a) * far, cy + Math.sin(a) * far, cx + Math.cos(a) * near, cy + Math.sin(a) * near);
      gr.addColorStop(0, color); gr.addColorStop(1, '#1A3A22');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * far + px * wo, cy + Math.sin(a) * far + py * wo);
      g.lineTo(cx + Math.cos(a) * near + px * wi, cy + Math.sin(a) * near + py * wi);
      g.lineTo(cx + Math.cos(a) * near - px * wi, cy + Math.sin(a) * near - py * wi);
      g.lineTo(cx + Math.cos(a) * far - px * wo, cy + Math.sin(a) * far - py * wo);
      g.fill();
    }
  });
}

function mistTex(seed, hex, h = 360) {
  const n = fbm(1024, { cells: 3, octaves: 5, seed });
  const c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  return fieldCanvas(1024, n, (v, x, y) => {
    const t = y / h, a = smooth(0.36, 0.82, v) * Math.sin(Math.PI * t);
    return [c[0], c[1], c[2], Math.round(a * 255)];
  }, h);
}

const STYLE = {
  far: { fill: '#11382A', vein: '#1C4F3A', tip: 'rgba(120,190,150,0.22)', blur: 5 },
  mid: { fill: '#17573A', vein: '#57A777', tip: 'rgba(196,236,150,0.5)', blur: 1.1 },
  lit: { fill: '#2B7A4C', vein: '#A6E2A0', tip: 'rgba(255,236,150,0.6)', blur: 1 },
  front: { fill: '#030B06', vein: '#07160C', tip: null, blur: 4.5 }
};

// ─────────────────────────── pantallas ───────────────────────────

/** MAIN · un claro de selva: luz entrando por arriba, follaje en tres distancias. */
function main() {
  const bg = bgRadial(0.56, 0.3, 0.6, [[0, '#4E9A72'], [0.28, '#235C42'], [0.62, '#0E2B1C'], [1, PAL.fondo]]);
  const tr = trunks('jun-main-troncos', { n: 8 });
  const warm = glow(1200, '#FFE9A8', { power: 2.2 });
  const far = leafSet(1, STYLE.far), mid = leafSet(2, STYLE.mid), lit = leafSet(3, STYLE.lit), front = leafSet(4, STYLE.front);
  const L = {
    mist: mist({ tex: mistTex(7, '#A8E0C0'), size: 1600, wraps: 1, alpha: 0.3, y: H * 0.3, h: 420 }),
    rays: rays({ n: 9, seed: 'jun-main-rayos', sprite: raySprite(192, 768, '#FFF0B8'), from: 'top', intensity: 1.1, alpha: [0.14, 0.36], width: [50, 190], tilt: 0.3 }),
    far: foliage({ seed: 'jun-main-far', n: 18, set: far, from: 'bottom', size: [190, 340], alpha: 0.85, sway: 0.6, inset: 120 }),
    farTop: foliage({ seed: 'jun-main-fartop', n: 10, set: far, from: 'top', size: [170, 300], alpha: 0.8, sway: 0.6 }),
    midB: foliage({ seed: 'jun-main-mid', n: 15, set: mid, from: 'bottom', size: [190, 350], sway: 1, inset: 20 }),
    litB: foliage({ seed: 'jun-main-lit', n: 7, set: lit, from: 'bottom', size: [170, 300], sway: 1.1, inset: 40 }),
    midL: foliage({ seed: 'jun-main-midl', n: 4, set: mid, from: 'left', size: [230, 380], sway: 1 }),
    midR: foliage({ seed: 'jun-main-midr', n: 4, set: mid, from: 'right', size: [230, 380], sway: 1 }),
    frontT: foliage({ seed: 'jun-main-ft', n: 5, set: front, from: 'top', size: [260, 400], sway: 1.4, fan: 0.8 }),
    frontS: foliage({ seed: 'jun-main-fs', n: 3, set: front, from: 'left', size: [300, 440], sway: 1.3 }),
    frontR: foliage({ seed: 'jun-main-fr', n: 3, set: front, from: 'right', size: [300, 440], sway: 1.3 }),
    frontB: foliage({ seed: 'jun-main-fb', n: 5, set: front, from: 'bottom', size: [170, 280], sway: 1.2, fan: 0.9 }),
    flies: motes({ n: 46, seed: 'jun-main-luz', color: PAL.sol, size: [10, 22], alpha: [0.5, 1], amp: [20, 90], blink: 5, region: [0, 0.25, 1, 1] }),
    dust: motes({ n: 90, seed: 'jun-main-polvo', color: '#FFF0C0', size: [3, 8], alpha: [0.12, 0.5], amp: [14, 60], rise: 1 })
  };
  const vig = vignette(0.92, '2,8,4', 0.36, 0.46), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.fondo; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.016, () => {
      ctx.drawImage(bg, -60, -60, W + 120, H + 120);
      ctx.globalAlpha = 0.8; ctx.drawImage(tr, -120 + lsin(f, T, 1, 0.1) * 8, -60); ctx.globalAlpha = 1;
      L.farTop(ctx, f, T); L.far(ctx, f, T);
      L.mist(ctx, f, T);
      L.rays(ctx, f, T);
      L.midL(ctx, f, T); L.midR(ctx, f, T); L.midB(ctx, f, T); L.litB(ctx, f, T);
      // la luz del claro calienta lo que tiene cerca
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.55 + 0.08 * lsin(f, T, 3, 0.2);
      ctx.drawImage(warm, W * 0.56 - 600, H * 0.2 - 600);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.dust(ctx, f, T);
      L.frontB(ctx, f, T); L.frontS(ctx, f, T); L.frontR(ctx, f, T); L.frontT(ctx, f, T);
      L.flies(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

/** CEILING · tumbada mirando hacia arriba: el dosel y el claro de cielo en medio. */
function ceiling() {
  const C = [0.5, 0.46];
  const bg = bgRadial(C[0], C[1], 0.5, [[0, '#FFF6CC'], [0.14, '#DDF0A8'], [0.36, '#5FA872'], [0.66, '#17462E'], [1, PAL.fondo]]);
  const tr = trunksUp('jun-ceil-troncos', { n: 8, center: C });
  const sun = glow(700, '#FFFFFF', { power: 2.4 });
  const far = leafSet(11, STYLE.far), mid = leafSet(12, STYLE.mid), lit = leafSet(13, STYLE.lit), front = leafSet(14, STYLE.front);
  const L = {
    rays: rays({ n: 14, seed: 'jun-ceil-rayos', sprite: raySprite(192, 768, '#FFF4C4'), from: C, intensity: 1.2, alpha: [0.1, 0.28], len: [0.6, 1.05], width: [90, 260] }),
    far: foliage({ seed: 'jun-ceil-far', n: 22, set: far, from: 'ring', size: [240, 380], alpha: 0.85, sway: 0.6, inset: 110, center: C, fan: 0.5 }),
    mid: foliage({ seed: 'jun-ceil-mid', n: 20, set: mid, from: 'ring', size: [240, 390], sway: 1, inset: 20, center: C, fan: 0.55 }),
    lit: foliage({ seed: 'jun-ceil-lit', n: 8, set: lit, from: 'ring', size: [200, 320], sway: 1.1, inset: 70, center: C, fan: 0.6 }),
    front: foliage({ seed: 'jun-ceil-front', n: 10, set: front, from: 'ring', size: [280, 420], sway: 1.3, inset: -90, center: C, fan: 0.7 }),
    flies: motes({ n: 26, seed: 'jun-ceil-luz', color: PAL.sol, size: [10, 20], alpha: [0.5, 1], amp: [20, 80], blink: 5 }),
    dust: motes({ n: 90, seed: 'jun-ceil-polvo', color: '#FFF6D0', size: [3, 9], alpha: [0.15, 0.6], amp: [14, 60] })
  };
  const vig = vignette(0.9, '2,8,4', 0.4, 0.46), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.fondo; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.012, () => {
      ctx.drawImage(bg, -60, -60, W + 120, H + 120);
      L.far(ctx, f, T);
      ctx.drawImage(tr, -100, -100);
      L.rays(ctx, f, T);
      L.mid(ctx, f, T); L.lit(ctx, f, T);
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.6 + 0.1 * lsin(f, T, 4, 0.3);
      ctx.drawImage(sun, C[0] * W - 350, C[1] * H - 350);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.dust(ctx, f, T);
      L.front(ctx, f, T);
      L.flies(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

/** SIDE · la selva cerrada, más oscura: es donde viven las luciérnagas. */
function side() {
  const bg = bgLinear([[0, '#1C4A34'], [0.45, '#0E2B1C'], [1, PAL.fondo]], 160);
  const tr = trunks('jun-side-troncos', { n: 10, color: '#081C12', light: '#12382A', lianas: 9 });
  const far = leafSet(21, STYLE.far), mid = leafSet(22, STYLE.mid), front = leafSet(24, STYLE.front);
  const L = {
    mist: mist({ tex: mistTex(27, '#8FD0B0'), size: 1500, wraps: 1, alpha: 0.26, y: H * 0.36, h: 400, dir: -1 }),
    rays: rays({ n: 5, seed: 'jun-side-rayos', sprite: raySprite(192, 768, '#FFF0B8'), from: 'top', intensity: 0.8, alpha: [0.1, 0.26], width: [50, 170], tilt: 0.3 }),
    far: foliage({ seed: 'jun-side-far', n: 20, set: far, from: 'bottom', size: [200, 360], alpha: 0.85, sway: 0.6, inset: 120 }),
    farTop: foliage({ seed: 'jun-side-fartop', n: 12, set: far, from: 'top', size: [180, 320], alpha: 0.8, sway: 0.6 }),
    mid: foliage({ seed: 'jun-side-mid', n: 16, set: mid, from: 'bottom', size: [200, 360], sway: 1, inset: 20 }),
    midL: foliage({ seed: 'jun-side-midl', n: 4, set: mid, from: 'left', size: [240, 400], sway: 1 }),
    frontT: foliage({ seed: 'jun-side-ft', n: 6, set: front, from: 'top', size: [260, 420], sway: 1.4, fan: 0.8 }),
    frontR: foliage({ seed: 'jun-side-fr', n: 4, set: front, from: 'right', size: [300, 460], sway: 1.3 }),
    frontB: foliage({ seed: 'jun-side-fb', n: 6, set: front, from: 'bottom', size: [170, 300], sway: 1.2, fan: 0.9 }),
    flies: motes({ n: 80, seed: 'jun-side-luz', color: PAL.sol, size: [10, 24], alpha: [0.5, 1], amp: [20, 100], blink: 5 }),
    dust: motes({ n: 60, seed: 'jun-side-polvo', color: '#FFF0C0', size: [3, 8], alpha: [0.1, 0.4], amp: [14, 60], rise: 1 })
  };
  const vig = vignette(0.94, '2,8,4', 0.34, 0.48), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.fondo; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.022, () => {
      ctx.drawImage(bg, -60, -60, W + 120, H + 120);
      ctx.globalAlpha = 0.85; ctx.drawImage(tr, -120 + lsin(f, T, 1, 0.5) * 8, -60); ctx.globalAlpha = 1;
      L.farTop(ctx, f, T); L.far(ctx, f, T);
      L.mist(ctx, f, T); L.rays(ctx, f, T);
      L.midL(ctx, f, T); L.mid(ctx, f, T);
      L.dust(ctx, f, T);
      L.frontB(ctx, f, T); L.frontR(ctx, f, T); L.frontT(ctx, f, T);
      L.flies(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

export default { id: 'AMBIENT-003', name: 'JUNGLE', screens: { main, ceiling, side } };

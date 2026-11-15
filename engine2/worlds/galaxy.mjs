/**
 * AMBIENT-004 · GALAXY — violeta, azul oscuro y estrellas cálidas.
 *
 * Aquí casi nada se mueve y eso es lo correcto: el espacio se percibe por el
 * centelleo, por una deriva lentísima y por algo que cruza muy de vez en cuando.
 */
import { W, H, TAU, makeRng, lsin, lcos, glow, bgRadial, vignette, grainTile, finish, drift, createCanvas, smooth, clamp01 } from '../lib.mjs';
import { fbm, flareSprite, blurred } from '../tex.mjs';
import { motes } from '../layers.mjs';

const PAL = { base: '#06060F', frio: '#2B1B4D', magenta: '#B06BFF', cian: '#5FD8FF', estrella: '#FFE9B0', polvo: '#1A0F2E' };
const hex3 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const wrap = (v, n) => ((v % n) + n) % n;

/**
 * Nebulosa: ruido fractal deformado por otro ruido, que es lo que le da los
 * filamentos. Sale sobre negro opaco para sumarla con `screen`: el negro no
 * añade nada, así que sus bordes no existen.
 */
export function nebulaTex(seed, colors, { size = 1024, cells = 3, warp = 150, lo = 0.3, hi = 0.9, power = 1.35, lanes = 0.5, gain = 1.3 } = {}) {
  const a = fbm(size, { cells, octaves: 6, seed });
  const b = fbm(size, { cells: cells + 1, octaves: 5, seed: seed + 50 });
  const c = fbm(size, { cells: 2, octaves: 4, seed: seed + 99 });
  const cols = colors.map(hex3);
  const cv = createCanvas(size, size), g = cv.getContext('2d');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const wx = wrap(Math.round(x + (b[i] - 0.5) * warp), size), wy = wrap(Math.round(y + (c[i] - 0.5) * warp), size);
      const v = a[wy * size + wx];
      let d = Math.pow(smooth(lo, hi, v), power);
      d *= 1 - lanes * (1 - smooth(0.3, 0.6, b[i]));                 // vetas de polvo oscuro
      const rx = (x / size - 0.5) * 2, ry = (y / size - 0.5) * 2;
      d *= 1 - smooth(0.62, 1, Math.sqrt(rx * rx + ry * ry));          // se apaga antes de llegar al borde
      d = Math.min(1, d * gain);
      const t = clamp01((c[i] - 0.25) / 0.5) * (cols.length - 1), k = Math.min(cols.length - 2, Math.floor(t)), u = t - k;
      img.data[i * 4] = (cols[k][0] + (cols[k + 1][0] - cols[k][0]) * u) * d;
      img.data[i * 4 + 1] = (cols[k][1] + (cols[k + 1][1] - cols[k][1]) * u) * d;
      img.data[i * 4 + 2] = (cols[k][2] + (cols[k + 1][2] - cols[k][2]) * u) * d;
      img.data[i * 4 + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

/**
 * Vía láctea: una banda gaussiana de ruido con el núcleo cálido, los bordes
 * violetas y vetas de polvo oscuro a lo largo del eje.
 */
function milkyWayTex(seed, size = 1024) {
  const a = fbm(size, { cells: 4, octaves: 6, seed }), b = fbm(size, { cells: 6, octaves: 5, seed: seed + 1 });
  const c = fbm(size, { cells: 2, octaves: 3, seed: seed + 2 });
  const cv = createCanvas(size, size), g = cv.getContext('2d');
  const img = g.createImageData(size, size);
  const O = hex3('#2A1F78'), M = hex3('#A98BFF'), C = hex3('#FFE8CC');
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const v = (y / size - 0.5) + (c[i] - 0.5) * 0.16;
      const wide = Math.exp(-(v * v) / (2 * 0.1 * 0.1)), core = Math.exp(-(v * v) / (2 * 0.035 * 0.035));
      let d = wide * (0.18 + 1.05 * a[i]) + core * 0.35 * a[i];
      d *= 1 - 0.85 * core * (1 - smooth(0.4, 0.6, b[i]));               // vetas de polvo sobre el núcleo
      d = Math.min(1, d);
      const t = Math.min(1, d * 1.25);
      let r, gg, bb;
      if (t < 0.5) { const u = t * 2; r = O[0] + (M[0] - O[0]) * u; gg = O[1] + (M[1] - O[1]) * u; bb = O[2] + (M[2] - O[2]) * u; }
      else { const u = (t - 0.5) * 2; r = M[0] + (C[0] - M[0]) * u; gg = M[1] + (C[1] - M[1]) * u; bb = M[2] + (C[2] - M[2]) * u; }
      img.data[i * 4] = r * d; img.data[i * 4 + 1] = gg * d; img.data[i * 4 + 2] = bb * d; img.data[i * 4 + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

/** Campo de estrellas fijas, pintado una sola vez. `mask(x,y)` concentra donde hay vía láctea. */
export function starLayer(seed, n, { w = W + 260, h = H + 260, mask = null, big = 5.5 } = {}) {
  const r = makeRng(seed);
  const cv = createCanvas(w, h), g = cv.getContext('2d');
  const warm = glow(32, PAL.estrella, { power: 2.6 }), cool = glow(32, '#BFD9FF', { power: 2.6 }), white = glow(32, '#FFFFFF', { power: 3 });
  g.globalCompositeOperation = 'lighter';
  let placed = 0, guard = 0;
  while (placed < n && guard++ < n * 30) {
    const x = r() * w, y = r() * h;
    if (mask && r() > mask(x / w, y / h)) continue;
    const mag = Math.pow(r(), 3.4), s = 1.6 + mag * big;
    g.globalAlpha = 0.28 + mag * 0.72;
    const k = r();
    g.drawImage(k < 0.6 ? warm : k < 0.85 ? cool : white, x - s / 2, y - s / 2, s, s);
    placed++;
  }
  return cv;
}

/** Estrellas que centellean, y unas pocas con destello de cuatro puntas. */
export function twinklers({ seed, n = 150, flares = 12 }) {
  const r = makeRng(seed);
  const dot = glow(48, '#FFF3D6', { power: 2.6 }), cool = glow(48, '#CFE4FF', { power: 2.6 });
  const fl = flareSprite(256, PAL.estrella), flc = flareSprite(256, '#CFE4FF');
  const st = Array.from({ length: n + flares }, (_, i) => ({
    x: r() * (W + 160) - 80, y: r() * (H + 160) - 80, s: i < n ? r.range(4, 11) : r.range(46, 110),
    c: r.int(3, 14), ph: r(), a: r.range(0.4, 1), spr: i < n ? (r() < 0.7 ? dot : cool) : (r() < 0.7 ? fl : flc), big: i >= n
  }));
  return (ctx, f, T, mul = 1) => {
    ctx.globalCompositeOperation = 'lighter';
    for (const s of st) {
      const tw = 0.5 + 0.5 * lsin(f, T, s.c, s.ph);
      const a = s.a * (s.big ? 0.35 + 0.65 * tw : 0.15 + 0.85 * tw * tw) * mul;
      const sz = s.s * (s.big ? 0.8 + 0.3 * tw : 1);
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(s.spr, s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}

/** Estrellas fugaces: pocas, cortas, y siempre en el mismo fotograma de cada vuelta. */
export function meteors({ seed, n = 4 }) {
  const r = makeRng(seed);
  const head = glow(64, '#FFFFFF', { power: 2.4 });
  const ev = Array.from({ length: n }, (_, i) => ({
    at: (i + r.range(0.2, 0.8)) / n, dur: r.int(26, 44),
    x: r.range(0.1, 0.9) * W, y: r.range(0.05, 0.5) * H, ang: r.range(0.35, 0.9) * (r() < 0.5 ? 1 : -1) + (r() < 0.5 ? 0 : Math.PI),
    len: r.range(260, 520), tail: r.range(120, 220)
  }));
  return (ctx, f, T) => {
    for (const e of ev) {
      const k = (f - Math.round(e.at * T)) / e.dur;
      if (k < 0 || k > 1) continue;
      const ease = 1 - (1 - k) * (1 - k);
      const hx = e.x + Math.cos(e.ang) * e.len * ease, hy = e.y + Math.abs(Math.sin(e.ang)) * e.len * ease * 0.6;
      const tx = hx - Math.cos(e.ang) * e.tail, ty = hy - Math.abs(Math.sin(e.ang)) * e.tail * 0.6;
      const a = Math.sin(Math.PI * k);
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(hx, hy, tx, ty);
      gr.addColorStop(0, `rgba(255,246,224,${0.9 * a})`); gr.addColorStop(1, 'rgba(255,217,160,0)');
      ctx.strokeStyle = gr; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.globalAlpha = a; ctx.drawImage(head, hx - 16, hy - 16, 32, 32); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  };
}

/** Galaxia espiral lejana: se pinta una vez y luego solo gira. */
function spiralSprite(seed, size = 520) {
  const r = makeRng(seed);
  return blurred(size, size, 1.2, (g) => {
    const m = size / 2;
    const dotW = glow(24, '#FFF0D0', { power: 2.4 }), dotV = glow(24, '#C79BFF', { power: 2.4 }), dotC = glow(24, '#8FDFFF', { power: 2.4 });
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5200; i++) {
      const arm = i % 2, t = Math.pow(r(), 0.7);
      const th = t * 4.2 * Math.PI + arm * Math.PI + r.gauss() * (0.16 + t * 0.2);
      const rad = t * m * 0.9 + r.gauss() * 5;
      const s = r.range(1.5, 4.5);
      g.globalAlpha = (0.1 + 0.4 * r()) * (1 - t * 0.55);
      g.drawImage(t < 0.25 ? dotW : r() < 0.6 ? dotV : dotC, m + Math.cos(th) * rad - s / 2, m + Math.sin(th) * rad - s / 2, s, s);
    }
    g.globalAlpha = 1;
    g.drawImage(glow(260, '#FFE9C4', { power: 2.6 }), m - 130, m - 130);
    g.drawImage(glow(90, '#FFFFFF', { power: 2 }), m - 45, m - 45);
  });
}

/** Planeta anillado, a contraluz. Un solo objeto grande le da escala al resto. */
function planetSprite(size = 420) {
  return blurred(size, size, 0.8, (g) => {
    const m = size / 2, R = size * 0.2;
    const ring = (front) => {
      g.save(); g.translate(m, m); g.rotate(-0.34); g.scale(1, 0.26);
      for (const [rr, w, a] of [[R * 1.55, 9, 0.5], [R * 1.78, 14, 0.38], [R * 2.05, 6, 0.26]]) {
        g.strokeStyle = `rgba(214,190,255,${a})`; g.lineWidth = w;
        g.beginPath(); g.arc(0, 0, rr, front ? 0 : Math.PI, front ? Math.PI : TAU); g.stroke();
      }
      g.restore();
    };
    ring(false);
    const body = g.createRadialGradient(m + R * 0.45, m - R * 0.45, R * 0.1, m, m, R);
    body.addColorStop(0, '#E9D2FF'); body.addColorStop(0.35, '#9A6BE0'); body.addColorStop(0.75, '#3A2470'); body.addColorStop(1, '#0C0820');
    g.fillStyle = body; g.beginPath(); g.arc(m, m, R, 0, TAU); g.fill();
    // bandas atmosféricas, recortadas a la esfera
    g.save(); g.beginPath(); g.arc(m, m, R, 0, TAU); g.clip();
    g.rotate(0); g.globalAlpha = 0.16; g.fillStyle = '#FFFFFF';
    for (const [yy, hh] of [[-0.5, 0.1], [-0.18, 0.07], [0.12, 0.13], [0.48, 0.08]]) g.fillRect(m - R, m + yy * R, R * 2, hh * R);
    // lado nocturno
    g.globalAlpha = 1;
    const night = g.createLinearGradient(m + R * 0.5, m - R * 0.5, m - R * 0.9, m + R * 0.9);
    night.addColorStop(0, 'rgba(4,3,12,0)'); night.addColorStop(0.55, 'rgba(4,3,12,0.55)'); night.addColorStop(1, 'rgba(4,3,12,0.96)');
    g.fillStyle = night; g.fillRect(m - R, m - R, R * 2, R * 2);
    g.restore();
    ring(true);
  });
}

/** Dibuja una nebulosa con respiración y giro mínimos. */
function nebulaLayer({ tex, cx, cy, size, alpha = 1, rot = 0.03, ph = 0, amp = 18 }) {
  return (ctx, f, T, mul = 1) => {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(1, alpha * (0.86 + 0.14 * lsin(f, T, 2, ph)) * mul);
    ctx.save();
    ctx.translate(cx * W + lsin(f, T, 1, ph) * amp, cy * H + lcos(f, T, 1, ph * 1.6) * amp * 0.6);
    ctx.rotate(lsin(f, T, 1, ph + 0.3) * rot);
    const s = size * (1 + lsin(f, T, 1, ph + 0.6) * 0.03);
    ctx.drawImage(tex, -s / 2, -s / 2, s, s);
    ctx.restore();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}

// ─────────────────────────── pantallas ───────────────────────────

/** MAIN · la nebulosa de frente, con una galaxia lejana girando. */
function main() {
  const bg = bgRadial(0.42, 0.52, 0.6, [[0, '#1E1440'], [0.5, '#0E0B24'], [1, PAL.base]]);
  const n1 = nebulaTex(4, ['#3A1F7A', PAL.magenta, '#FF8FD0', PAL.cian], { cells: 3 });
  const n2 = nebulaTex(15, ['#152A6E', PAL.cian, '#7C5CFF'], { cells: 4, warp: 190, lo: 0.42, power: 2 });
  const stars = starLayer('gal-main-fijas', 2400), stars2 = starLayer('gal-main-fijas2', 700, { big: 8 });
  const spiral = spiralSprite(21);
  const L = {
    nA: nebulaLayer({ tex: n1, cx: 0.4, cy: 0.5, size: 1500, alpha: 0.95, ph: 0.1 }),
    nB: nebulaLayer({ tex: n2, cx: 0.66, cy: 0.42, size: 1300, alpha: 0.7, ph: 0.55, rot: -0.04 }),
    tw: twinklers({ seed: 'gal-main-tw', n: 170, flares: 12 }),
    met: meteors({ seed: 'gal-main-met', n: 4 }),
    dust: motes({ n: 70, seed: 'gal-main-polvo', color: PAL.cian, size: [3, 8], alpha: [0.1, 0.4], amp: [12, 50] })
  };
  const vig = vignette(0.9, '3,3,10', 0.36, 0.48), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.base; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.016, () => {
      ctx.drawImage(bg, -60, -60, W + 120, H + 120);
      L.nA(ctx, f, T); L.nB(ctx, f, T);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(stars, -130 + lsin(f, T, 1, 0.2) * 6, -130);
      ctx.drawImage(stars2, -130 - lsin(f, T, 1, 0.2) * 14, -130 + lcos(f, T, 1, 0.1) * 8);
      // la espiral: inclinada, girando una vuelta entera por bucle
      ctx.globalAlpha = 0.85;
      ctx.save(); ctx.translate(W * 0.78, H * 0.3); ctx.rotate(-0.5); ctx.scale(1, 0.42); ctx.rotate((f / T) * TAU);
      ctx.drawImage(spiral, -170, -170, 340, 340); ctx.restore();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.tw(ctx, f, T); L.met(ctx, f, T); L.dust(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

/** CEILING · la vía láctea cruzando el techo. */
function ceiling() {
  const ANG = -0.42;
  // las estrellas se agolpan sobre la banda: misma recta, mismo ángulo
  const bandMask = (u, v) => {
    const x = (u - 0.5) * (W + 260), y = (v - 0.5) * (H + 260);
    const d = (-x * Math.sin(ANG) + y * Math.cos(ANG)) / 1900;
    return 0.08 + 0.92 * Math.exp(-(d * d) / (2 * 0.07 * 0.07));
  };
  const band = milkyWayTex(33);
  const n2 = nebulaTex(41, ['#3A1F7A', PAL.magenta, '#FF9AD5'], { cells: 3, lo: 0.45, power: 2.2 });
  const stars = starLayer('gal-ceil-fijas', 2600), dense = starLayer('gal-ceil-banda', 3400, { mask: bandMask, big: 4 });
  const L = {
    band: (ctx, f, T) => {
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.95;
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ANG + lsin(f, T, 1, 0.3) * 0.015);
      ctx.drawImage(band, -950, -950, 1900, 1900); ctx.restore();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
    nB: nebulaLayer({ tex: n2, cx: 0.26, cy: 0.7, size: 1000, alpha: 0.6, ph: 0.4 }),
    tw: twinklers({ seed: 'gal-ceil-tw', n: 230, flares: 16 }),
    met: meteors({ seed: 'gal-ceil-met', n: 5 })
  };
  const vig = vignette(0.84, '3,3,10', 0.4, 0.5), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.base; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.012, () => {
      L.band(ctx, f, T); L.nB(ctx, f, T);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(stars, -130, -130);
      ctx.drawImage(dense, -130 + lsin(f, T, 1, 0.5) * 8, -130 + lcos(f, T, 1, 0.5) * 5);
      ctx.globalCompositeOperation = 'source-over';
      L.tw(ctx, f, T, 1.15); L.met(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

/** SIDE · más vacío: un planeta anillado y polvo. Le da escala al conjunto. */
function side() {
  const bg = bgRadial(0.68, 0.38, 0.62, [[0, '#191036'], [0.55, '#0B0920'], [1, PAL.base]]);
  const n1 = nebulaTex(57, ['#12306E', PAL.cian, '#8E6BFF', PAL.magenta], { cells: 3, lo: 0.4, power: 1.9 });
  const stars = starLayer('gal-side-fijas', 1900), stars2 = starLayer('gal-side-fijas2', 500, { big: 8 });
  const planet = planetSprite(520), halo = glow(520, '#8E6BFF', { power: 2.6 });
  const L = {
    nA: nebulaLayer({ tex: n1, cx: 0.64, cy: 0.4, size: 1500, alpha: 0.8, ph: 0.7 }),
    tw: twinklers({ seed: 'gal-side-tw', n: 130, flares: 9 }),
    met: meteors({ seed: 'gal-side-met', n: 3 }),
    dust: motes({ n: 120, seed: 'gal-side-polvo', color: PAL.magenta, size: [3, 8], alpha: [0.1, 0.42], amp: [12, 50] })
  };
  const vig = vignette(0.92, '3,3,10', 0.34, 0.48), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.base; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.022, () => {
      ctx.drawImage(bg, -60, -60, W + 120, H + 120);
      L.nA(ctx, f, T);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(stars, -130 + lsin(f, T, 1, 0.2) * 6, -130);
      ctx.drawImage(stars2, -130 - lsin(f, T, 1, 0.2) * 14, -130 + lcos(f, T, 1, 0.1) * 8);
      ctx.globalAlpha = 0.3; ctx.drawImage(halo, W * 0.27 - 260, H * 0.6 - 260);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const py = H * 0.6 + lsin(f, T, 1, 0.15) * 10;
      ctx.drawImage(planet, W * 0.27 - 260, py - 260);
      L.tw(ctx, f, T); L.met(ctx, f, T); L.dust(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

export default { id: 'AMBIENT-004', name: 'GALAXY', screens: { main, ceiling, side } };

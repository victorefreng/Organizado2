/**
 * AMBIENT-002 · OCEAN — el mundo base.
 *
 * Tres encuadres del mismo sitio. No hay continuidad geométrica entre pantallas
 * (no se puede sostener con tres proyectores separados): comparten paleta,
 * profundidad y ritmo, que es lo que hace que se lean como un solo lugar.
 */
import { W, H, TAU, makeRng, lsin, lcos, glow, bgLinear, bgRadial, vignette, grainTile, finish, drift, createCanvas } from '../lib.mjs';
import { causticTile, raySprite, blurred } from '../tex.mjs';
import { motes, rays, caustics } from '../layers.mjs';

const PAL = { abyss: '#000507', base: '#021E2E', mid: '#063D56', surface: '#0A6E8C',
              caustic: '#7FE3FF', biolum: '#6AFFD8', rays: '#E8F7FF' };
const mod = (a, n) => ((a % n) + n) % n;

// ─────────────────────────── sprites ───────────────────────────

function fishSprite(top, belly, blur = 0.6) {
  return blurred(96, 40, blur, (g) => {
    const gr = g.createLinearGradient(0, 6, 0, 34);
    gr.addColorStop(0, top); gr.addColorStop(1, belly);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(92, 20);
    g.bezierCurveTo(78, 5, 46, 5, 24, 17);
    g.lineTo(4, 6); g.lineTo(11, 20); g.lineTo(4, 34); g.lineTo(24, 23);
    g.bezierCurveTo(46, 35, 78, 35, 92, 20);
    g.fill();
  });
}

function mantaSprite(color, blur = 2.5) {
  return blurred(460, 260, blur, (g, w, h) => {
    g.translate(w / 2 + 20, h / 2);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(150, 0);
    g.bezierCurveTo(96, -22, 26, -96, -44, -112);
    g.bezierCurveTo(-30, -62, -70, -24, -112, -7);
    g.lineTo(-236, 0);
    g.lineTo(-112, 7);
    g.bezierCurveTo(-70, 24, -30, 62, -44, 112);
    g.bezierCurveTo(26, 96, 96, 22, 150, 0);
    g.fill();
    // aletas cefálicas
    g.beginPath(); g.moveTo(140, -8); g.quadraticCurveTo(168, -22, 172, -8); g.quadraticCurveTo(160, -6, 146, -2); g.fill();
    g.beginPath(); g.moveTo(140, 8); g.quadraticCurveTo(168, 22, 172, 8); g.quadraticCurveTo(160, 6, 146, 2); g.fill();
  });
}

function jellySprite(hex, seed) {
  const r = makeRng(seed);
  const rgb = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const c = (a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  return blurred(180, 300, 1.6, (g) => {
    // tentáculos: primero, para que la campana los tape
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x0 = 52 + (i / 8) * 76, len = r.range(110, 190), wob = r.range(5, 13), ph = r() * TAU;
      const gr = g.createLinearGradient(0, 96, 0, 96 + len);
      gr.addColorStop(0, c(0.5)); gr.addColorStop(1, c(0));
      g.strokeStyle = gr; g.lineWidth = r.range(1.2, 3.2);
      g.beginPath(); g.moveTo(x0, 96);
      for (let k = 1; k <= 14; k++) {
        const t = k / 14;
        g.lineTo(x0 + Math.sin(t * 5 + ph) * wob * t + (x0 - 90) * t * 0.12, 96 + t * len);
      }
      g.stroke();
    }
    // brazos orales: más gruesos y cortos
    for (let i = 0; i < 3; i++) {
      const x0 = 76 + i * 14;
      const gr = g.createLinearGradient(0, 90, 0, 190);
      gr.addColorStop(0, c(0.55)); gr.addColorStop(1, c(0));
      g.strokeStyle = gr; g.lineWidth = 7;
      g.beginPath(); g.moveTo(x0, 90);
      g.bezierCurveTo(x0 - 10, 125, x0 + 12, 150, x0 - 4, 190);
      g.stroke();
    }
    // campana
    const bell = g.createRadialGradient(90, 62, 4, 90, 70, 82);
    bell.addColorStop(0, c(0.95)); bell.addColorStop(0.45, c(0.5)); bell.addColorStop(1, c(0.08));
    g.fillStyle = bell;
    g.beginPath();
    g.moveTo(22, 100);
    g.bezierCurveTo(14, 30, 60, 8, 90, 8);
    g.bezierCurveTo(120, 8, 166, 30, 158, 100);
    g.quadraticCurveTo(142, 88, 124, 100); g.quadraticCurveTo(107, 88, 90, 100);
    g.quadraticCurveTo(73, 88, 56, 100); g.quadraticCurveTo(38, 88, 22, 100);
    g.fill();
    // borde luminoso
    g.strokeStyle = c(0.6); g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(22, 100); g.bezierCurveTo(14, 30, 60, 8, 90, 8); g.bezierCurveTo(120, 8, 166, 30, 158, 100); g.stroke();
  });
}

function kelpSprite(color, seed) {
  // Cintas largas que nacen de un mismo pie: algas, no alambre de espino.
  const r = makeRng(seed);
  return blurred(240, 520, 1.8, (g) => {
    g.fillStyle = color;
    const n = r.int(4, 6);
    for (let i = 0; i < n; i++) {
      const lean = r.range(-70, 70), len = r.range(300, 500), wid = r.range(9, 20);
      const waves = r.range(1.6, 3.2), amp = r.range(10, 26), ph = r() * TAU;
      const pt = (t, sgn) => {
        const cx = 120 + lean * t * t + Math.sin(t * waves * TAU * 0.5 + ph) * amp * t;
        const w = wid * Math.sin(Math.PI * Math.min(1, t * 1.02 + 0.02)) * (1 - t * 0.35) + 1.5;
        return [cx + sgn * w, 520 - t * len];
      };
      g.beginPath();
      for (let k = 0; k <= 30; k++) { const [x, y] = pt(k / 30, -1); k ? g.lineTo(x, y) : g.moveTo(x, y); }
      for (let k = 30; k >= 0; k--) { const [x, y] = pt(k / 30, 1); g.lineTo(x, y); }
      g.fill();
    }
  });
}

/** Perfil del fondo: rocas a contraluz, casi negras. */
function seabed(seed, height = 190, color = '#00080C') {
  const r = makeRng(seed);
  const w = W + 240;
  return blurred(w, height, 3, (g) => {
    const ph = [r() * TAU, r() * TAU, r() * TAU];
    const gr = g.createLinearGradient(0, 0, 0, height);
    gr.addColorStop(0, color + 'F0'); gr.addColorStop(1, '#000203');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, height);
    for (let x = 0; x <= w; x += 6) {
      const t = x / w;
      const edge = Math.pow(Math.abs(t - 0.5) * 2, 1.7);          // sube hacia los lados: enmarca
      const y = height * (0.86 - edge * 0.62)
        - Math.sin(t * 9 + ph[0]) * 16 - Math.sin(t * 23 + ph[1]) * 8 - Math.sin(t * 51 + ph[2]) * 4;
      g.lineTo(x, y);
    }
    g.lineTo(w, height); g.fill();
  });
}

// ─────────────────────────── capas propias ───────────────────────────

/** Cardúmenes: grupos que cruzan el encuadre un número entero de veces. */
function schools({ seed, groups, sprites }) {
  const r = makeRng(seed);
  const margin = 220, span = W + margin * 2;
  const fish = [];
  for (const gdef of groups) {
    const gy = gdef.y * H, gx = r() * span;
    for (let i = 0; i < gdef.n; i++) {
      const rad = Math.sqrt(r()) * gdef.spread;
      const a = r() * TAU;
      fish.push({
        x0: gx + Math.cos(a) * rad * 2.1, y0: gy + Math.sin(a) * rad * 0.8,
        s: gdef.size * r.range(0.7, 1.3), al: gdef.alpha * r.range(0.6, 1),
        dir: gdef.dir, wraps: gdef.wraps, spr: sprites[gdef.sprite || 0],
        c: r.int(2, 5), ph: r(), wob: r.range(4, 16) * gdef.size / 30,
        gc: gdef.gc || 1, gph: gdef.gph || 0, gamp: (gdef.gamp || 0.06) * H
      });
    }
  }
  return (ctx, f, T) => {
    ctx.globalCompositeOperation = 'source-over';
    for (const p of fish) {
      const x = mod(p.x0 + p.dir * (f / T) * p.wraps * span, span) - margin;
      if (x < -120 || x > W + 120) continue;
      const wob = lsin(f, T, p.c, p.ph) * p.wob;
      const grp = lsin(f, T, p.gc, p.gph) * p.gamp;
      // el pez se inclina hacia donde va: la pendiente del seno es su coseno
      const tilt = (lcos(f, T, p.c, p.ph) * p.wob * p.c + lcos(f, T, p.gc, p.gph) * p.gamp * p.gc) * 0.0009 * p.dir;
      ctx.globalAlpha = p.al;
      ctx.save();
      ctx.translate(x, p.y0 + wob + grp);
      ctx.scale(p.dir, 1);
      ctx.rotate(tilt);
      ctx.drawImage(p.spr, -p.s / 2, -p.s * 0.21, p.s, p.s * 0.42);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
}

function jellies({ n, seed, sizes = [60, 150], alpha = [0.3, 0.7], colors = [PAL.biolum] }) {
  const r = makeRng(seed);
  const sprs = colors.map((c, i) => jellySprite(c, seed.length * 7 + i));
  const span = H + 420;
  const js = Array.from({ length: n }, (_, i) => ({
    x: r.range(0.04, 0.96) * W, y0: r() * span, w: r.range(sizes[0], sizes[1]),
    a: r.range(alpha[0], alpha[1]), pulses: r.int(8, 18), ph: r(), sway: r.range(8, 30),
    spr: sprs[i % sprs.length], tiltPh: r()
  }));
  return (ctx, f, T) => {
    ctx.globalCompositeOperation = 'screen';
    for (const j of js) {
      const pulse = lsin(f, T, j.pulses, j.ph);
      const y = mod(j.y0 - (f / T) * span - lcos(f, T, j.pulses, j.ph) * 5, span) - 320;
      const x = j.x + lsin(f, T, 2, j.ph) * j.sway;
      const sx = 1 + pulse * 0.09, sy = 1 - pulse * 0.07;
      const w = j.w * sx, h = j.w * (300 / 180) * sy;
      ctx.globalAlpha = j.a * (0.75 + 0.25 * (0.5 + 0.5 * pulse));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lsin(f, T, 2, j.tiltPh) * 0.12);
      ctx.drawImage(j.spr, -w / 2, 0, w, h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
}

function kelp({ n, seed, color, region = [0, 1], sizes = [260, 520], alpha = 0.95 }) {
  const r = makeRng(seed);
  const sprs = [kelpSprite(color, 3), kelpSprite(color, 8), kelpSprite(color, 15)];
  const ks = Array.from({ length: n }, () => ({
    x: r.range(region[0], region[1]) * W, h: r.range(sizes[0], sizes[1]),
    c: r.int(3, 6), ph: r(), amp: r.range(0.04, 0.1), spr: r.pick(sprs), flip: r() < 0.5 ? -1 : 1
  })).sort((a, b) => a.h - b.h);
  return (ctx, f, T) => {
    ctx.globalAlpha = alpha;
    for (const k of ks) {
      ctx.save();
      ctx.translate(k.x, H + 26);
      ctx.rotate(lsin(f, T, k.c, k.ph) * k.amp);
      ctx.scale(k.flip, 1);
      ctx.drawImage(k.spr, -k.h * 0.23, -k.h, k.h * 0.46, k.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
}

/** Una manta que cruza una vez por vuelta. Lejana, sin protagonismo. */
function manta({ color, y = 0.4, size = 300, dir = 1, alpha = 0.5, ph = 0.3, blur = 2.5 }) {
  const spr = mantaSprite(color, blur);
  const margin = 420, span = W + margin * 2;
  return (ctx, f, T) => {
    const x = mod((ph + (f / T)) * span * dir, span) - margin;
    if (x < -360 || x > W + 360) return;
    const flap = lsin(f, T, 24, 0.1);
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(x, y * H + lsin(f, T, 3, 0.2) * 26);
    ctx.scale(dir, 1);
    ctx.rotate(lcos(f, T, 3, 0.2) * 0.05);
    ctx.drawImage(spr, -size / 2, -size * 0.283 * (0.72 + 0.28 * flap), size, size * 0.565 * (0.72 + 0.28 * flap));
    ctx.restore();
    ctx.globalAlpha = 1;
  };
}

function maskTopDown(from = 0.0, to = 0.62) {
  const c = createCanvas(W / 2, H / 2), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, from * H / 2, 0, to * H / 2);
  gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, '#000000');
  g.fillStyle = gr; g.fillRect(0, 0, W / 2, H / 2);
  return c;
}

// ─────────────────────────── pantallas ───────────────────────────

/** MAIN · pared de enfrente: el océano abierto. */
function main() {
  const bg = bgLinear([[0, PAL.surface], [0.36, PAL.mid], [0.72, PAL.base], [1, PAL.abyss]], 176);
  const sun = glow(1100, '#9FE8FF', { power: 2.4 });
  const ray = raySprite(192, 768, PAL.rays);
  const tA = causticTile(512, { cells: 5, seed: 5 }), tB = causticTile(512, { cells: 4, seed: 9 });
  const fishS = [fishSprite('#DFF6FF', '#7FD0E8'), fishSprite('#9CD9EC', '#3E8FA8', 1.2), fishSprite('#06222E', '#0A3442', 0.8)];
  const L = {
    rays: rays({ n: 11, seed: 'main-rayos', sprite: ray, from: 'top', intensity: 1.2, alpha: [0.16, 0.42], width: [40, 170] }),
    caus: caustics({ tileA: tA, tileB: tB, scale: 1.1, wraps: 2, alpha: 0.5, mask: maskTopDown(0, 0.95), destH: H * 0.42 }),
    manta: manta({ color: 'rgba(1,22,32,0.9)', y: 0.36, size: 300, dir: -1, alpha: 0.55, ph: 0.55 }),
    far: schools({ seed: 'main-lejos', sprites: fishS, groups: [
      { n: 46, y: 0.42, spread: 110, size: 20, alpha: 0.5, dir: 1, wraps: 1, sprite: 1, gc: 2, gph: 0.1 },
      { n: 34, y: 0.62, spread: 90, size: 17, alpha: 0.42, dir: -1, wraps: 1, sprite: 1, gc: 3, gph: 0.6 }] }),
    near: schools({ seed: 'main-cerca', sprites: fishS, groups: [
      { n: 30, y: 0.5, spread: 150, size: 44, alpha: 0.85, dir: 1, wraps: 2, sprite: 0, gc: 2, gph: 0.4, gamp: 0.08 },
      { n: 7, y: 0.74, spread: 90, size: 74, alpha: 0.8, dir: -1, wraps: 1, sprite: 2, gc: 1, gph: 0.8 }] }),
    jelly: jellies({ n: 5, seed: 'main-med', sizes: [56, 120], alpha: [0.3, 0.6] }),
    kelp: kelp({ n: 8, seed: 'main-kelp', color: '#000A0F', sizes: [190, 400] }),
    plank: motes({ n: 200, seed: 'main-plancton', color: PAL.rays, size: [3, 11], alpha: [0.12, 0.6], amp: [10, 60], rise: -1 })
  };
  const bed = seabed('main-fondo', 200);
  const vig = vignette(0.92, '0,2,4', 0.34, 0.44), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.abyss; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.022, () => {
      ctx.drawImage(bg, -40, -40, W + 80, H + 80);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.5 + 0.1 * lsin(f, T, 3, 0.2);
      ctx.drawImage(sun, W * 0.46 - 550, -640);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.caus(ctx, f, T);
      L.rays(ctx, f, T);
      L.manta(ctx, f, T);
      L.far(ctx, f, T);
      L.jelly(ctx, f, T);
      L.near(ctx, f, T);
      ctx.drawImage(bed, -120 + lsin(f, T, 1, 0.3) * 10, H - 180);
      L.kelp(ctx, f, T);
      L.plank(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

/** CEILING · techo: la superficie vista desde abajo. La red de luz ES la imagen. */
function ceiling() {
  const bg = bgRadial(0.5, 0.42, 0.52, [[0, '#1590AE'], [0.3, PAL.surface], [0.58, PAL.mid], [0.82, PAL.base], [1, PAL.abyss]]);
  const sun = glow(900, '#D8F8FF', { power: 2.6 }), core = glow(380, '#FFFFFF', { power: 3 });
  const ray = raySprite(192, 768, PAL.rays);
  const tA = causticTile(512, { cells: 4, seed: 11, width: 0.4 }), tB = causticTile(512, { cells: 3, seed: 17, width: 0.42 });
  const dark = [fishSprite('#012230', '#01303E', 1), fishSprite('#011C28', '#012A38', 1.6)];
  const L = {
    caus: caustics({ tileA: tA, tileB: tB, scale: 1.6, wraps: 2, alpha: 0.9, lift: 0.4 }),
    rays: rays({ n: 13, seed: 'ceil-rayos', sprite: ray, from: [0.5, 0.42], intensity: 1.2, alpha: [0.1, 0.26], len: [0.7, 1.1], width: [120, 320] }),
    fish: schools({ seed: 'ceil-peces', sprites: dark, groups: [
      { n: 38, y: 0.3, spread: 150, size: 26, alpha: 0.6, dir: 1, wraps: 1, sprite: 0, gc: 2, gph: 0.2, gamp: 0.1 },
      { n: 22, y: 0.68, spread: 120, size: 20, alpha: 0.45, dir: -1, wraps: 1, sprite: 1, gc: 1, gph: 0.7 }] }),
    manta: manta({ color: 'rgba(0,16,24,0.95)', y: 0.5, size: 520, dir: 1, alpha: 0.62, ph: 0.5, blur: 4 }),
    plank: motes({ n: 130, seed: 'ceil-plancton', color: PAL.rays, size: [3, 9], alpha: [0.12, 0.5], amp: [10, 50] })
  };
  const vig = vignette(0.96, '0,3,6', 0.36, 0.44), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.abyss; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.016, () => {
      ctx.drawImage(bg, -40, -40, W + 80, H + 80);
      L.caus(ctx, f, T);
      ctx.globalCompositeOperation = 'screen';
      const br = 0.5 + 0.5 * lsin(f, T, 4, 0.1);
      ctx.globalAlpha = 0.5 + 0.12 * br; ctx.drawImage(sun, W * 0.5 - 450, H * 0.42 - 450);
      ctx.globalAlpha = 0.5 + 0.2 * br; ctx.drawImage(core, W * 0.5 - 190, H * 0.42 - 190);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      L.rays(ctx, f, T);
      L.fish(ctx, f, T);
      L.manta(ctx, f, T);
      L.plank(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

/** SIDE · pared lateral: más hondo, más vida pequeña, sin protagonismo. */
function side() {
  const bg = bgLinear([[0, PAL.mid], [0.4, PAL.base], [1, PAL.abyss]], 200);
  const ray = raySprite(192, 768, PAL.rays);
  const tA = causticTile(512, { cells: 6, seed: 23 }), tB = causticTile(512, { cells: 5, seed: 29 });
  const fishS = [fishSprite('#C9F0FA', '#63BCD6'), fishSprite('#7FC9DE', '#2F7C96', 1.2)];
  const L = {
    rays: rays({ n: 7, seed: 'side-rayos', sprite: ray, from: 'top', intensity: 0.9, alpha: [0.12, 0.32], width: [40, 150] }),
    caus: caustics({ tileA: tA, tileB: tB, scale: 1.0, wraps: 2, alpha: 0.36, mask: maskTopDown(0, 0.95), destH: H * 0.34 }),
    far: schools({ seed: 'side-lejos', sprites: fishS, groups: [
      { n: 60, y: 0.34, spread: 130, size: 12, alpha: 0.36, dir: -1, wraps: 1, sprite: 1, gc: 2, gph: 0.3 },
      { n: 50, y: 0.6, spread: 120, size: 14, alpha: 0.4, dir: 1, wraps: 1, sprite: 1, gc: 3, gph: 0.8 }] }),
    near: schools({ seed: 'side-cerca', sprites: fishS, groups: [
      { n: 34, y: 0.46, spread: 150, size: 34, alpha: 0.78, dir: -1, wraps: 2, sprite: 0, gc: 2, gph: 0.5, gamp: 0.09 }] }),
    jelly: jellies({ n: 9, seed: 'side-med', sizes: [50, 170], alpha: [0.3, 0.72], colors: [PAL.biolum, '#8FB8FF'] }),
    kelp: kelp({ n: 11, seed: 'side-kelp', color: '#00090D', sizes: [220, 520] }),
    plank: motes({ n: 250, seed: 'side-plancton', color: '#BFFFF0', size: [3, 10], alpha: [0.12, 0.6], amp: [10, 55], rise: -1 }),
    bio: motes({ n: 40, seed: 'side-bio', color: PAL.biolum, size: [8, 20], alpha: [0.2, 0.7], amp: [20, 80], blink: 4 })
  };
  const bed = seabed('side-fondo', 220);
  const vig = vignette(0.94, '0,2,4', 0.32, 0.46), grain = grainTile();
  return (ctx, f, T) => {
    ctx.fillStyle = PAL.abyss; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.026, () => {
      ctx.drawImage(bg, -40, -40, W + 80, H + 80);
      L.caus(ctx, f, T);
      L.rays(ctx, f, T);
      L.far(ctx, f, T);
      L.jelly(ctx, f, T);
      L.near(ctx, f, T);
      ctx.drawImage(bed, -120 + lsin(f, T, 1, 0.6) * 10, H - 186);
      L.kelp(ctx, f, T);
      L.plank(ctx, f, T);
      L.bio(ctx, f, T);
    });
    finish(ctx, f, vig, grain);
  };
}

export default { id: 'AMBIENT-002', name: 'OCEAN', screens: { main, ceiling, side } };

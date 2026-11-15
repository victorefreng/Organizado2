/**
 * PIEZAS PARA LOS CAPÍTULOS: texto que se forma con partículas, tarjetas de
 * foto, flores, mariposa, ballena. Todo precalculado; el fotograma solo coloca.
 */
import { GlobalFonts, loadImage } from '@napi-rs/canvas';
import { W, H, TAU, makeRng, glow, createCanvas, clamp01 } from '../lib.mjs';
import { blurred } from '../tex.mjs';

GlobalFonts.registerFromPath('/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf', 'U11 Serif');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf', 'U11 Serif Italic');

export const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const prog = (t, a, b) => clamp01((t - a) / (b - a));
export const eo = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const back = (x) => { x = clamp01(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
/** Ventana: sube en `fi` segundos desde a, baja en `fo` segundos hasta b. */
export const win = (t, a, b, fi = 1, fo = 1) => ss(a, a + fi, t) * (1 - ss(b - fo, b, t));

export function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/**
 * Texto que se forma con partículas doradas y se deshace hacia arriba.
 * Devuelve `(ctx, kin, kout, f)`: kin 0→1 lo forma, kout 0→1 lo disuelve.
 */
export function textFx({ text, size = 64, y = H / 2, tracking = 0.12, italic = false, seed = 'txt', n = 620,
                         colors = ['#FFE2A8'], scatter = 380, maxW = W - 160 }) {
  const font = (s) => `${s}px "${italic ? 'U11 Serif Italic' : 'U11 Serif'}"`;
  const probe = createCanvas(8, 8).getContext('2d');
  const chars = [...text];
  let widths, tr, total;
  for (;;) {
    probe.font = font(size);
    widths = chars.map((c) => probe.measureText(c).width); tr = size * tracking;
    total = widths.reduce((a, b) => a + b, 0) + tr * (chars.length - 1);
    if (total <= maxW || size < 20) break;
    size *= 0.94;                                   // nunca se sale del encuadre
  }
  const pad = Math.round(size * 0.9), cw = Math.ceil(total) + pad * 2, ch = Math.ceil(size * 1.5) + pad * 2;
  const tc = createCanvas(cw, ch), tg = tc.getContext('2d');
  tg.font = font(size); tg.textBaseline = 'alphabetic';
  const grad = tg.createLinearGradient(0, pad, 0, pad + size * 1.25);
  grad.addColorStop(0, '#FFFBEF'); grad.addColorStop(0.5, '#FFDFA6'); grad.addColorStop(1, '#E7A95A');
  tg.fillStyle = grad;
  let x = pad; const base = pad + size * 1.02;
  chars.forEach((c, i) => { tg.fillText(c, x, base); x += widths[i] + tr; });
  const halo = blurred(cw, ch, size * 0.16, (g) => g.drawImage(tc, 0, 0));
  const data = tg.getImageData(0, 0, cw, ch).data, pts = [];
  for (let py = 0; py < ch; py += 3) for (let px = 0; px < cw; px += 3) if (data[(py * cw + px) * 4 + 3] > 130) pts.push([px, py]);
  const r = makeRng(seed);
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const ox = W / 2 - cw / 2, oy = y - ch / 2;
  const dots = colors.map((c) => glow(48, c, { power: 2.3 })), gold = glow(48, '#FFE2A8', { power: 2.3 });
  const ps = pts.slice(0, n).map(([px, py]) => {
    const a = r() * TAU, d = scatter * (0.35 + r());
    return { tx: ox + px, ty: oy + py, sx: ox + px + Math.cos(a) * d, sy: oy + py + Math.sin(a) * d * 0.7,
             delay: (px / cw) * 0.45 + r() * 0.25, s: r.range(4, 10), spr: dots[Math.floor(r() * dots.length)], up: r.range(40, 170), sw: r.range(-40, 40), tw: r() * TAU };
  });
  return (ctx, kin, kout = 0, f = 0) => {
    if (kin <= 0 || kout >= 1) return;
    const ta = ss(0.5, 0.95, kin) * (1 - ss(0, 0.55, kout));
    ctx.globalCompositeOperation = 'lighter';
    if (ta > 0.003) { ctx.globalAlpha = ta * 0.55; ctx.drawImage(halo, ox, oy); }
    for (const p of ps) {
      const local = clamp01(kin * 1.7 - p.delay), e = eo(local);
      let px = p.sx + (p.tx - p.sx) * e, py = p.sy + (p.ty - p.sy) * e;
      let a = Math.min(1, local * 3) * (1 - 0.82 * ss(0.75, 1, kin));       // al llegar se apagan y queda la letra
      if (kout > 0) { px += p.sw * kout; py -= p.up * kout * kout; a = Math.max(a, Math.sin(Math.PI * Math.min(1, kout * 1.15)) * 0.9); }
      a *= 0.7 + 0.3 * Math.sin(f * 0.3 + p.tw);
      if (a < 0.01) continue;
      ctx.globalAlpha = Math.min(1, a);
      const spr = local > 0.9 ? gold : p.spr;
      ctx.drawImage(spr, px - p.s / 2, py - p.s / 2, p.s, p.s);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (ta > 0.003) { ctx.globalAlpha = ta; ctx.drawImage(tc, ox, oy); }
    ctx.globalAlpha = 1;
  };
}

/** Flor de cinco pétalos, mirando al frente. */
export function flowerSprite(petal, center, seed = 1) {
  const r = makeRng(seed);
  return blurred(160, 160, 0.8, (g) => {
    g.translate(80, 80);
    const n = 5 + (seed % 2);
    for (let i = 0; i < n; i++) {
      g.save(); g.rotate((i / n) * TAU + r.range(-0.08, 0.08));
      const gr = g.createLinearGradient(0, 0, 0, -70);
      gr.addColorStop(0, center); gr.addColorStop(0.35, petal); gr.addColorStop(1, '#FFFFFF');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(30, -18, 30, -58, 0, -72); g.bezierCurveTo(-30, -58, -30, -18, 0, 0); g.fill();
      g.restore();
    }
    const c = g.createRadialGradient(0, 0, 0, 0, 0, 16);
    c.addColorStop(0, '#FFF6C8'); c.addColorStop(1, center);
    g.fillStyle = c; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill();
  });
}

/** Flores que se abren una tras otra. `(ctx, t, f)`, con t en segundos. */
export function flowers({ seed, n, from, to, region = [0, 0.45, 1, 1], size = [34, 84], avoid = null }) {
  const r = makeRng(seed);
  const sprs = [flowerSprite('#FFB7C9', '#FF8FB0', 1), flowerSprite('#FFE3B0', '#FFC06A', 2), flowerSprite('#F4E9FF', '#C9A6FF', 3), flowerSprite('#FFFFFF', '#FFD98A', 4)];
  const fs = [];
  let guard = 0;
  while (fs.length < n && guard++ < n * 40) {
    const x = (region[0] + r() * (region[2] - region[0])) * W, y = (region[1] + r() * (region[3] - region[1])) * H;
    if (avoid && Math.abs(x - avoid[0] * W) < avoid[2] * W && Math.abs(y - avoid[1] * H) < avoid[3] * H) continue;
    fs.push({ x, y, s: r.range(size[0], size[1]), at: from + r() * (to - from), spr: sprs[Math.floor(r() * sprs.length)], rot: r() * TAU, ph: r() * TAU, sq: r.range(0.55, 1) });
  }
  return (ctx, t, f, alpha = 1) => {
    ctx.globalCompositeOperation = 'source-over';
    for (const fl of fs) {
      const k = back(prog(t, fl.at, fl.at + 1.4));
      if (k <= 0.01) continue;
      const s = fl.s * k;
      ctx.globalAlpha = Math.min(1, alpha * Math.min(1, k * 2));
      ctx.save(); ctx.translate(fl.x + Math.sin(f * 0.02 + fl.ph) * 3, fl.y);
      ctx.rotate(fl.rot + Math.sin(f * 0.017 + fl.ph) * 0.06 + (1 - Math.min(1, k)) * 1.2); ctx.scale(1, fl.sq);
      ctx.drawImage(fl.spr, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
}

/**
 * Tarjeta de foto. El marco toma la proporción de la foto, nunca al revés:
 * ningún rostro se deforma ni se recorta.
 */
export async function photoCard(file, { maxW = 640, maxH = 520, leaves = [], blooms = [], seed = 1, border = true } = {}) {
  const img = await loadImage(file), ar = img.width / img.height;
  let w = maxW, h = w / ar; if (h > maxH) { h = maxH; w = h * ar; }
  w = Math.round(w); h = Math.round(h);
  const pad = 120, c = createCanvas(w + pad * 2, h + pad * 2), g = c.getContext('2d'), r = makeRng(seed * 13 + 5);
  g.shadowColor = 'rgba(255,200,120,0.6)'; g.shadowBlur = 60; g.fillStyle = '#20150A'; rr(g, pad, pad, w, h, 16); g.fill();
  g.shadowBlur = 0; g.shadowColor = 'transparent';
  g.save(); rr(g, pad, pad, w, h, 16); g.clip();
  g.drawImage(img, pad, pad, w, h);
  const vg = g.createRadialGradient(pad + w / 2, pad + h / 2, Math.min(w, h) * 0.35, pad + w / 2, pad + h / 2, Math.hypot(w, h) * 0.62);
  vg.addColorStop(0, 'rgba(20,10,0,0)'); vg.addColorStop(1, 'rgba(20,10,0,0.42)');
  g.fillStyle = vg; g.fillRect(pad, pad, w, h);
  g.restore();
  const bd = g.createLinearGradient(pad, pad, pad + w, pad + h);
  bd.addColorStop(0, '#FFF1CF'); bd.addColorStop(0.5, '#E0A65A'); bd.addColorStop(1, '#FFE2A8');
  if (border) { g.strokeStyle = bd; g.lineWidth = 3.5; rr(g, pad, pad, w, h, 16); g.stroke(); }
  // el marco vivo: hojas y flores abrazando dos esquinas opuestas
  const corner = (cx, cy, base) => {
    for (let i = 0; i < 5 && leaves.length; i++) {
      const l = leaves[Math.floor(r() * leaves.length)], hh = r.range(120, 200), ww = hh * l.ratio;
      g.save(); g.translate(cx + r.range(-14, 14), cy + r.range(-14, 14)); g.rotate(base + r.range(-0.9, 0.9));
      g.drawImage(l.spr, -ww / 2, -hh, ww, hh); g.restore();
    }
    for (let i = 0; i < 3 && blooms.length; i++) {
      const b = blooms[Math.floor(r() * blooms.length)], s = r.range(38, 62);
      g.drawImage(b, cx + r.range(-50, 50) - s / 2, cy + r.range(-50, 50) - s / 2, s, s);
    }
  };
  corner(pad + 8, pad + h - 8, -2.2); corner(pad + w - 8, pad + 8, 0.9);
  return { canvas: c, w: c.width, h: c.height, pw: w, ph: h };
}

/** Dibuja una tarjeta entrando, respirando y saliendo. k en 0..1 dentro de su ventana. */
export function drawCard(ctx, card, cx, cy, t, a, b, f, { fi = 1.3, fo = 0.9, tilt = 0 } = {}) {
  if (t < a || t > b) return;
  const kin = eo(prog(t, a, a + fi)), kout = ss(b - fo, b, t), life = prog(t, a, b);
  const s = (0.9 + 0.1 * kin) * (1 + 0.045 * life) * (1 + 0.03 * kout);
  ctx.globalAlpha = kin * (1 - kout);
  ctx.save(); ctx.translate(cx + Math.sin(f * 0.012) * 5, cy + Math.cos(f * 0.01) * 4 + (1 - kin) * 26);
  ctx.rotate(tilt + Math.sin(f * 0.008) * 0.006); ctx.scale(s, s);
  ctx.drawImage(card.canvas, -card.w / 2, -card.h / 2);
  ctx.restore(); ctx.globalAlpha = 1;
}

/** Mariposa luminosa: dos pares de alas que baten. */
export function butterfly() {
  const wing = blurred(120, 150, 1, (g) => {
    const gr = g.createRadialGradient(8, 75, 4, 30, 70, 110);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.35, '#FFE7A8'); gr.addColorStop(0.75, '#FFB45A'); gr.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(6, 74); g.bezierCurveTo(30, 6, 104, 0, 110, 40); g.bezierCurveTo(112, 66, 60, 76, 6, 76); g.fill();
    g.beginPath(); g.moveTo(6, 78); g.bezierCurveTo(60, 80, 96, 96, 84, 126); g.bezierCurveTo(70, 150, 22, 124, 6, 78); g.fill();
  });
  const halo = glow(240, '#FFD08A', { power: 2.4 });
  return (ctx, x, y, s, f, alpha = 1, heading = 0) => {
    if (alpha <= 0.003) return;
    const flap = 0.2 + 0.8 * Math.abs(Math.cos(f * 0.62));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * alpha; ctx.drawImage(halo, x - 120 * s, y - 120 * s, 240 * s, 240 * s);
    ctx.globalAlpha = alpha;
    ctx.save(); ctx.translate(x, y); ctx.rotate(heading); ctx.scale(s, s);
    for (const side of [-1, 1]) { ctx.save(); ctx.scale(side * flap, 1); ctx.drawImage(wing, 0, -75); ctx.restore(); }
    ctx.restore();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}

/** Ballena jorobada de cuento, de perfil, mirando a la izquierda. Cuerpo y cola por separado para que la cola bata. */
export function whaleSide() {
  const body = blurred(900, 420, 1.4, (g) => {
    const gr = g.createLinearGradient(0, 110, 0, 320);
    gr.addColorStop(0, '#0E3A52'); gr.addColorStop(0.5, '#1E6A86'); gr.addColorStop(0.78, '#8FCBDC'); gr.addColorStop(1, '#CDEAF0');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(70, 220);
    g.bezierCurveTo(120, 118, 350, 92, 560, 134); g.bezierCurveTo(690, 160, 770, 192, 838, 206);
    g.lineTo(838, 232); g.bezierCurveTo(750, 252, 630, 300, 440, 306); g.bezierCurveTo(270, 312, 120, 296, 70, 220); g.fill();
    // aleta dorsal
    g.fillStyle = '#0E3A52'; g.beginPath(); g.moveTo(590, 140); g.quadraticCurveTo(628, 108, 650, 150); g.fill();
    // surcos de la garganta
    g.strokeStyle = 'rgba(14,58,82,0.4)'; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(96 + i * 6, 236 + i * 7); g.bezierCurveTo(220, 262 + i * 6, 340, 276 + i * 4, 440 - i * 12, 282 + i * 3); g.stroke(); }
    // aleta pectoral, larga
    const pf = g.createLinearGradient(300, 280, 430, 400);
    pf.addColorStop(0, '#1E6A86'); pf.addColorStop(1, '#0B3044');
    g.fillStyle = pf; g.beginPath(); g.moveTo(300, 276); g.bezierCurveTo(330, 340, 400, 394, 470, 402); g.bezierCurveTo(430, 360, 400, 312, 372, 280); g.fill();
    // ojo y línea de la boca
    g.fillStyle = '#04141C'; g.beginPath(); g.arc(196, 236, 6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(194, 234, 2, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(4,20,28,0.55)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(74, 224); g.quadraticCurveTo(150, 246, 232, 250); g.stroke();
  });
  const fluke = blurred(220, 300, 1.4, (g) => {
    g.fillStyle = '#12445E';
    g.beginPath(); g.moveTo(0, 138); g.bezierCurveTo(50, 132, 100, 80, 180, 14); g.bezierCurveTo(176, 80, 150, 130, 112, 150);
    g.bezierCurveTo(150, 170, 176, 220, 180, 286); g.bezierCurveTo(100, 220, 50, 168, 0, 162); g.fill();
  });
  return (ctx, x, y, s, f, alpha = 1) => {
    if (alpha <= 0.003) return;
    ctx.globalAlpha = alpha;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(f * 0.03) * 0.03); ctx.scale(s, s);
    ctx.save(); ctx.translate(380, 0); ctx.rotate(Math.sin(f * 0.06) * 0.22); ctx.drawImage(fluke, -6, -150); ctx.restore();
    ctx.drawImage(body, -450, -219);
    ctx.restore(); ctx.globalAlpha = 1;
  };
}

/** Ballena vista desde abajo: silueta a contraluz de la superficie. */
export function whaleBelow() {
  const spr = blurred(900, 520, 3.5, (g) => {
    g.fillStyle = '#011C28'; g.translate(450, 260);
    g.beginPath(); g.moveTo(-400, 0); g.bezierCurveTo(-340, -74, -80, -86, 150, -44); g.bezierCurveTo(260, -24, 330, -8, 372, 0);
    g.bezierCurveTo(330, 8, 260, 24, 150, 44); g.bezierCurveTo(-80, 86, -340, 74, -400, 0); g.fill();
    for (const sgn of [-1, 1]) {
      g.beginPath(); g.moveTo(-170, sgn * 60); g.bezierCurveTo(-140, sgn * 150, -40, sgn * 220, 60, sgn * 236); g.bezierCurveTo(10, sgn * 170, -60, sgn * 100, -100, sgn * 62); g.fill();
      g.beginPath(); g.moveTo(360, 0); g.bezierCurveTo(390, sgn * 30, 420, sgn * 96, 444, sgn * 128); g.bezierCurveTo(400, sgn * 110, 372, sgn * 50, 352, sgn * 8); g.fill();
    }
  });
  return (ctx, x, y, s, rot, f, alpha = 1) => {
    if (alpha <= 0.003) return;
    ctx.globalAlpha = alpha;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot + Math.sin(f * 0.04) * 0.03); ctx.scale(s, s * (1 + Math.sin(f * 0.05) * 0.03));
    ctx.drawImage(spr, -450, -260); ctx.restore(); ctx.globalAlpha = 1;
  };
}

/**
 * Tarjeta que viaja en profundidad: nace lejos y pequeña, se acerca y pasa de
 * largo por un lado. `side` −1 izquierda, +1 derecha, 0 se queda en el centro.
 */
export function floatCard(ctx, card, t, a, b, side, f, { near = 1.06, far = 0.34, hold = 0 } = {}) {
  const k = prog(t, a, b);
  if (k <= 0 || k >= 1) return;
  const e = side === 0 ? eo(Math.min(1, k / 0.42)) : k * k * (3 - 2 * k);
  const s = far + (near - far) * e;
  const x = W * (0.5 + side * (0.05 + 0.3 * e)) + Math.sin(f * 0.011 + a) * 6, y = H * (0.52 - 0.04 * e) + Math.cos(f * 0.009 + a) * 5;
  ctx.globalAlpha = ss(0, 0.16, k) * (side === 0 ? 1 - hold : 1 - ss(0.84, 1, k));
  ctx.save(); ctx.translate(x, y); ctx.rotate(side * 0.03 + Math.sin(f * 0.007 + a) * 0.008); ctx.scale(s, s);
  ctx.drawImage(card.canvas, -card.w / 2, -card.h / 2); ctx.restore(); ctx.globalAlpha = 1;
}

/** Una tarjeta que se deshace en partículas doradas. k 0→1. */
export function dissolver(card, seed = 'dis', n = 520) {
  const r = makeRng(seed), dot = glow(48, '#FFE2A8', { power: 2.2 });
  const ps = Array.from({ length: n }, () => ({ x: (r() - 0.5) * card.pw, y: (r() - 0.5) * card.ph, vx: r.range(-160, 160), vy: r.range(-320, -60), s: r.range(5, 14), d: r() * 0.4, tw: r() * TAU }));
  return (ctx, k, cx, cy, scale, f) => {
    if (k <= 0 || k >= 1) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of ps) {
      const l = clamp01((k - p.d) / (1 - p.d)); if (l <= 0 || l >= 1) continue;
      ctx.globalAlpha = Math.sin(Math.PI * l) * (0.7 + 0.3 * Math.sin(f * 0.3 + p.tw));
      const s = p.s * (1 - l * 0.4);
      ctx.drawImage(dot, cx + (p.x + p.vx * l * l) * scale - s / 2, cy + (p.y + p.vy * l) * scale - s / 2, s, s);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}

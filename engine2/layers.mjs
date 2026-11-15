/**
 * CAPAS REUTILIZABLES.
 *
 * Cada fábrica precalcula lo suyo y devuelve una función `(ctx, f, T)` que
 * solo coloca sprites. Todas cierran ciclo: usan lsin/lcos/lramp con un número
 * entero de vueltas.
 */
import { W, H, TAU, makeRng, lsin, lcos, lramp, glow, createCanvas, tile } from './lib.mjs';

const mod = (a, n) => ((a % n) + n) % n;

/**
 * Motas luminosas: plancton, polvo, luciérnagas, bokeh.
 *   rise   vueltas enteras de subida (negativo = caen) a lo largo del bucle
 *   blink  exponente del parpadeo: 1 = respiración, 5 = luciérnaga
 */
export function motes({ n, seed, color = '#FFFFFF', size = [2, 6], alpha = [0.15, 0.6], amp = [8, 40],
                        rise = 0, blink = 1, cycles = [1, 4], region = [0, 0, 1, 1], blend = 'lighter',
                        sprite = null, power = 2 }) {
  const r = makeRng(seed);
  const spr = sprite || glow(64, color, { power });
  const ps = Array.from({ length: n }, () => ({
    x: (region[0] + r() * (region[2] - region[0])) * W,
    y: (region[1] + r() * (region[3] - region[1])) * H,
    s: r.range(size[0], size[1]),
    a: r.range(alpha[0], alpha[1]),
    amp: r.range(amp[0], amp[1]),
    c: r.int(cycles[0], cycles[1]),
    tc: r.int(1, 6),
    ph: r(), ph2: r(),
    rise: rise === 0 ? 0 : rise * (r() < 0.5 || Math.abs(rise) > 1 ? 1 : 1)
  }));
  const span = H + 80;
  return (ctx, f, T, mul = 1) => {
    ctx.globalCompositeOperation = blend;
    for (const p of ps) {
      const tw = 0.5 + 0.5 * lsin(f, T, p.tc, p.ph2);
      const a = p.a * (blink === 1 ? 0.45 + 0.55 * tw : Math.pow(tw, blink)) * mul;
      if (a < 0.004) continue;
      const x = p.x + lsin(f, T, p.c, p.ph) * p.amp;
      let y = p.y + lcos(f, T, p.c, p.ph * 1.7) * p.amp * 0.6;
      if (p.rise) y = mod(y - (f / T) * p.rise * span + 40, span) - 40;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(spr, x - p.s / 2, y - p.s / 2, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
}

/**
 * Haces de luz que respiran.
 *   from  'top' | 'bottom' | [cx, cy] (radial, desde un punto)
 */
export function rays({ n, seed, sprite, from = 'top', intensity = 1, len = [0.8, 1.25], width = [90, 300],
                       tilt = 0.38, alpha = [0.1, 0.3], blend = 'screen' }) {
  const r = makeRng(seed);
  const radial = Array.isArray(from);
  const rs = Array.from({ length: n }, (_, i) => ({
    x: r.range(-0.08, 1.08) * W,
    w: r.range(width[0], width[1]),
    ang: radial ? (i / n) * TAU + r.range(-0.25, 0.25) : r.range(-tilt, tilt),
    a: r.range(alpha[0], alpha[1]),
    c: r.int(1, 3), ph: r(),
    len: r.range(len[0], len[1])
  }));
  return (ctx, f, T, mul = 1) => {
    ctx.globalCompositeOperation = blend;
    for (const ray of rs) {
      const breathe = 0.6 + 0.4 * (0.5 + 0.5 * lsin(f, T, ray.c, ray.ph));
      const sway = lsin(f, T, ray.c, ray.ph + 0.25) * 0.035;
      ctx.globalAlpha = Math.min(1, ray.a * intensity * breathe * mul);
      ctx.save();
      if (radial) {
        ctx.translate(from[0] * W, from[1] * H);
        ctx.rotate(ray.ang + sway * 2);
        ctx.drawImage(sprite, -ray.w / 2, 10, ray.w, ray.len * H);
      } else if (from === 'top') {
        ctx.translate(ray.x, -H * 0.12);
        ctx.rotate(ray.ang + sway);
        ctx.drawImage(sprite, -ray.w / 2, 0, ray.w, ray.len * H * 1.2);
      } else {
        ctx.translate(ray.x, H * 1.12);
        ctx.rotate(Math.PI + ray.ang + sway);
        ctx.drawImage(sprite, -ray.w / 2, 0, ray.w, ray.len * H * 1.2);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
}

/**
 * Cáusticas vivas: dos redes que se cruzan en sentidos opuestos y de las que
 * queda el mínimo. Donde coinciden hay luz; al deslizarse, la red entera
 * cambia de forma en vez de limitarse a desplazarse.
 *   mask  lienzo opcional (W/2 × H/2) que se multiplica: blanco deja pasar
 */
export function caustics({ tileA, tileB, scale = 1, wraps = 2, alpha = 0.5, mask = null, lift = 0.3, destH = H }) {
  const cw = W / 2, ch = H / 2;
  const off = createCanvas(cw, ch), g = off.getContext('2d');
  const size = 512 * scale * 0.5;
  return (ctx, f, T, mul = 1) => {
    const p = f / T;
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    tile(g, tileA, size, p * wraps * size, p * wraps * size * 1, cw, ch);
    g.globalCompositeOperation = 'darken';
    tile(g, tileB, size, -p * wraps * size + size * 0.37, p * (wraps + 1) * size + size * 0.61, cw, ch);
    if (lift > 0) {
      // un resto de la primera red evita que queden zonas muertas
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = lift;
      tile(g, tileA, size, p * wraps * size, p * wraps * size * 1, cw, ch);
      g.globalAlpha = 1;
    }
    if (mask) { g.globalCompositeOperation = 'multiply'; g.drawImage(mask, 0, 0, cw, ch); }
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(1, alpha * mul);
    // destH < H aplasta la red: es la superficie vista en rasante, no una malla en el agua
    ctx.drawImage(off, -60, -40, W + 120, destH + 40);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
}

/** Niebla o bruma: una tesela de ruido que cruza el encuadre un número entero de veces. */
export function mist({ tex, size = 1024, wraps = 1, alpha = 0.3, y = 0, h = H, blend = 'screen', dir = 1 }) {
  return (ctx, f, T, mul = 1) => {
    ctx.globalCompositeOperation = blend;
    ctx.globalAlpha = alpha * mul;
    const ox = dir * (f / T) * wraps * size;
    const sx = mod(ox, size) - size;
    for (let x = sx; x < W + size; x += size) ctx.drawImage(tex, x, y, size, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
}

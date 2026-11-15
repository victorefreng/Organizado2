/**
 * TEXTURAS PRECALCULADAS.
 *
 * Todo lo que aquí se genera se calcula UNA vez por render. Son las piezas
 * caras (ruido, desenfoques, siluetas) que luego el fotograma solo coloca.
 * Las texturas de ruido son teselables: se pueden desplazar un número entero
 * de teselas a lo largo del bucle y el último fotograma coincide con el primero.
 */
import { createCanvas, makeRng, clamp01 } from './lib.mjs';

const mod = (a, n) => ((a % n) + n) % n;

/** Ruido fractal teselable. Devuelve Float32Array size² normalizado a 0..1. */
export function fbm(size, { cells = 4, octaves = 5, seed = 1, gain = 0.5 } = {}) {
  const out = new Float32Array(size * size);
  let amp = 1, period = cells;
  for (let o = 0; o < octaves; o++) {
    const r = makeRng(seed * 131 + o * 977 + 7);
    const lat = new Float32Array(period * period);
    for (let i = 0; i < lat.length; i++) lat[i] = r();
    const scale = period / size;
    for (let y = 0; y < size; y++) {
      const fy = y * scale, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
      const y0 = (iy % period) * period, y1 = ((iy + 1) % period) * period;
      for (let x = 0; x < size; x++) {
        const fx = x * scale, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
        const x0 = ix % period, x1 = (ix + 1) % period;
        const a = lat[y0 + x0], b = lat[y0 + x1], c = lat[y1 + x0], d = lat[y1 + x1];
        out[y * size + x] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
      }
    }
    amp *= gain; period *= 2;
    if (period > size / 2) break;
  }
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < out.length; i++) { if (out[i] < lo) lo = out[i]; if (out[i] > hi) hi = out[i]; }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo);
  return out;
}

/**
 * Ruido celular teselable (F2 − F1): vale cero en las fronteras entre celdas.
 * Deformado con ruido fractal da la red orgánica de las cáusticas.
 */
export function worley(size, { cells = 6, seed = 1, warp = 0.35, mode = 'edge' } = {}) {
  const r = makeRng(seed * 53 + 11);
  const px = new Float32Array(cells * cells), py = new Float32Array(cells * cells);
  for (let i = 0; i < px.length; i++) { px[i] = r(); py[i] = r(); }
  const wa = fbm(size, { cells: 3, octaves: 3, seed: seed + 400 });
  const wb = fbm(size, { cells: 3, octaves: 3, seed: seed + 900 });
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const u = (x / size) * cells + (wa[i] - 0.5) * warp * 2;
      const v = (y / size) * cells + (wb[i] - 0.5) * warp * 2;
      const cx = Math.floor(u), cy = Math.floor(v);
      let f1 = 9, f2 = 9;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const gx = cx + dx, gy = cy + dy, k = mod(gy, cells) * cells + mod(gx, cells);
          const ddx = u - (gx + px[k]), ddy = v - (gy + py[k]);
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
        }
      }
      out[i] = mode === 'f1' ? f1 : f2 - f1;
    }
  }
  return out;
}

/** Convierte un campo escalar en lienzo. `fn(v, x, y)` devuelve [r,g,b,a] 0..255. */
export function fieldCanvas(size, field, fn, h = size) {
  const c = createCanvas(size, h), g = c.getContext('2d');
  const img = g.createImageData(size, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x, p = fn(field ? field[i] : 0, x, y);
      img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = p[3];
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Tesela de cáusticas: líneas de luz blandas sobre negro opaco, para poder combinarlas con `darken`. */
export function causticTile(size = 512, { cells = 5, seed = 3, width = 0.34, power = 2.2, rgb = [150, 232, 255] } = {}) {
  const w = worley(size, { cells, seed, warp: 0.42 });
  return fieldCanvas(size, w, (v) => {
    const a = Math.pow(clamp01(1 - v / width), power);
    return [rgb[0] * a, rgb[1] * a, rgb[2] * a, 255];
  });
}

/** Lienzo auxiliar: dibuja con `fn` y devuelve el resultado desenfocado. */
export function blurred(w, h, px, fn) {
  const a = createCanvas(w, h), ga = a.getContext('2d');
  fn(ga, w, h);
  if (!px) return a;
  const b = createCanvas(w, h), gb = b.getContext('2d');
  gb.filter = `blur(${px}px)`;
  gb.drawImage(a, 0, 0);
  gb.filter = 'none';
  return b;
}

/** Haz de luz: columna blanda que nace arriba y se disuelve. */
export function raySprite(w = 192, h = 768, hex = '#E8F7FF') {
  return blurred(w, h, 10, (g) => {
    const v = g.createLinearGradient(0, 0, 0, h);
    const c = (a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
    v.addColorStop(0, c(0)); v.addColorStop(0.1, c(1)); v.addColorStop(0.55, c(0.42)); v.addColorStop(1, c(0));
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    // el corte lateral se hace con una máscara: el haz es más denso en su eje
    g.globalCompositeOperation = 'destination-in';
    const hz = g.createLinearGradient(0, 0, w, 0);
    hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(0.5, 'rgba(0,0,0,1)'); hz.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hz; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  });
}

/** Destello de cuatro puntas, para las estrellas grandes y la estrella dorada. */
export function flareSprite(size = 256, hex = '#FFE9B0', { arm = 0.5, thick = 0.035, core = 0.2 } = {}) {
  const c = createCanvas(size, size), g = c.getContext('2d');
  const m = size / 2;
  const col = (a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  g.globalCompositeOperation = 'lighter';
  for (const ang of [0, Math.PI / 2]) {
    g.save(); g.translate(m, m); g.rotate(ang);
    const gr = g.createLinearGradient(-m * arm * 2, 0, m * arm * 2, 0);
    gr.addColorStop(0, col(0)); gr.addColorStop(0.5, col(0.95)); gr.addColorStop(1, col(0));
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-m * arm * 2, 0);
    g.quadraticCurveTo(0, -size * thick, m * arm * 2, 0);
    g.quadraticCurveTo(0, size * thick, -m * arm * 2, 0);
    g.fill();
    g.restore();
  }
  const rg = g.createRadialGradient(m, m, 0, m, m, m * core * 2.4);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.25, col(0.85)); rg.addColorStop(1, col(0));
  g.fillStyle = rg; g.fillRect(0, 0, size, size);
  return c;
}

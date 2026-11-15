/**
 * PRNG determinista. Clave para la sincronización entre proyectores:
 * las tres ventanas generan geometría idéntica a partir de la misma semilla,
 * sin transmitir ni un vértice.
 */

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 */
export function makeRng(seed) {
  let a = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (min, max) => min + rng() * (max - min);
  rng.int = (min, max) => Math.floor(rng.range(min, max + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length) % arr.length];
  rng.sign = () => (rng() < 0.5 ? -1 : 1);
  /** Distribución en disco uniforme */
  rng.disk = (radius = 1) => {
    const r = radius * Math.sqrt(rng());
    const a2 = rng() * Math.PI * 2;
    return [Math.cos(a2) * r, Math.sin(a2) * r];
  };
  /** Gaussiana aproximada (Irwin-Hall) */
  rng.gauss = (mean = 0, sd = 1) => {
    let s = 0;
    for (let i = 0; i < 4; i++) s += rng();
    return mean + ((s - 2) / 0.816) * sd;
  };
  rng.reseed = (s) => { a = typeof s === 'string' ? hashSeed(s) : s >>> 0; };
  return rng;
}

/** Ruido 1D suave y determinista (para viento, vibración, deriva). */
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n) => {
    let t = (n + seed * 374761393) >>> 0;
    t = Math.imul(t ^ (t >>> 13), 1274126177) >>> 0;
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
  };
  const a = h(i), b = h(i + 1);
  const u = f * f * (3 - 2 * f);
  return a * (1 - u) + b * u;
}

/** Ruido fraccional: varias octavas. Devuelve [-1,1]. */
export function fbm1(x, octaves = 3, seed = 0) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise1(x * freq, seed + o * 17) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.07;
  }
  return (sum / norm) * 2 - 1;
}

/** Ruido 2D suave (nubes, superficies). */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const h = (a, b) => {
    let t = (a * 374761393 + b * 668265263 + seed * 2246822519) >>> 0;
    t = Math.imul(t ^ (t >>> 13), 1274126177) >>> 0;
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
  };
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const n00 = h(xi, yi), n10 = h(xi + 1, yi), n01 = h(xi, yi + 1), n11 = h(xi + 1, yi + 1);
  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
}

export default makeRng;

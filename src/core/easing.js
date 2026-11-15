/** Curvas de animación. Nada entra ni sale con corte: todo pasa por aquí. */

export const EASING = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  easeOutExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  /** Crecimiento de plantas: sobrepasa y vuelve. Nunca lineal. */
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  /** Para brotes: arranca despacio, acelera, se asienta. */
  growth: (t) => {
    const e = 1 - Math.pow(1 - t, 2.4);
    return e + Math.sin(t * Math.PI) * 0.06 * (1 - t);
  }
};

export function ease(name, t) {
  const f = EASING[name] || EASING.easeInOutCubic;
  return f(clamp01(t));
}

export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix = lerp;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (a, b, v) => {
  const t = clamp01(invLerp(a, b, v));
  return t * t * (3 - 2 * t);
};
/** Rampa de 0→1→0 dentro de una ventana, con bordes suaves. */
export function pulse(t, start, end, fade = 0.2) {
  if (t <= start || t >= end) return 0;
  const d = end - start;
  const f = Math.min(fade, d * 0.49);
  if (t < start + f) return smoothstep(start, start + f, t);
  if (t > end - f) return 1 - smoothstep(end - f, end, t);
  return 1;
}
/** Suavizado exponencial independiente de framerate (para seguimiento de cámara). */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export default EASING;

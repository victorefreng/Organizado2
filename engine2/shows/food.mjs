/**
 * FUEGO, BRASAS Y HUMO — lo que comparten PIZZA y BBQ.
 */
import { W, H, TAU, makeRng, glow, createCanvas } from '../lib.mjs';
import { blurred } from '../tex.mjs';

/** Lengua de fuego: una gota de luz, del blanco al rojo. */
export function flameSprite() {
  return blurred(160, 320, 6, (g) => {
    const gr = g.createLinearGradient(0, 320, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,230,0.95)'); gr.addColorStop(0.25, 'rgba(255,214,110,0.9)'); gr.addColorStop(0.6, 'rgba(255,120,30,0.7)'); gr.addColorStop(1, 'rgba(200,30,10,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(80, 6); g.bezierCurveTo(150, 130, 150, 250, 80, 314); g.bezierCurveTo(10, 250, 10, 130, 80, 6); g.fill();
  });
}

/**
 * Hoguera estilizada: lenguas que suben y tiemblan. `(ctx, cx, baseY, width, height, f, power)`.
 * El temblor es suma de senos de frecuencias distintas: nunca se repite a la vista.
 */
export function fire(seed, n = 16) {
  const r = makeRng(seed), spr = flameSprite();
  const ts = Array.from({ length: n }, (_, i) => ({ x: (i + 0.5) / n - 0.5 + r.range(-0.03, 0.03), h: r.range(0.55, 1), w: r.range(0.16, 0.3), a: r.range(1.6, 3.4), b: r.range(3.6, 6.2), ph: r() * TAU }));
  return (ctx, cx, baseY, width, height, f, power = 1) => {
    if (power <= 0.003) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const t of ts) {
      const fl = 0.72 + 0.18 * Math.sin(f * 0.11 * t.a + t.ph) + 0.1 * Math.sin(f * 0.11 * t.b + t.ph * 2), bell = 1 - Math.pow(Math.abs(t.x) * 2, 2) * 0.55;
      const h = height * t.h * fl * bell * power, w = width * t.w;
      ctx.globalAlpha = Math.min(1, 0.6 * power);
      ctx.save(); ctx.translate(cx + t.x * width + Math.sin(f * 0.07 * t.a + t.ph) * w * 0.12, baseY); ctx.rotate(Math.sin(f * 0.05 * t.b + t.ph) * 0.08);
      ctx.drawImage(spr, -w / 2, -h, w, h); ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}

/** Jirones de humo o vapor que suben y se abren. */
export function smoke(seed, n = 14, hex = '#E8DCCB') {
  const r = makeRng(seed), puff = glow(256, hex, { power: 1.6 });
  const ps = Array.from({ length: n }, () => ({ ph: r(), x: r.range(-0.5, 0.5), sp: r.range(0.06, 0.12), sw: r.range(-60, 60) }));
  return (ctx, cx, baseY, width, rise, t, alpha = 1) => {
    if (alpha <= 0.003) return;
    ctx.globalCompositeOperation = 'screen';
    for (const p of ps) { const l = (t * p.sp + p.ph) % 1, s = 70 + l * 260; ctx.globalAlpha = alpha * Math.sin(Math.PI * l) * 0.2; ctx.drawImage(puff, cx + p.x * width + p.sw * l - s / 2, baseY - l * rise - s / 2, s, s); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}

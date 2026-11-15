/**
 * LA ESTRELLA DORADA — el hilo de toda la noche.
 *
 * Aparece en el opening, cruza en cada transición y vuelve en el finale. Se
 * dibuja siempre con estas mismas piezas para que sea reconocible: halo, cruz
 * de destello, núcleo blanco, cola de cometa y chispas que se quedan atrás.
 */
import { TAU, makeRng, glow } from './lib.mjs';
import { flareSprite } from './tex.mjs';

export function goldenStar(seed = 'estrella') {
  const halo = glow(640, '#FFD08A', { power: 2.3 }), core = glow(200, '#FFFFFF', { power: 2.2 });
  const mid = glow(320, '#FFE7B8', { power: 2.6 });
  const flare = flareSprite(512, '#FFE9B0', { arm: 0.5, thick: 0.03, core: 0.12 });
  const dot = glow(64, '#FFE2A8', { power: 2.2 });
  const r = makeRng(seed);
  const sparks = Array.from({ length: 110 }, () => ({
    born: r(), perp: r.gauss() * 34, along: r.range(-20, 20), size: r.range(5, 16), life: r.range(0.1, 0.3),
    fall: r.range(10, 70), tw: r.range(3, 9), ph: r() * TAU
  }));

  /** El cuerpo de la estrella. `s` es la escala (1 ≈ 200 px de cruz). */
  function body(ctx, x, y, s = 1, alpha = 1, f = 0) {
    if (alpha <= 0.003) return;
    const pulse = 1 + 0.07 * Math.sin(f * 0.42) + 0.04 * Math.sin(f * 1.13);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, 0.55 * alpha);
    ctx.drawImage(halo, x - 320 * s, y - 320 * s, 640 * s, 640 * s);
    ctx.globalAlpha = Math.min(1, 0.8 * alpha);
    ctx.drawImage(mid, x - 160 * s * pulse, y - 160 * s * pulse, 320 * s * pulse, 320 * s * pulse);
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(f * 0.05) * 0.08);
    const a = 300 * s * pulse;
    ctx.drawImage(flare, -a, -a, a * 2, a * 2);
    ctx.rotate(Math.PI / 4); ctx.globalAlpha = Math.min(1, 0.45 * alpha);
    ctx.drawImage(flare, -a * 0.5, -a * 0.5, a, a);
    ctx.restore();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(core, x - 70 * s * pulse, y - 70 * s * pulse, 140 * s * pulse, 140 * s * pulse);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Cola y chispas. `pos(p)` da la posición en píxeles para p en 0..1 y `p` es
   * el avance actual. Lo que queda atrás se apaga solo.
   */
  function trail(ctx, pos, p, s = 1, alpha = 1, f = 0) {
    if (alpha <= 0.003) return;
    ctx.globalCompositeOperation = 'lighter';
    const N = 54;
    for (let k = 1; k <= N; k++) {
      const pp = p - k * 0.0052;
      if (pp < 0) break;
      const t = 1 - k / N, [x, y] = pos(pp), sz = (14 + 110 * Math.pow(t, 1.6)) * s;
      ctx.globalAlpha = Math.min(1, 0.42 * t * t * alpha);
      ctx.drawImage(dot, x - sz / 2, y - sz / 2, sz, sz);
    }
    for (const sp of sparks) {
      const age = (p - sp.born) / sp.life;
      if (age < 0 || age > 1) continue;
      const [x, y] = pos(sp.born), [x2, y2] = pos(Math.min(1, sp.born + 0.01));
      const dx = x2 - x, dy = y2 - y, len = Math.hypot(dx, dy) || 1;
      const px = -dy / len, py = dx / len;
      const spread = 0.5 + age * 1.4;
      const sx = x + px * sp.perp * spread * s + (dx / len) * sp.along, sy = y + py * sp.perp * spread * s + age * age * sp.fall * s;
      const tw = 0.6 + 0.4 * Math.sin(f * sp.tw * 0.2 + sp.ph);
      const sz = sp.size * s * (1 - age * 0.5);
      ctx.globalAlpha = Math.min(1, (1 - age) * (1 - age) * tw * alpha);
      ctx.drawImage(dot, sx - sz / 2, sy - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  return { body, trail };
}

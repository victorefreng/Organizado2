/**
 * AMBIENT-106 · CAPSULE — la cápsula de MESSAGES TO THE FUTURE.
 *
 * Una esfera de cristal flota entre estrellas mientras graban su mensaje. No
 * tiene límite de tiempo, así que casi nada se mueve: respira, y poco más.
 */
import { W, H, TAU, makeRng, lsin, lcos, glow, bgRadial, vignette, grainTile, finish, drift, createCanvas } from '../lib.mjs';
import { blurred } from '../tex.mjs';
import { motes } from '../layers.mjs';
import { nebulaTex, starLayer, twinklers } from './galaxy.mjs';

/**
 * La esfera. Devuelve `(ctx, x, y, R, f, T, { light, lens })`.
 *   light  0..1+, cuánta luz guarda dentro
 *   lens   imagen que se ve refractada (invertida) a través del cristal
 */
export function makeSphere(seed = 'esfera') {
  const r = makeRng(seed);
  const shell = blurred(640, 640, 1, (g) => {
    const m = 320, R = 300;
    const body = g.createRadialGradient(m, m, R * 0.3, m, m, R);
    body.addColorStop(0, 'rgba(150,200,255,0.03)'); body.addColorStop(0.75, 'rgba(150,200,255,0.1)'); body.addColorStop(0.94, 'rgba(190,225,255,0.5)'); body.addColorStop(1, 'rgba(220,240,255,0.0)');
    g.fillStyle = body; g.beginPath(); g.arc(m, m, R, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(230,244,255,0.75)'; g.lineWidth = 2.5; g.beginPath(); g.arc(m, m, R - 2, 0, TAU); g.stroke();
    // brillo especular arriba a la izquierda, y su eco abajo a la derecha
    g.save(); g.translate(m - 120, m - 150); g.rotate(-0.7);
    const sp = g.createRadialGradient(0, 0, 0, 0, 0, 110); sp.addColorStop(0, 'rgba(255,255,255,0.95)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sp; g.scale(1, 0.42); g.beginPath(); g.arc(0, 0, 110, 0, TAU); g.fill(); g.restore();
    g.strokeStyle = 'rgba(200,225,255,0.5)'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(m, m, R - 26, 0.35, 1.25); g.stroke();
  });
  const halo = glow(900, '#8FB4FF', { power: 2.4 }), warm = glow(500, '#FFE2A8', { power: 2.2 }), white = glow(200, '#FFFFFF', { power: 2.4 }), dot = glow(40, '#FFF0C8', { power: 2.2 });
  const inner = Array.from({ length: 22 }, () => ({ rad: r.range(0.12, 0.72), c: r.int(2, 5) * (r() < 0.5 ? -1 : 1), ph: r(), tilt: r.range(0.3, 1), s: r.range(5, 12) }));
  return (ctx, x, y, R, f, T, { light = 0.35, lens = null } = {}) => {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, 0.22 + 0.3 * light); ctx.drawImage(halo, x - R * 2.6, y - R * 2.6, R * 5.2, R * 5.2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (lens) {                                   // el cielo, visto del revés a través del cristal
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, R * 0.96, 0, TAU); ctx.clip();
      ctx.fillStyle = 'rgba(4,6,18,0.55)'; ctx.fillRect(x - R, y - R, R * 2, R * 2);
      ctx.translate(x, y); ctx.scale(-1.5, -1.5); ctx.globalAlpha = 0.85; ctx.drawImage(lens, -W / 2 - 130, -H / 2 - 130); ctx.restore(); ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.85 + 0.15 * lsin(f, T, 8, 0.2);
    ctx.globalAlpha = Math.min(1, light * 0.9 * pulse); ctx.drawImage(warm, x - R * 0.9, y - R * 0.9, R * 1.8, R * 1.8);
    ctx.globalAlpha = Math.min(1, light * 1.1 * pulse); ctx.drawImage(white, x - R * 0.3, y - R * 0.3, R * 0.6, R * 0.6);
    for (const p of inner) {                      // las luces guardadas, girando dentro
      const a = (f / T) * p.c * TAU + p.ph * TAU;
      ctx.globalAlpha = Math.min(1, light * 1.4) * (0.5 + 0.5 * Math.sin(a * 3 + p.ph * 9));
      ctx.drawImage(dot, x + Math.cos(a) * p.rad * R - p.s / 2, y + Math.sin(a) * p.rad * R * p.tilt - p.s / 2, p.s, p.s);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(shell, x - R * 1.066, y - R * 1.066, R * 2.133, R * 2.133);
  };
}

function base(seed, { stars = 1900, nebulaAt = [0.5, 0.5], neb = ['#16307A', '#5F7CFF', '#8E6BFF'], vig = 0.92 } = {}) {
  const bg = bgRadial(0.5, 0.5, 0.62, [[0, '#131C44'], [0.5, '#080B20'], [1, '#03040C']]);
  const n = nebulaTex(seed, neb, { cells: 3, lo: 0.42, power: 2, gain: 1.1 });
  const st = starLayer('cap-' + seed, stars), tw = twinklers({ seed: 'cap-tw-' + seed, n: 110, flares: 7 });
  const v = vignette(vig, '2,3,10', 0.36, 0.5), grain = grainTile();
  return { st, draw(ctx, f, T, inside) {
    ctx.fillStyle = '#03040C'; ctx.fillRect(0, 0, W, H);
    drift(ctx, f, T, 0.01, () => {
      ctx.drawImage(bg, -60, -60, W + 120, H + 120);
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.5 + 0.06 * lsin(f, T, 2, 0.3);
      ctx.drawImage(n, nebulaAt[0] * W - 700, nebulaAt[1] * H - 700, 1400, 1400);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(st, -130 + lsin(f, T, 1, 0.2) * 5, -130);
      ctx.globalCompositeOperation = 'source-over';
      tw(ctx, f, T, 0.9);
      if (inside) inside();
    });
    finish(ctx, f, v, grain);
  } };
}

function main({ sphere = true } = {}) {
  const b = base(71), orb = makeSphere();
  return (ctx, f, T) => b.draw(ctx, f, T, sphere ? () => orb(ctx, W / 2 + lsin(f, T, 1, 0.1) * 10, H * 0.5 + lsin(f, T, 3, 0.4) * 14, 150, f, T, { light: 0.34 + 0.08 * lsin(f, T, 5, 0.6), lens: b.st }) : null);
}
function ceiling() { const b = base(83, { stars: 2400, nebulaAt: [0.4, 0.55], vig: 0.86 }); return (ctx, f, T) => b.draw(ctx, f, T, null); }
function side() {
  const b = base(97, { stars: 1500, nebulaAt: [0.66, 0.42] });
  const far = motes({ n: 26, seed: 'cap-lejos', color: '#CFE0FF', size: [8, 22], alpha: [0.2, 0.6], amp: [20, 80], blink: 2 });
  return (ctx, f, T) => b.draw(ctx, f, T, () => far(ctx, f, T));
}

export default { id: 'AMBIENT-106', name: 'CAPSULE', screens: { main, ceiling, side } };

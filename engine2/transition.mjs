/**
 * TRANSICIÓN ENTRE MUNDOS · TR-001 … TR-005
 *
 * Tres exigencias del brief gobiernan el diseño:
 *
 * 1. Tiene que funcionar VINIENDO DE CUALQUIER MUNDO. Por eso arranca con un
 *    destello en las tres pantallas a la vez: tapa el fundido de entrada.
 * 2. La estrella cruza y REPINTA el mundo nuevo: no es un fundido, el mundo
 *    aparece detrás de la estela, como si la luz lo pintara al pasar.
 * 3. Tiene que ATERRIZAR. Los últimos fotogramas son exactamente el final del
 *    bucle del mundo de destino, así que al terminar el bucle arranca en su
 *    fotograma cero y el empalme no existe.
 *
 * Las tres pantallas van sincronizadas y la estrella las recorre en orden:
 * primero el techo, luego la pared de enfrente, luego la lateral.
 */
import { W, H, FPS, lsin, glow, bgRadial, createCanvas, clamp01 } from './lib.mjs';
import { motes } from './layers.mjs';
import { goldenStar } from './star.mjs';

const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 2.4);

const PATHS = {
  ceiling: { delay: 0.0, pos: (p) => [(0.5 + 0.16 * Math.sin(Math.PI * p)) * W, (-0.14 + 1.28 * p) * H] },
  main: { delay: 0.45, pos: (p) => [(-0.14 + 1.28 * p) * W, (0.64 - 0.3 * p - 0.13 * Math.sin(Math.PI * p)) * H] },
  side: { delay: 0.9, pos: (p) => [(1.14 - 1.28 * p) * W, (0.36 + 0.22 * p - 0.1 * Math.sin(Math.PI * p)) * H] }
};

/**
 *   worldDraw   función de dibujo del mundo de destino (ya instanciada)
 *   worldFrames duración en fotogramas del bucle de ese mundo
 */
export function makeTransition({ worldDraw, worldFrames, screen, frames = 300, seed = 'tr' }) {
  const path = PATHS[screen];
  const world = createCanvas(W, H), wg = world.getContext('2d');
  const cover = createCanvas(W, H), cg = cover.getContext('2d');
  const between = bgRadial(0.5, 0.55, 0.62, [[0, '#231A3E'], [0.55, '#0F0C22'], [1, '#05070D']]);
  const dust = motes({ n: 120, seed: seed + '-polvo', color: '#FFD9A0', size: [3, 9], alpha: [0.15, 0.7], amp: [10, 40] });
  const flashSpr = glow(1600, '#FFF3D8', { power: 1.7 });
  const star = goldenStar(seed);
  const diag = Math.hypot(W, H);

  return (ctx, f) => {
    const t = f / FPS, tl = t - path.delay, dur = frames / FPS;
    const p = ss(1.0, 5.0, tl) * 0.3 + easeOut((tl - 1.0) / 4.0) * 0.7;      // avance de la estrella
    const reveal = ss(1.25, 6.0, tl);
    const settle = 1 - ss(5.2, dur - 1.6, tl);                              // lo que queda de estela
    const flash = t < 0.45 ? ss(0, 0.45, t) : 1 - ss(0.45, 1.9, t);
    const [sx, sy] = path.pos(p);

    // el mundo de destino, en el tramo final de su bucle
    wg.setTransform(1, 0, 0, 1, 0, 0); wg.globalAlpha = 1; wg.globalCompositeOperation = 'source-over';
    worldDraw(wg, (worldFrames - frames + f) % worldFrames, worldFrames);
    ctx.drawImage(world, 0, 0);

    if (reveal < 0.999) {
      // lo que aún no se ha repintado: el espacio entre mundos, con un agujero que sigue a la estrella
      cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalAlpha = 1; cg.globalCompositeOperation = 'source-over';
      cg.drawImage(between, 0, 0);
      dust(cg, f, frames);
      const R = Math.max(1, reveal * diag * 2.6);
      if (reveal > 0.001) {
        const hole = cg.createRadialGradient(sx, sy, 0, sx, sy, R);
        hole.addColorStop(0, 'rgba(0,0,0,1)'); hole.addColorStop(0.56, 'rgba(0,0,0,1)'); hole.addColorStop(0.82, 'rgba(0,0,0,0)');
        cg.globalCompositeOperation = 'destination-out'; cg.fillStyle = hole; cg.fillRect(0, 0, W, H);
        cg.globalCompositeOperation = 'source-over';
      }
      ctx.drawImage(cover, 0, 0);
      // el borde incandescente: es lo que hace que parezca pintado y no fundido
      if (reveal > 0.001) {
        const ring = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
        const a = 0.62 * Math.sqrt(Math.sin(Math.PI * Math.min(1, reveal * 1.05)));
        ring.addColorStop(0, 'rgba(255,217,160,0)'); ring.addColorStop(0.52, 'rgba(255,217,160,0)');
        ring.addColorStop(0.67, `rgba(255,226,176,${a})`); ring.addColorStop(0.72, `rgba(255,246,224,${a * 0.8})`);
        ring.addColorStop(0.86, 'rgba(255,217,160,0)');
        ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = ring; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    if (tl > 0.9 && settle > 0.003) {
      star.trail(ctx, path.pos, p, 1, settle, f);
      const vis = ss(0.9, 1.3, tl) * (1 - ss(0.985, 1, p)) * settle;
      star.body(ctx, sx, sy, 0.62, vis, f);
    }

    if (flash > 0.002) {
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.min(1, flash * 0.95);
      ctx.drawImage(flashSpr, W * 0.5 - 800, H * 0.55 - 800);
      ctx.globalAlpha = Math.min(1, flash * 0.35); ctx.fillStyle = '#FFE7BC'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  };
}

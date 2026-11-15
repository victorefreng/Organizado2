/**
 * SH-009 · RELAX & SPA — un mundo para desconectarse (entrada).
 *
 * Las estrellas se vuelven luciérnagas y bajamos a un bosque con flores, agua y
 * luz dorada. Todo baja de intensidad: no hay un solo golpe.
 */
import { W, H, TAU, createCanvas } from '../lib.mjs';
import { motes } from '../layers.mjs';
import { ss, prog, eo, win, flowers } from './kit.mjs';
import { world, worldScene, landing, intro, ring, P } from './stage.mjs';

export const DURATION = 45;
export const PIECE = {
  id: 'SH-009', name: 'RELAX & SPA', exitAmbient: 'AMBIENT-003', timecode: { offset: '09:00:00:00', show: 0 },
  description: 'Entrada al momento de masaje: las estrellas se vuelven luciernagas y descendemos a un bosque magico con flores, agua y luz dorada.',
  notes: 'Pieza suave, sin bumps de luz. El descenso termina en el mundo JUNGLE, que puede quedarse el tiempo que haga falta.',
  cues: [
    { atMs: 0, label: '001 ESTRELLAS', tipo: 'AMBIENT_FADE', momento: 'colchon y viento', accion: 'cielo de estrellas en calma', halo_par: '3x PAR violeta al 15%', color: '#6A3FD0', intensidad: 0.15, fade_s: 4 },
    { atMs: 3000, label: '002 LUCIERNAGAS', tipo: 'COLOR_TRANSITION', momento: 'entran las campanas', accion: 'las estrellas se vuelven luciernagas', halo_par: '3x PAR de violeta a ambar al 18%', color: '#FFC27A', intensidad: 0.18, fade_s: 9 },
    { atMs: 12000, label: '003 EL DESCENSO', tipo: 'COLOR_TRANSITION', momento: 'entra el agua', accion: 'bajamos al bosque; flores y agua', halo_par: '3x PAR de ambar a verde calido al 20%', color: '#9FD87A', intensidad: 0.2, fade_s: 16 },
    { atMs: 39000, label: '004 ATERRIZAJE', tipo: 'OUTRO_FADE', momento: 'acorde sostenido', accion: 'look de reposo de JUNGLE', halo_par: '3x PAR #2F6B4F al 20%', color: '#2F6B4F', intensidad: 0.2, fade_s: 6 }
  ]
};

export function score(m) {
  const G = [98, 146.83, 196, 246.94], Em = [82.41, 123.47, 164.81, 246.94], C = [130.81, 164.81, 196, 261.63];
  m.pad(0, 14, Em, 0.035, 3, 5, 0.2); m.pad(12, 28, C, 0.035, 5, 5, 0.22); m.pad(26, 40, G, 0.038, 5, 4, 0.24);
  m.bed(0, 44, 240, 0.02, 4, 2, 0.07);                    // viento
  m.bed(12, 44, 900, 0.012, 8, 2, 0.31);                  // agua
  m.sparkle(3, 38, 54, 783.99, 0.022, [0, 2, 4, 7, 9, 12]);
  m.motif(16, 2.2, 293.66, 0.045, 9, 4.2);
  m.land('jungle', 37.5, 0.04);
}

export async function make(screen) {
  const galaxy = await world('galaxy', screen), jungle = await world('jungle', screen);
  const sky = worldScene(galaxy, { dim: 0.92 }), forest = landing(jungle, DURATION);
  const flies = motes({ n: 90, seed: 'sh9-luc-' + screen, color: '#FFD98A', size: [9, 24], alpha: [0.5, 1], amp: [20, 90], blink: 4 });
  const fl = screen === 'ceiling' ? null : flowers({ seed: 'sh9-flores-' + screen, n: 26, from: 24, to: 36, region: [0, 0.6, 1, 0.97], size: [30, 70] });
  const tmp = createCanvas(W, H), tg = tmp.getContext('2d');
  return (ctx, f) => {
    const t = f / 30, k = eo(prog(t, 12, 30));
    // el cielo sube y sale; el bosque entra desde abajo detrás de un borde difuso
    ctx.save(); ctx.translate(0, -k * H * 0.5); sky(ctx, t, f); ctx.restore();
    if (k > 0) {
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalAlpha = 1; tg.globalCompositeOperation = 'source-over';
      tg.save(); tg.translate(0, (1 - k) * 140); forest(tg, t, f); tg.restore();
      if (k < 1) { const e = H * (1.2 - 1.5 * k), m = tg.createLinearGradient(0, e - 170, 0, e + 170); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)'); tg.globalCompositeOperation = 'destination-in'; tg.fillStyle = m; tg.fillRect(0, 0, W, H); }
      ctx.drawImage(tmp, 0, 0);
    }
    const fa = win(t, 3, 43, 8, 3); if (fa > 0.003) flies(ctx, f % P, P, fa);
    if (fl) fl(ctx, t, f, 1 - ss(40, 44, t));
    if (screen !== 'ceiling') {                 // ondas en el agua, abajo
      const wa = win(t, 24, 43, 3, 3);
      for (let i = 0; i < 4; i++) { const l = ((t * 0.16 + i * 0.25) % 1), rx = 40 + l * 520; ring(ctx, W * (0.3 + 0.4 * ((i * 0.37) % 1)), H * 0.93, rx, rx * 0.14, wa * (1 - l) * 0.35, 2, '255,236,190'); }
    }
    ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,196,110,${0.2 * win(t, 14, 44, 6, 4)})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    intro(ctx, t, 0.3);
  };
}

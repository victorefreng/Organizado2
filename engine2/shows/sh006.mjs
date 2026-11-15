/**
 * SH-006 · MESSAGES TO THE FUTURE — el cierre.
 *
 * Arranca donde estaba la cápsula (AMBIENT-106): la esfera recoge puntos de luz
 * como si guardara sus palabras, asciende, cruza al techo y allí se vuelve
 * constelación. Ningún texto: el mensaje es de ellos.
 */
import { W, H, TAU, FPS } from '../lib.mjs';
import { flareSprite } from '../tex.mjs';
import capsule, { makeSphere } from '../worlds/capsule.mjs';
import { ss, prog, eo, win } from './kit.mjs';
import { world, sceneStack, landing, intro, flash, gather, J } from './stage.mjs';

export const DURATION = 60;
export const PIECE = {
  id: 'SH-006', name: 'MESSAGES TO THE FUTURE', exitAmbient: 'AMBIENT-004', timecode: { offset: '06:00:00:00', show: 6 },
  description: 'Cierre de la capsula: la esfera recoge puntos de luz como si guardara sus palabras, asciende y se vuelve constelacion.',
  notes: 'Se lanza al terminar la grabacion, desde `AMBIENT-106`, y arranca con la esfera en el mismo sitio donde estaba. La esfera sube por la pared de enfrente y entra al techo, donde se convierte en constelacion. No lleva ningun texto: el mensaje es de ellos y no se inventa.\n\nPieza suave: solo Halo PAR, fundidos lentos, sin golpes.',
  cues: [
    { atMs: 0, label: '001 LA CAPSULA', tipo: 'AMBIENT_FADE', momento: 'piano intimo', accion: 'la esfera flota entre estrellas', halo_par: '3x PAR azul noche al 12%', color: '#3A4FB0', intensidad: 0.12, fade_s: 4 },
    { atMs: 3000, label: '002 GUARDA SUS PALABRAS', tipo: 'COLOR_TRANSITION', momento: 'el piano se abre', accion: 'la esfera recoge puntos de luz', halo_par: '3x PAR de azul a dorado suave al 20%', color: '#FFD9A0', intensidad: 0.2, fade_s: 14 },
    { atMs: 30000, label: '003 ASCIENDE', tipo: 'COLOR_TRANSITION', momento: 'sube la melodia', accion: 'la esfera sube y cruza al techo', halo_par: '3x PAR de dorado a violeta al 22%', color: '#8E63F0', intensidad: 0.22, fade_s: 10 },
    { atMs: 45000, label: '004 CONSTELACION', tipo: 'COLOR_TRANSITION', momento: 'campanas', accion: 'en el techo se vuelve constelacion', halo_par: '3x PAR violeta con dorado al 26%', color: '#B06BFF', intensidad: 0.26, fade_s: 4 },
    { atMs: 51000, label: '005 ATERRIZAJE', tipo: 'OUTRO_FADE', momento: 'acorde de GALAXY', accion: 'look de reposo de GALAXY', halo_par: '3x PAR #6A3FD0 al 18%', color: '#6A3FD0', intensidad: 0.18, fade_s: 6 }
  ]
};

export function score(m) {
  const Em = [82.41, 123.47, 164.81, 246.94], C = [130.81, 164.81, 196, 261.63], G = [98, 146.83, 196, 246.94], D = [146.83, 220, 293.66, 369.99];
  m.pad(0, 16, Em, 0.028, 3, 5, 0.2); m.pad(14, 30, C, 0.03, 4, 5, 0.22); m.pad(28, 44, G, 0.034, 4, 4, 0.26); m.pad(42, 52, D, 0.036, 3, 3, 0.3);
  m.motif(3.5, 2.4, 293.66, 0.07, 9, 4.2); m.motif(28.5, 1.5, 587.33, 0.06, 9, 3.4);
  m.sparkle(4, 30, 60, 1174.66, 0.014);
  m.arp(30, 44, [196, 246.94, 293.66, 392], 0.75, 0.04, 1.6);
  [0, 4, 7, 11, 14, 16].forEach((s, k) => m.bell(45 + k * 0.5, 587.33 * Math.pow(2, s / 12), 0.06, 3));
  m.land('galaxy', 50, 0.04);
}

export async function make(screen) {
  const galaxy = await world('galaxy', screen);
  const T = Math.round(J('production/pieces/AMBIENT-106/piece.json').screens[screen].loopSeconds * FPS);
  const cap = screen === 'main' ? capsule.screens.main({ sphere: false }) : capsule.screens[screen]();
  const scenes = sceneStack([{ at: 0, fade: 0, draw: (ctx, t, f) => cap(ctx, f % T, T) }, { at: 50.5, fade: 6, draw: landing(galaxy, DURATION) }]);
  const orb = makeSphere(), fl = flareSprite(256, '#FFE9B0');
  const collect = gather({ seed: 'sh6-' + screen, n: screen === 'main' ? 260 : 150, colors: ['#FFE2A8', '#FFFFFF', '#CFE0FF'], far: [600, 1100], size: [5, 14] });
  // la constelación del techo: una corona de estrellas con una en el centro
  const stars = [...Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (1.08 + (i / 8) * 0.84); return [W / 2 + Math.cos(a) * 330, H * 0.62 + Math.sin(a) * 250]; }), [W / 2, H * 0.52]];
  return (ctx, f) => {
    const t = f / 30;
    scenes(ctx, t, f);
    const fill = ss(3, 30, t), rise = eo(prog(t, 30, 42));
    if (screen === 'main') {
      const y = H * 0.5 + Math.sin(t * 0.8) * 10 * (1 - rise) - rise * (H * 0.5 + 260), a = 1 - ss(41, 42.5, t);
      // las luces acuden por tandas, como si cada frase fuera una
      for (let k = 0; k < 4; k++) collect(ctx, prog(t, 3 + k * 6.4, 11 + k * 6.4), { x: W / 2, y });
      if (a > 0.003) { ctx.globalAlpha = a; orb(ctx, W / 2, y, 150 + 14 * fill, f, T, { light: 0.34 + 0.9 * fill }); ctx.globalAlpha = 1; }
      if (rise > 0 && rise < 1) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) { const l = i / 40, yy = y + 150 + l * 420 * rise; ctx.globalAlpha = (1 - l) * 0.5 * Math.sin(Math.PI * rise); ctx.drawImage(fl, W / 2 + Math.sin(i * 3.1 + t * 2) * 30 * l - 14, yy - 14, 28, 28); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    } else if (screen === 'side') {
      for (let k = 0; k < 4; k++) collect(ctx, prog(t, 3 + k * 6.4, 11 + k * 6.4), { x: -W * 0.2, y: H * 0.5 });     // van hacia la pared de enfrente
    } else {
      // techo: la esfera entra por abajo, llega al centro y se abre en constelación
      const k = eo(prog(t, 37, 45)), open = prog(t, 45, 49.5), a = (1 - ss(45, 46.2, t)) * ss(37, 38, t);
      if (a > 0.003) { ctx.globalAlpha = a; orb(ctx, W / 2, H * 1.25 - k * H * 0.73, 130, f, T, { light: 1.25 }); ctx.globalAlpha = 1; }
      flash(ctx, t, 45.05, 0.2, 3, 0.5, 0.5, 0.52);
      const ca = win(t, 45, 57, 0.5, 4);
      if (ca > 0.003) {
        const n = eo(open) * (stars.length - 1);
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,226,176,${0.45 * ca})`; ctx.lineWidth = 1.6; ctx.beginPath();
        for (let i = 0; i <= Math.floor(n) && i < 9; i++) i ? ctx.lineTo(stars[i][0], stars[i][1]) : ctx.moveTo(stars[i][0], stars[i][1]);
        ctx.stroke();
        stars.forEach((q, i) => { const on = ss(0, 0.25, open - (i / stars.length) * 0.7), px = W / 2 + (q[0] - W / 2) * eo(open), py = H * 0.52 + (q[1] - H * 0.52) * eo(open), s = (i === 9 ? 130 : 70) * on * (0.8 + 0.2 * Math.sin(f * 0.1 + i)); ctx.globalAlpha = ca * on; ctx.drawImage(fl, px - s / 2, py - s / 2, s, s); });
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    intro(ctx, t, 0.25);
  };
}

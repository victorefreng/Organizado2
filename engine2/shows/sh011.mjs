/**
 * SH-011 · BBQ EXPERIENCE — la cena especial.
 *
 * Brasas flotando en la oscuridad, un fuego estilizado, la parrilla, las
 * costillas con su glaseado y un impacto final. Luego, luz cómoda para cenar.
 */
import { W, H, TAU, makeRng, glow } from '../lib.mjs';
import { blurred } from '../tex.mjs';
import { motes } from '../layers.mjs';
import { ss, prog, eo, back, win, rr } from './kit.mjs';
import { world, sceneStack, landing, intro, flash, ring, voidStage, P } from './stage.mjs';
import { fire, smoke } from './food.mjs';

export const DURATION = 50;
const HIT = 42;
export const PIECE = {
  id: 'SH-011', name: 'BBQ EXPERIENCE', exitAmbient: 'AMBIENT-005', timecode: { offset: '11:00:00:00', show: 0 },
  description: 'La cena llega anunciada por fuego y brasas: brasas flotando, un fuego estilizado, la parrilla, las costillas con su glaseado y un impacto final.',
  notes: 'MAIN lleva la parrilla y las costillas; SIDE el fuego de cerca; CEILING brasas y humo subiendo. Al terminar queda luz comoda para cenar sobre el mundo RED ROOM.',
  cues: [
    { atMs: 0, label: '001 BRASAS', tipo: 'AMBIENT_FADE', momento: 'tambores lejanos', accion: 'brasas flotando en la oscuridad', halo_par: '3x PAR rojo brasa al 14%', color: '#B0301A', intensidad: 0.14, fade_s: 3 },
    { atMs: 10000, label: '002 EL FUEGO', tipo: 'COLOR_TRANSITION', momento: 'entra la percusion', accion: 'el fuego prende y crece', halo_par: '3x PAR naranja fuego al 30%, temblor lento', color: '#FF7A2A', intensidad: 0.3, fade_s: 8 },
    { atMs: 20000, label: '003 LA PARRILLA', tipo: 'MUSICAL_BUMP', momento: 'golpe de tambor', accion: 'entra la parrilla sobre el fuego', halo_par: '3x PAR pulso a 40%', color: '#FF8A3A', intensidad: 0.4, fade_s: 0.4 },
    { atMs: 30000, label: '004 LAS COSTILLAS', tipo: 'MUSICAL_BUMP', momento: 'golpe y chisporroteo', accion: 'las costillas caen a la parrilla; brilla el glaseado', halo_par: '3x PAR ambar al 42%', color: '#FFB060', intensidad: 0.42, fade_s: 0.4 },
    { atMs: 38000, label: '005 SUBE EL FUEGO', tipo: 'RISER', momento: 'subida de 4 s', accion: 'el fuego crece bajo la parrilla', halo_par: '3x PAR de 40% a 70%', color: '#FF7A2A', intensidad: 0.7, fade_s: 4 },
    { atMs: 42000, label: '006 LISTA', tipo: 'FINAL_HIT', momento: 'impacto final', accion: 'llamarada y destello', halo_par: '3x PAR naranja al 85%', flasher: '1 destello unico', color: '#FFB060', intensidad: 0.85, fade_s: 0.15 },
    { atMs: 44500, label: '007 ATERRIZAJE', tipo: 'OUTRO_FADE', momento: 'acorde de RED ROOM', accion: 'luz comoda para cenar: ambar calido sobre el look de RED ROOM', halo_par: '3x PAR ambar calido al 30%', color: '#D98B3A', intensidad: 0.3, fade_s: 5 }
  ]
};

export function score(m) {
  const Gm = [98, 146.83, 196, 233.08], B = 60 / 96;
  m.intro(0.18);
  m.bed(0, 46, 520, 0.03, 4, 3, 1.3);                          // el fuego
  for (let k = 0; k < 170; k++) m.tick(2 + m.rnd() * 42, 0.02 + m.rnd() * 0.05, 1800 + m.rnd() * 3000, 160);   // chisporroteo
  m.pad(2, HIT, Gm, 0.03, 4, 2, 0.3);
  for (let t = 10, k = 0; t < HIT; t += B / 2, k++) { const p = [1, 0, 0, 1, 0, 1, 1, 0][k % 8]; if (p) m.thump(t, [150, 120, 100][k % 3], 70, 0.2 + 0.1 * m.ss(10, HIT, t), 0.22); if (k % 4 === 2) m.tick(t, 0.07, 300, 30); }
  [20, 30].forEach((t) => { m.thump(t, 130, 54, 0.4, 0.7); m.bloom(t, 0.2, 1.2); });
  m.arp(30, HIT, [196, 233.08, 293.66, 392], B / 2, 0.045, 0.3, 'pluck');
  m.riser(38, HIT, 0.26); m.thump(HIT, 130, 50, 0.48, 1); m.bloom(HIT, 0.44, 2.4); Gm.forEach((f) => m.bell(HIT + 0.02, f * 2, 0.085, 3));
  m.land('redroom', 44);
}

function rackSprite() {
  return blurred(640, 260, 1.2, (g) => {
    const gr = g.createLinearGradient(0, 40, 0, 230); gr.addColorStop(0, '#8A3A14'); gr.addColorStop(0.5, '#5E2008'); gr.addColorStop(1, '#2E0E04');
    g.fillStyle = gr; rr(g, 40, 50, 560, 170, 46); g.fill();
    for (let i = 0; i < 11; i++) {                      // cada costilla: un surco oscuro y un hueso que asoma arriba
      const x = 76 + i * 49;
      g.strokeStyle = 'rgba(20,6,2,0.55)'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 24, 62); g.quadraticCurveTo(x + 18, 136, x + 24, 208); g.stroke();
      g.fillStyle = '#F2E2C4'; rr(g, x - 2, 34, 22, 34, 10); g.fill();
    }
    g.strokeStyle = 'rgba(18,5,2,0.7)'; g.lineWidth = 7; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(70 + i * 62, 196); g.lineTo(120 + i * 62, 84); g.stroke(); }   // marcas de parrilla
    const gl = g.createLinearGradient(0, 56, 0, 120); gl.addColorStop(0, 'rgba(255,190,110,0.5)'); gl.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = gl; rr(g, 52, 58, 536, 70, 34); g.fill();
  });
}

export async function make(screen) {
  const red = await world('redroom', screen);
  const bg = voidStage('#3C1406', '#160604', '#040202', 0.5, 0.86);
  const embers = motes({ n: 170, seed: 'sh11-brasas-' + screen, color: '#FF9A40', size: [3, 11], alpha: [0.2, 1], amp: [10, 50], rise: 4, blink: 2 });
  const blaze = fire('sh11-fuego-' + screen, screen === 'side' ? 22 : 16), sm = smoke('sh11-humo-' + screen, 14, '#C9B4A0'), warm = glow(1200, '#FF8A30', { power: 2.2 });
  const power = (t) => ss(10, 19, t) * (1 + 0.5 * ss(38, HIT, t)) * (1 + 0.7 * Math.max(0, 1 - Math.abs(t - HIT - 0.3) / 1.4)) * (1 - ss(44.5, 48, t));
  const stage = (ctx, t, f) => { ctx.drawImage(bg, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.min(1, 0.16 + 0.4 * power(t)); ctx.drawImage(warm, W / 2 - 600, H * 0.9 - 600); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; };
  const scenes = sceneStack([{ at: 0, fade: 0, draw: stage }, { at: 44.6, fade: 5, draw: landing(red, DURATION) }]);
  const hit = (ctx, t, s = 1) => { flash(ctx, t, HIT + 0.05, 0.1, 2.6, 0.85 * s, 0.5, 0.7, '#FFC27A'); const k = prog(t, HIT, HIT + 2.4), rad = eo(k) * 1000; ring(ctx, W / 2, H * 0.62, rad, rad * 0.5, (1 - k) * 0.8 * s, 5, '255,180,110'); };
  const em = (ctx, t, f) => { const a = win(t, 0.5, 47, 2, 2.5); if (a > 0.003) embers(ctx, f % P, P, a); };

  if (screen === 'main') {
    const rack = rackSprite(), shine = glow(420, '#FFE2B0', { power: 2 }), r = makeRng('sh11-chispas');
    const sparks = Array.from({ length: 90 }, () => ({ a: -Math.PI / 2 + r.gauss() * 1.1, v: r.range(120, 460), s: r.range(4, 10) })), dot = glow(32, '#FFC060', { power: 2 });
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f);
      const out = 1 - ss(44.6, 47.4, t);
      blaze(ctx, W / 2, H * 1.02, W * 0.78, H * 0.62, f, power(t));
      // la parrilla: barras que entran desde los lados, con el canto de abajo al rojo
      const gk = eo(prog(t, 20, 23.5));
      if (gk > 0 && out > 0.003) {
        ctx.globalAlpha = out;
        for (let i = 0; i < 9; i++) {
          const y = H * (0.6 + i * 0.026), w = W * 0.74 * gk, x = i % 2 ? W * 0.13 : W * 0.87 - w;
          ctx.fillStyle = '#0C0705'; ctx.fillRect(x, y, w, 9);
          ctx.fillStyle = `rgba(255,${90 + 60 * Math.sin(f * 0.09 + i)},30,${0.75 * Math.min(1, power(t))})`; ctx.fillRect(x, y + 7, w, 2.5);
        }
        ctx.globalAlpha = 1;
      }
      // las costillas: caen, botan, y el glaseado recoge un brillo que las recorre
      const dk = prog(t, 30, 31.3);
      if (dk > 0 && out > 0.003) {
        const y = H * 0.58 - (1 - back(dk)) * 420, sq = 1 + 0.05 * Math.sin(Math.PI * Math.min(1, prog(t, 31.1, 31.7)));
        ctx.globalAlpha = out * Math.min(1, dk * 4);
        ctx.save(); ctx.translate(W / 2, y); ctx.scale(sq, 1 / sq); ctx.drawImage(rack, -320, -130); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(W / 2 - 280, y - 80, 560, 170); ctx.clip();
        for (const [a, b] of [[32.5, 35.5], [37, 40.5]]) { const k = prog(t, a, b); if (k > 0 && k < 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * Math.sin(Math.PI * k) * out; ctx.drawImage(shine, W / 2 - 500 + k * 1000 - 110, y - 220, 220, 440); ctx.globalCompositeOperation = 'source-over'; } }
        ctx.restore(); ctx.globalAlpha = 1;
        const sk = prog(t, 31.2, 33.4);              // chispas al tocar la parrilla
        if (sk > 0 && sk < 1) { ctx.globalCompositeOperation = 'lighter'; for (const s of sparks) { const e = eo(sk); ctx.globalAlpha = 1 - sk; ctx.drawImage(dot, W / 2 + Math.cos(s.a) * s.v * e * 1.4 - s.s / 2, H * 0.66 + Math.sin(s.a) * s.v * e + sk * sk * 160 - s.s / 2, s.s, s.s); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        sm(ctx, W / 2, H * 0.5, 460, 360, t, 0.9 * out * ss(31, 34, t));
      }
      em(ctx, t, f); hit(ctx, t); intro(ctx, t, 0.5);
    };
  }
  if (screen === 'ceiling') return (ctx, f) => { const t = f / 30; scenes(ctx, t, f); sm(ctx, W / 2, H * 0.7, 900, 620, t, 0.8 * ss(12, 20, t) * (1 - ss(44.5, 48, t))); em(ctx, t, f); hit(ctx, t, 0.9); intro(ctx, t, 0.5); };
  return (ctx, f) => { const t = f / 30; scenes(ctx, t, f); blaze(ctx, W / 2, H * 1.04, W * 1.15, H * 0.95, f, power(t)); em(ctx, t, f); hit(ctx, t, 0.9); intro(ctx, t, 0.5); };
}

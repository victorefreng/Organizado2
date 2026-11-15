/**
 * SH-010 · PLAYER TWO — dos jugadores, una aventura.
 *
 * Dos orbes, uno violeta y uno dorado, empiezan cada uno en su lado. Superan
 * tres pequeños retos, se encuentran y liberan una onda de luz: PLAYER TWO.
 */
import { W, H, TAU, makeRng, glow } from '../lib.mjs';
import { motes } from '../layers.mjs';
import { ss, prog, eo, win, textFx } from './kit.mjs';
import { world, sceneStack, landing, intro, flash, ring, gather, voidStage, P } from './stage.mjs';

export const DURATION = 45;
const BPM = 100, BEAT = 60 / BPM, MEET = 34;
export const PIECE = {
  id: 'SH-010', name: 'PLAYER TWO', exitAmbient: 'AMBIENT-004', timecode: { offset: '10:00:00:00', show: 10 },
  description: 'La habitacion se vuelve videojuego: dos orbes, uno violeta y uno dorado, superan tres retos, se encuentran y liberan una onda de luz.',
  notes: 'Da paso a jugar en la PS5. Tempo de 100 pulsos por minuto: los cambios de color van a compas. Mientras juegan, el mundo que queda de fondo (GALAXY) no compite con la pantalla del juego.',
  cues: [
    { atMs: 0, label: '001 START', tipo: 'AMBIENT_FADE', momento: 'entra la rejilla', accion: 'un tablero de luz en la oscuridad', halo_par: '3x PAR violeta al 20%', color: '#6A3FD0', intensidad: 0.2, fade_s: 2 },
    { atMs: 3000, label: '002 DOS JUGADORES', tipo: 'COLOR_TRANSITION', momento: 'entra el pulso', accion: 'aparecen los dos orbes, cada uno en su lado', halo_par: '3x PAR alternando violeta y dorado al 28%, a compas', color: '#B06BFF', intensidad: 0.28, fade_s: 2 },
    { atMs: 10000, label: '003 RETO 1', tipo: 'MUSICAL_BUMP', momento: 'tres saltos', accion: 'saltan de plataforma en plataforma', halo_par: '3x PAR pulso a 40% en cada salto', color: '#FFD08A', intensidad: 0.4, fade_s: 0.3 },
    { atMs: 17000, label: '004 RETO 2', tipo: 'MUSICAL_BUMP', momento: 'golpe doble', accion: 'activan a la vez los dos anillos', halo_par: '3x PAR pulso a 45%', color: '#7FD8FF', intensidad: 0.45, fade_s: 0.3 },
    { atMs: 24000, label: '005 RETO 3', tipo: 'MUSICAL_BUMP', momento: 'el puente', accion: 'un puente de luz los une', halo_par: '3x PAR pulso a 45%', color: '#B06BFF', intensidad: 0.45, fade_s: 0.3 },
    { atMs: 30000, label: '006 SE ENCUENTRAN', tipo: 'RISER', momento: 'subida de 4 s', accion: 'giran uno alrededor del otro', halo_par: '3x PAR de 30% a 70%', color: '#FFE7BC', intensidad: 0.7, fade_s: 4 },
    { atMs: 34000, label: '007 PLAYER TWO', tipo: 'FINAL_HIT', momento: 'golpe y acorde', accion: 'onda de luz y aparece PLAYER TWO', halo_par: '3x PAR blanco violeta al 85%', flasher: '1 destello unico', color: '#E0C8FF', intensidad: 0.85, fade_s: 0.15 },
    { atMs: 40000, label: '008 ATERRIZAJE', tipo: 'OUTRO_FADE', momento: 'acorde de GALAXY', accion: 'look de reposo de GALAXY', halo_par: '3x PAR #6A3FD0 al 18%', color: '#6A3FD0', intensidad: 0.18, fade_s: 5 }
  ]
};

export function score(m) {
  const Am = [110, 164.81, 220, 261.63], F = [87.31, 130.81, 174.61, 220], G = [98, 146.83, 196, 246.94];
  m.intro(0.2);
  m.pad(0, 34, Am, 0.03, 2, 1, 0.4); m.pad(16, 34, F, 0.02, 2, 1, 0.4);
  for (let t = 3; t < MEET; t += BEAT) { m.thump(t, 100, 54, 0.26, 0.2); m.hat(t + BEAT / 2, 0.06); if (t > 10) m.hat(t + BEAT / 4, 0.03); }
  m.arp(3, 16, [220, 261.63, 329.63, 440], BEAT / 2, 0.05, 0.16, 'pluck'); m.arp(16, 24, [174.61, 220, 261.63, 349.23], BEAT / 2, 0.05, 0.16, 'pluck'); m.arp(24, MEET, [196, 246.94, 293.66, 392], BEAT / 4, 0.045, 0.12, 'pluck');
  [10.6, 12.4, 14.2].forEach((t, k) => m.pluck(t, 440 * Math.pow(2, k * 2 / 12), 0.12, 0.3));
  [17.6, 19.4, 21.2].forEach((t) => { m.pluck(t, 659.26, 0.1, 0.3, 0.3); m.pluck(t, 880, 0.1, 0.3, 0.7); });
  [0, 2, 4, 5, 7, 9, 11, 12].forEach((s, k) => m.pluck(24.4 + k * 0.6, 440 * Math.pow(2, s / 12), 0.09, 0.3));
  m.riser(30, MEET, 0.28); m.thump(MEET, 130, 52, 0.45, 0.9); m.bloom(MEET, 0.42, 2.4); [110, 220, 329.63, 440, 659.26].forEach((f) => m.bell(MEET + 0.02, f, 0.09, 3.2));
  m.motif(MEET + 0.4, BEAT, 440, 0.07, 6, 2);
  m.land('galaxy', 39);
}

export async function make(screen) {
  const galaxy = await world('galaxy', screen);
  const bg = voidStage('#22124A', '#0B0624', '#030208', 0.5, 0.5);
  const stars = motes({ n: 110, seed: 'sh10-est-' + screen, color: '#E8DCFF', size: [3, 8], alpha: [0.2, 0.8], amp: [0, 0], region: [0, 0, 1, 0.5] });
  const vio = { halo: glow(420, '#B06BFF', { power: 2.2 }), core: glow(140, '#F2E4FF', { power: 2 }), dot: glow(48, '#C79BFF', { power: 2.2 }), rgb: '190,140,255' };
  const gol = { halo: glow(420, '#FFC060', { power: 2.2 }), core: glow(140, '#FFF6DC', { power: 2 }), dot: glow(48, '#FFD08A', { power: 2.2 }), rgb: '255,208,138' };
  const HZ = H * 0.56, beat = (t) => Math.pow(Math.max(0, Math.cos(((t - 3) / BEAT) * TAU) * 0.5 + 0.5), 6);
  const grid = (ctx, t) => {                       // el tablero: una rejilla en perspectiva que avanza a compás
    const a = win(t, 0.4, 41, 1.5, 2) * (0.55 + 0.45 * (t > 3 ? beat(t) : 0)), col = Math.floor((t - 3) / (BEAT * 4)) % 2 ? vio.rgb : gol.rgb;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.6;
    ctx.strokeStyle = `rgba(${t > 3 ? col : vio.rgb},${0.34 * a})`;
    ctx.beginPath();
    for (let i = -14; i <= 14; i++) { ctx.moveTo(W / 2 + i * 26, HZ); ctx.lineTo(W / 2 + i * 240, H + 40); }
    for (let k = 0; k < 12; k++) { const l = ((k + (t * 0.7) % 1) / 12), y = HZ + (H - HZ + 40) * l * l; ctx.moveTo(-40, y); ctx.lineTo(W + 40, y); }
    ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
  };
  const orb = (ctx, o, x, y, s, a, hist) => {
    if (a <= 0.003) return;
    ctx.globalCompositeOperation = 'lighter';
    hist.forEach(([hx, hy], i) => { const l = i / hist.length, z = 46 * s * (1 - l); ctx.globalAlpha = a * (1 - l) * 0.5; ctx.drawImage(o.dot, hx - z / 2, hy - z / 2, z, z); });
    ctx.globalAlpha = 0.6 * a; ctx.drawImage(o.halo, x - 170 * s, y - 170 * s, 340 * s, 340 * s);
    ctx.globalAlpha = a; ctx.drawImage(o.core, x - 50 * s, y - 50 * s, 100 * s, 100 * s);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  const stage = (ctx, t, f) => { ctx.drawImage(bg, 0, 0); stars(ctx, f % P, P); grid(ctx, t); };
  const scenes = sceneStack([{ at: 0, fade: 0, draw: stage }, { at: 40.3, fade: 4.4, draw: landing(galaxy, DURATION) }]);
  const boom = gather({ seed: 'sh10-onda-' + screen, n: 240, colors: ['#C79BFF', '#FFD08A', '#FFFFFF'], far: [520, 1100] });
  const wave = (ctx, t, s = 1) => {
    flash(ctx, t, MEET + 0.04, 0.08, 2.6, 0.9 * s, 0.5, 0.42, '#E8D8FF');
    for (const [d, c] of [[0, vio.rgb], [0.3, gol.rgb], [0.6, '255,255,255']]) { const k = prog(t, MEET + d, MEET + d + 2.6), r = eo(k) * 1200; ring(ctx, W / 2, H * 0.42, r, r * 0.6, (1 - k) * 0.9 * s, 5, c); }
    boom(ctx, prog(t, MEET, MEET + 3.2), { reverse: true, x: W / 2, y: H * 0.42 });
  };

  if (screen === 'main') {
    const title = textFx({ text: 'PLAYER TWO', size: 120, y: H * 0.42, tracking: 0.26, seed: 'p2', n: 900, colors: ['#C79BFF', '#FFD08A'], scatter: 520 });
    // el recorrido de cada orbe, espejado: tres saltos, subir a los anillos, cruzar el puente, y la espiral
    const path = (t, side) => {
      let x = 0.5 + side * 0.34, y = 0.44 + Math.sin(t * 1.6 + side) * 0.012;
      [10.6, 12.4, 14.2].forEach((h, i) => { const k = prog(t, h, h + 0.9); x -= side * 0.055 * eo(k); y -= Math.sin(Math.PI * k) * 0.13; });
      [17.6, 19.4, 21.2].forEach((h) => { const k = prog(t, h, h + 0.8); y -= Math.sin(Math.PI * k) * 0.2; });
      const br = eo(prog(t, 24.4, 30)); x -= side * 0.1 * br;
      const sp = prog(t, 30, MEET), ang = sp * sp * 7 * Math.PI + (side > 0 ? 0 : Math.PI), rad = (1 - sp) * 0.075;
      if (sp > 0) { x = 0.5 + Math.cos(ang) * rad * (0.5 + 0.5 * (1 - sp)) + (x - 0.5) * (1 - eo(sp)) * 0; y = 0.42 + Math.sin(ang) * rad * 1.2; x += side * 0.075 * (1 - eo(Math.min(1, sp * 3))) * 0; }
      return [x * W, y * H];
    };
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f);
      const out = 1 - ss(MEET, MEET + 0.4, t), inn = ss(3, 5, t);
      // reto 1: plataformas que se encienden bajo cada salto
      for (const side of [-1, 1]) [10.6, 12.4, 14.2].forEach((h, i) => { const a = win(t, h - 0.6, h + 2.6, 0.5, 1.2) * out; if (a > 0.003) { const px = (0.5 + side * (0.34 - 0.055 * (i + 1))) * W; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(${side < 0 ? vio.rgb : gol.rgb},${0.8 * a})`; ctx.fillRect(px - 44, H * 0.5, 88, 5); ctx.globalCompositeOperation = 'source-over'; ring(ctx, px, H * 0.5, eo(prog(t, h + 0.85, h + 1.9)) * 90, eo(prog(t, h + 0.85, h + 1.9)) * 26, (1 - prog(t, h + 0.85, h + 1.9)) * 0.8 * out, 3, side < 0 ? vio.rgb : gol.rgb); } });
      // reto 2: dos anillos que hay que tocar a la vez
      [17.6, 19.4, 21.2].forEach((h) => { for (const side of [-1, 1]) { const px = (0.5 + side * 0.175) * W, hit = prog(t, h + 0.4, h + 1.3), a = win(t, h - 0.7, h + 1.3, 0.5, 0.2); ring(ctx, px, H * 0.24, 34 + hit * 110, 34 + hit * 110, a * (1 - hit) * out, 4, '160,220,255'); } });
      // reto 3: el puente de luz, que crece desde los dos lados
      { const k = eo(prog(t, 24.2, 29.6)), a = win(t, 24, MEET, 0.4, 0.6); if (a > 0.003) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 16; i++) { const on = ss(i / 16, (i + 1) / 16, k); for (const side of [-1, 1]) { ctx.fillStyle = `rgba(${side < 0 ? vio.rgb : gol.rgb},${0.75 * a * on})`; ctx.fillRect(W / 2 + side * (0.175 * W - i * 13.5) - 5, H * 0.5 + 2, 10, 4); } } ctx.globalCompositeOperation = 'source-over'; } }
      for (const [o, side] of [[vio, -1], [gol, 1]]) {
        const [x, y] = path(t, side), hist = []; for (let i = 1; i <= 12; i++) hist.push(path(t - i * 0.03, side));
        orb(ctx, o, x, y, 1, inn * out, hist);
      }
      wave(ctx, t);
      title(ctx, prog(t, MEET + 0.1, MEET + 2.6), prog(t, 40, 41.8), f);
      intro(ctx, t, 0.6);
    };
  }
  if (screen === 'ceiling') return (ctx, f) => {
    const t = f / 30;
    scenes(ctx, t, f);
    // anillos que laten a compás, y los dos orbes dando vueltas hasta encontrarse
    const a = win(t, 3, MEET, 1, 0.3);
    for (let i = 0; i < 5; i++) { const l = (((t - 3) / (BEAT * 4)) + i / 5) % 1; ring(ctx, W / 2, H / 2, l * 760, l * 470, a * (1 - l) * 0.6, 3, i % 2 ? vio.rgb : gol.rgb); }
    const sp = prog(t, 30, MEET), rad = 330 * (1 - eo(sp)), ang = t * 0.9 + sp * sp * 9, inn = ss(3, 5, t), out = 1 - ss(MEET, MEET + 0.4, t);
    for (const [o, ph] of [[vio, 0], [gol, Math.PI]]) { const pos = (tt) => [W / 2 + Math.cos(tt * 0.9 + sp * sp * 9 + ph) * rad, H / 2 + Math.sin(tt * 0.9 + sp * sp * 9 + ph) * rad * 0.6]; const hist = []; for (let i = 1; i <= 14; i++) hist.push(pos(t - i * 0.035)); const [x, y] = pos(t); orb(ctx, o, x, y, 1.3, inn * out, hist); }
    wave(ctx, t, 0.9); intro(ctx, t, 0.6);
  };
  const r = makeRng('sh10-barras'), bars = Array.from({ length: 24 }, () => ({ ph: r() * TAU, sp: r.range(0.6, 1.8) }));
  return (ctx, f) => {
    const t = f / 30;
    scenes(ctx, t, f);
    // lateral: barras que suben y bajan con el pulso, cambiando de color a compás
    const a = win(t, 3, 40.5, 1.5, 2), b = beat(t);
    if (a > 0.003) { ctx.globalCompositeOperation = 'lighter'; bars.forEach((q, i) => { const h = (60 + 240 * (0.5 + 0.5 * Math.sin(t * q.sp * 2 + q.ph)) * (0.5 + 0.5 * b)) * (1 + 0.6 * ss(30, MEET, t)), x = (i + 0.5) / 24 * W, c = (i + Math.floor((t - 3) / BEAT)) % 2 ? vio.rgb : gol.rgb; const g = ctx.createLinearGradient(0, HZ, 0, HZ - h); g.addColorStop(0, `rgba(${c},${0.7 * a})`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.fillRect(x - 15, HZ - h, 30, h); }); ctx.globalCompositeOperation = 'source-over'; }
    wave(ctx, t, 0.9); intro(ctx, t, 0.6);
  };
}

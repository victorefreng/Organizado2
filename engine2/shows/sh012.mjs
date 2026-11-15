/**
 * SH-012 · GRAND FINALE — el universo que construimos.
 *
 * Vuelve la estrella y vuelve la melodía del opening. La estrella recorre los
 * mundos que visitaron, con fragmentos de sus fotos; sube dejando una estela,
 * se vuelve la última constelación sobre la cama y aparece por última vez
 * UNIVERSO 1/1. Termina en una galaxia tranquila.
 */
import { W, H, TAU, glow } from '../lib.mjs';
import { flareSprite } from '../tex.mjs';
import { goldenStar } from '../star.mjs';
import { makeSphere } from '../worlds/capsule.mjs';
import { ss, prog, eo, win, textFx, photoCard, floatCard, drawCard, butterfly } from './kit.mjs';
import { world, sceneStack, worldScene, landing, intro, flash, ring, gather, J, rootPath } from './stage.mjs';
import { boxSprites } from './sh003.mjs';
import { flameSprite } from './food.mjs';

export const DURATION = 120;
const CH = [6, 21, 36, 51], RISE = 64, PHOTO = 78, HIT = 100;
const LASER = 'OPCIONAL: solo con zona segura confirmada por el operador. Abanico alto 4 s, por encima de 2.2 m, nunca hacia la cama ni a la altura de los ojos';
export const PIECE = {
  id: 'SH-012', name: 'GRAND FINALE', exitAmbient: 'AMBIENT-004', timecode: { offset: '12:00:00:00', show: 12 },
  description: 'El cierre: la estrella reaparece, recorre nubes, selva, oceano y galaxia entre fragmentos de sus fotos, sube, se vuelve la ultima constelacion y aparece por ultima vez UNIVERSO 1/1.',
  notes: 'Show de luces completo, como el opening. Duracion elegida: 2 minutos (el brief la dejaba por definir).\n\n**Fotos.** MAIN lleva fragmentos de ocho fotos, dos por mundo, y despues «la fiesta» en grande: los dos de frente, sonriendo. Todas en su proporcion real.\n\n**Simbolos.** En SIDE pasan los simbolos de lo que hicieron en la noche: la caja, la mariposa, los dos orbes, la esfera de cristal y el fuego.\n\n**Constelacion.** La estrella sube por MAIN, entra al techo y dibuja la misma constelacion que cerro el opening.\n\nTermina en una galaxia tranquila, que es el mundo que se queda hasta la 1:00.',
  licenses: 'Animacion y musica originales. Fotografias personales aportadas por el operador, uso privado. Tipografia Liberation Serif (SIL Open Font License 1.1). Sin stock ni IA generativa.',
  cues: [
    { atMs: 0, label: '001 SILENCIO', tipo: 'AMBIENT_FADE', momento: 'las primeras notas del tema', accion: 'penumbra; algo vuelve a brillar', halo_par: '3x PAR ambar al 5%: el nivel mas bajo, nunca cero', color: '#FFB060', intensidad: 0.05, fade_s: 4 },
    { atMs: 6000, label: '002 LA ESTRELLA VUELVE', tipo: 'IMPACT', momento: 'golpe y acorde', accion: 'la estrella estalla y abre el cielo de nubes', halo_par: '3x PAR dorado al 60%, cae a 30%', flasher: '1 destello unico', color: '#FFD9A0', intensidad: 0.6, fade_s: 0.2 },
    { atMs: 21000, label: '003 LA SELVA', tipo: 'COLOR_TRANSITION', momento: 'cambia el acorde', accion: 'la estrella cruza y repinta la selva', halo_par: '3x PAR verde calido al 30%', color: '#9FD87A', intensidad: 0.3, fade_s: 4 },
    { atMs: 36000, label: '004 EL OCEANO', tipo: 'COLOR_TRANSITION', momento: 'cambia el acorde', accion: 'la estrella cruza y repinta el oceano', halo_par: '3x PAR azul profundo al 30%', color: '#0A6E8C', intensidad: 0.3, fade_s: 4 },
    { atMs: 51000, label: '005 LA GALAXIA', tipo: 'COLOR_TRANSITION', momento: 'cambia el acorde', accion: 'la estrella cruza y repinta la galaxia', halo_par: '3x PAR violeta al 32%', color: '#7A4FE0', intensidad: 0.32, fade_s: 4 },
    { atMs: 64000, label: '006 SUBE', tipo: 'RISER', momento: 'crescendo', accion: 'la estrella sube dejando una estela y entra al techo', halo_par: '3x PAR de violeta a dorado, de 32% a 60%', color: '#FFD08A', intensidad: 0.6, fade_s: 12 },
    { atMs: 78000, label: '007 NOSOTROS', tipo: 'REVEAL', momento: 'el tema, a piano', accion: 'la constelacion en el techo; su foto, grande, en la pared', halo_par: '3x PAR ambar calido al 45%', color: '#FFC27A', intensidad: 0.45, fade_s: 3 },
    { atMs: 86000, label: '008 RESPIRA', tipo: 'MUSICAL_BUMP', momento: 'entra el pulso', accion: 'la foto se queda', halo_par: '3x PAR ambar, respira de 40% a 48%', haze: 'rafaga unica de 6 s: tiene que estar en el aire antes de 1:40', color: '#FFC27A', intensidad: 0.48, fade_s: 2 },
    { atMs: 92000, label: '009 SE REUNE TODO', tipo: 'RISER', momento: 'subida de 8 s', accion: 'particulas de todos los mundos acuden al centro', halo_par: '3x PAR de 40% a 85%, de violeta a dorado', color: '#FFD08A', intensidad: 0.85, fade_s: 8 },
    { atMs: 100000, label: '010 UNIVERSO 1/1', tipo: 'FINAL_HIT', momento: 'golpe final y tema completo', accion: 'aparece por ultima vez UNIVERSO 1/1', halo_par: '3x PAR dorado al 100%', flasher: 'los 2, 1 destello unico', laser: LASER, color: '#FFD08A', intensidad: 1, fade_s: 0.1 },
    { atMs: 112000, label: '011 GALAXIA TRANQUILA', tipo: 'OUTRO_FADE', momento: 'resolucion calida', accion: 'el titulo se disuelve: look de reposo de GALAXY', halo_par: '3x PAR #6A3FD0 al 18%', color: '#6A3FD0', intensidad: 0.18, fade_s: 7 }
  ]
};

export function score(m) {
  const D = [146.83, 220, 293.66, 369.99], G = [98, 196, 246.94, 293.66], Bm = [123.47, 185, 246.94, 293.66], A = [110, 164.81, 220, 277.18], Fs = [92.5, 185, 220, 277.18];
  m.bed(0, 7, 260, 0.012, 2, 2); m.bell(1.2, 587.33, 0.05, 2.8); m.bell(3.4, 880, 0.055, 2.8);
  m.riser(4.4, 6, 0.16); m.thump(6, 120, 54, 0.4, 0.8); m.bloom(6, 0.38, 2);
  // cada mundo, su acorde; la orquestación crece de uno a otro
  [[6, D, G], [21, Bm, G], [36, A, Fs], [51, Bm, A]].forEach(([t, a, b], i) => {
    m.pad(t, t + 7.5, a, 0.034 + i * 0.004, 1.5, 3, 0.3 + i * 0.04); m.pad(t + 7.5, t + 15, b, 0.034 + i * 0.004, 2, 3, 0.3 + i * 0.04);
    m.arp(t + 0.4, t + 15, [a[1], a[2], a[3], a[2] * 2], [0.75, 0.5, 0.375, 0.25][i], 0.04, [1.2, 0.8, 0.6, 0.4][i]);
    m.motif(t + 1, 1.25, i % 2 ? 293.66 : 587.33, 0.06 + i * 0.006, 9, 2.6);
    m.sweep(t - 1.4, t + 3, 400, 4600, 0.16, i % 2 ? 0.75 : 0.25, i % 2 ? 0.25 : 0.75);
    if (i) { m.thump(t, 100, 56, 0.26, 0.5); m.bloom(t, 0.18, 1.4); }
    if (i > 1) for (let x = t; x < t + 15; x += 0.75) m.thump(x, 86, 60, 0.1, 0.22);
  });
  // sube
  m.pad(RISE, PHOTO, [D[0], D[1], D[2], D[3], 440], 0.042, 4, 1, 0.42); m.arp(RISE, PHOTO, [293.66, 369.99, 440, 587.33], 0.1875, 0.04, 0.35); m.riser(70, PHOTO, 0.24);
  m.thump(PHOTO, 110, 56, 0.3, 0.8); m.bloom(PHOTO, 0.3, 2.2);
  // nosotros: casi solo piano
  m.pad(PHOTO, 92, G, 0.028, 2, 4, 0.22); m.pad(85, 92, D, 0.026, 2, 3, 0.22);
  m.motif(79, 1.4, 293.66, 0.085, 9, 3.6);
  for (let x = 86; x < 92; x += 1.5) m.thump(x, 84, 60, 0.12, 0.3);
  // se reúne todo, y el golpe final
  m.pad(92, HIT, [A[0], A[1], A[2], A[3], 329.63, 440], 0.042, 4, 0.3, 0.45);
  for (let x = 92.2; x < HIT; x += 0.125) m.bell(x, 440 * [1, 1.26, 1.5, 2, 2.52, 3][Math.floor(m.rnd() * 6)], 0.012 + 0.03 * m.ss(92, HIT, x), 0.25, 0.2 + m.rnd() * 0.6);
  m.riser(93, HIT, 0.34, 250, 8000); m.thump(HIT, 140, 50, 0.52, 1.1); m.bloom(HIT, 0.5, 2.8);
  m.pad(HIT, 112, [D[0], D[1], D[2], D[3], 440], 0.055, 0.15, 5, 0.45);
  m.motif(HIT + 0.2, 0.75, 587.33, 0.11, 9, 2.8); m.motif(HIT + 0.2, 0.75, 293.66, 0.07, 9, 2.8); m.motif(HIT + 7, 1.1, 587.33, 0.06, 9, 3.2);
  m.land('galaxy', 110, 0.05);
}

export async function make(screen) {
  const T = J('production/config/textos.json'), F = J('production/config/fotos.json'), all = [...F.protagonistas, ...F.secundarias];
  const file = (id) => rootPath('production/fotos', all.find((x) => x.id === id).archivo);
  const Wd = { clouds: await world('clouds', screen), jungle: await world('jungle', screen), ocean: await world('ocean', screen), galaxy: await world('galaxy', screen) };
  const star = goldenStar('sh12-' + screen), fl = flareSprite(256, '#FFE9B0'), shade = glow(1200, '#02060A', { power: 1.2 });
  const scenes = sceneStack([
    { at: 0, fade: 0, draw: (ctx) => { ctx.fillStyle = '#020204'; ctx.fillRect(0, 0, W, H); } },
    { at: CH[0], fade: 2.6, draw: worldScene(Wd.clouds) }, { at: CH[1], fade: 4, draw: worldScene(Wd.jungle) },
    { at: CH[2], fade: 4, draw: worldScene(Wd.ocean) }, { at: CH[3], fade: 5, draw: worldScene(Wd.galaxy, { push: (t) => 1 + 0.08 * ss(51, 110, t) }) },
    { at: 111.5, fade: 6.5, draw: landing(Wd.galaxy, DURATION) }
  ]);
  const boom = gather({ seed: 'sh12-reunir-' + screen, n: screen === 'main' ? 300 : 170, cy: 0.46 });
  // la estrella cruza en cada cambio de mundo: en una pantalla hacia un lado, en la siguiente hacia el otro
  const dir0 = screen === 'side' ? -1 : 1, lag = { ceiling: 0, main: 0.5, side: 1 }[screen];
  const crossing = (ctx, t, f) => CH.slice(1).forEach((c, i) => {
    const a = c - 1.6 + lag, b = c + 3.2 + lag; if (t < a || t > b) return;
    const d = dir0 * (i % 2 ? -1 : 1), p = eo(prog(t, a, b)) * 0.4 + prog(t, a, b) * 0.6;
    const pos = (q) => [W * (0.5 - d * 0.64 + d * 1.28 * q), H * (0.6 - 0.26 * q - 0.12 * Math.sin(Math.PI * q) + i * 0.04)];
    const [x, y] = pos(p); star.trail(ctx, pos, p, 1, 1, f); star.body(ctx, x, y, 0.6, win(t, a, b, 0.4, 0.4), f);
  });
  const hits = (ctx, t, s = 1) => {
    flash(ctx, t, CH[0] + 0.05, 0.12, 2.6, 0.9 * s, 0.5, 0.5);
    CH.slice(1).forEach((c) => flash(ctx, t, c + lag + 0.6, 0.6, 1.8, 0.28 * s));
    flash(ctx, t, PHOTO + 0.05, 0.3, 2.6, 0.5 * s);
    flash(ctx, t, HIT + 0.06, 0.12, 3.4, 0.95 * s, 0.5, 0.46);
    boom(ctx, prog(t, 92, HIT));
    const k = prog(t, HIT, HIT + 3.2), r = eo(k) * 1150; ring(ctx, W / 2, H * 0.46, r, r * 0.62, (1 - k) * 0.9 * s, 6);
  };

  if (screen === 'main') {
    const plan = [['p02', 8, 18, -1], ['s01', 12, 21.5, 1], ['p03', 23, 33, 1], ['s02', 27, 36.5, -1], ['p05', 38, 48, -1], ['s03', 42, 51.5, 1], ['s04', 53, 63, 1], ['s05', 56.5, 66, -1]];
    const cards = {}; for (const [id] of plan) cards[id] = await photoCard(file(id), { maxW: 520, maxH: 440, seed: 3 });
    const us = await photoCard(file('p06'), { maxW: 760, maxH: 520, seed: 12 });
    const title = textFx({ text: T.titulo, size: 138, y: H * 0.44, seed: 'titulo-final', tracking: 0.2, n: 950, colors: ['#5FD8FF', '#8FD6A8', '#B06BFF', '#FFD9A0', '#FF9AB8'], scatter: 640 });
    const up = (p) => [W * (0.5 + 0.1 * Math.sin(p * 5)), H * (0.86 - 1.12 * p)];
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f);
      if (t >= 2.6 && t < CH[0] + 0.4) { const k = ss(2.6, 5.6, t); star.body(ctx, W / 2, H * 0.5, 0.12 + 0.5 * k, k * (1 - ss(CH[0], CH[0] + 0.4, t)), f); }
      for (const [id, a, b, side] of plan) floatCard(ctx, cards[id], t, a, b, side, f, { near: 0.86, far: 0.3 });
      crossing(ctx, t, f);
      if (t >= RISE && t < 77) { const p = eo(prog(t, RISE + 0.4, 76.4)); const [x, y] = up(p); star.trail(ctx, up, p, 1.1, 1, f); star.body(ctx, x, y, 0.66, win(t, RISE, 77, 0.6, 0.5), f); }
      const da = 0.46 * win(t, PHOTO - 0.5, 110.5, 1.6, 2); if (da > 0.003) { ctx.globalAlpha = da; ctx.drawImage(shade, W / 2 - 760, H * 0.48 - 430, 1520, 860); ctx.globalAlpha = 1; }
      drawCard(ctx, us, W / 2, H * 0.5, t, PHOTO + 0.2, 93.4, f, { fi: 2, fo: 1.6 });
      hits(ctx, t);
      title(ctx, prog(t, HIT + 0.1, HIT + 3.3), prog(t, 110.2, 112.8), f);
    };
  }

  if (screen === 'ceiling') {
    const heart = Array.from({ length: 14 }, (_, i) => { const th = (i / 14) * TAU; return [W / 2 + 16 * Math.pow(Math.sin(th), 3) * 15, H * 0.46 - (13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)) * 15]; });
    const arrive = (p) => [W * (0.5 + 0.12 * Math.sin(p * 4)), H * (1.16 - 0.7 * p)];
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f); crossing(ctx, t, f);
      if (t >= 70 && t < PHOTO + 0.5) { const p = eo(prog(t, 70.4, PHOTO)); const [x, y] = arrive(p); star.trail(ctx, arrive, p, 1.1, 1, f); star.body(ctx, x, y, 0.7, win(t, 70, PHOTO + 0.5, 0.5, 0.5), f); }
      const ca = win(t, PHOTO, 112.5, 0.6, 3);        // la última constelación, sobre la cama
      if (ca > 0.003) {
        const k = prog(t, PHOTO + 0.4, 86.5) * heart.length;
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,226,176,${0.5 * ca})`; ctx.lineWidth = 1.6; ctx.beginPath();
        for (let i = 0; i <= Math.min(heart.length, Math.floor(k)); i++) { const q = heart[i % heart.length]; i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
        if (k < heart.length) { const i = Math.floor(k), a = heart[i % heart.length], b = heart[(i + 1) % heart.length], u = k - i; ctx.lineTo(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); }
        ctx.stroke();
        heart.forEach((q, i) => { const on = ss(i, i + 0.8, k + 0.8), s = (56 + 26 * Math.sin(f * 0.11 + i)) * on; ctx.globalAlpha = ca * on; ctx.drawImage(fl, q[0] - s / 2, q[1] - s / 2, s, s); });
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      hits(ctx, t, 0.9);
    };
  }

  // lateral: los símbolos de lo que hicieron esta noche, pasando uno tras otro
  const { body, lid } = boxSprites(), fly = butterfly(), orb = makeSphere('sh12-esfera'), flame = flameSprite();
  const vio = glow(300, '#B06BFF', { power: 2 }), gol = glow(300, '#FFC060', { power: 2 }), coreV = glow(110, '#F2E4FF', { power: 2 }), coreG = glow(110, '#FFF6DC', { power: 2 });
  const icons = [
    [9, (ctx, x, y, f) => { ctx.drawImage(body, x - 110, y - 80, 220, 186); ctx.drawImage(lid, x - 118, y - 150, 236, 110); }],
    [22, (ctx, x, y, f) => fly(ctx, x, y, 1.5, f, 1, Math.sin(f * 0.03) * 0.3)],
    [35, (ctx, x, y, f) => { ctx.globalCompositeOperation = 'lighter'; for (const [h, c, d] of [[vio, coreV, -1], [gol, coreG, 1]]) { const ox = x + d * 70 * Math.cos(f * 0.05), oy = y + d * 40 * Math.sin(f * 0.05); ctx.drawImage(h, ox - 150, oy - 150); ctx.drawImage(c, ox - 55, oy - 55); } ctx.globalCompositeOperation = 'source-over'; }],
    [48, (ctx, x, y, f) => orb(ctx, x, y, 110, f, 3600, { light: 0.9 })],
    [61, (ctx, x, y, f) => { ctx.globalCompositeOperation = 'lighter'; for (let i = -1; i <= 1; i++) { const h = 250 * (0.8 + 0.2 * Math.sin(f * 0.2 + i * 2)); ctx.drawImage(flame, x + i * 60 - 60, y + 110 - h, 120, h); } ctx.globalCompositeOperation = 'source-over'; }]
  ];
  return (ctx, f) => {
    const t = f / 30;
    scenes(ctx, t, f);
    for (const [at, draw] of icons) { const k = prog(t, at, at + 11); if (k <= 0 || k >= 1) continue; ctx.globalAlpha = Math.sin(Math.PI * k) * 0.92; draw(ctx, W * (0.5 + 0.12 * Math.sin(k * 3 + at)), H * (0.78 - 0.5 * k), f); ctx.globalAlpha = 1; }
    crossing(ctx, t, f); hits(ctx, t, 0.9);
  };
}

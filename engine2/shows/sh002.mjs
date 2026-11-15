/**
 * SH-002 · OUR STORY — un viaje por nuestros recuerdos.
 *
 * No es un pase de fotos: la cámara avanza entre nubes y los recuerdos pasan a
 * distintas distancias. Uno de ellos se queda: la cámara se detiene y la música
 * baja. Al final los recuerdos se vuelven partículas.
 *
 * ALARGARLO: la lista de fotos y sus tiempos están en `PLAN`. Añadir fotos a
 * production/config/fotos.json, sumarlas al plan y subir DURATION es todo.
 */
import { W, H, TAU, glow } from '../lib.mjs';
import { motes } from '../layers.mjs';
import { ss, prog, win, photoCard, floatCard, dissolver } from './kit.mjs';
import { world, sceneStack, worldScene, landing, intro, J, rootPath, P } from './stage.mjs';

export const DURATION = 60;
/** Qué foto va en qué pantalla y cuándo. `special` es la que detiene el viaje. */
const PLAN = {
  main: [['p02', 3, 14, -1], ['p03', 10.5, 21.5, 1], ['p05', 18, 29, -1]],
  special: ['p04', 27, 48.5],
  side: [['s01', 4, 15, 1], ['s02', 12.5, 23.5, -1], ['s03', 21, 32, 1], ['s04', 29.5, 40.5, -1], ['s05', 38, 49, 1]],
  ceiling: ['p02', 's01', 'p03', 's03', 'p05', 's05']
};

export const PIECE = {
  id: 'SH-002', name: 'OUR STORY', exitAmbient: 'AMBIENT-001', timecode: { offset: '02:00:00:00', show: 2 },
  description: 'Un viaje por nuestros recuerdos: la camara avanza entre nubes doradas y lavanda y las fotos pasan a distintas distancias.',
  notes: 'Las fotos salen de `production/config/fotos.json`, en su proporcion real. MAIN lleva las protagonistas y la foto especial (el atardecer), donde la camara se detiene y la musica baja; SIDE las secundarias; CEILING recuerdos lejanos entre nubes.\n\n**Para alargarlo:** el reparto y los tiempos estan en `PLAN`, al principio de `engine2/shows/sh002.mjs`. Se anaden fotos al registro, se suman al plan y se sube `DURATION`. Nada mas cambia.',
  licenses: 'Animacion y musica originales. Fotografias personales aportadas por el operador, uso privado. Sin stock ni IA generativa.',
  cues: [
    { atMs: 0, label: '001 ENTRE NUBES', tipo: 'AMBIENT_FADE', momento: 'piano y cuerdas', accion: 'la camara avanza entre nubes; primeros recuerdos', halo_par: '3x PAR ambar y lavanda al 25%', color: '#FFC89A', intensidad: 0.25, fade_s: 4 },
    { atMs: 27000, label: '002 LA FOTO ESPECIAL', tipo: 'COLOR_TRANSITION', momento: 'la musica baja', accion: 'el atardecer llega al centro y la camara se detiene', halo_par: '3x PAR lavanda al 18%', color: '#A99BD6', intensidad: 0.18, fade_s: 6 },
    { atMs: 43500, label: '003 PARTICULAS', tipo: 'COLOR_TRANSITION', momento: 'el tema vuelve a subir', accion: 'los recuerdos se vuelven particulas doradas', halo_par: '3x PAR dorado al 30%', color: '#FFD9A0', intensidad: 0.3, fade_s: 5 },
    { atMs: 54000, label: '004 ATERRIZAJE', tipo: 'OUTRO_FADE', momento: 'acorde sostenido', accion: 'look de reposo de CLOUDS', halo_par: '3x PAR #FFD9A0 al 24%', color: '#FFD9A0', intensidad: 0.24, fade_s: 5 }
  ]
};

export function score(m) {
  const D = [146.83, 220, 293.66, 369.99], Bm = [123.47, 185, 246.94, 293.66], G = [98, 196, 246.94, 293.66], A = [110, 164.81, 220, 277.18];
  m.intro(0.16);
  [[0, D], [7, Bm], [14, G], [21, A]].forEach(([t, ch]) => { m.pad(t, t + 7, ch, 0.04, 2, 3, 0.3); m.arp(t + 0.3, t + 7, [ch[1], ch[2], ch[3], ch[2]], 0.875, 0.055, 1.7); });
  m.motif(3.5, 1.15, 587.33, 0.06, 9, 2.6);
  // la foto especial: casi nada, solo piano
  m.pad(28, 44, Bm, 0.022, 3, 4, 0.2); m.pad(36, 44, G, 0.02, 3, 4, 0.2);
  m.motif(31, 1.5, 293.66, 0.07, 9, 3.4);
  // los recuerdos se vuelven partículas
  m.pad(43.5, 54, D, 0.045, 3, 3, 0.36); m.arp(44, 53, [D[1], D[2], D[3], D[2] * 2], 0.44, 0.045, 0.9);
  m.sparkle(43.5, 53, 46, 880, 0.02); m.motif(45, 0.8, 587.33, 0.06, 9, 2.4);
  m.land('clouds', 52);
}

export async function make(screen) {
  const F = J('production/config/fotos.json'), all = [...F.protagonistas, ...F.secundarias];
  const file = (id) => rootPath('production/fotos', all.find((x) => x.id === id).archivo);
  const clouds = await world('clouds', screen);
  const wisp = glow(512, '#FFE9D6', { power: 1.5 });
  const dust = motes({ n: 140, seed: 'sh2-polvo-' + screen, color: '#FFE2A8', size: [4, 13], alpha: [0.3, 0.9], amp: [10, 46], rise: 2, blink: 2 });
  const scenes = sceneStack([
    { at: 0, fade: 0, draw: worldScene(clouds, { push: (t) => 1 + 0.2 * prog(t, 0, 57) }) },
    { at: 54.2, fade: 4.2, draw: landing(clouds, DURATION) }
  ]);
  // jirones de nube que nos pasan de largo: es lo que da la sensación de avanzar
  const wisps = (ctx, t) => {
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 7; i++) {
      const k = (((t + i * 1.1) / 7.7) % 1), a = i * 2.4, s = 300 + 2400 * k * k;
      ctx.globalAlpha = Math.sin(Math.PI * k) * 0.2 * win(t, 0, 55, 2, 3);
      ctx.drawImage(wisp, W / 2 + Math.cos(a) * k * k * 760 - s / 2, H / 2 + Math.sin(a) * k * k * 420 - s / 2, s, s);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  const finale = (ctx, t, f) => { const a = win(t, 43.5, 56, 2, 3.5); if (a > 0.003) dust(ctx, f % P, P, a); };

  if (screen === 'main') {
    const cards = {};
    for (const [id] of PLAN.main) cards[id] = await photoCard(file(id), { maxW: 600, maxH: 470, seed: 2 });
    const [sid, sa, sb] = PLAN.special;
    const special = await photoCard(file(sid), { maxW: 620, maxH: 500, seed: 9 }), dis = dissolver(special, 'sh2-dis');
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f); wisps(ctx, t);
      for (const [id, a, b, side] of PLAN.main) floatCard(ctx, cards[id], t, a, b, side, f);
      const kd = prog(t, 43.5, sb);
      floatCard(ctx, special, t, sa, sb, 0, f, { near: 1.02, hold: ss(0, 0.5, kd) });
      dis(ctx, kd, W * 0.5, H * 0.48, 1.02, f);
      finale(ctx, t, f); intro(ctx, t, 0.6);
    };
  }
  if (screen === 'side') {
    const cards = {};
    for (const [id] of PLAN.side) cards[id] = await photoCard(file(id), { maxW: 520, maxH: 470, seed: 5, border: id !== 's02' && id !== 's04' });
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f); wisps(ctx, t);
      for (const [id, a, b, side] of PLAN.side) floatCard(ctx, cards[id], t, a, b, side, f, { near: 0.96 });
      finale(ctx, t, f); intro(ctx, t, 0.6);
    };
  }
  // techo: recuerdos lejanos girando despacio entre nubes
  const far = [];
  for (const id of PLAN.ceiling) far.push(await photoCard(file(id), { maxW: 250, maxH: 230, seed: 7, border: false }));
  return (ctx, f) => {
    const t = f / 30;
    scenes(ctx, t, f); wisps(ctx, t);
    const a = 0.5 * win(t, 3, 50, 4, 6);
    if (a > 0.003) far.forEach((c, i) => {
      const th = (i / far.length) * TAU + t * 0.035, s = 0.62 + 0.12 * Math.sin(t * 0.2 + i);
      ctx.globalAlpha = a * (0.7 + 0.3 * Math.sin(t * 0.3 + i * 1.7));
      ctx.save(); ctx.translate(W / 2 + Math.cos(th) * W * 0.34, H * 0.48 + Math.sin(th) * H * 0.31); ctx.rotate(Math.sin(t * 0.1 + i) * 0.08); ctx.scale(s, s);
      ctx.drawImage(c.canvas, -c.w / 2, -c.h / 2); ctx.restore();
    });
    ctx.globalAlpha = 1;
    finale(ctx, t, f); intro(ctx, t, 0.6);
  };
}

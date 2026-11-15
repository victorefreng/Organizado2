/**
 * SH-007 · RED ROOM — nuestro espacio privado (entrada).
 *
 * Partículas doradas que se ordenan, se vuelven tela roja y forman un telón de
 * terciopelo. El telón se abre y detrás está ya el mundo RED ROOM: sombras
 * suaves y reflejos ámbar. Sin golpes: aquí todo son fundidos lentos.
 */
import { W, H, TAU, makeRng, glow, createCanvas } from '../lib.mjs';
import { ss, prog, eo, win } from './kit.mjs';
import { world, sceneStack, landing, intro, voidStage } from './stage.mjs';
import { curtainTex } from '../worlds/redroom.mjs';

export const DURATION = 60;
export const PIECE = {
  id: 'SH-007', name: 'RED ROOM', exitAmbient: 'AMBIENT-005', timecode: { offset: '07:00:00:00', show: 0 },
  description: 'Entrada al espacio privado: particulas doradas se vuelven telas rojas y un telon de terciopelo se abre a sombras suaves y reflejos ambar.',
  notes: 'Pieza suave: solo Halo PAR, fundidos lentos y ningun golpe. Lo que hay detras del telon es ya el mundo RED ROOM, colocado para terminar en el ultimo fotograma de su bucle.\n\nLa ruleta de propuestas va aparte, como grafico editable: `production/assets/ruleta/ruleta.svg`. Las casillas estan vacias a proposito; las opciones las escribe el operador.',
  cues: [
    { atMs: 0, label: '001 POLVO DORADO', tipo: 'AMBIENT_FADE', momento: 'entra el pulso lento', accion: 'particulas doradas en la oscuridad', halo_par: '3x PAR ambar al 12%', color: '#D98B3A', intensidad: 0.12, fade_s: 4 },
    { atMs: 11000, label: '002 LA TELA', tipo: 'COLOR_TRANSITION', momento: 'entra el colchon grave', accion: 'las particulas se ordenan y se vuelven terciopelo rojo', halo_par: '3x PAR de ambar a rojo vino al 18%', color: '#8E1226', intensidad: 0.18, fade_s: 12 },
    { atMs: 27000, label: '003 SE ABRE EL TELON', tipo: 'COLOR_TRANSITION', momento: 'la melodia se abre', accion: 'el telon se abre a un espacio de sombras y reflejos ambar', halo_par: '3x PAR rojo vino y ambar al 24%', color: '#B0402E', intensidad: 0.24, fade_s: 14 },
    { atMs: 50000, label: '004 ATERRIZAJE', tipo: 'OUTRO_FADE', momento: 'acorde sostenido', accion: 'look de reposo de RED ROOM', halo_par: '3x PAR #8E1226 al 16%', color: '#8E1226', intensidad: 0.16, fade_s: 6 }
  ]
};

export function score(m) {
  const Gm = [98, 116.54, 146.83, 196], Eb = [77.78, 116.54, 155.56, 196], F = [87.31, 130.81, 174.61, 220];
  m.intro(0.14);
  m.bed(0, 14, 300, 0.014, 2, 5);
  [[2, Gm], [14, Eb], [26, F], [38, Gm]].forEach(([t, ch]) => m.pad(t, t + 12, ch, 0.04, 4, 5, 0.24));
  for (let t = 11; t < 50; t += 60 / 68) { m.thump(t, 84, 58, 0.16, 0.26); if (Math.round((t - 11) / (60 / 68)) % 2) m.tick(t + 30 / 68, 0.035, 520, 34); }
  m.arp(14, 50, [196, 233.08, 293.66, 233.08, 349.23, 293.66], 60 / 68, 0.05, 1.3);
  m.motif(28, 60 / 68 * 2, 196, 0.06, 9, 3.2);
  m.sparkle(0, 26, 50, 783.99, 0.016, [0, 3, 7, 10, 12]);
  m.land('redroom', 50);
}

export async function make(screen) {
  const red = await world('redroom', screen);
  const bg = voidStage('#2C0C12', '#12050A', '#050203');
  const r = makeRng('sh7-' + screen), gold = glow(48, '#FFD08A', { power: 2.2 }), crim = glow(48, '#E0556A', { power: 2.2 });
  const ps = Array.from({ length: 300 }, () => ({ x: r() * W, y: r() * H, col: Math.floor(r() * 46), a: r() * TAU, rad: r.range(60, 520), s: r.range(4, 13), v: r.range(30, 110), tw: r() * TAU, al: r.range(0.3, 1) }));
  const drape = curtainTex(77, { lamp: [0.5, 0.42], lampR: 0.6, gain: 0.82 });
  const edge = glow(256, '#FFC27A', { power: 2 });
  const behind = landing(red, DURATION), delay = screen === 'side' ? 2 : 0;
  const tmp = createCanvas(W, H), tg = tmp.getContext('2d');

  return (ctx, f) => {
    const t = f / 30;
    // lo que hay detrás: el mundo, ya desde el principio, para que el aterrizaje no tenga empalme
    const fabric = ss(11, 23, t), open = eo(prog(t, 27 + delay, 45 + delay)), leave = ss(49, 55.5, t);
    if (fabric < 1) { ctx.drawImage(bg, 0, 0); } else behind(ctx, t, f);
    if (fabric > 0 && fabric < 1) { ctx.fillStyle = '#050203'; ctx.fillRect(0, 0, W, H); ctx.drawImage(bg, 0, 0); }

    if (screen === 'ceiling') {
      // en el techo no hay telón: el dosel se revela en círculo desde el centro
      const k = eo(prog(t, 16, 44));
      if (k > 0) {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalAlpha = 1; tg.globalCompositeOperation = 'source-over';
        behind(tg, t, f);
        if (k < 1) { const R = k * 1100, m = tg.createRadialGradient(W / 2, H * 0.48, R * 0.5, W / 2, H * 0.48, R); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); tg.globalCompositeOperation = 'destination-in'; tg.fillStyle = m; tg.fillRect(0, 0, W, H); }
        ctx.drawImage(bg, 0, 0); ctx.drawImage(tmp, 0, 0);
      }
    } else if (fabric > 0) {
      if (fabric >= 1) behind(ctx, t, f);
      // el telón: dos mitades que se recogen hacia los lados y al final salen del todo
      const keep = (1 - 0.74 * open) * (1 - leave), halfW = (W / 2) * keep;
      if (keep > 0.002) {
        ctx.globalAlpha = fabric;
        ctx.drawImage(drape, 0, 0, 768, 800, -leave * 80, -40, halfW + 2, H + 80);
        ctx.drawImage(drape, 768, 0, 768, 800, W - halfW + leave * 80, -40, halfW + 2, H + 80);
        if (open > 0.01) {                       // el canto del telón recoge la luz de dentro
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * fabric * Math.sin(Math.PI * Math.min(1, open * 1.2)) + 0.12 * open * (1 - leave);
          ctx.drawImage(edge, halfW - 70, -100, 140, H + 200); ctx.drawImage(edge, W - halfW - 70, -100, 140, H + 200);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 1;
      }
    }

    // las partículas: remolino dorado → columnas que caen → se tiñen de rojo y desaparecen en la tela
    const pa = win(t, 0.3, 26, 1.5, 6);
    if (pa > 0.003) {
      const order = ss(8, 18, t), redden = ss(12, 22, t);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        const ang = p.a + t * 0.25, sx = W / 2 + Math.cos(ang) * p.rad, sy = H / 2 + Math.sin(ang) * p.rad * 0.6;
        const cx = (p.col + 0.5) / 46 * W + Math.sin(t * 0.7 + p.tw) * 4, cy = ((p.y + t * p.v) % (H + 60)) - 30;
        ctx.globalAlpha = pa * p.al * (0.6 + 0.4 * Math.sin(f * 0.15 + p.tw));
        ctx.drawImage(p.tw / TAU < redden ? crim : gold, sx + (cx - sx) * order - p.s / 2, sy + (cy - sy) * order - p.s / 2, p.s, p.s);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    intro(ctx, t, 0.45);
  };
}

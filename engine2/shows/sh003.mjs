/**
 * SH-003 · THE MYSTERY BOX — el espectáculo de las sorpresas.
 *
 * Tres cajas doradas en un espacio violeta. Se abren una tras otra, cada una
 * con su efecto, y su energía se reúne en una esfera que estalla suavemente.
 * El final es NEUTRO: no dice qué sorpresa viene, así que sirve varias veces.
 */
import { W, H, TAU, makeRng, glow } from '../lib.mjs';
import { blurred, raySprite, flareSprite } from '../tex.mjs';
import { motes, rays } from '../layers.mjs';
import { ss, prog, eo, back, win, rr } from './kit.mjs';
import { world, sceneStack, landing, intro, flash, ring, voidStage, P } from './stage.mjs';

export const DURATION = 60;
const OPEN = [16, 30, 43], BURST = 51;

export const PIECE = {
  id: 'SH-003', name: 'THE MYSTERY BOX', exitAmbient: 'AMBIENT-002', timecode: { offset: '03:00:00:00', show: 3 },
  description: 'Tres cajas doradas flotan en un espacio violeta, se abren una tras otra y su energia se reune en una esfera que estalla suavemente en luz.',
  notes: 'Un solo video lineal: ella no elige ni toca nada. Tres impactos (0:16, 0:30 y 0:43) y un crescendo hasta el estallido de 0:51. El final es neutro a proposito: no anuncia que sorpresa viene, asi que la pieza se puede lanzar varias veces en la noche.',
  cues: [
    { atMs: 0, label: '001 TRES CAJAS', tipo: 'AMBIENT_FADE', momento: 'cambia la musica', accion: 'aparecen tres cajas doradas', halo_par: '3x PAR violeta al 20%', color: '#6A3FD0', intensidad: 0.2, fade_s: 3 },
    { atMs: 8000, label: '002 LA PRIMERA VIBRA', tipo: 'RISER', momento: 'percusion que se acelera', accion: 'la primera caja tiembla y se ilumina', halo_par: '3x PAR de violeta a dorado, de 20% a 35%', color: '#FFD08A', intensidad: 0.35, fade_s: 8 },
    { atMs: 16000, label: '003 PRIMERA CAJA', tipo: 'IMPACT', momento: 'impacto 1', accion: 'se abre: fuente de luz dorada', halo_par: '3x PAR dorado al 60%, cae a 28%', color: '#FFD08A', intensidad: 0.6, fade_s: 0.2 },
    { atMs: 22000, label: '004 LA SEGUNDA VIBRA', tipo: 'RISER', momento: 'percusion que se acelera', accion: 'la segunda caja responde', halo_par: '3x PAR de 28% a 40%, violeta y cian', color: '#7FB8FF', intensidad: 0.4, fade_s: 8 },
    { atMs: 30000, label: '005 SEGUNDA CAJA', tipo: 'IMPACT', momento: 'impacto 2', accion: 'se abre: espiral de estrellas', halo_par: '3x PAR cian al 65%, cae a 30%', color: '#7FD8FF', intensidad: 0.65, fade_s: 0.2 },
    { atMs: 36000, label: '006 LA TERCERA VIBRA', tipo: 'RISER', momento: 'percusion que se acelera', accion: 'la tercera caja tiembla con mas fuerza', halo_par: '3x PAR de 30% a 45%, magenta', color: '#D08AFF', intensidad: 0.45, fade_s: 7 },
    { atMs: 43000, label: '007 TERCERA CAJA', tipo: 'IMPACT', momento: 'impacto 3', accion: 'se abre: columna de luz', halo_par: '3x PAR blanco calido al 70%, cae a 40%', color: '#FFF0D0', intensidad: 0.7, fade_s: 0.2 },
    { atMs: 44000, label: '008 LA ESFERA', tipo: 'RISER', momento: 'crescendo', accion: 'la energia de las tres se reune en una esfera dorada', halo_par: '3x PAR dorado de 40% a 85%', color: '#FFD08A', intensidad: 0.85, fade_s: 7 },
    { atMs: 51000, label: '009 ESTALLIDO', tipo: 'FINAL_HIT', momento: 'estallido suave', accion: 'la esfera se deshace en luz', halo_par: '3x PAR dorado al 90%', flasher: '1 destello unico', color: '#FFE7BC', intensidad: 0.9, fade_s: 0.15 },
    { atMs: 53000, label: '010 ATERRIZAJE', tipo: 'OUTRO_FADE', momento: 'acorde de OCEAN', accion: 'look de reposo de OCEAN', halo_par: '3x PAR #0A6E8C al 20%', color: '#0A6E8C', intensidad: 0.2, fade_s: 5 }
  ]
};

export function score(m) {
  const Dm = [73.42 * 2, 174.61, 220, 329.63];
  m.intro(0.2);
  m.pad(0, 44, Dm, 0.032, 3, 2, 0.3);
  // percusión mágica: celesta que se aprieta antes de cada apertura
  for (const [a, b, base] of [[8, 16, 587.33], [22, 30, 698.46], [36, 43, 880]]) {
    let t = a, step = 0.6, k = 0;
    while (t < b - 0.05) { m.bell(t, base * [1, 1.2, 1.5, 1.8, 2][k % 5], 0.03 + 0.05 * m.ss(a, b, t), 0.45, 0.3 + 0.4 * ((k * 0.37) % 1)); m.tick(t, 0.02 + 0.04 * m.ss(a, b, t), 1400); t += step; step = Math.max(0.11, step * 0.93); k++; }
    m.riser(b - 2.2, b, 0.16);
  }
  [[16, 146.83], [30, 174.61], [43, 220]].forEach(([t, f]) => { m.thump(t, 120, 54, 0.4, 0.7); m.bloom(t, 0.36, 1.8); [1, 1.5, 2, 3].forEach((h) => m.bell(t + 0.02, f * h, 0.085, 3)); });
  m.sparkle(16, 51, 90, 1174.66, 0.014);
  // crescendo: las tres energías se reúnen
  m.pad(44, 51, [146.83, 220, 293.66, 369.99, 440], 0.04, 5, 0.4, 0.45);
  m.arp(44, 51, [293.66, 369.99, 440, 587.33], 0.19, 0.045, 0.4); m.riser(45, 51, 0.3, 250, 8000);
  m.thump(51, 110, 52, 0.42, 1); m.bloom(51, 0.44, 2.8); [146.83, 220, 293.66, 369.99, 587.33].forEach((f) => m.bell(51.02, f, 0.08, 3.6));
  m.land('ocean', 52.2);
}

/** Caja y tapa por separado, para que la tapa pueda salir volando. */
function boxSprites() {
  const gold = (g, x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#FFE9A8'); gr.addColorStop(0.45, '#E9B24E'); gr.addColorStop(1, '#8A5A16'); return gr; };
  const body = blurred(260, 220, 0.8, (g) => {
    g.fillStyle = gold(g, 30, 20, 230, 210); rr(g, 30, 20, 200, 180, 10); g.fill();
    g.fillStyle = 'rgba(60,30,0,0.28)'; g.fillRect(30, 20, 200, 16);                       // sombra de la tapa
    const rb = g.createLinearGradient(110, 0, 150, 0); rb.addColorStop(0, '#FFF6D8'); rb.addColorStop(0.5, '#FFFFFF'); rb.addColorStop(1, '#F0D090');
    g.fillStyle = rb; g.fillRect(112, 20, 36, 180);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; rr(g, 31, 21, 198, 178, 10); g.stroke();
  });
  const lid = blurred(280, 130, 0.8, (g) => {
    g.fillStyle = gold(g, 20, 70, 260, 124); rr(g, 20, 70, 240, 52, 9); g.fill();
    g.fillStyle = '#FFFFFF'; g.fillRect(122, 70, 36, 52);
    g.fillStyle = '#FFF2C8';                                                                // el lazo
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(140, 70); g.bezierCurveTo(140 + s * 26, 14, 140 + s * 88, 22, 140 + s * 70, 62); g.bezierCurveTo(140 + s * 50, 78, 140 + s * 20, 76, 140, 70); g.fill(); }
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(140, 68, 11, 0, TAU); g.fill();
  });
  return { body, lid };
}

export async function make(screen) {
  const ocean = await world('ocean', screen);
  const bg = voidStage('#3D2074', '#170C32', '#040308', 0.5, 0.52);
  const dust = motes({ n: 130, seed: 'sh3-polvo-' + screen, color: '#FFE2A8', size: [3, 10], alpha: [0.15, 0.7], amp: [10, 40] });
  const halo = glow(700, '#FFD08A', { power: 2.3 }), white = glow(300, '#FFFFFF', { power: 2.2 }), dot = glow(48, '#FFE2A8', { power: 2.2 });
  const dotC = glow(48, '#8FDFFF', { power: 2.2 }), dotV = glow(48, '#D9A6FF', { power: 2.2 });
  const stage = (ctx, t, f) => { ctx.drawImage(bg, 0, 0); dust(ctx, f % P, P); };
  const scenes = sceneStack([{ at: 0, fade: 0, draw: stage }, { at: 53.2, fade: 4.6, draw: landing(ocean, DURATION) }]);
  const SX = W / 2, SY = H * 0.26;                                   // donde se forma la esfera
  const sphereK = (t) => eo(prog(t, 44.2, 50.8));
  const burst = (ctx, t, s = 1) => { flash(ctx, t, BURST + 0.05, 0.1, 3.6, 0.95 * s, 0.5, 0.36); const k = prog(t, BURST, BURST + 3.2), r = eo(k) * 1200; ring(ctx, SX, SY, r, r * 0.7, (1 - k) * 0.9 * s, 6); };
  const hits = (ctx, t, s = 0.5) => OPEN.forEach((o, i) => flash(ctx, t, o + 0.05, 0.08, 1.8, s, [0.24, 0.5, 0.76][i], 0.56, ['#FFE2A8', '#BFE8FF', '#FFF3D8'][i]));

  if (screen === 'main') {
    const { body, lid } = boxSprites(), ray = raySprite(192, 768, '#FFE9B0'), fl = flareSprite(256, '#FFE9B0');
    const r = makeRng('sh3-cajas');
    const boxes = [0.24, 0.5, 0.76].map((x, i) => ({
      x: x * W, y: H * 0.6, s: i === 1 ? 1.12 : 1, open: OPEN[i], shake: [8, 22, 36][i], ph: i * 2.1,
      sparks: Array.from({ length: 120 }, () => ({ a: -Math.PI / 2 + r.gauss() * (i === 1 ? 1.3 : 0.5), v: r.range(180, 620), sz: r.range(5, 15), d: r() * 0.5, sw: r.range(-3, 3), spr: i === 1 ? (r() < 0.5 ? dotC : dotV) : dot }))
    }));
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f);
      const out = 1 - ss(BURST - 0.4, BURST + 1.6, t);
      for (const [i, b] of boxes.entries()) {
        const inn = back(prog(t, 1.4 + i * 1.1, 2.8 + i * 1.1));
        if (inn <= 0.01 || out <= 0.003) continue;
        const sh = ss(b.shake, b.open, t) * (t < b.open ? 1 : 0), jx = Math.sin(f * 2.9 + i) * 7 * sh * sh, jy = Math.cos(f * 3.7 + i) * 4 * sh * sh;
        const x = b.x + jx, y = b.y + Math.sin(t * 0.9 + b.ph) * 10 + jy, s = b.s * inn, ko = prog(t, b.open, b.open + 1.4), opened = t >= b.open;
        // resplandor: crece mientras tiembla y se queda cuando ya está abierta
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = out * (0.22 + 0.5 * sh + (opened ? 0.3 : 0));
        ctx.drawImage(halo, x - 300 * s, y - 300 * s, 600 * s, 600 * s); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (opened) {
          // lo que sale de dentro: haz de luz, y chispas en fuente (la segunda, en espiral)
          const beam = Math.min(1, ko * 3) * (1 - 0.55 * ss(b.open + 2, b.open + 6, t)) * out;
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8 * beam;
          ctx.save(); ctx.translate(x, y - 60 * s); ctx.rotate(Math.PI); ctx.drawImage(ray, -(60 + 60 * (i === 2 ? 2 : 1)) * s, 0, (120 + 120 * (i === 2 ? 2 : 1)) * s, 620); ctx.restore();
          for (const p of b.sparks) {
            const l = ((t - b.open) / 2.6 - p.d + 4) % 1, first = t - b.open < 2.6 * (p.d + 1);
            if (t - b.open < p.d * 2.6) continue;
            const e = eo(l), ang = p.a + (i === 1 ? l * p.sw : 0), d = p.v * e * (first ? 1 : 0.6);
            ctx.globalAlpha = (1 - l) * (first ? 1 : 0.45) * out;
            ctx.drawImage(p.spr, x + Math.cos(ang) * d * s - p.sz / 2, y - 70 * s + Math.sin(ang) * d * s + l * l * 90 - p.sz / 2, p.sz, p.sz);
          }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = out;
        ctx.drawImage(body, x - 130 * s, y - 110 * s, 260 * s, 220 * s);
        // la tapa: en su sitio, o saliendo despedida
        const lk = eo(ko);
        if (lk < 1) { ctx.globalAlpha = out * (1 - ss(0.6, 1, ko)); ctx.save(); ctx.translate(x + (i - 1) * 60 * lk, y - 96 * s - 210 * lk); ctx.rotate((i - 1 || 0.6) * 0.7 * lk); ctx.drawImage(lid, -140 * s, -70 * s, 280 * s, 130 * s); ctx.restore(); }
        ctx.globalAlpha = 1;
        // la energía de cada caja sube hacia la esfera
        const kg = prog(t, 44.2, 50.8);
        if (kg > 0 && kg < 1) { ctx.globalCompositeOperation = 'lighter'; for (let n = 0; n < 26; n++) { const l = (kg * 3 + n / 26) % 1, px = x + (SX - x) * eo(l), py = y - 70 + (SY - (y - 70)) * l + Math.sin(l * Math.PI) * -60; ctx.globalAlpha = Math.sin(Math.PI * l) * 0.9; ctx.drawImage(dot, px - 7, py - 7, 14, 14); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
      hits(ctx, t, 0.6);
      OPEN.forEach((o, i) => { const k = prog(t, o, o + 1.6), rad = eo(k) * 520; ring(ctx, boxes[i].x, boxes[i].y - 60, rad, rad * 0.5, (1 - k) * 0.8, 4, ['255,226,176', '160,220,255', '255,246,224'][i]); });
      const sk = sphereK(t), sa = (t < BURST ? 1 : 1 - ss(BURST, BURST + 0.5, t));
      if (sk > 0.005 && sa > 0.003) {
        const rad = 18 + 110 * sk + Math.sin(f * 0.5) * 4 * sk;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7 * sa; ctx.drawImage(halo, SX - rad * 4, SY - rad * 4, rad * 8, rad * 8);
        ctx.globalAlpha = sa; ctx.drawImage(white, SX - rad, SY - rad, rad * 2, rad * 2);
        ctx.globalAlpha = 0.8 * sa * sk; ctx.drawImage(fl, SX - rad * 2.4, SY - rad * 2.4, rad * 4.8, rad * 4.8);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      burst(ctx, t); intro(ctx, t, 0.6);
    };
  }

  if (screen === 'ceiling') {
    // una bóveda de partículas que gira, más deprisa cuanto más cerca del centro
    const r = makeRng('sh3-boveda');
    const vault = Array.from({ length: 420 }, () => ({ rad: 60 + Math.pow(r(), 0.7) * 760, a: r() * TAU, s: r.range(3, 10), al: r.range(0.25, 0.9), tw: r() * TAU, spr: r() < 0.7 ? dot : dotV }));
    const beams = rays({ n: 14, seed: 'sh3-rayos', sprite: raySprite(192, 768, '#C9A6FF'), from: [0.5, 0.5], intensity: 1, alpha: [0.06, 0.18], len: [0.7, 1.1], width: [120, 300] });
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f);
      const out = 1 - ss(BURST + 0.6, BURST + 3, t), speed = 0.05 + 0.35 * sphereK(t);
      if (out > 0.003) {
        beams(ctx, f % P, P, out);
        ctx.globalCompositeOperation = 'lighter';
        for (const p of vault) {
          const pull = 1 - 0.75 * sphereK(t) * (t < BURST ? 1 : 0), rad = p.rad * pull, ang = p.a + t * speed * (260 / (p.rad + 120));
          ctx.globalAlpha = p.al * out * (0.6 + 0.4 * Math.sin(f * 0.1 + p.tw));
          ctx.drawImage(p.spr, W / 2 + Math.cos(ang) * rad - p.s / 2, H / 2 + Math.sin(ang) * rad * 0.62 - p.s / 2, p.s, p.s);
        }
        const sk = sphereK(t) * (t < BURST ? 1 : 1 - ss(BURST, BURST + 0.5, t));
        ctx.globalAlpha = 0.8 * sk; ctx.drawImage(halo, W / 2 - 350, H / 2 - 350, 700, 700);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      hits(ctx, t, 0.45); flash(ctx, t, BURST + 0.05, 0.1, 3.4, 0.9); intro(ctx, t, 0.6);
    };
  }

  // lateral: signos de interrogación de luz y destellos
  const r = makeRng('sh3-signos');
  const mark = blurred(160, 200, 1.2, (g) => { g.font = '150px "U11 Serif"'; g.textAlign = 'center'; g.textBaseline = 'middle'; const gr = g.createLinearGradient(0, 30, 0, 170); gr.addColorStop(0, '#FFF6D8'); gr.addColorStop(1, '#E9B24E'); g.fillStyle = gr; g.fillText('?', 80, 104); });
  const fl = flareSprite(256, '#FFE9B0');
  const marks = Array.from({ length: 16 }, () => ({ x: r() * W, y: r() * (H + 300), s: r.range(0.35, 1.05), v: r.range(14, 34), a: r.range(0.25, 0.7), ph: r() * TAU }));
  const stars = Array.from({ length: 34 }, () => ({ x: r() * W, y: r() * H, s: r.range(30, 110), tw: r.range(0.05, 0.14), ph: r() * TAU }));
  return (ctx, f) => {
    const t = f / 30;
    scenes(ctx, t, f);
    const out = win(t, 1.5, BURST + 2.4, 2.5, 2.4), boost = 1 + 0.9 * sphereK(t);
    if (out > 0.003) {
      for (const m of marks) {
        const y = ((m.y - t * m.v * boost) % (H + 300) + H + 300) % (H + 300) - 150;
        ctx.globalAlpha = out * m.a * (0.6 + 0.4 * Math.sin(t * 0.8 + m.ph));
        ctx.save(); ctx.translate(m.x + Math.sin(t * 0.5 + m.ph) * 18, y); ctx.rotate(Math.sin(t * 0.4 + m.ph) * 0.2); ctx.scale(m.s, m.s); ctx.drawImage(mark, -80, -100); ctx.restore();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const s of stars) { const k = 0.5 + 0.5 * Math.sin(f * s.tw + s.ph), sz = s.s * k; ctx.globalAlpha = out * k * k; ctx.drawImage(fl, s.x - sz / 2, s.y - sz / 2, sz, sz); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    hits(ctx, t, 0.45); flash(ctx, t, BURST + 0.05, 0.1, 3.4, 0.9); intro(ctx, t, 0.6);
  };
}

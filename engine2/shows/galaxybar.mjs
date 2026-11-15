/**
 * GALAXY BAR · SH-051 · SH-052 · SH-053 — la barra de otro universo.
 *
 * Una base común y tres variantes. Los ingredientes son luz que gira y cae
 * dentro de una copa dibujada con un trazo; la copa se llena, aparece el nombre
 * de la bebida y un acento final da paso a servirla.
 *
 * Los nombres salen de production/config/textos.json (galaxyBar): cambiarlos
 * ahí y volver a renderizar es todo.
 */
import { W, H, TAU, makeRng, glow } from '../lib.mjs';
import { blurred, flareSprite } from '../tex.mjs';
import { ss, prog, eo, win, textFx } from './kit.mjs';
import { world, sceneStack, worldScene, landing, intro, flash, ring, gather, J } from './stage.mjs';

const DURATION = 50, HIT = 38;
const VARIANTS = {
  'SH-051': { key: 'golden', offset: '05:10:00:00', show: 51, glass: 'coupe', colors: ['#FFE2A8', '#FFB45A', '#FFF6DC'], tint: 'rgba(255,168,70,0.34)', rgb: '255,217,160', par: '#FFC27A', speed: 0.09, turns: 1.4, fall: 0.5,
    look: 'polvo estelar dorado; los ingredientes caen como fragmentos de luz', music: 'electronica elegante, sin percusion marcada' },
  'SH-052': { key: 'blue', offset: '05:20:00:00', show: 52, glass: 'highball', colors: ['#8FE6FF', '#3FB8E0', '#E8FBFF'], tint: 'rgba(40,190,232,0.34)', rgb: '150,226,255', par: '#3FB8E0', speed: 0.055, turns: 0.9, fall: 0,
    look: 'universo turquesa; liquidos en gravedad cero y cristales girando', music: 'espacial y suave' },
  'SH-053': { key: 'violet', offset: '05:30:00:00', show: 53, glass: 'martini', colors: ['#D9A6FF', '#FF6FD8', '#B06BFF'], tint: 'rgba(170,70,255,0.36)', rgb: '226,150,255', par: '#B06BFF', speed: 0.16, turns: 2.4, fall: 0,
    look: 'nebulosa violeta en torbellino y estallido magenta', music: 'la mas ritmica de las tres' }
};

const GLASS = {
  coupe: { top: -120, bottom: -18, bowl: (g) => { g.beginPath(); g.moveTo(-134, -120); g.quadraticCurveTo(-134, -18, 0, -18); g.quadraticCurveTo(134, -18, 134, -120); }, stem: [[0, -18, 0, 132], [-72, 132, 72, 132]] },
  highball: { top: -150, bottom: 130, bowl: (g) => { g.beginPath(); g.moveTo(-82, -150); g.lineTo(-68, 130); g.lineTo(68, 130); g.lineTo(82, -150); }, stem: [] },
  martini: { top: -130, bottom: 12, bowl: (g) => { g.beginPath(); g.moveTo(-142, -130); g.lineTo(0, 12); g.lineTo(142, -130); }, stem: [[0, 12, 0, 132], [-72, 132, 72, 132]] }
};

function ingredients(v) {
  const c = v.colors;
  const gem = (fill, hi) => blurred(96, 96, 0.6, (g) => {
    g.translate(48, 48);
    const gr = g.createLinearGradient(-30, -36, 30, 36); gr.addColorStop(0, hi); gr.addColorStop(1, fill);
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -40); g.lineTo(28, -12); g.lineTo(20, 30); g.lineTo(-20, 30); g.lineTo(-28, -12); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -40); g.lineTo(0, 30); g.moveTo(-28, -12); g.lineTo(28, -12); g.stroke();
  });
  const shard = blurred(96, 96, 0.6, (g) => { g.translate(48, 48); const gr = g.createLinearGradient(0, -44, 0, 44); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, c[1]); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -44); g.lineTo(11, 0); g.lineTo(0, 44); g.lineTo(-11, 0); g.closePath(); g.fill(); });
  const blob = blurred(96, 96, 0.8, (g) => { const gr = g.createRadialGradient(38, 36, 2, 48, 48, 40); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.35, c[0]); gr.addColorStop(1, c[1] + '55'); g.fillStyle = gr; g.beginPath(); g.arc(48, 48, 38, 0, TAU); g.fill(); });
  return { golden: [shard, shard, flareSprite(96, c[0])], blue: [blob, gem(c[1], c[2]), blob], violet: [flareSprite(96, c[1]), gem(c[2], c[0]), flareSprite(96, c[0])] }[v.key];
}

export function barChapter(id) {
  const v = VARIANTS[id], T = J('production/config/textos.json').galaxyBar[id];
  const PIECE = {
    id, name: `GALAXY BAR - ${T.nombre}`, exitAmbient: 'AMBIENT-004', timecode: { offset: v.offset, show: v.show },
    description: `La bebida ${T.nombre}: ${v.look}.`,
    notes: `Variante de la base comun de GALAXY BAR. Se lanza cuando ella pide esta bebida de palabra. El nombre («${T.nombre}») sale de \`production/config/textos.json\`: los nombres y recetas definitivos los pone el operador, y cambiarlos es volver a renderizar. Musica: ${v.music}.`,
    cues: [
      { atMs: 0, label: '001 LA BARRA', tipo: 'AMBIENT_FADE', momento: 'entra la base', accion: 'la galaxia toma el color de la bebida', halo_par: `3x PAR ${v.par} al 22%`, color: v.par, intensidad: 0.22, fade_s: 3 },
      { atMs: 3000, label: '002 LOS INGREDIENTES', tipo: 'COLOR_TRANSITION', momento: 'la musica se abre', accion: v.look, halo_par: `3x PAR ${v.par} al 30%, movimiento lento`, color: v.par, intensidad: 0.3, fade_s: 8 },
      { atMs: 16000, label: '003 LA COPA', tipo: 'MUSICAL_BUMP', momento: 'entra el pulso', accion: 'un trazo de luz dibuja la copa y se va llenando', halo_par: `3x PAR ${v.par}, pulso a 40% y vuelve`, color: v.par, intensidad: 0.4, fade_s: 0.5 },
      { atMs: 30000, label: `004 ${T.nombre}`, tipo: 'REVEAL', momento: 'acorde del nombre', accion: 'el nombre de la bebida se forma con particulas', halo_par: `3x PAR ${v.par} sube a 42%`, color: v.par, intensidad: 0.42, fade_s: 3 },
      { atMs: 38000, label: '005 LISTA', tipo: 'FINAL_HIT', momento: 'acento final', accion: 'estallido de luz: la bebida esta lista', halo_par: `3x PAR ${v.par} al 80%`, flasher: '1 destello unico', color: v.par, intensidad: 0.8, fade_s: 0.15 },
      { atMs: 44000, label: '006 ATERRIZAJE', tipo: 'OUTRO_FADE', momento: 'acorde de GALAXY', accion: 'look de reposo de GALAXY', halo_par: '3x PAR #6A3FD0 al 18%', color: '#6A3FD0', intensidad: 0.18, fade_s: 5 }
    ]
  };

  function score(m) {
    const base = { golden: [146.83, 220, 293.66, 369.99], blue: [110, 164.81, 220, 329.63], violet: [123.47, 185, 246.94, 369.99] }[v.key];
    m.intro(0.2);
    m.pad(0, 38, base, 0.036, 3, 2, v.key === 'blue' ? 0.2 : 0.38);
    if (v.key === 'golden') { m.arp(3, 38, [base[1], base[2], base[3], base[2] * 2], 0.5, 0.04, 0.5, 'pluck'); m.sparkle(3, 38, 60, 1174.66, 0.016); }
    if (v.key === 'blue') { m.bed(0, 40, 500, 0.02, 3, 4); m.sparkle(3, 38, 44, 880, 0.03, [0, 4, 7, 11, 14]); m.motif(6, 2.6, 293.66, 0.045, 9, 4); }
    if (v.key === 'violet') { for (let t = 4; t < 38; t += 0.5) { if ((t * 2) % 2 === 0) m.thump(t, 96, 56, 0.2, 0.22); m.hat(t + 0.25, 0.05); } m.arp(4, 38, [base[1], base[3], base[2], base[3] * 1.5], 0.25, 0.045, 0.2, 'pluck'); }
    // la copa se llena: una escala que sube
    [0, 2, 4, 7, 9, 12, 14, 16].forEach((s, k) => m.bell(20 + k * 1.2, base[2] * Math.pow(2, s / 12), 0.06, 1.6, 0.4 + 0.03 * k));
    [0, 7, 12].forEach((s, k) => m.bell(30 + k * 0.08, base[2] * 2 * Math.pow(2, s / 12), 0.09, 3.2));
    m.riser(34.5, HIT, 0.2); m.thump(HIT, 120, 52, 0.42, 0.9); m.bloom(HIT, 0.4, 2.4); base.forEach((f) => m.bell(HIT + 0.02, f * 2, 0.085, 3.4));
    m.land('galaxy', 42.5);
  }

  async function make(screen) {
    const galaxy = await world('galaxy', screen), items = ingredients(v);
    const r = makeRng('bar-' + id + '-' + screen), dots = v.colors.map((c) => glow(48, c, { power: 2.2 }));
    const halo = glow(900, v.colors[1], { power: 2.3 });
    const scenes = sceneStack([{ at: 0, fade: 0, draw: worldScene(galaxy, { tint: [v.tint, 'overlay'] }) }, { at: 44.2, fade: 4.3, draw: landing(galaxy, DURATION) }]);
    const CX = W / 2, CY = screen === 'main' ? H * 0.44 : H / 2, R0 = screen === 'main' ? 560 : 760;
    const swirl = Array.from({ length: screen === 'side' ? 110 : 240 }, () => ({ ph: r(), a: r() * TAU, s: r.range(4, 13), spr: dots[Math.floor(r() * dots.length)], k: r.range(0.7, 1.3) }));
    const bigs = Array.from({ length: screen === 'side' ? 16 : 11 }, (_, i) => ({ a: (i / 11) * TAU + r() * 0.4, rad: r.range(230, 430), s: r.range(34, 78), spr: items[i % items.length], rot: r.range(-1.2, 1.2), ph: r() * TAU, x: r() * W, y: r() * H, v: r.range(8, 26) }));
    const boom = gather({ seed: 'bar-boom-' + id, n: 220, cx: 0.5, cy: CY / H, colors: v.colors, far: [500, 1000] });
    const vortex = (ctx, t, f) => {
      const a = win(t, 1.5, 43, 2.5, 3) * (1 - 0.55 * ss(30, 36, t));
      if (a <= 0.003) return;
      ctx.globalCompositeOperation = 'lighter';
      for (const p of swirl) {
        const l = (t * v.speed * p.k + p.ph) % 1, rad = R0 * Math.pow(1 - l, 1.3) + 46, ang = p.a + l * v.turns * TAU;
        ctx.globalAlpha = a * Math.sin(Math.PI * l) * (0.6 + 0.4 * Math.sin(f * 0.2 + p.ph * 40));
        ctx.drawImage(p.spr, CX + Math.cos(ang) * rad - p.s / 2, CY + Math.sin(ang) * rad * 0.58 - v.fall * (1 - l) * 150 - p.s / 2, p.s, p.s);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    };
    const accent = (ctx, t, s = 1) => {
      flash(ctx, t, HIT + 0.05, 0.1, 2.8, 0.85 * s, 0.5, CY / H, v.colors[2]);
      const k = prog(t, HIT, HIT + 2.6), rad = eo(k) * 1100; ring(ctx, CX, CY, rad, rad * 0.62, (1 - k) * 0.9 * s, 6, v.rgb);
      boom(ctx, prog(t, HIT, HIT + 3.4), { reverse: true, x: CX, y: CY });
    };

    if (screen === 'main') {
      const G = GLASS[v.glass], S = 1.05;
      const name = textFx({ text: T.nombre, size: 60, y: H * 0.875, tracking: 0.24, seed: 'bar-' + id, n: 620, colors: v.colors, scatter: 300 });
      return (ctx, f) => {
        const t = f / 30;
        scenes(ctx, t, f);
        const ga = win(t, 14, 44.5, 3, 2.5);
        if (ga > 0.003) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.34 * ga * (0.85 + 0.15 * Math.sin(t * 1.3)); ctx.drawImage(halo, CX - 450, CY - 450); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        vortex(ctx, t, f);
        // ingredientes grandes: orbitan y, cuando aparece la copa, caen dentro
        const into = ss(17, 29, t);
        for (const b of bigs) {
          const al = win(t, 2.5, 30, 2, 1.5) * (1 - into * 0.2); if (al <= 0.003) continue;
          const rad = b.rad * (1 - into) + 20 * into, ang = b.a + t * (0.16 + v.speed) + into * 3;
          const s = b.s * (1 - 0.6 * into);
          ctx.globalAlpha = al;
          ctx.save(); ctx.translate(CX + Math.cos(ang) * rad, CY + Math.sin(ang) * rad * 0.6 - into * 40); ctx.rotate(t * b.rot + b.ph); ctx.drawImage(b.spr, -s / 2, -s / 2, s, s); ctx.restore();
        }
        ctx.globalAlpha = 1;
        // la copa: se llena, y un trazo de luz la dibuja
        const draw = eo(prog(t, 16, 21.5)), fill = eo(prog(t, 20, 30)), gl = win(t, 16, 44.6, 0.5, 2.2), bob = Math.sin(t * 0.8) * 6;
        if (gl > 0.003 && draw > 0) {
          ctx.save(); ctx.translate(CX, CY + 20 + bob); ctx.scale(S, S);
          if (fill > 0) {
            const lvl = G.bottom - fill * (G.bottom - G.top) * 0.84;
            ctx.save(); G.bowl(ctx); ctx.closePath(); ctx.clip();
            const lq = ctx.createLinearGradient(0, lvl, 0, G.bottom); lq.addColorStop(0, v.colors[2]); lq.addColorStop(0.3, v.colors[0]); lq.addColorStop(1, v.colors[1]);
            ctx.globalAlpha = 0.86 * gl; ctx.fillStyle = lq;
            ctx.beginPath(); ctx.moveTo(-200, G.bottom + 10);
            for (let x = -200; x <= 200; x += 10) ctx.lineTo(x, lvl + Math.sin(x * 0.05 + f * 0.12) * 3);
            ctx.lineTo(200, G.bottom + 10); ctx.fill();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 26; i++) { const bx = Math.sin(i * 12.9) * 110, by = G.bottom - (((t * 0.12 + i * 0.137) % 1)) * (G.bottom - lvl); ctx.globalAlpha = 0.7 * gl; ctx.drawImage(dots[2], bx - 4, by - 4, 8, 8); }
            ctx.restore();
          }
          ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter'; ctx.setLineDash([draw * 1500, 1500]);
          for (const [w, a] of [[16, 0.1], [7, 0.28], [2.6, 0.95]]) {
            ctx.strokeStyle = `rgba(${v.rgb},${a * gl})`; ctx.lineWidth = w; G.bowl(ctx); ctx.stroke();
            if (draw > 0.6) { ctx.globalAlpha = ss(0.6, 1, draw); for (const [x0, y0, x1, y1] of G.stem) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); } ctx.globalAlpha = 1; }
          }
          ctx.setLineDash([]); ctx.restore(); ctx.globalCompositeOperation = 'source-over';
        }
        name(ctx, prog(t, 30, 33), prog(t, 43.2, 45.2), f);
        accent(ctx, t); intro(ctx, t, 0.6);
      };
    }
    if (screen === 'ceiling') return (ctx, f) => { const t = f / 30; scenes(ctx, t, f); vortex(ctx, t, f); accent(ctx, t, 0.9); intro(ctx, t, 0.6); };
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f); vortex(ctx, t, f);
      const al = win(t, 2.5, 44, 2, 2.5);
      if (al > 0.003) for (const b of bigs) {           // ingredientes flotando por la pared, sin prisa
        const y = ((b.y - t * b.v) % (H + 160) + H + 160) % (H + 160) - 80;
        ctx.globalAlpha = al * 0.9; ctx.save(); ctx.translate(b.x + Math.sin(t * 0.4 + b.ph) * 24, y); ctx.rotate(t * b.rot * 0.5 + b.ph); ctx.drawImage(b.spr, -b.s / 2, -b.s / 2, b.s, b.s); ctx.restore();
      }
      ctx.globalAlpha = 1; accent(ctx, t, 0.9); intro(ctx, t, 0.6);
    };
  }
  return { DURATION, PIECE, score, make };
}

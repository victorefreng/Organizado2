/**
 * SH-008 · PIZZA EXPERIENCE — una pizza de otro universo.
 *
 * La masa gira y se abre, cae el queso, los ingredientes llegan volando y se
 * colocan solos, la pizza entra al horno (que está en la pared lateral) y sale
 * terminada.
 */
import { W, H, TAU, makeRng, glow, createCanvas } from '../lib.mjs';
import { blurred } from '../tex.mjs';
import { motes } from '../layers.mjs';
import { ss, prog, eo, back, win } from './kit.mjs';
import { world, sceneStack, landing, intro, flash, ring, voidStage, P } from './stage.mjs';
import { fire, smoke } from './food.mjs';

export const DURATION = 50;
const DONE = 43;
export const PIECE = {
  id: 'SH-008', name: 'PIZZA EXPERIENCE', exitAmbient: 'AMBIENT-003', timecode: { offset: '08:00:00:00', show: 0 },
  description: 'La llegada de la pizza: la masa gira y se extiende, cae el queso, los ingredientes vuelan, la pizza se arma sola, entra al horno y sale terminada.',
  notes: 'MAIN lleva la preparacion vista desde arriba; CEILING los ingredientes pasando por encima; SIDE el horno. Cuando la pizza sale de MAIN hacia la derecha es que esta entrando al horno de la pared lateral. Al terminar queda luz comoda para comer, con JUNGLE de fondo.',
  cues: [
    { atMs: 0, label: '001 LA COCINA', tipo: 'AMBIENT_FADE', momento: 'entra el ritmo', accion: 'harina flotando en la oscuridad', halo_par: '3x PAR dorado al 20%', color: '#FFC27A', intensidad: 0.2, fade_s: 2 },
    { atMs: 2000, label: '002 LA MASA', tipo: 'COLOR_TRANSITION', momento: 'el ritmo se abre', accion: 'la masa gira y se extiende; entra la salsa', halo_par: '3x PAR ambar al 28%', color: '#FFB060', intensidad: 0.28, fade_s: 6 },
    { atMs: 16000, label: '003 EL QUESO', tipo: 'MUSICAL_BUMP', momento: 'entra la melodia', accion: 'el queso cae despacio', halo_par: '3x PAR dorado, pulso a 36%', color: '#FFE2A8', intensidad: 0.36, fade_s: 0.5 },
    { atMs: 24000, label: '004 LOS INGREDIENTES', tipo: 'MUSICAL_BUMP', momento: 'pulsos', accion: 'los ingredientes llegan volando y se colocan', halo_par: '3x PAR pulsos a 40%, rojo y verde calidos', color: '#FF8A5A', intensidad: 0.4, fade_s: 0.4 },
    { atMs: 34000, label: '005 AL HORNO', tipo: 'RISER', momento: 'subida de 8 s', accion: 'la pizza entra al horno entre destellos', halo_par: '3x PAR de ambar a naranja fuego, de 30% a 60%', color: '#FF7A2A', intensidad: 0.6, fade_s: 8 },
    { atMs: 43000, label: '006 LISTA', tipo: 'FINAL_HIT', momento: 'acento final', accion: 'la pizza sale terminada', halo_par: '3x PAR dorado al 80%', flasher: '1 destello unico', color: '#FFD08A', intensidad: 0.8, fade_s: 0.15 },
    { atMs: 45500, label: '007 ATERRIZAJE', tipo: 'OUTRO_FADE', momento: 'acorde de JUNGLE', accion: 'luz comoda para comer: look de reposo de JUNGLE', halo_par: '3x PAR #2F6B4F al 20% con ambar calido', color: '#2F6B4F', intensidad: 0.2, fade_s: 4 }
  ]
};

export function score(m) {
  const C = [130.81, 196, 261.63, 329.63], Am = [110, 164.81, 220, 261.63], F = [87.31, 174.61, 220, 261.63], G = [98, 196, 246.94, 293.66], B = 60 / 112;
  m.intro(0.18);
  [[0, C], [8.6, Am], [17.2, F], [25.8, G], [34.4, C]].forEach(([t, ch]) => { m.pad(t, t + 8.6, ch, 0.03, 1.5, 2, 0.34); m.arp(Math.max(2, t), t + 8.6, [ch[1], ch[2], ch[3], ch[2] * 2, ch[3], ch[2]], B / 2, 0.05, 0.22, 'pluck'); });
  for (let t = 2; t < DONE; t += B) { m.tick(t, 0.06, 420, 40); m.hat(t + B / 2, 0.045); if (Math.round((t - 2) / B) % 2 === 0) m.thump(t, 92, 58, 0.14, 0.2); }
  m.motif(16.2, B, 523.25, 0.07, 9, 1.4);
  for (let k = 0; k < 21; k++) m.sweep(24 + k * 0.46, 24.5 + k * 0.46, 1800, 500, 0.08, 0.2 + 0.6 * ((k * 0.37) % 1), 0.5, 1);
  m.bed(34, DONE, 700, 0.03, 3, 1, 0.9);                        // el horno
  m.riser(38, DONE, 0.24); m.thump(DONE, 120, 54, 0.42, 0.8); m.bloom(DONE, 0.4, 2.2); C.forEach((f) => m.bell(DONE + 0.02, f * 2, 0.09, 3));
  m.land('jungle', 44.8);
}

/** Los ingredientes, vistos desde arriba. */
function sprites() {
  const r = makeRng('pizza');
  const disc = (size, fn, blur = 1) => blurred(size, size, blur, (g) => { g.translate(size / 2, size / 2); fn(g, size / 2); });
  const dough = disc(600, (g, R) => {
    const gr = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 0.96); gr.addColorStop(0, '#F3DDB0'); gr.addColorStop(0.8, '#E9CB92'); gr.addColorStop(0.93, '#D9A860'); gr.addColorStop(1, '#B98440');
    g.fillStyle = gr; g.beginPath();
    for (let i = 0; i <= 80; i++) { const a = (i / 80) * TAU, rr = R * (0.93 + 0.025 * Math.sin(a * 7) + 0.015 * Math.sin(a * 13 + 1)); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.fill();
  }, 1.5);
  const sauce = disc(600, (g, R) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.8); gr.addColorStop(0, '#D4421E'); gr.addColorStop(0.85, '#B93318'); gr.addColorStop(1, 'rgba(160,40,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R * 0.8, 0, TAU); g.fill(); }, 2);
  const cheese = disc(600, (g, R) => { for (let i = 0; i < 130; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.74, s = r.range(26, 64); const gr = g.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0, Math.cos(a) * d, Math.sin(a) * d, s); gr.addColorStop(0, 'rgba(255,244,196,0.95)'); gr.addColorStop(0.7, 'rgba(255,226,150,0.75)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, s, 0, TAU); g.fill(); } }, 2);
  const toast = disc(600, (g, R) => { for (let i = 0; i < 46; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.86, s = r.range(8, 24); g.fillStyle = `rgba(150,80,20,${r.range(0.2, 0.5)})`; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, s, 0, TAU); g.fill(); } }, 4);
  const pep = disc(96, (g, R) => { const gr = g.createRadialGradient(-8, -8, 2, 0, 0, R * 0.9); gr.addColorStop(0, '#D8492C'); gr.addColorStop(1, '#8E1E12'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R * 0.88, 0, TAU); g.fill(); g.fillStyle = 'rgba(70,10,6,0.5)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(r.range(-22, 22), r.range(-22, 22), r.range(3, 6), 0, TAU); g.fill(); } }, 0.8);
  const basil = disc(96, (g, R) => { const gr = g.createLinearGradient(-R, 0, R, 0); gr.addColorStop(0, '#2E7A3C'); gr.addColorStop(1, '#6FC46A'); g.fillStyle = gr; g.beginPath(); g.moveTo(-R * 0.9, 0); g.bezierCurveTo(-R * 0.3, -R * 0.62, R * 0.5, -R * 0.5, R * 0.9, 0); g.bezierCurveTo(R * 0.5, R * 0.5, -R * 0.3, R * 0.62, -R * 0.9, 0); g.fill(); g.strokeStyle = 'rgba(20,70,30,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-R * 0.86, 0); g.lineTo(R * 0.86, 0); g.stroke(); }, 0.8);
  const olive = disc(64, (g, R) => { g.fillStyle = '#1C1410'; g.beginPath(); g.arc(0, 0, R * 0.82, 0, TAU); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 0, R * 0.34, 0, TAU); g.fill(); }, 0.8);
  const shred = blurred(48, 16, 0.8, (g) => { g.fillStyle = '#FFF0B8'; g.beginPath(); g.ellipse(24, 8, 22, 5, 0, 0, TAU); g.fill(); });
  return { dough, sauce, cheese, toast, pep, basil, olive, shred };
}

export async function make(screen) {
  const jungle = await world('jungle', screen), S = sprites();
  const bg = voidStage('#3E1E0A', '#170B05', '#040302', 0.5, 0.52);
  const flour = motes({ n: 150, seed: 'sh8-harina-' + screen, color: '#FFF0D8', size: [3, 9], alpha: [0.12, 0.6], amp: [10, 50] });
  const warm = glow(1100, '#FFB060', { power: 2.2 });
  const r = makeRng('sh8-' + screen);
  const tops = [...Array.from({ length: 10 }, () => ['pep', 60]), ...Array.from({ length: 7 }, () => ['basil', 58]), ...Array.from({ length: 8 }, () => ['olive', 34])].map(([k, s], i) => {
    const a = r() * TAU, d = Math.sqrt(r()) * 150, from = r() * TAU;
    return { k, s: s * r.range(0.85, 1.15), tx: Math.cos(a) * d, ty: Math.sin(a) * d, fx: Math.cos(from) * 900, fy: Math.sin(from) * 620, at: 24 + (i / 25) * 8.6, rot: r() * TAU, spin: r.range(-9, 9) };
  });
  const shreds = Array.from({ length: 70 }, () => ({ x: r.range(-190, 190), ph: r(), rot: r() * TAU, sp: r.range(0.16, 0.26), s: r.range(0.7, 1.3) }));
  const stage = (ctx, t, f) => { ctx.drawImage(bg, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.22 + 0.3 * ss(34, DONE, t); ctx.drawImage(warm, W / 2 - 550, H / 2 - 550); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; flour(ctx, f % P, P); };
  const scenes = sceneStack([{ at: 0, fade: 0, draw: stage }, { at: 45.6, fade: 4.2, draw: landing(jungle, DURATION) }]);
  const hit = (ctx, t, s = 1) => { flash(ctx, t, DONE + 0.05, 0.1, 2.6, 0.85 * s, 0.5, 0.5, '#FFE2A8'); const k = prog(t, DONE, DONE + 2.4), rad = eo(k) * 1000; ring(ctx, W / 2, H / 2, rad, rad * 0.62, (1 - k) * 0.8 * s, 5); };
  /** La pizza, con lo que lleve puesto en ese momento. `baked` la tuesta. */
  const pizza = (ctx, t, f, cx, cy, sc, baked, alpha = 1) => {
    const grow = eo(prog(t, 2, 10)), R = (60 + 250 * grow) * sc, rot = t * (2.6 * (1 - ss(6, 14, t)) + 0.12);
    ctx.globalAlpha = alpha;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.drawImage(S.dough, -R, -R, R * 2, R * 2);
    const sk = eo(prog(t, 10, 16)); if (sk > 0) { ctx.globalAlpha = alpha * Math.min(1, sk * 2); ctx.drawImage(S.sauce, -R * sk, -R * sk, R * 2 * sk, R * 2 * sk); }
    const ck = ss(17, 25, t); if (ck > 0) { ctx.globalAlpha = alpha * ck; ctx.drawImage(S.cheese, -R, -R, R * 2, R * 2); }
    ctx.globalAlpha = alpha;
    for (const p of tops) {
      const k = prog(t, p.at, p.at + 1.3); if (k <= 0) continue;
      const e = eo(k), q = 1 / sc;                       // llegan volando desde fuera y se posan con un pequeño bote
      const x = (p.tx + (p.fx * Math.cos(-rot) - p.fy * Math.sin(-rot)) * (1 - e) * q) * (R / 310), y = (p.ty + (p.fx * Math.sin(-rot) + p.fy * Math.cos(-rot)) * (1 - e) * q) * (R / 310);
      const s = p.s * (R / 310) * (1 + 0.5 * (1 - e)) * (k < 1 ? 1 : 1) * (0.9 + 0.1 * back(Math.min(1, k * 1.2)));
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + p.spin * (1 - e)); ctx.drawImage(S[p.k], -s / 2, -s / 2, s, s); ctx.restore();
    }
    if (baked > 0) { ctx.globalAlpha = alpha * baked; ctx.drawImage(S.toast, -R, -R, R * 2, R * 2); ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,150,40,${0.4 * baked})`; ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore(); ctx.globalAlpha = 1;
  };

  if (screen === 'main') {
    const steam = smoke('sh8-vapor', 12, '#FFF4E0');
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f);
      // 0:34 sale por la derecha hacia el horno · 0:42 vuelve, ya hecha
      const go = eo(prog(t, 34, 37.5)), back2 = eo(prog(t, 41.6, 43.4)), away = go * (1 - back2), out = 1 - ss(45.2, 47.6, t);
      const cx = W / 2 + away * (W * 0.78), sc = 0.82 * (1 - 0.25 * away);
      if (t > 1.6 && out > 0.003) {
        ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.3 * out; ctx.drawImage(warm, cx - 430, H / 2 - 430, 860, 860); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        pizza(ctx, t, f, cx, H * 0.5, sc, t > 41 ? 1 : 0, ss(1.6, 2.6, t) * out);
      }
      // el queso cayendo: tiras que bajan girando y se quedan
      const ca = win(t, 16, 25.5, 0.6, 1.2);
      if (ca > 0.003) for (const s of shreds) { const l = (t * s.sp + s.ph) % 1, y = -40 + l * (H * 0.5 + 40); ctx.globalAlpha = ca * (1 - ss(0.8, 1, l)); ctx.save(); ctx.translate(W / 2 + s.x + Math.sin(l * 6 + s.ph * 9) * 20, y); ctx.rotate(s.rot + l * 5); ctx.drawImage(S.shred, -24 * s.s, -8 * s.s, 48 * s.s, 16 * s.s); ctx.restore(); }
      ctx.globalAlpha = 1;
      steam(ctx, W / 2, H * 0.42, 300, 300, t, win(t, 43.2, 47.5, 0.6, 2));
      hit(ctx, t); intro(ctx, t, 0.6);
    };
  }
  if (screen === 'ceiling') {
    const fly = Array.from({ length: 34 }, (_, i) => ({ k: ['pep', 'basil', 'olive', 'shred'][i % 4], at: 15 + r() * 21, y0: r(), dir: r() < 0.5 ? -1 : 1, s: r.range(60, 150), spin: r.range(-4, 4), arc: r.range(-160, 160) }));
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f);
      for (const p of fly) { const k = prog(t, p.at, p.at + 3.4); if (k <= 0 || k >= 1) continue; const x = p.dir > 0 ? -160 + k * (W + 320) : W + 160 - k * (W + 320), y = p.y0 * H + Math.sin(Math.PI * k) * p.arc, w = p.k === 'shred' ? p.s : p.s, h = p.k === 'shred' ? p.s / 3 : p.s; ctx.save(); ctx.translate(x, y); ctx.rotate(k * p.spin); ctx.drawImage(S[p.k], -w / 2, -h / 2, w, h); ctx.restore(); }
      hit(ctx, t, 0.9); intro(ctx, t, 0.6);
    };
  }
  // lateral: el horno de leña
  const blaze = fire('sh8-fuego', 18), sm = smoke('sh8-humo', 10, '#C8B8A8');
  const oven = blurred(W, H, 1.2, (g) => {
    g.fillStyle = '#160C08'; g.fillRect(0, 0, W, H);
    for (let row = 0; row < 16; row++) for (let col = -1; col < 18; col++) { const x = col * 78 + (row % 2) * 39, y = row * 46; g.fillStyle = `rgb(${46 + ((row * 7 + col * 13) % 22)},${22 + ((row * 5 + col * 3) % 10)},${14 + ((row + col) % 6)})`; g.fillRect(x + 2, y + 2, 74, 42); }
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(W * 0.24, H * 0.92); g.lineTo(W * 0.24, H * 0.52); g.bezierCurveTo(W * 0.24, H * 0.1, W * 0.76, H * 0.1, W * 0.76, H * 0.52); g.lineTo(W * 0.76, H * 0.92); g.fill();
  });
  const mouth = voidStage('#FF8A2A', '#6A1E06', '#120603', 0.5, 0.74);
  return (ctx, f) => {
    const t = f / 30;
    const lit = 0.35 + 0.65 * ss(30, 41, t) * (1 - 0.4 * ss(DONE, 46, t)), show = win(t, 0.6, 46.2, 3, 2.4);
    if (show < 1) scenes(ctx, t, f);
    if (show > 0.003) {
      ctx.globalAlpha = show;
      ctx.drawImage(mouth, 0, 0);
      ctx.fillStyle = `rgba(8,3,2,${1 - lit})`; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      blaze(ctx, W / 2, H * 0.9, W * 0.5, H * 0.56, f, lit * show);
      // la pizza dentro, vista casi de canto
      const inside = win(t, 36.5, 42.4, 1.2, 1);
      if (inside > 0.003) { ctx.save(); ctx.translate(W / 2 - (1 - eo(prog(t, 36.5, 38.5))) * W * 0.6 + eo(prog(t, 41.2, 42.4)) * -W * 0.6, H * 0.8); ctx.scale(1, 0.3); pizza(ctx, 33.9, f, 0, 0, 0.62, ss(38, 41.5, t), inside * show); ctx.restore(); }
      ctx.globalAlpha = show; ctx.drawImage(oven, 0, 0);
      ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,130,40,${0.34 * lit})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      sm(ctx, W / 2, H * 0.24, 360, 260, t, 0.8 * lit * show);
      if (show < 1) { ctx.globalAlpha = 1; }
    }
    if (t >= 45.6) { ctx.globalAlpha = ss(45.6, 49.8, t); landing(jungle, DURATION)(ctx, t, f); ctx.globalAlpha = 1; }
    hit(ctx, t, 0.9); intro(ctx, t, 0.6);
  };
}

/**
 * SH-004 · DESTINATION UNKNOWN — nuestra próxima aventura.
 *
 * Un avión estilizado rueda por una pista entre nubes, despega, cruza una
 * tormenta de partículas, sale a un amanecer, sobrevuela paisajes y se vuelve
 * un punto de luz hacia el horizonte. No hay destino real: es una promesa.
 */
import { W, H, TAU, makeRng, glow, createCanvas } from '../lib.mjs';
import { blurred, flareSprite } from '../tex.mjs';
import { ss, prog, eo, win } from './kit.mjs';
import { world, sceneStack, worldScene, landing, intro, flash, voidStage } from './stage.mjs';

export const DURATION = 60;
const SUN = 34;
export const PIECE = {
  id: 'SH-004', name: 'DESTINATION UNKNOWN', exitAmbient: 'AMBIENT-001', timecode: { offset: '04:00:00:00', show: 0 },
  description: 'Un viaje simbolico: un avion estilizado despega entre nubes, cruza una tormenta de particulas, sale a un amanecer y se vuelve un punto de luz hacia el horizonte.',
  notes: 'No hay destino real ni ningun texto: es un viaje simbolico hacia las aventuras que les esperan, y deja espacio para una sorpresa fisica despues. El avion va de izquierda a derecha en MAIN; en CEILING se ve pasar su silueta desde abajo durante el despegue.',
  cues: [
    { atMs: 0, label: '001 LA PISTA', tipo: 'AMBIENT_FADE', momento: 'ambiente de aeropuerto', accion: 'el avion rueda por una pista entre nubes', halo_par: '3x PAR azul atardecer al 18%', color: '#5A6FB0', intensidad: 0.18, fade_s: 3 },
    { atMs: 12000, label: '002 DESPEGUE', tipo: 'RISER', momento: 'los motores suben', accion: 'el avion levanta el morro y despega', halo_par: '3x PAR de 18% a 40%, blanco frio', color: '#CFE0FF', intensidad: 0.4, fade_s: 7 },
    { atMs: 20000, label: '003 LA TORMENTA', tipo: 'COLOR_TRANSITION', momento: 'crescendo', accion: 'cruza una tormenta de particulas', halo_par: '3x PAR azul gris al 30%, pulsos lentos', color: '#4A5A8C', intensidad: 0.3, fade_s: 4 },
    { atMs: 34000, label: '004 EL AMANECER', tipo: 'REVEAL', momento: 'acorde abierto', accion: 'sale a un amanecer dorado', halo_par: '3x PAR dorado al 60%, cae a 40%', color: '#FFD9A0', intensidad: 0.6, fade_s: 1.5 },
    { atMs: 46000, label: '005 HACIA EL HORIZONTE', tipo: 'COLOR_TRANSITION', momento: 'la musica se aleja', accion: 'el avion se vuelve un punto de luz', halo_par: '3x PAR dorado y lavanda al 28%', color: '#C7A6D2', intensidad: 0.28, fade_s: 8 },
    { atMs: 54000, label: '006 ATERRIZAJE', tipo: 'OUTRO_FADE', momento: 'acorde de CLOUDS', accion: 'look de reposo de CLOUDS', halo_par: '3x PAR #FFD9A0 al 24%', color: '#FFD9A0', intensidad: 0.24, fade_s: 5 }
  ]
};

export function score(m) {
  const D = [146.83, 220, 293.66, 369.99], Bm = [123.47, 185, 246.94, 293.66], G = [98, 196, 246.94, 293.66], A = [110, 164.81, 220, 277.18];
  m.bed(0, 14, 320, 0.03, 1.5, 4, 0.2);                            // la terminal
  m.bell(1.0, 659.26, 0.07, 1.6); m.bell(1.5, 523.25, 0.07, 2);    // el aviso de megafonía, sin palabras
  m.sweep(4, 20, 90, 520, 0.2, 0.4, 0.6, 0.7, 0.4);                // los motores
  m.pad(6, 20, D, 0.03, 4, 3, 0.3); m.arp(8, 20, [D[1], D[2], D[3], D[2] * 2], 0.5, 0.04, 0.5, 'pluck');
  m.pad(20, SUN, Bm, 0.04, 2, 1, 0.42); m.pad(27, SUN, G, 0.03, 2, 1, 0.42);
  for (let t = 20; t < SUN; t += 0.5) m.thump(t, 96, 58, 0.12 + 0.14 * m.ss(20, SUN, t), 0.22);
  m.arp(20, SUN, [246.94, 293.66, 369.99, 493.88], 0.25, 0.045, 0.2, 'pluck'); m.bed(20, SUN, 1400, 0.03, 2, 1, 0.8);
  m.riser(28, SUN, 0.28); m.thump(SUN, 120, 54, 0.4, 0.9); m.bloom(SUN, 0.4, 2.6);
  m.pad(SUN, 54, D, 0.045, 0.3, 4, 0.38); m.pad(42, 54, A, 0.03, 3, 4, 0.3);
  m.motif(SUN + 0.3, 0.95, 587.33, 0.08, 9, 2.6); m.arp(SUN + 9, 52, [D[1], D[2], D[3], D[2] * 2], 0.5, 0.035, 0.7);
  m.sparkle(46, 54, 30, 1174.66, 0.016);
  m.land('clouds', 52.5);
}

function planeSide() {
  return blurred(560, 220, 0.9, (g) => {
    const body = g.createLinearGradient(0, 70, 0, 130); body.addColorStop(0, '#FFFFFF'); body.addColorStop(0.55, '#FFE9C4'); body.addColorStop(1, '#C99A5A');
    g.fillStyle = '#E4C48A'; g.beginPath(); g.moveTo(74, 88); g.lineTo(34, 24); g.lineTo(84, 24); g.lineTo(150, 86); g.fill();          // deriva
    g.beginPath(); g.moveTo(64, 104); g.lineTo(22, 134); g.lineTo(60, 134); g.lineTo(116, 106); g.fill();                              // estabilizador
    g.fillStyle = body; g.beginPath(); g.moveTo(540, 106); g.bezierCurveTo(506, 84, 452, 80, 390, 80); g.lineTo(76, 84); g.quadraticCurveTo(30, 86, 24, 98); g.lineTo(66, 120); g.lineTo(390, 126); g.bezierCurveTo(462, 126, 516, 120, 540, 106); g.fill();
    g.fillStyle = '#D9B273'; g.beginPath(); g.moveTo(276, 112); g.lineTo(176, 190); g.lineTo(226, 190); g.lineTo(366, 114); g.fill();   // ala
    g.fillStyle = '#B98A4A'; g.beginPath(); g.ellipse(262, 150, 30, 11, -0.6, 0, TAU); g.fill();                                       // motor
    g.fillStyle = 'rgba(70,90,150,0.85)'; for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(150 + i * 20, 98, 3.2, 0, TAU); g.fill(); }
    g.beginPath(); g.moveTo(494, 98); g.lineTo(520, 104); g.lineTo(500, 108); g.lineTo(480, 104); g.fill();                             // cabina
  });
}
function planeBelow() {
  return blurred(520, 520, 4, (g) => {
    g.translate(260, 260); g.fillStyle = '#1A1E3A';
    g.beginPath(); g.ellipse(0, 0, 230, 22, 0, 0, TAU); g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(40, s * 14); g.lineTo(-60, s * 230); g.lineTo(-104, s * 230); g.lineTo(-40, s * 14); g.fill(); g.beginPath(); g.moveTo(-180, s * 8); g.lineTo(-222, s * 84); g.lineTo(-242, s * 84); g.lineTo(-214, s * 8); g.fill(); }
  });
}

export async function make(screen) {
  const clouds = await world('clouds', screen);
  const storm = voidStage('#465280', '#161C36', '#05060C', 0.5, 0.45);
  const r = makeRng('sh4-' + screen), puff = glow(700, '#0B0F22', { power: 1.3 }), lightPuff = glow(600, '#8E9CD0', { power: 1.8 }), dot = glow(32, '#DCE6FF', { power: 2 });
  const streaks = Array.from({ length: 130 }, () => ({ y: r() * H, ph: r(), sp: r.range(0.9, 2.2), len: r.range(60, 260), a: r.range(0.15, 0.7) }));
  const puffs = Array.from({ length: 12 }, () => ({ y: r() * H, ph: r(), sp: r.range(0.18, 0.4), s: r.range(500, 1000), light: r() < 0.3 }));
  // crestas lejanas que pasan por debajo, lavadas por la bruma
  const ridge = blurred(W * 2, 220, 2, (g) => { for (const [base, amp, col] of [[70, 40, 'rgba(150,130,190,0.55)'], [110, 50, 'rgba(110,96,160,0.7)'], [150, 44, 'rgba(70,60,120,0.85)']]) { const ph = [r() * TAU, r() * TAU]; g.fillStyle = col; g.beginPath(); g.moveTo(0, 220); for (let x = 0; x <= W * 2; x += 8) { const u = (x / (W * 2)) * TAU; g.lineTo(x, base - Math.abs(Math.sin(u * 4 + ph[0])) * amp - Math.sin(u * 11 + ph[1]) * amp * 0.25); } g.lineTo(W * 2, 220); g.fill(); } });
  const stormScene = (ctx, t) => {
    ctx.drawImage(storm, 0, 0);
    for (const p of puffs) { const x = W + p.s - ((t * p.sp + p.ph) % 1) * (W + p.s * 2); ctx.globalAlpha = p.light ? 0.35 : 0.8; if (p.light) ctx.globalCompositeOperation = 'screen'; ctx.drawImage(p.light ? lightPuff : puff, x - p.s / 2, p.y - p.s * 0.3, p.s, p.s * 0.6); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
  };
  const speed = (ctx, t, a) => {                     // la tormenta de partículas: estelas que pasan de largo
    if (a <= 0.003) return;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const s of streaks) { const x = W + 300 - ((t * s.sp + s.ph) % 1) * (W + 600), g = ctx.createLinearGradient(x, 0, x + s.len, 0); g.addColorStop(0, `rgba(220,230,255,${s.a * a})`); g.addColorStop(1, 'rgba(220,230,255,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, s.y); ctx.lineTo(x + s.len, s.y - 6); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
  };
  const dusk = worldScene(clouds, { dim: 0.62 }), bright = worldScene(clouds);
  const scenes = sceneStack([{ at: 0, fade: 0, draw: dusk }, { at: 19.5, fade: 3, draw: (ctx, t) => stormScene(ctx, t) }, { at: SUN - 0.2, fade: 1.4, draw: bright }, { at: 54.2, fade: 4.4, draw: landing(clouds, DURATION) }]);
  const sunrise = (ctx, t, s = 1) => flash(ctx, t, SUN + 0.05, 0.25, 3.2, 0.9 * s, 0.6, 0.6, '#FFE9C2');
  const stormA = (t) => win(t, 19.5, SUN + 0.6, 2, 1.2);

  if (screen === 'main') {
    const plane = planeSide(), glowP = glow(700, '#FFE2B0', { power: 2.3 }), fl = flareSprite(256, '#FFE9B0');
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f);
      // la pista: una franja oscura con balizas que pasan cada vez más deprisa
      const ra = 1 - ss(13, 19.5, t);
      if (ra > 0.003) {
        const drop = eo(prog(t, 12.5, 19.5)) * H * 0.5, y0 = H * 0.76 + drop, off = 46 * t * t;
        ctx.globalAlpha = ra; ctx.fillStyle = '#0A0C18'; ctx.fillRect(0, y0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = -1; i < 9; i++) ctx.fillRect(((i * 190 - off) % (W + 190) + W + 190) % (W + 190) - 100, y0 + 74, 90, 6);
        ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 16; i++) { const x = ((i * 96 - off * 1.25) % (W + 96) + W + 96) % (W + 96) - 30; ctx.drawImage(dot, x - 13, y0 + 4, 26, 26); ctx.drawImage(dot, x - 16, y0 + 150, 32, 32); }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
      const ma = win(t, SUN + 1, 55, 3, 3);          // paisajes pasando por debajo
      if (ma > 0.003) { ctx.globalAlpha = ma * 0.9; const x = -((t * 26) % (W * 2)); ctx.drawImage(ridge, x, H - 200); ctx.drawImage(ridge, x + W * 2, H - 200); ctx.globalAlpha = 1; }
      speed(ctx, t, stormA(t));
      // el avión
      const up = eo(prog(t, 12, 19.5)), far = eo(prog(t, 46, 53.5)), shake = stormA(t) * 5, pa = 1 - ss(52.6, 53.6, t);
      const x = W * (0.36 + 0.14 * up + 0.14 * far) + Math.sin(f * 1.7) * shake, y = H * (0.7 - 0.25 * up + 0.13 * far) + Math.sin(t * 0.9) * 8 * up + Math.cos(f * 2.3) * shake;
      const sc = (0.62 + 0.1 * up) * (1 - 0.95 * far), rot = -0.2 * Math.sin(Math.PI * prog(t, 12, 21)) + Math.sin(t * 0.5) * 0.03 * up;
      if (pa > 0.003) {
        ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.4 * pa * (1 - 0.6 * stormA(t)); ctx.drawImage(glowP, x - 350 * sc, y - 350 * sc, 700 * sc, 700 * sc); ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = pa; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.drawImage(plane, -280, -110); ctx.restore(); ctx.globalAlpha = 1;
      }
      const sa = win(t, 50.5, 56.5, 2.5, 2.5);       // …y se vuelve un punto de luz
      if (sa > 0.003) { const s = 150 * sa * (0.85 + 0.15 * Math.sin(f * 0.2)); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = sa; ctx.drawImage(fl, W * 0.64 - s / 2, H * 0.58 - s / 2, s, s); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      sunrise(ctx, t); intro(ctx, t, 0.45);
    };
  }
  if (screen === 'ceiling') {
    const below = planeBelow();
    return (ctx, f) => {
      const t = f / 30;
      scenes(ctx, t, f); speed(ctx, t, stormA(t));
      const k = prog(t, 13, 19.5);                    // la silueta del avión, pasando por encima en el despegue
      if (k > 0 && k < 1) { ctx.globalAlpha = 0.75 * Math.sin(Math.PI * k); ctx.save(); ctx.translate(-300 + k * (W + 600), H * (0.72 - 0.4 * k)); ctx.rotate(-0.24); ctx.scale(1 + 0.5 * k, 1 + 0.5 * k); ctx.drawImage(below, -260, -260); ctx.restore(); ctx.globalAlpha = 1; }
      sunrise(ctx, t, 0.9); intro(ctx, t, 0.45);
    };
  }
  const fl = flareSprite(256, '#FFE9B0');
  return (ctx, f) => {
    const t = f / 30;
    scenes(ctx, t, f);
    speed(ctx, t, Math.max(stormA(t), 0.55 * win(t, 5, 19.5, 5, 2)));
    const sa = win(t, 50.5, 56.5, 2.5, 2.5);
    if (sa > 0.003) { const s = 110 * sa; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = sa; ctx.drawImage(fl, W * 0.3 - s / 2, H * 0.52 - s / 2, s, s); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    sunrise(ctx, t, 0.9); intro(ctx, t, 0.45);
  };
}

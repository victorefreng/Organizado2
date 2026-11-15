/**
 * ANALIZADOR DE CLIPS — compara modelos de IA con números, no con opiniones.
 *
 * Mide lo que este proyecto necesita de verdad, que no es lo mismo que "se ve
 * bonito":
 *
 *   1. Formato        resolución, fps reales, duración, bitrate
 *   2. Movimiento     cuánto se mueve y si es deriva o viaje
 *   3. Estabilidad    parpadeo entre fotogramas, que en proyección grande mata
 *   4. Bucle          si cierra solo, con ida y vuelta, o no cierra
 *   5. Sombras        bandeo en los oscuros, que es donde revienta un proyector
 *   6. Paleta         si el color cae dentro del mundo al que va
 *
 * Uso:
 *   node tools/analyze-clip.mjs clip.mp4
 *   node tools/analyze-clip.mjs a.mp4 b.mp4 c.mp4 --compare
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const compare = process.argv.includes('--compare');

/** ffmpeg reparte lo que nos interesa entre stdout y stderr: hay que unir los dos. */
const ff = (args) => {
  try {
    const r = execFileSync('ffmpeg', ['-hide_banner', ...args],
      { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    return r.toString();
  } catch (e) {
    return (e.stdout?.toString() || '') + '\n' + (e.stderr?.toString() || '');
  }
};
/** Variante que SIEMPRE devuelve stdout + stderr, aunque ffmpeg termine bien. */
const ffBoth = (args) => {
  const { execFileSync: ex } = { execFileSync };
  try {
    const out = ex('bash', ['-c',
      'ffmpeg -hide_banner ' + args.map((a) => `'${String(a).replace(/'/g, "'\\''")}'`).join(' ') + ' 2>&1'],
      { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    return out.toString();
  } catch (e) { return (e.stdout?.toString() || '') + (e.stderr?.toString() || ''); }
};

function probe(f) {
  const o = execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'stream=width,height,r_frame_rate,avg_frame_rate,bit_rate,nb_frames,pix_fmt,codec_name:format=duration,bit_rate',
    '-of', 'default=nw=1', f]).toString();
  const g = (k) => (o.match(new RegExp('^' + k + '=([^\\n]+)', 'm')) || [])[1];
  const fr = (g('r_frame_rate') || '0/1').split('/').map(Number);
  return {
    width: +g('width'), height: +g('height'),
    fps: fr[1] ? fr[0] / fr[1] : 0,
    duration: parseFloat(g('duration')) || 0,
    bitrate: Math.round((parseInt(o.match(/^bit_rate=(\d+)/m)?.[1] || '0', 10)) / 1000),
    pixFmt: g('pix_fmt'), codec: g('codec_name')
  };
}

/** Diferencia media entre fotogramas consecutivos → cuánto se mueve. */
function motion(f) {
  const out = ff(['-i', f, '-vf', 'scale=320:-2,tblend=all_mode=difference,signalstats,metadata=print:file=-:key=lavfi.signalstats.YAVG',
    '-f', 'null', '-']);
  const vals = [...out.matchAll(/lavfi\.signalstats\.YAVG=([\d.]+)/g)].map((m) => parseFloat(m[1]));
  if (!vals.length) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  const sorted = [...vals].sort((a, b) => a - b);
  return {
    mean,
    sd: Math.sqrt(variance),
    p95: sorted[Math.floor(sorted.length * 0.95)],
    spikes: vals.filter((v) => v > mean * 3).length,   // cortes o parpadeos
    frames: vals.length
  };
}

/** Estadísticas de luma y saturación por fotograma. */
function stats(f) {
  const out = ff(['-i', f, '-vf', 'scale=320:-2,signalstats,metadata=print:file=-',
    '-f', 'null', '-']);
  const grab = (key) => [...out.matchAll(new RegExp(`lavfi\\.signalstats\\.${key}=([\\d.]+)`, 'g'))]
    .map((m) => parseFloat(m[1]));
  const y = grab('YAVG'), sat = grab('SATAVG'), hue = grab('HUEAVG'), ylow = grab('YLOW');
  const avg = (a) => (a.length ? a.reduce((x, b) => x + b, 0) / a.length : 0);
  return { yavg: avg(y), satavg: avg(sat), hueavg: avg(hue), ylow: avg(ylow) };
}

/** Calidad del enlace del bucle: directo y con ida y vuelta. */
function loopQuality(f, dur) {
  const dir = mkdtempSync(join(tmpdir(), 'loop-'));
  try {
    ff(['-y', '-i', f, '-vf', 'select=eq(n\\,0),scale=320:-2', '-frames:v', '1', join(dir, 'first.png')]);
    ff(['-y', '-sseof', '-0.06', '-i', f, '-vf', 'scale=320:-2', '-frames:v', '1', join(dir, 'last.png')]);
    const out = ffBoth(['-i', join(dir, 'first.png'), '-i', join(dir, 'last.png'),
      '-filter_complex', 'ssim', '-f', 'null', '-']);
    const m = out.match(/All:([\d.]+)/);
    return m ? parseFloat(m[1]) : null;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function analyze(f) {
  if (!existsSync(f)) { console.error(`No existe: ${f}`); return null; }
  const p = probe(f);
  const m = motion(f);
  const s = stats(f);
  const loop = loopQuality(f, p.duration);

  // ── veredictos ──
  const v = {};

  // Movimiento: deriva o viaje. Un clip de mundo necesita deriva.
  if (!m) v.movimiento = ['?', 'no medible'];
  else if (m.mean < 1.2) v.movimiento = ['deriva muy lenta', 'ideal para mundo en bucle'];
  else if (m.mean < 3.5) v.movimiento = ['deriva', 'sirve para mundo'];
  else if (m.mean < 8) v.movimiento = ['movimiento medio', 'sirve para capítulo, dudoso para bucle'];
  else v.movimiento = ['viaje', 'NO sirve para bucle salvo con ida y vuelta'];

  // Estabilidad: picos de diferencia = parpadeo o cortes
  const spikeRatio = m ? m.spikes / m.frames : 1;
  if (spikeRatio < 0.01) v.estabilidad = ['estable', 'sin parpadeo'];
  else if (spikeRatio < 0.04) v.estabilidad = ['aceptable', 'algún salto aislado'];
  else v.estabilidad = ['INESTABLE', 'parpadea o tiene cortes internos'];

  // Bucle
  if (loop === null) v.bucle = ['?', ''];
  else if (loop > 0.97) v.bucle = ['cierra solo', 'bucle directo'];
  else if (loop > 0.85) v.bucle = ['casi cierra', 'con solape corto queda perfecto'];
  else v.bucle = ['no cierra', 'hace falta ida y vuelta o solape largo'];

  // Sombras: YLOW alto en escena oscura sugiere negros levantados
  if (s.yavg < 60 && s.ylow > 18) v.sombras = ['negros levantados', 'se verá lavado en proyección'];
  else if (s.yavg < 60) v.sombras = ['negros limpios', ''];
  else v.sombras = ['escena clara', 'no aplica'];

  // Formato
  const fmtOk = p.width >= 1280 && Math.abs(p.fps - Math.round(p.fps)) < 0.01;
  v.formato = fmtOk ? ['correcto', ''] : ['revisar', `${p.width}x${p.height} @ ${p.fps.toFixed(2)} fps`];

  return { file: basename(f), p, m, s, loop, v };
}

// ─────────────────────────── salida ───────────────────────────

const results = files.map(analyze).filter(Boolean);

if (!results.length) {
  console.error('Uso: node tools/analyze-clip.mjs clip.mp4 [clip2.mp4 ...] [--compare]');
  process.exit(1);
}

if (!compare || results.length === 1) {
  for (const r of results) {
    console.log(`\n━━ ${r.file} ━━`);
    console.log(`  ${r.p.width}x${r.p.height} · ${r.p.fps.toFixed(2)} fps · ${r.p.duration.toFixed(2)}s · ${r.p.bitrate} kbps · ${r.p.codec} ${r.p.pixFmt}`);
    console.log('');
    for (const [k, [verdict, note]] of Object.entries(r.v)) {
      console.log(`  ${k.padEnd(12)} ${verdict.padEnd(22)} ${note}`);
    }
    if (r.m) {
      console.log('');
      console.log(`  movimiento medio ${r.m.mean.toFixed(2)} · pico ${r.m.p95.toFixed(2)} · picos bruscos ${r.m.spikes}/${r.m.frames}`);
    }
    console.log(`  luma media ${r.s.yavg.toFixed(1)} · saturación ${r.s.satavg.toFixed(1)} · enlace de bucle ${r.loop !== null ? (r.loop * 100).toFixed(1) + ' %' : '?'}`);
  }
} else {
  // tabla comparativa
  const col = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log('\n━━ COMPARATIVA ━━\n');
  console.log(col('clip', 26) + col('formato', 18) + col('movimiento', 20) + col('estabilidad', 14) + col('bucle', 16));
  console.log('─'.repeat(94));
  for (const r of results) {
    console.log(
      col(r.file, 26) +
      col(`${r.p.width}x${r.p.height} ${r.p.fps.toFixed(0)}fps`, 18) +
      col(r.v.movimiento[0], 20) +
      col(r.v.estabilidad[0], 14) +
      col(r.v.bucle[0], 16)
    );
  }
  console.log('');
  // puntuación orientada a lo que necesita el proyecto
  console.log('Puntuación para mundo en bucle (0-10):\n');
  const scored = results.map((r) => {
    let s = 0;
    if (r.m) s += r.m.mean < 1.2 ? 3 : r.m.mean < 3.5 ? 2.5 : r.m.mean < 8 ? 1 : 0;
    const spikeRatio = r.m ? r.m.spikes / r.m.frames : 1;
    s += spikeRatio < 0.01 ? 3 : spikeRatio < 0.04 ? 1.5 : 0;
    s += r.loop > 0.97 ? 2 : r.loop > 0.85 ? 1.5 : 0.5;  // la ida y vuelta salva casi todo
    s += r.p.width >= 1920 ? 2 : r.p.width >= 1280 ? 1.5 : 0.5;
    return { file: r.file, score: s };
  }).sort((a, b) => b.score - a.score);
  for (const s of scored) {
    const bar = '█'.repeat(Math.round(s.score)) + '░'.repeat(10 - Math.round(s.score));
    console.log(`  ${col(s.file, 26)} ${bar}  ${s.score.toFixed(1)}`);
  }
  console.log('\nLa puntuación mide aptitud para ESTE proyecto, no belleza.');
  console.log('Lo bonito lo juzgas tú; esto detecta lo que se rompe en proyección.');
}

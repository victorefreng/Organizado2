/**
 * VALIDADOR DE PAQUETES — aplica las reglas del Brief Maestro V3.2 §5.
 *
 * Es una comprobación PREVIA a la entrega: replica lo que hace el importador de
 * UNIVERSO CONTROL para que un paquete no llegue allí roto. El validador que
 * manda sigue siendo el suyo (`npm run validate` en C:\UNIVERSO\universo-control);
 * este existe para no entregar algo que ya sabemos que va a ser rechazado.
 *
 * Uso: node tools/validate-package.mjs dist/packages/AMBIENT-002
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, basename, join } from 'node:path';
import { CONTRACT, AMBIENTS } from './lib/contract.mjs';

const dir = resolve(process.argv[2] || '');
const errors = [];
const warnings = [];
const ok = [];
const E = (m) => errors.push(m);
const W = (m) => warnings.push(m);
const OK = (m) => ok.push(m);

function probe(file) {
  const raw = execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format',
    '-of', 'json', file]).toString();
  return JSON.parse(raw);
}

if (!existsSync(dir) || !statSync(dir).isDirectory()) {
  console.error(`✗ No existe la carpeta: ${dir}`);
  process.exit(2);
}

const id = basename(dir);
console.log(`\n━━ VALIDACIÓN · ${id} ━━`);

// ── nombre de carpeta ──
if (!CONTRACT.idPattern.test(id)) E(`El nombre de la carpeta "${id}" no cumple LETRAS-000.`);
else OK(`ID de carpeta ${id}`);

// ── experience.json ──
const expPath = join(dir, 'experience.json');
if (!existsSync(expPath)) { E('Falta experience.json.'); report(); }
let exp;
try { exp = JSON.parse(readFileSync(expPath, 'utf8')); }
catch (e) { E(`experience.json no es JSON válido: ${e.message}`); report(); }

if (exp.formatVersion !== CONTRACT.formatVersion) E(`formatVersion debe ser ${CONTRACT.formatVersion}, es ${exp.formatVersion}.`);
if (exp.id !== id) E(`id "${exp.id}" no coincide con la carpeta "${id}".`);
if (!['cinematic', 'ambient'].includes(exp.type)) E(`type debe ser cinematic o ambient, es "${exp.type}".`);
if (typeof exp.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(exp.version)) E('version debe ser semver, p. ej. "1.0.0".');
if (typeof exp.testMaterial !== 'boolean') E('testMaterial debe ser booleano.');
if (exp.frameRate !== CONTRACT.timecodeFps) E(`frameRate debe ser ${CONTRACT.timecodeFps}, es ${exp.frameRate}.`);

const isAmbient = exp.type === 'ambient';

// ── reglas por tipo ──
if (isAmbient) {
  if (exp.durationMs !== 0) E(`En un ambient durationMs debe ser 0, es ${exp.durationMs}.`);
  if (exp.exitAmbient) E('Un ambient no lleva exitAmbient.');
  if (Array.isArray(exp.cues) && exp.cues.length) E('Un ambient lleva cues vacío.');
  if (!isAmbient) {} else OK('Reglas de mundo (durationMs 0, sin exitAmbient, sin cues)');
} else {
  if (!(exp.durationMs > 0)) E('En un cinematic durationMs debe ser mayor que 0.');
  if (!AMBIENTS.includes(exp.exitAmbient)) E(`exitAmbient "${exp.exitAmbient}" no es un mundo declarado.`);
  if (!Array.isArray(exp.cues) || exp.cues.length === 0) W('cinematic sin cues: el operador no podrá saltar dentro de la pieza.');
  else {
    let prev = -1;
    for (const c of exp.cues) {
      if (typeof c.atMs !== 'number') { E(`Cue sin atMs numérico: ${JSON.stringify(c)}`); continue; }
      if (c.atMs < prev) E(`Cues desordenados en atMs=${c.atMs}.`);
      if (c.atMs > exp.durationMs) E(`Cue en ${c.atMs} ms fuera de la duración (${exp.durationMs} ms).`);
      if (!c.label) E(`Cue en ${c.atMs} ms sin label.`);
      prev = c.atMs;
    }
    OK(`${exp.cues.length} cues ordenados y dentro de la duración`);
  }
}

// ── transición ──
for (const k of ['in', 'out']) {
  const t = exp.transition?.[k];
  if (!t) { E(`Falta transition.${k}.`); continue; }
  if (!CONTRACT.transitions.includes(t.type)) E(`transition.${k}.type "${t.type}" no es válido.`);
  if (typeof t.ms !== 'number') E(`transition.${k}.ms debe ser numérico.`);
}

// ── media ──
const media = exp.media || {};
for (const s of CONTRACT.screens) {
  if (!media[s]) E(`media.${s} no declarado.`);
}
if (!media.audio) E('media.audio no declarado.');

const durations = {};
for (const s of CONTRACT.screens) {
  const f = join(dir, media[s] || `${s}.mp4`);
  if (!existsSync(f)) { E(`Falta el vídeo ${media[s] || s + '.mp4'}.`); continue; }
  let info;
  try { info = probe(f); } catch (e) { E(`No se puede leer ${basename(f)}: ${e.message}`); continue; }

  const v = info.streams.find((x) => x.codec_type === 'video');
  const a = info.streams.find((x) => x.codec_type === 'audio');
  if (!v) { E(`${basename(f)} no tiene pista de vídeo.`); continue; }
  if (a) E(`${basename(f)} lleva pista de audio; los vídeos van sin audio.`);

  if (v.codec_name !== CONTRACT.video.codec) E(`${basename(f)}: códec ${v.codec_name}, se espera ${CONTRACT.video.codec}.`);
  if (v.pix_fmt !== CONTRACT.video.pixelFormat) E(`${basename(f)}: pix_fmt ${v.pix_fmt}, se espera ${CONTRACT.video.pixelFormat}.`);
  if (v.width !== CONTRACT.video.width || v.height !== CONTRACT.video.height)
    W(`${basename(f)}: ${v.width}x${v.height} (el contrato arranca en ${CONTRACT.video.width}x${CONTRACT.video.height}).`);

  const [num, den] = (v.r_frame_rate || '0/1').split('/').map(Number);
  const fps = den ? num / den : 0;
  if (Math.abs(fps - CONTRACT.video.fps) > 0.001) E(`${basename(f)}: ${fps.toFixed(3)} fps, se exigen ${CONTRACT.video.fps} constantes.`);
  const avg = (v.avg_frame_rate || '0/1').split('/').map(Number);
  if (avg[1] && Math.abs(avg[0] / avg[1] - CONTRACT.video.fps) > 0.01)
    E(`${basename(f)}: fps medio ${(avg[0] / avg[1]).toFixed(3)}; parece variable.`);

  const dur = parseFloat(info.format.duration);
  durations[s] = dur;
  OK(`${basename(f)} ${v.width}x${v.height} ${fps} fps ${dur.toFixed(2)}s`);
}

// ── audio ──
const af = join(dir, media.audio || 'audio.wav');
let audioDur = 0;
if (!existsSync(af)) E('Falta audio.wav.');
else {
  const info = probe(af);
  const a = info.streams.find((x) => x.codec_type === 'audio');
  if (!a) E('audio.wav no tiene pista de audio.');
  else {
    if (+a.sample_rate !== CONTRACT.audio.sampleRate) E(`audio.wav a ${a.sample_rate} Hz, se exigen ${CONTRACT.audio.sampleRate}.`);
    if (+a.channels !== CONTRACT.audio.channels) E(`audio.wav con ${a.channels} canales, se exigen ${CONTRACT.audio.channels}.`);
    if (!/^pcm_s(16|24)le$/.test(a.codec_name)) E(`audio.wav con códec ${a.codec_name}, se exige PCM 16 o 24 bits.`);
    audioDur = parseFloat(info.format.duration);
    OK(`audio.wav ${a.sample_rate} Hz ${a.channels}ch ${a.codec_name} ${audioDur.toFixed(1)}s`);
  }
}

// ── duración declarada ──
if (!isAmbient) {
  const tol = CONTRACT.durationToleranceMs / 1000;
  for (const s of CONTRACT.screens) {
    if (durations[s] === undefined) continue;
    if (durations[s] + tol < exp.durationMs / 1000)
      E(`${s}.mp4 dura ${durations[s].toFixed(2)}s, menos que durationMs (${(exp.durationMs / 1000).toFixed(2)}s).`);
  }
  if (audioDur && audioDur + tol < exp.durationMs / 1000)
    E(`audio.wav dura ${audioDur.toFixed(2)}s, menos que durationMs.`);

  const vals = CONTRACT.screens.map((s) => durations[s]).filter((x) => x !== undefined);
  if (vals.length === 3 && Math.max(...vals) - Math.min(...vals) > tol)
    E(`Los tres vídeos de un SHOW deben durar exactamente lo mismo: ${vals.map((v) => v.toFixed(2)).join(' / ')}.`);
  else if (vals.length === 3) OK('Los tres vídeos duran lo mismo');
} else {
  const vals = CONTRACT.screens.map((s) => durations[s]).filter((x) => x !== undefined);
  if (vals.length === 3 && new Set(vals.map((v) => v.toFixed(1))).size === 1)
    W('Los tres bucles duran lo mismo: el conjunto se repetirá igual. El brief pide duraciones distintas.');
  else if (vals.length === 3) OK(`Bucles de duraciones distintas: ${vals.map((v) => v.toFixed(0) + 's').join(' / ')}`);
}

// ── extras ──
const ex = join(dir, 'extras');
if (!existsSync(ex)) W('No hay carpeta extras/. El sistema la ignora, pero el equipo la necesita.');
else {
  const files = readdirSync(ex);
  for (const want of ['cue-sheet.csv', 'licenses.md', 'production-notes.md']) {
    if (!files.includes(want)) W(`extras/ sin ${want}.`);
  }
  OK(`extras/ con ${files.length} archivos`);
}

report();

function report() {
  console.log('');
  for (const m of ok) console.log(`  ✓ ${m}`);
  for (const m of warnings) console.log(`  ⚠ ${m}`);
  for (const m of errors) console.log(`  ✗ ${m}`);
  console.log('');
  if (errors.length) {
    console.log(`RECHAZADO · ${errors.length} error(es), ${warnings.length} aviso(s)\n`);
    process.exit(1);
  }
  console.log(`VALIDATED · ${warnings.length} aviso(s)\n`);
  process.exit(0);
}

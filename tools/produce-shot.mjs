/**
 * PRODUCTOR DE PLANO.
 *
 * Convierte un clip de IA (Runway) más las planchas del motor en el paquete
 * audiovisual completo de UNIVERSO 1/1:
 *
 *   MAIN        · el clip de Runway graduado y con respiración 2.5D
 *   CEILING     · plancha propia: el océano visto desde abajo
 *   ENVIRONMENT · plancha propia: ambiente con peces y partículas
 *   TRÍPTICO    · las tres juntas, con audio, timecode y cues quemados
 *   CUES        · CSV + JSON + XML de grandMA2
 *
 * Decisión de dirección: CEILING y ENVIRONMENT NO se derivan del clip principal.
 * Son material propio graduado para casar en color y luz con el MAIN. La
 * relación entre las tres pantallas es tonal y rítmica, no geométrica: no se
 * finge una continuidad espacial que el clip de IA no puede sostener.
 *
 * Uso:
 *   node tools/produce-shot.mjs production/ocean-test/shot.json
 *   node tools/produce-shot.mjs ... --skip-plates     (si ya están renderizadas)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join, basename } from 'node:path';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes('--' + n);

const shotPath = resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'production/ocean-test/shot.json');
const shot = JSON.parse(readFileSync(shotPath, 'utf8'));
const base = dirname(shotPath);
const P = (rel) => join(base, rel);
const { width: W, height: H, fps: FPS, duration: DUR, crf, pixelFormat } = shot.format;

const ff = (args, label) => {
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    console.error(`\n✗ ffmpeg falló en: ${label}\n${e.stderr?.toString().slice(0, 1200)}`);
    process.exit(1);
  }
};
const probe = (f) => {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'stream=width,height,r_frame_rate,nb_frames:format=duration', '-of', 'default=nw=1', f]).toString();
  const g = (k) => (out.match(new RegExp(k + '=([^\\n]+)')) || [])[1];
  return { width: +g('width'), height: +g('height'), duration: +g('duration'), fps: g('r_frame_rate') };
};

mkdirSync(P('out'), { recursive: true });
console.log(`\n━━ ${shot.name} ━━ ${DUR}s · ${W}x${H} @ ${FPS} fps\n`);

// ───────────────────── 1. ¿clip real de Runway o sustituto? ─────────────────────

const runwayClip = P(shot.main.source);
const standIn = P(shot.main.standIn);
let mainSrc, usingReal;
if (existsSync(runwayClip)) {
  mainSrc = runwayClip; usingReal = true;
  console.log(`MAIN  ← clip de Runway: ${shot.main.source}`);
} else if (existsSync(standIn)) {
  mainSrc = standIn; usingReal = false;
  console.log(`MAIN  ← SUSTITUTO del motor (no hay clip de Runway todavía)`);
  console.log(`        coloca el clip en ${shot.main.source} y vuelve a ejecutar`);
} else {
  console.error(`✗ No hay ni clip de Runway (${shot.main.source}) ni sustituto (${shot.main.standIn}).`);
  process.exit(1);
}
const srcInfo = probe(mainSrc);
console.log(`        origen ${srcInfo.width}x${srcInfo.height} · ${srcInfo.duration.toFixed(2)}s`);

// ───────────────────── 2. cadenas de grado y movimiento ─────────────────────

/** Grado de color común. Todo lo que entra al paquete pasa por aquí. */
function gradeChain(g = {}) {
  const parts = [];
  if (g.temperature) parts.push(`colortemperature=temperature=${6500 + g.temperature * 100}`);
  parts.push(`eq=contrast=${g.contrast ?? 1}:brightness=${g.brightness ?? 0}:saturation=${g.saturation ?? 1}:gamma=${g.gamma ?? 1}`);
  if (g.vignette) parts.push(`vignette=angle=PI/${(5 / Math.max(0.01, g.vignette)).toFixed(3)}`);
  if (g.grain) parts.push(`noise=alls=${g.grain}:allf=t+u`);
  return parts.join(',');
}

/**
 * Encaje + respiración 2.5D.
 * El empuje lentísimo evita que un clip de IA se note congelado en los extremos
 * y da continuidad de movimiento con las planchas, que sí derivan de cámara.
 */
function fitAndBreathe(motion = {}) {
  const frames = Math.round(DUR * FPS);
  const z0 = motion.zoomFrom ?? 1, z1 = motion.zoomTo ?? 1;
  // sobremuestreo para que el zoom no pixele
  const SS = 2;
  const chain = [
    `scale=${W * SS}:${H * SS}:force_original_aspect_ratio=increase`,
    `crop=${W * SS}:${H * SS}`
  ];
  if (z0 !== z1 || motion.panX || motion.panY) {
    const dz = `(${z0}+(${z1}-${z0})*on/${frames})`;
    const px = `(iw/2-(iw/zoom/2))+(${motion.panX ?? 0})*iw*on/${frames}`;
    const py = `(ih/2-(ih/zoom/2))+(${motion.panY ?? 0})*ih*on/${frames}`;
    chain.push(`zoompan=z='${dz}':x='${px}':y='${py}':d=1:s=${W}x${H}:fps=${FPS}`);
  } else {
    chain.push(`scale=${W}:${H}`);
  }
  return chain.join(',');
}

/** Ajusta cualquier fuente a la duración exacta: recorta o congela el último frame. */
const exactDuration = `tpad=stop_mode=clone:stop_duration=${DUR},trim=duration=${DUR},setpts=PTS-STARTPTS`;

// ───────────────────── 3. MAIN ─────────────────────

const mainOut = P(shot.deliverables.main);
ff(['-i', mainSrc, '-an',
  '-vf', [fitAndBreathe(shot.main.motion), gradeChain(shot.main.grade), `fps=${FPS}`, exactDuration].join(','),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', pixelFormat,
  '-movflags', '+faststart', mainOut], 'MAIN');
console.log(`  → ${basename(mainOut)}`);

// ───────────────────── 4. CEILING y ENVIRONMENT ─────────────────────

for (const key of ['ceiling', 'environment']) {
  const plate = P(`out/_plate-${key}.mp4`);
  if (!existsSync(plate)) {
    console.error(`✗ Falta la plancha ${key}. Ejecuta primero:\n    node tools/render-plate.mjs --shot ${shotPath} --plate ${key}`);
    process.exit(1);
  }
  const out = P(shot.deliverables[key]);
  ff(['-i', plate, '-an',
    '-vf', [`scale=${W}:${H}`, gradeChain(shot.plates[key].grade), `fps=${FPS}`, exactDuration].join(','),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', pixelFormat,
    '-movflags', '+faststart', out], key.toUpperCase());
  console.log(`  → ${basename(out)}   (${shot.plates[key].role})`);
}

// ───────────────────── 5. audio ─────────────────────

const masterWav = P(shot.audio.master);
const ltcWav = P(shot.audio.ltc);
if (!existsSync(masterWav)) {
  console.error(`✗ Falta el audio maestro. Ejecuta: node tools/make-audio.mjs ${shotPath}`);
  process.exit(1);
}
console.log(`\nAUDIO → ${basename(masterWav)} (música y efectos)`);
console.log(`      → ${basename(ltcWav)} (LTC SMPTE ${FPS} fps para grandMA2)`);
console.log(`      Las tres pistas de proyección salen SIN audio: en sala el sonido va por`);
console.log(`      una sola fuente, no por tres reproductores que derivarían entre sí.`);

// ───────────────────── 6. tríptico ─────────────────────

const TW = 640, TH = Math.round((H / W) * TW); // 640x360 por pantalla
const label = (txt, i) =>
  `drawtext=text='${txt}':x=14:y=12:fontsize=19:fontcolor=0xFFD9A0@0.92:box=1:boxcolor=0x05070D@0.45:boxborderw=7`;

// marcas de cue quemadas: permiten comprobar la sincronía a ojo
const cueOverlay = shot.cues.map((c) => {
  const a = c.seconds, b = c.seconds + 1.2;
  return `drawtext=text='CUE ${c.number} · ${c.name}':x=w-tw-16:y=h-th-16:fontsize=20:` +
         `fontcolor=0xFFFFFF:box=1:boxcolor=0xC9435A@0.72:boxborderw=8:` +
         `enable='between(t,${a},${b})'`;
}).join(',');

const tcOverlay =
  `drawtext=timecode='00\\:00\\:00\\:00':r=${FPS}:x=w-tw-16:y=16:fontsize=22:` +
  `fontcolor=0xFFD9A0:box=1:boxcolor=0x05070D@0.6:boxborderw=8`;

const tripOut = P(shot.deliverables.triptych);
ff([
  '-i', P(shot.deliverables.ceiling),
  '-i', P(shot.deliverables.environment),
  '-i', P(shot.deliverables.main),
  '-i', masterWav,
  '-filter_complex',
  `[0:v]scale=${TW}:${TH},${label('P1 CEILING')}[a];` +
  `[1:v]scale=${TW}:${TH},${label('P2 ENVIRONMENT')}[b];` +
  `[2:v]scale=${TW}:${TH},${label('P3 STORY / MAIN')}[c];` +
  `[a][b][c]vstack=inputs=3,${tcOverlay},${cueOverlay}[v]`,
  '-map', '[v]', '-map', '3:a',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', pixelFormat,
  '-c:a', 'aac', '-b:a', '192k', '-ar', String(shot.format.audioSampleRate),
  '-movflags', '+faststart', '-t', String(DUR), tripOut
], 'TRÍPTICO');
console.log(`\nTRÍPTICO → ${basename(tripOut)} (${TW}x${TH * 3}, con audio, timecode y cues quemados)`);

// ───────────────────── 7. cues ─────────────────────

const tcToFrames = (tc) => { const [h, m, s, f] = tc.split(':').map(Number); return ((h * 60 + m) * 60 + s) * FPS + f; };

// CSV para entrada manual en consola
const csv = [
  'Cue,Timecode,Frames,Seconds,Name,MA2Cue,Color,Intensity,FadeSec,Group,Musical'
].concat(shot.cues.map((c) =>
  [c.number, c.timecode, tcToFrames(c.timecode), c.seconds.toFixed(3), c.name,
   c.light.cue, c.light.color, c.light.intensity, c.light.fade, c.light.group,
   `"${c.musical.replace(/"/g, '""')}"`].join(',')
)).join('\n') + '\n';
writeFileSync(P(shot.deliverables.cuesCsv), csv);

// JSON para UNIVERSO CONTROL
writeFileSync(P(shot.deliverables.cuesJson), JSON.stringify({
  shot: shot.id, name: shot.name, fps: FPS, duration: DUR,
  startTimecode: shot.audio.startTimecode,
  dropFrame: false,
  cues: shot.cues.map((c) => ({
    number: c.number, timecode: c.timecode, frames: tcToFrames(c.timecode),
    seconds: c.seconds, name: c.name, musical: c.musical, light: c.light
  }))
}, null, 2) + '\n');

// XML de grandMA2 (secuencia con tiempos de timecode)
const xmlEsc = (s) => String(s).replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]));
const ma2 = `<?xml version="1.0" encoding="utf-8"?>
<!-- UNIVERSO 1/1 · ${xmlEsc(shot.name)}
     Secuencia de ${shot.cues.length} cues sincronizada a LTC SMPTE ${FPS} fps no-drop.
     Pista de timecode: ${basename(ltcWav)} · arranque ${shot.audio.startTimecode}

     ⚠ SIN VERIFICAR EN CONSOLA. Este XML sigue la estructura de exportación de
     grandMA2 pero no se ha probado en un equipo real. Antes de la función,
     importar en una show vacía y comprobar; si la importación no cuadra, usar
     el CSV para dar de alta los cues a mano, que son solo tres. -->
<MA xmlns="http://schemas.malighting.de/grandma2/xml/MA"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    major_vers="3" minor_vers="9" stream_vers="60">
  <Info datetime="${new Date().toISOString().replace(/\.\d+Z$/, '')}" showfile="UNIVERSO_1_1" />
  <Sequ index="1" name="${xmlEsc(shot.name)}" timecode_slot="1">
${shot.cues.map((c) => `    <Cue xname="${xmlEsc(c.name)}" no="${c.number}">
      <Number number="${c.number}" sub_number="0" />
      <TimeCode>${c.timecode}</TimeCode>
      <Part index="0" name="${xmlEsc(c.light.cue)}">
        <CuePart fade="${c.light.fade}" outfade="${c.light.fade}" delay="0" outdelay="0" />
        <!-- color ${c.light.color} · intensidad ${c.light.intensity} · grupo ${c.light.group}${c.light.sweep ? ' · barrido' : ''} -->
      </Part>
    </Cue>`).join('\n')}
  </Sequ>
</MA>
`;
writeFileSync(P(shot.deliverables.cuesMa2), ma2);

console.log(`\nCUES`);
for (const c of shot.cues) {
  console.log(`  ${c.number}  ${c.timecode}  f${String(tcToFrames(c.timecode)).padStart(3)}  ${c.name.padEnd(11)} ${c.light.cue} ${c.light.color} @${c.light.intensity} fade ${c.light.fade}s`);
}
console.log(`  → ${basename(shot.deliverables.cuesCsv)} · ${basename(shot.deliverables.cuesJson)} · ${basename(shot.deliverables.cuesMa2)}`);

// ───────────────────── 8. verificación ─────────────────────

// ───────────────────── 8. publicar para UNIVERSO CONTROL ─────────────────────

const pub = resolve(dirname(shotPath), '../../public/packages', shot.id);
rmSync(pub, { recursive: true, force: true });
mkdirSync(pub, { recursive: true });
const published = {};
for (const [k, rel] of Object.entries(shot.deliverables)) {
  const src = P(rel);
  if (!existsSync(src)) continue;
  const name = basename(rel);
  copyFileSync(src, join(pub, name));
  published[k] = `/packages/${shot.id}/${name}`;
}
writeFileSync(join(pub, 'manifest.json'), JSON.stringify({
  id: shot.id,
  name: shot.name,
  chapter: shot.chapter,
  duration: DUR,
  fps: FPS,
  width: W,
  height: H,
  usingRealClip: usingReal,
  startTimecode: shot.audio.startTimecode,
  files: published,
  surfaces: { story: published.main, ceiling: published.ceiling, environment: published.environment },
  cues: shot.cues.map((c) => ({
    number: c.number, timecode: c.timecode, seconds: c.seconds,
    name: c.name, musical: c.musical, light: c.light
  }))
}, null, 2) + '\n');
// índice de paquetes para que el panel los descubra
const pkgRoot = resolve(dirname(shotPath), '../../public/packages');
const idxPath = join(pkgRoot, 'index.json');
let index = [];
try { index = JSON.parse(readFileSync(idxPath, 'utf8')); } catch (_) {}
index = index.filter((e) => e.id !== shot.id);
index.push({ id: shot.id, name: shot.name, chapter: shot.chapter, duration: DUR,
             usingRealClip: usingReal, manifest: `/packages/${shot.id}/manifest.json` });
index.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(idxPath, JSON.stringify(index, null, 2) + '\n');

console.log(`\nPAQUETE → public/packages/${shot.id}/  (cargable desde UNIVERSO CONTROL)`);

console.log(`\nVERIFICACIÓN`);
let ok = true;
for (const [k, rel] of Object.entries(shot.deliverables)) {
  const f = P(rel);
  if (!existsSync(f)) { console.log(`  ✗ falta ${rel}`); ok = false; continue; }
  if (/\.mp4$/.test(rel)) {
    const i = probe(f);
    const good = Math.abs(i.duration - DUR) < 0.12;
    console.log(`  ${good ? '✓' : '✗'} ${rel.padEnd(34)} ${i.width}x${i.height} ${i.duration.toFixed(2)}s ${i.fps}`);
    if (!good) ok = false;
  } else {
    console.log(`  ✓ ${rel}`);
  }
}
if (!usingReal) {
  console.log(`\n  ⚠ MAIN es el SUSTITUTO del motor, no el clip de Runway.`);
  console.log(`    El flujo queda validado; al colocar el clip real sale el mismo paquete.`);
}
process.exitCode = ok ? 0 : 1;

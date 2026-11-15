/**
 * AUDITORÍA DE ENTREGA A UNIVERSO CONTROL.
 *
 * No se fía de lo que dijo el constructor: abre cada archivo y lo mide. Para
 * cada una de las 25 carpetas comprueba nombres, códec, fps, GOP real
 * (fotograma clave a fotograma clave), ausencia de pista de audio, duraciones,
 * experience.json, timecode y que los cue sheets lleven el timecode absoluto.
 *
 * Escribe dist/INFORME-ENTREGA.md y termina con error si hay alguna desviación.
 *
 * Uso: node tools/audit-delivery.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { CONTRACT, EXPECTED_IDS, ROOT_FILES, OFFSETS, timecodeShowFor, msToTimecode } from './lib/contract.mjs';

const DIR = 'dist/packages', FPS = CONTRACT.video.fps;
const probe = (f) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f]).toString());
const keyframes = (f) => execFileSync('ffprobe', ['-v', 'error', '-skip_frame', 'nokey', '-select_streams', 'v:0', '-show_entries', 'frame=pts_time', '-of', 'csv=p=0', f], { maxBuffer: 1 << 26 }).toString().trim().split(/\s+/).map((x) => parseFloat(x));   // la primera línea llega con una coma al final
/** faststart: el átomo moov va antes que los datos. */
function moovFirst(f) {
  const fd = openSync(f, 'r'), b = Buffer.alloc(16), size = statSync(f).size; let pos = 0, res = false;
  while (pos + 8 <= size) { readSync(fd, b, 0, 16, pos); let sz = b.readUInt32BE(0); const t = b.toString('ascii', 4, 8); if (sz === 1) sz = Number(b.readBigUInt64BE(8)); if (t === 'moov') { res = true; break; } if (t === 'mdat' || sz < 8) break; pos += sz; }
  closeSync(fd); return res;
}
const deepHas = (o, key) => o && typeof o === 'object' && (key in o || Object.values(o).some((v) => deepHas(v, key)));

const issues = [], rows = [];
const bad = (id, msg) => issues.push(`\`${id}\` — ${msg}`);

// ── la carpeta de entrega: exactamente las 25, y nada más ──
const entries = readdirSync(DIR);
for (const e of entries) if (!EXPECTED_IDS.includes(e)) bad(e, 'no es uno de los 25 paquetes y está dentro de dist/packages');
for (const id of EXPECTED_IDS) if (!entries.includes(id)) bad(id, 'falta la carpeta');

for (const id of EXPECTED_IDS) {
  const p = join(DIR, id);
  if (!existsSync(p)) continue;
  const isWorld = id.startsWith('AMBIENT');
  // ── raíz: los cinco archivos y extras/ ──
  const root = readdirSync(p).sort(), extra = root.filter((f) => !ROOT_FILES.includes(f) && f !== 'extras');
  for (const f of ROOT_FILES) if (!root.includes(f)) bad(id, `falta ${f} en la raíz`);
  if (extra.length) bad(id, `archivos fuera de sitio en la raíz: ${extra.join(', ')}`);
  for (const f of ['cue-sheet.csv', 'preview-triptico.mp4', 'production-notes.md', 'licenses.md']) if (!existsSync(join(p, 'extras', f))) bad(id, `falta extras/${f}`);

  // ── los tres vídeos ──
  const vid = {};
  for (const s of CONTRACT.screens) {
    const f = join(p, `${s}.mp4`); if (!existsSync(f)) continue;
    const info = probe(f), v = info.streams.find((x) => x.codec_type === 'video'), kf = keyframes(f);
    const frames = +v.nb_frames, gaps = kf.slice(1).map((t, i) => Math.round((t - kf[i]) * FPS));
    vid[s] = { frames, seconds: frames / FPS, w: v.width, h: v.height };
    if (info.streams.some((x) => x.codec_type === 'audio')) bad(id, `${s}.mp4 lleva pista de audio`);
    if (info.streams.length !== 1) bad(id, `${s}.mp4 tiene ${info.streams.length} pistas, debe tener solo la de vídeo`);
    if (v.codec_name !== 'h264') bad(id, `${s}.mp4 es ${v.codec_name}, no H.264`);
    if (v.pix_fmt !== 'yuv420p') bad(id, `${s}.mp4 es ${v.pix_fmt}, no yuv420p`);
    if (v.r_frame_rate !== `${FPS}/1` || v.avg_frame_rate !== `${FPS}/1`) bad(id, `${s}.mp4 va a ${v.r_frame_rate} (medio ${v.avg_frame_rate}), no a ${FPS} fps constantes`);
    if (v.width !== 1280 || v.height !== 720) bad(id, `${s}.mp4 mide ${v.width}x${v.height}`);
    if (kf[0] !== 0 || gaps.some((g) => g !== CONTRACT.video.gop)) bad(id, `${s}.mp4 no tiene GOP ${CONTRACT.video.gop} (intervalos entre fotogramas clave: ${[...new Set(gaps)].join(', ')})`);
    if (Math.abs(parseFloat(info.format.duration) - frames / FPS) > 0.001) bad(id, `${s}.mp4: el contenedor dice ${info.format.duration} s y los fotogramas ${frames / FPS} s`);
    if (!moovFirst(f)) bad(id, `${s}.mp4 no lleva faststart`);
  }
  const secs = CONTRACT.screens.map((s) => vid[s]?.seconds);

  // ── audio ──
  const ainfo = probe(join(p, 'audio.wav')), a = ainfo.streams[0], asec = parseFloat(ainfo.format.duration);
  if (a.codec_name !== 'pcm_s16le' || +a.sample_rate !== 48000 || +a.channels !== 2) bad(id, `audio.wav es ${a.codec_name} ${a.sample_rate} Hz ${a.channels} canales`);

  // ── experience.json ──
  const e = JSON.parse(readFileSync(join(p, 'experience.json'), 'utf8'));
  if (e.id !== id) bad(id, `experience.json dice id "${e.id}"`);
  if (e.type !== (isWorld ? 'ambient' : 'cinematic')) bad(id, `type es "${e.type}"`);
  if (e.frameRate !== FPS) bad(id, `frameRate es ${e.frameRate}`);
  if (deepHas(e, 'lightingCommand')) bad(id, 'lleva lightingCommand, que lo asigna el operador');
  if (e.grandma2?.timecodeShow !== timecodeShowFor(id)) bad(id, `timecodeShow es ${e.grandma2?.timecodeShow}, debe ser ${timecodeShowFor(id)}`);
  if (e.grandma2?.timecodeSlot !== CONTRACT.timecodeSlot) bad(id, `timecodeSlot es ${e.grandma2?.timecodeSlot}, debe ser ${CONTRACT.timecodeSlot}`);
  for (const k of ['main', 'ceiling', 'side']) if (e.media?.[k] !== `${k}.mp4`) bad(id, `media.${k} es "${e.media?.[k]}"`);
  if (e.media?.audio !== 'audio.wav') bad(id, `media.audio es "${e.media?.audio}"`);
  if (e.testMaterial !== true) bad(id, 'testMaterial no es true');
  if (isWorld) {
    if (e.durationMs !== 0) bad(id, `un mundo lleva durationMs 0 y lleva ${e.durationMs}`);
    if (e.exitAmbient) bad(id, 'un mundo no lleva exitAmbient');
    if (e.cues?.length) bad(id, 'un mundo lleva cues vacío');
    if (e.timecode) bad(id, 'un mundo no lleva bloque timecode');
  } else {
    if (new Set(secs).size !== 1) bad(id, `los tres vídeos no duran lo mismo: ${secs.join(' / ')} s`);
    if (e.durationMs !== Math.round(secs[0] * 1000)) bad(id, `durationMs es ${e.durationMs} y el vídeo dura ${Math.round(secs[0] * 1000)} ms`);
    if (asec < secs[0]) bad(id, `audio.wav dura ${asec} s, menos que el vídeo`);
    if (e.timecode?.format !== 'mtc' || e.timecode?.fps !== FPS) bad(id, `timecode debe ser mtc a ${FPS} fps`);
    if (e.timecode?.offset !== OFFSETS[id]) bad(id, `offset es ${e.timecode?.offset}, debe ser ${OFFSETS[id]}`);
    if (!EXPECTED_IDS.includes(e.exitAmbient) || !e.exitAmbient?.startsWith('AMBIENT')) bad(id, `exitAmbient "${e.exitAmbient}" no es un mundo de la entrega`);
    let prev = -1; for (const c of e.cues || []) { if (c.atMs < prev || c.atMs > e.durationMs) bad(id, `cue fuera de orden o de la duración: ${c.atMs} ms`); prev = c.atMs; }
    // el cue sheet lleva el timecode absoluto: offset + tiempo del cue
    const csv = readFileSync(join(p, 'extras', 'cue-sheet.csv'), 'utf8').trim().split('\n').slice(1);
    for (const line of csv) { const m = line.match(/^[^,]+,[^,]+,(\d\d:\d\d:\d\d:\d\d),(\d+),/); if (!m) { bad(id, `fila ilegible en el cue sheet: ${line.slice(0, 40)}`); continue; } if (m[1] !== msToTimecode(+m[2], OFFSETS[id])) bad(id, `cue sheet: a los ${m[2]} ms pone ${m[1]} y debe ser ${msToTimecode(+m[2], OFFSETS[id])}`); }
    if (csv.length !== (e.cues || []).length) bad(id, `el cue sheet tiene ${csv.length} filas y experience.json ${e.cues.length} cues`);
  }
  const mb = ROOT_FILES.reduce((s, f) => s + (existsSync(join(p, f)) ? statSync(join(p, f)).size : 0), 0) / 1048576;
  rows.push({ id, name: e.name, world: isWorld, secs, frames: CONTRACT.screens.map((s) => vid[s]?.frames), res: `${vid.main?.w}x${vid.main?.h}`, asec, mb, show: e.grandma2?.timecodeShow, offset: e.timecode?.offset || '—', exit: e.exitAmbient || '—', version: e.version, cues: e.cues?.length || 0 });
}

const f3 = (x) => x.toFixed(3);
const dur = (r) => r.world ? `${r.secs.map(f3).join(' / ')} s` : `${f3(r.secs[0])} s (${r.frames[0]} fotogramas)`;
const total = rows.reduce((s, r) => s + r.mb, 0);
writeFileSync('dist/INFORME-ENTREGA.md', `# Informe de entrega a UNIVERSO CONTROL

Generado con \`node tools/audit-delivery.mjs\`, que abre cada archivo y lo mide: no
repite lo que dijo el constructor. Destino: \`C:\\UNIVERSO\\universo-control\\experiences\\<ID>\\\`.

## Resultado

**${issues.length === 0 ? `Las ${rows.length} carpetas cumplen. Ninguna desviación.` : `${issues.length} desviación(es) en ${rows.length} carpetas.`}**

${issues.length ? issues.map((i) => `- ${i}`).join('\n') + '\n' : ''}
Comprobado en cada carpeta: nombre igual al ID; en la raíz solo \`experience.json\`,
\`main.mp4\`, \`ceiling.mp4\`, \`side.mp4\` y \`audio.wav\`, y todo lo demás en \`extras/\`;
vídeo H.264 yuv420p a 30 fps constantes, 1280x720, **una sola pista y sin audio**, con
fotograma clave exactamente cada 30 fotogramas (medido de clave a clave) y faststart;
audio WAV PCM 16 bits, 48 kHz, estéreo; \`id\`, \`type\`, \`durationMs\`, \`timecodeShow\`,
\`timecodeSlot\` 2, offset y \`exitAmbient\`; ningún \`lightingCommand\`; y cue sheets con el
timecode absoluto.

## Tabla por pieza

En los mundos la duración es la de main / ceiling / side. El peso es el de los cinco
archivos de la raíz, sin \`extras/\`.

| ID | Pieza | Duración exacta | Resolución | Audio | Peso | timecodeShow | Offset | exitAmbient | Cues | Versión |
|---|---|---|---|---|---|---|---|---|---|---|
${rows.map((r) => `| \`${r.id}\` | ${r.name} | ${dur(r)} | ${r.res} | ${r.asec.toFixed(1)} s | ${r.mb.toFixed(1)} MB | ${r.show} | ${r.offset} | ${r.exit} | ${r.cues || '—'} | ${r.version} |`).join('\n')}

Total: **${total.toFixed(0)} MB** en ${rows.length} carpetas (${rows.length * 3} vídeos y ${rows.length} audios).

## Show de luces por timecode

Solo tres piezas lo llevan. Su cue sheet usa el timecode absoluto: un cue a los 45 s
del opening figura como \`01:00:45:00\`.

| ID | timecodeShow | Offset | timecodeSlot | fps |
|---|---|---|---|---|
${rows.filter((r) => r.show).map((r) => `| \`${r.id}\` | ${r.show} | ${r.offset} | 2 | 30 |`).join('\n')}

Todas las demás van con \`timecodeShow\` 0. Su \`extras/cue-sheet.csv\` se queda como
referencia para programar la consola a mano; no lo dispara ningún show.

## Cuatro cosas que conviene que confirme UNIVERSO CONTROL

No son desviaciones del brief, pero la lista de comprobación de esta entrega es más
genérica que el brief en estos puntos y prefiero decirlo a suponerlo.

1. **Los mundos no duran lo mismo en las tres pantallas, y llevan \`durationMs\` 0.**
   Es lo que pide el brief (§5.4: «en un ambient, durationMs es 0»; §5.6: «cada video
   puede durar distinto: así el conjunto no se repite igual»). En capítulos y
   transiciones los tres vídeos sí duran exactamente lo mismo y \`durationMs\` es esa
   duración. Si el importador exige duración igual también en los mundos, hay que
   volver a renderizar los seis: unos 30 minutos.
2. **Los mundos llevan \`grandma2: { timecodeShow: 0, timecodeSlot: 2 }\`** para cumplir
   «todas las demás, timecodeShow 0». No llevan bloque \`timecode\`, porque el brief los
   define sin timecode. Si el importador prefiere los mundos sin bloque \`grandma2\`, se
   quita con una línea.
3. **En las piezas con show 0, el resto del bloque \`grandma2\`** (\`source\`,
   \`armCondition\`, \`expectedState\`) se quedó como en el ejemplo válido del brief. Si una
   pieza sin show debe llevar otros valores ahí, decidme cuáles.
4. **Los offsets de las piezas con show 0** se conservan de la tabla 5.5 del brief
   (02:00:00:00, 04:00:00:00…). No se ha tocado ninguno.

## Pendiente del operador

Sin tocar: textos de Arantza, opciones de la ruleta, fotos extra, láser y música
definitiva. Todo entra como material de prueba (\`testMaterial: true\`).
`);
console.log(`${rows.length} carpetas auditadas · ${issues.length} desviación(es)`);
for (const i of issues) console.log('  ✗ ' + i.replace(/`/g, ''));
process.exit(issues.length ? 1 : 0);

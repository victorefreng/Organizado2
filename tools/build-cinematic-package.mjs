/**
 * ENSAMBLADOR DE PIEZAS CON TIMECODE (capítulos y transiciones) — Brief V3.2 §5.
 *
 *   SH-001/  o  TR-002/
 *     experience.json        type cinematic, offset y show de la tabla 5.5
 *     main.mp4 ceiling.mp4 side.mp4     misma duración exacta, sin audio
 *     audio.wav              48 kHz estéreo, desde el tiempo cero, sin LTC
 *     extras/  cue-sheet.csv · preview-triptico.mp4 · production-notes.md · licenses.md
 *
 * Los cues viven en production/pieces/<ID>/piece.json: de ahí salen tanto los
 * de experience.json como las filas de luces del cue sheet, para que no puedan
 * contradecirse.
 *
 * Uso: node tools/build-cinematic-package.mjs TR-002
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { CONTRACT, CUE_SHEET_COLUMNS, msToTimecode } from './lib/contract.mjs';

const id = process.argv[2];
const root = resolve('.');
const piecePath = join(root, 'production/pieces', id || '', 'piece.json');
if (!id || !existsSync(piecePath)) { console.error('Uso: node tools/build-cinematic-package.mjs TR-002'); process.exit(1); }
const piece = JSON.parse(readFileSync(piecePath, 'utf8'));
const pkg = join(root, 'dist/packages', id), extras = join(pkg, 'extras');
mkdirSync(extras, { recursive: true });
const durationMs = Math.round(piece.durationSeconds * 1000);

const probe = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
console.log(`\n━━ ${id} · ${piece.name} ━━\n`);

for (const s of CONTRACT.screens) {
  const f = join(pkg, `${s}.mp4`);
  if (!existsSync(f)) { console.error(`✗ Falta ${s}.mp4`); process.exit(1); }
  const d = probe(f);
  console.log(`  ${s.padEnd(9)} ${d.toFixed(2)} s`);
  if (Math.abs(d * 1000 - durationMs) > CONTRACT.durationToleranceMs) { console.error(`✗ ${s}.mp4 dura ${d}s y la pieza ${piece.durationSeconds}s`); process.exit(1); }
}

const audio = join(pkg, 'audio.wav');
if (!existsSync(audio)) {
  if (!String(piece.audio?.style || '').startsWith('transition-')) { console.error('✗ Falta audio.wav'); process.exit(1); }
  execFileSync('node', [join(root, 'tools/make-transition-audio.mjs'), piecePath, audio], { stdio: 'inherit' });
}

const cues = piece.cues || [];
const exp = {
  formatVersion: CONTRACT.formatVersion, id, name: piece.name, description: piece.description,
  type: 'cinematic', version: piece.version || '1.0.0', testMaterial: piece.testMaterial !== false,
  durationMs, frameRate: CONTRACT.timecodeFps,
  media: { main: 'main.mp4', ceiling: 'ceiling.mp4', side: 'side.mp4', audio: 'audio.wav' },
  timecode: { format: 'mtc', fps: CONTRACT.timecodeFps, offset: piece.timecode.offset, onEnd: 'stop' },
  grandma2: { timecodeShow: piece.timecode.show, timecodeSlot: CONTRACT.timecodeSlot, source: 'external', armCondition: 'manual-or-telnet', expectedState: 'armed-external' },
  transition: piece.transition || { in: { type: 'crossfade', ms: 1500 }, out: { type: 'crossfade', ms: 2000 } },
  exitAmbient: piece.exitAmbient,
  onError: { nodeLost: 'continue', playbackStalled: 'continue', audioFail: 'hold' },
  cues: cues.map((c) => ({ atMs: c.atMs, label: c.label }))
};
writeFileSync(join(pkg, 'experience.json'), JSON.stringify(exp, null, 2) + '\n');
console.log(`  experience.json  cinematic · ${durationMs} ms · offset ${piece.timecode.offset} · show ${piece.timecode.show} · aterriza en ${piece.exitAmbient}`);

const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
const rows = cues.map((c, i) => [id, String(i + 1).padStart(3, '0'), msToTimecode(c.atMs, piece.timecode.offset), c.atMs, c.tipo,
  c.momento || '', c.accion || '', c.halo_par || 'sin cambio', c.flasher || 'sin uso', c.laser || 'sin uso', c.haze || 'sin uso',
  c.color || '', c.intensidad ?? '', c.fade_s ?? '']);
for (const r of rows) if (!CONTRACT.cueTypes.includes(r[4])) { console.error(`✗ tipo de cue no válido: ${r[4]}`); process.exit(1); }
writeFileSync(join(extras, 'cue-sheet.csv'), CUE_SHEET_COLUMNS.join(',') + '\n' + rows.map((r) => r.map(q).join(',')).join('\n') + '\n');
console.log(`  extras/cue-sheet.csv  ${rows.length} cues`);

const tag = (t) => `drawtext=text='${t}':x=14:y=12:fontsize=18:fontcolor=0xFFD9A0@0.9:box=1:boxcolor=0x05070D@0.45:boxborderw=6`;
try {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-i', join(pkg, 'ceiling.mp4'), '-i', join(pkg, 'side.mp4'), '-i', join(pkg, 'main.mp4'), '-i', audio,
    '-filter_complex', `[0:v]scale=640:360,${tag('P1 CEILING')}[a];[1:v]scale=640:360,${tag('P2 SIDE')}[b];[2:v]scale=640:360,${tag('P3 MAIN')}[c];[a][b][c]vstack=inputs=3[v]`,
    '-map', '[v]', '-map', '3:a', '-t', String(piece.durationSeconds), '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', join(extras, 'preview-triptico.mp4')], { stdio: ['ignore', 'ignore', 'pipe'] });
  console.log('  extras/preview-triptico.mp4');
} catch (e) { console.error(`✗ tríptico: ${e.stderr?.toString().slice(0, 600)}`); process.exit(1); }

writeFileSync(join(extras, 'production-notes.md'), `# ${id} · ${piece.name}

${piece.description}

- **Duración:** ${piece.durationSeconds} s · **offset** ${piece.timecode.offset} · **timecodeShow** ${piece.timecode.show} · slot ${CONTRACT.timecodeSlot}
- **Aterriza en:** ${piece.exitAmbient}
- **Material de prueba:** ${piece.testMaterial !== false ? 'sí' : 'no'}

${piece.notes || ''}

## Cues

| ms | timecode | tipo | qué pasa |
|---|---|---|---|
${rows.map((r) => `| ${r[3]} | ${r[2]} | ${r[4]} | ${r[6]} |`).join('\n')}

## Seguridad

Sin láser y sin estrobo en esta pieza. El Flasher, si aparece, es un único destello.
`);
writeFileSync(join(extras, 'licenses.md'), `# Origen del material · ${id}

${piece.licenses || 'Todo el contenido visual y sonoro de este paquete es **original**: animación procedural en lienzo nativo y audio por síntesis propia. Sin metraje de stock, sin música de terceros, sin IA generativa. No hay licencias de terceros que respetar.'}
`);

console.log('\n━━ validando ━━');
try { execFileSync('node', [join(root, 'tools/validate-package.mjs'), pkg], { stdio: 'inherit' }); console.log(`✓ ${id} listo en dist/packages/${id}\n`); }
catch { console.error(`✗ ${id} NO valida.\n`); process.exit(1); }

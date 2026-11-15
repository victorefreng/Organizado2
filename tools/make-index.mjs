/**
 * ÍNDICE DE ENTREGA: recorre dist/packages, valida cada paquete y escribe
 * dist/index.json y dist/INDICE.md con el estado real.
 *
 * Uso: node tools/make-index.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const dir = 'dist/packages', rows = [];
for (const id of readdirSync(dir).sort()) {
  const p = join(dir, id);
  if (!statSync(p).isDirectory() || !existsSync(join(p, 'experience.json'))) continue;
  const e = JSON.parse(readFileSync(join(p, 'experience.json'), 'utf8'));
  let ok = false, out = '';
  try { out = execFileSync('node', ['tools/validate-package.mjs', p], { stdio: ['ignore', 'pipe', 'pipe'] }).toString(); ok = /VALIDATED/.test(out); } catch (err) { out = (err.stdout || '').toString(); }
  const durs = ['main', 'ceiling', 'side'].map((s) => { const m = out.match(new RegExp(`${s}\\.mp4 \\S+ \\S+ fps ([\\d.]+)s`)); return m ? Math.round(+m[1]) : '?'; });
  const mb = ['main.mp4', 'ceiling.mp4', 'side.mp4', 'audio.wav'].reduce((a, f) => a + (existsSync(join(p, f)) ? statSync(join(p, f)).size : 0), 0) / 1e6;
  rows.push({ id, name: e.name, type: e.type, validated: ok, seconds: e.type === 'ambient' ? durs : e.durationMs / 1000, offset: e.timecode?.offset || null, show: e.grandma2?.timecodeShow ?? null, exitAmbient: e.exitAmbient || null, cues: e.cues?.length || 0, testMaterial: e.testMaterial, megabytes: Math.round(mb) });
}
writeFileSync('dist/index.json', JSON.stringify({ generated: new Date().toISOString().slice(0, 10), packages: rows }, null, 2) + '\n');
const order = (r) => (r.id.startsWith('AMBIENT') ? 0 : r.id.startsWith('TR') ? 1 : 2);
const t = [...rows].sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id));
const fmt = (r) => r.type === 'ambient' ? `bucles de ${r.seconds.join(' / ')} s` : `${r.seconds} s`;
writeFileSync('dist/INDICE.md', `# Paquetes entregados

Generado con \`node tools/make-index.mjs\`. Cada fila es una carpeta lista para importar.

| ID | Pieza | Tipo | Duración | Timecode | Aterriza en | Cues | Estado |
|---|---|---|---|---|---|---|---|
${t.map((r) => `| \`${r.id}\` | ${r.name} | ${r.type === 'ambient' ? 'mundo' : r.id.startsWith('TR') ? 'transición' : 'capítulo'} | ${fmt(r)} | ${r.offset ? `${r.offset} · show ${r.show}` : '—'} | ${r.exitAmbient || '—'} | ${r.cues || '—'} | ${r.validated ? 'VALIDATED' : '**NO VALIDA**'} |`).join('\n')}

**${rows.filter((r) => r.validated).length} de ${rows.length} paquetes validados.** Peso total: ${Math.round(rows.reduce((a, r) => a + r.megabytes, 0))} MB.

Todos van marcados como material de prueba (\`testMaterial: true\`) hasta que el operador confirme textos, música y fotos definitivas.
`);
console.log(`${rows.filter((r) => r.validated).length}/${rows.length} validados`);
for (const r of rows.filter((x) => !x.validated)) console.log(`  ✗ ${r.id}`);

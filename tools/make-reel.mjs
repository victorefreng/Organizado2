/**
 * REEL DE ENTREGA: unos segundos de cada paquete, uno detrás de otro, para ver
 * toda la noche de un vistazo. Sale de los trípticos de revisión.
 *
 * Uso: node tools/make-reel.mjs [segundos por pieza]   → dist/reel-entrega.mp4
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const each = Number(process.argv[2] || 5);
const idx = JSON.parse(readFileSync('dist/index.json', 'utf8')).packages;
const order = (r) => (r.id === 'SH-001' ? 0 : r.id.startsWith('AMBIENT') ? 1 : r.id.startsWith('TR') ? 2 : 3);
const list = [...idx].sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id));
const tmp = 'dist/.reel'; mkdirSync(tmp, { recursive: true });
const parts = [];
for (const r of list) {
  const src = join('dist/packages', r.id, 'extras/preview-triptico.mp4');
  if (!existsSync(src)) continue;
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString());
  // el momento más representativo: hacia dos tercios en los capítulos, la mitad en lo demás
  const at = Math.max(0, Math.min(dur - each, dur * (r.id.startsWith('SH') ? 0.62 : 0.45)));
  const out = join(tmp, `${r.id}.mp4`), label = `${r.id}  ${r.name}`.replace(/[':]/g, '');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(at), '-t', String(each), '-i', src,
    '-vf', `scale=480:810,drawtext=text='${label}':x=(w-text_w)/2:y=h-34:fontsize=20:fontcolor=0xFFE2A8:box=1:boxcolor=0x05070D@0.6:boxborderw=7,fade=t=in:st=0:d=0.3,fade=t=out:st=${each - 0.3}:d=0.3`,
    '-af', `afade=t=in:st=0:d=0.3,afade=t=out:st=${each - 0.3}:d=0.3`,
    '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2', out]);
  parts.push(out);
}
writeFileSync(join(tmp, 'lista.txt'), parts.map((p) => `file '${p.replace(/^dist\/\.reel\//, '')}'`).join('\n') + '\n');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'lista.txt'), '-c', 'copy', '-movflags', '+faststart', 'dist/reel-entrega.mp4']);
rmSync(tmp, { recursive: true, force: true });
console.log(`reel: ${parts.length} piezas, ${parts.length * each} s → dist/reel-entrega.mp4`);

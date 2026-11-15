/**
 * CONTRATO DE ENTREGA — Brief Maestro V3.2, sección 5.
 *
 * Único lugar donde viven las reglas del formato. Lo usan el constructor de
 * paquetes y el validador, para que no puedan divergir entre sí.
 */

export const CONTRACT = {
  formatVersion: 1,
  idPattern: /^[A-Z]+-\d{3}$/,
  screens: ['main', 'ceiling', 'side'],
  video: {
    container: 'mp4',
    codec: 'h264',
    pixelFormat: 'yuv420p',
    fps: 30,
    fpsExact: true,          // 30 constantes, no 29.97, no variable
    gop: 30,                 // un fotograma clave por segundo
    width: 1280,
    height: 720,
    noAudio: true,
    faststart: true,
    crf: 18,
    bitrateHintMbps: [4, 6]
  },
  audio: {
    container: 'wav',
    codec: 'pcm_s16le',
    sampleRate: 48000,
    channels: 2,
    peakMarginDb: 1.0,
    noTimecode: true         // el LTC lo genera UNIVERSO CONTROL, no el paquete
  },
  durationToleranceMs: 150,
  transitions: ['cut', 'crossfade', 'fade-through-black'],
  cueTypes: [
    'AMBIENT_FADE', 'COLOR_TRANSITION', 'MUSICAL_BUMP', 'IMPACT',
    'RISER', 'REVEAL', 'FINAL_HIT', 'OUTRO_FADE'
  ],
  timecodeSlot: 2,
  timecodeFps: 30
};

/** Inventario real de luces (brief 3). No hay Philips Hue en este montaje. */
export const RIG = {
  halo_par: { count: 3, label: 'Halo PAR (Super Bright and Loud)', role: 'luz principal: color, fades, bumps' },
  flasher: { count: 2, label: 'Flasher 200 (Litetek)', role: 'acentos puntuales; un destello, nunca estrobo' },
  laser: { count: 1, label: 'Láser 1 W', role: 'clímax del opening y del finale, solo si es seguro' },
  haze: { count: 1, label: 'Dark Fazer 5000', role: 'hace visibles los haces; solo antes de momentos de show' }
};

/** Columnas exactas de extras/cue-sheet.csv (brief 9). */
export const CUE_SHEET_COLUMNS = [
  'capitulo', 'cue', 'timecode', 'ms', 'tipo', 'momento_musical', 'accion_visual',
  'halo_par', 'flasher', 'laser', 'haze', 'color', 'intensidad', 'fade_s'
];

/** Mundos declarados en el brief 5.5. `exitAmbient` debe apuntar a uno de estos. */
export const AMBIENTS = [
  'AMBIENT-001', 'AMBIENT-002', 'AMBIENT-003',
  'AMBIENT-004', 'AMBIENT-005', 'AMBIENT-106'
];

/** ms → timecode hh:mm:ss:ff con el offset del capítulo ya aplicado. */
export function msToTimecode(ms, offset = '00:00:00:00', fps = 30) {
  const [oh, om, os, of] = offset.split(':').map(Number);
  const offFrames = ((oh * 60 + om) * 60 + os) * fps + of;
  const total = offFrames + Math.round((ms / 1000) * fps);
  const f = total % fps;
  const s = Math.floor(total / fps) % 60;
  const m = Math.floor(total / (fps * 60)) % 60;
  const h = Math.floor(total / (fps * 3600)) % 24;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}:${p(f)}`;
}

/** Argumentos de ffmpeg que cumplen el contrato de vídeo. Fuente única de verdad. */
export function videoEncodeArgs(fmt = {}) {
  const v = { ...CONTRACT.video, ...fmt };
  return [
    '-an',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', String(v.crf),
    '-pix_fmt', v.pixelFormat,
    '-r', String(v.fps),
    '-g', String(v.gop),
    '-keyint_min', String(v.gop),
    '-sc_threshold', '0',      // sin keyframes por cambio de escena: GOP exacto
    '-x264-params', `keyint=${v.gop}:min-keyint=${v.gop}:scenecut=0`,
    '-movflags', '+faststart'
  ];
}

export default CONTRACT;

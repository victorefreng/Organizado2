/**
 * TIMELINE DEL SHOW — "THE FIRST LIGHT" (300 s) + mundos de biblioteca.
 *
 * Todo es editable aquí sin tocar el motor: duraciones, cues, keyframes de cámara,
 * eventos de audio, pausas interactivas y marcadores.
 *
 * Keyframes de cámara: `pos` y `target` están en el espacio local del mundo activo
 * (metros). `fov` en grados. `ease` nombra una curva de src/core/easing.js.
 * El CameraDirector interpola el masterRig; cada proyector aplica su propio offset.
 */

export const CUE_TYPES = [
  'BLACKOUT', 'LIGHT_FADE_IN', 'LIGHT_FADE_OUT', 'COLOR_CHANGE',
  'AMBIENCE_IN', 'STAR_BIRTH', 'STAR_PASSING', 'STAR_DESCENT', 'IMPACT',
  'FOREST_GREEN', 'SUN_RAYS', 'MEMORY_IN', 'MEMORY_CHORUS', 'BUTTERFLY',
  'WATER_TOUCH', 'OCEAN_BLUE', 'WHALE_PASS', 'ASCEND', 'SURFACE_BREAK',
  'SUNSET_AMBER', 'PLANE', 'NIGHT_FALL', 'GALAXY_PURPLE', 'STAR_RETURN',
  'FINAL_REVEAL', 'RED_ROOM', 'IDLE_INTERACTIVE'
];

export const OPENING = {
  id: 'opening',
  name: 'THE FIRST LIGHT',
  subtitle: 'Opening cinematográfico',
  duration: 300,
  scenes: [
    // ───────────────────────── ESCENA 001 ─────────────────────────
    {
      id: 's001',
      number: '001',
      name: 'ABSOLUTE DARKNESS',
      start: 0,
      end: 35,
      world: 'void',
      note: 'Negro absoluto. Nace un punto de luz. Debe dudar de si ya empezó.',
      params: { starPhase: 'seed' },
      camera: [
        { t: 0,  pos: [0, 0, 60], target: [0, 0, 0], fov: 42, ease: 'linear' },
        { t: 18, pos: [0, 0, 60], target: [0, 0, 0], fov: 42, ease: 'easeInOutCubic' },
        { t: 28, pos: [0, 0, 38], target: [0, 0, 0], fov: 42, ease: 'easeInOutCubic' },
        { t: 35, pos: [0, 0.4, 22], target: [0, 0, 0], fov: 42, ease: 'easeInOutCubic' }
      ],
      cues: [
        { t: 0,  type: 'BLACKOUT',      dur: 0.5 },
        { t: 8,  type: 'AMBIENCE_IN',   dur: 10 },
        { t: 28, type: 'LIGHT_FADE_IN', dur: 7, color: '#9FD8FF', intensity: 0.06, group: 'hue' }
      ],
      audio: [
        { t: 8,  layer: 'pad',    action: 'fadeIn', dur: 12, to: 0.18 },
        { t: 22, layer: 'pad',    action: 'ramp',   dur: 13, to: 0.4 },
        { t: 18, layer: 'sparkle', action: 'fadeIn', dur: 6, to: 0.2 }
      ]
    },
    // ───────────────────────── ESCENA 002 ─────────────────────────
    {
      id: 's002',
      number: '002',
      name: 'THE SHOOTING STAR',
      start: 35,
      end: 75,
      world: 'void',
      note: 'La estrella nace, viaja en curva por el stage y despierta zonas de luz.',
      params: { starPhase: 'travel' },
      camera: [
        { t: 35, pos: [0, 0.4, 22],  target: [0, 0, 0],    fov: 42, ease: 'easeOutCubic' },
        { t: 42, pos: [2, 1.2, 30],  target: [0, 0, 0],    fov: 46, ease: 'easeInOutCubic' },
        { t: 58, pos: [-6, 3, 26],   target: [6, 2, -10],  fov: 48, ease: 'easeInOutCubic' },
        { t: 68, pos: [-2, 5, 20],   target: [4, -2, -14], fov: 46, ease: 'easeInOutCubic' },
        { t: 75, pos: [0, 7, 16],    target: [0, -6, -10], fov: 44, ease: 'easeInOutCubic' }
      ],
      cues: [
        { t: 35, type: 'STAR_BIRTH',   dur: 1.5 },
        { t: 42, type: 'STAR_PASSING', dur: 16, color: '#9FD8FF', intensity: 0.22, group: 'hue', sweep: true },
        { t: 68, type: 'STAR_DESCENT', dur: 7 }
      ],
      audio: [
        { t: 35, layer: 'impact',  action: 'play', gain: 0.5 },
        { t: 42, layer: 'whoosh',  action: 'play', gain: 0.45 },
        { t: 42, layer: 'pad',     action: 'ramp', dur: 16, to: 0.6 },
        { t: 68, layer: 'strings', action: 'fadeIn', dur: 7, to: 0.35 }
      ]
    },
    // ───────────────────────── ESCENA 003 ─────────────────────────
    {
      id: 's003',
      number: '003',
      name: 'THE BIRTH OF NATURE',
      start: 75,
      end: 130,
      world: 'garden',
      transitionIn: { via: 'light-wave', duration: 2.5 },
      note: 'Impacto, un brote, raíces de luz, propagación, dosel sobre nosotros.',
      params: { growth: 'auto' },
      camera: [
        { t: 75,  pos: [0, 3.2, 9],    target: [0, 0.2, 0],   fov: 44, ease: 'easeOutCubic' },
        { t: 80,  pos: [0, 0.55, 2.0], target: [0, 0.35, 0],  fov: 34, ease: 'easeInOutCubic' },
        { t: 92,  pos: [0.6, 0.9, 3.0], target: [0, 0.9, 0],  fov: 36, ease: 'easeInOutCubic' },
        { t: 112, pos: [4.0, 5.2, 15],  target: [0, 2.2, 0],  fov: 46, ease: 'easeInOutCubic' },
        { t: 122, pos: [2.2, 3.4, 11],  target: [-2, 1.8, -4], fov: 44, ease: 'easeInOutCubic' },
        { t: 130, pos: [-2.0, 2.6, 6],  target: [-4, 1.8, -6], fov: 42, ease: 'easeInOutCubic' }
      ],
      cues: [
        { t: 75,  type: 'IMPACT',       dur: 1.2 },
        { t: 80,  type: 'FOREST_GREEN', dur: 12, color: '#2F6B4F', intensity: 0.15, group: 'hue' },
        { t: 92,  type: 'FOREST_GREEN', dur: 20, color: '#7FC79A', intensity: 0.35, group: 'all' },
        { t: 112, type: 'SUN_RAYS',     dur: 18, color: '#FFD98A', intensity: 0.3, group: 'par' }
      ],
      audio: [
        { t: 75,  layer: 'impact',  action: 'play', gain: 0.7 },
        { t: 78,  layer: 'forest',  action: 'fadeIn', dur: 14, to: 0.4 },
        { t: 92,  layer: 'strings', action: 'ramp', dur: 20, to: 0.55 },
        { t: 112, layer: 'pad',     action: 'ramp', dur: 18, to: 0.5 }
      ]
    },
    // ───────────────────────── ESCENA 004 ─────────────────────────
    {
      id: 's004',
      number: '004',
      name: 'MEMORIES ARE GROWING',
      start: 130,
      end: 185,
      world: 'garden',
      note: 'La naturaleza construye, sostiene y abraza las fotografías.',
      params: { growth: 'full', memories: true },
      camera: [
        { t: 130, pos: [-2.0, 2.6, 6],  target: [-4, 1.8, -6],  fov: 42, ease: 'easeInOutCubic' },
        { t: 142, pos: [-3.4, 1.8, 2.2], target: [-4.2, 1.7, -2], fov: 34, ease: 'easeInOutCubic' },
        { t: 156, pos: [1.2, 1.9, 2.6],  target: [2.6, 1.9, -3],  fov: 34, ease: 'easeInOutCubic' },
        { t: 172, pos: [4.4, 1.4, 2.0],  target: [5.2, 1.1, -2.4], fov: 32, ease: 'easeInOutCubic' },
        { t: 185, pos: [0, 4.0, 14],     target: [0, 2.2, 0],     fov: 46, ease: 'easeInOutCubic' }
      ],
      cues: [
        { t: 130, type: 'MEMORY_IN',     dur: 3, color: '#FFD98A', intensity: 0.35, group: 'hue', index: 0 },
        { t: 144, type: 'MEMORY_IN',     dur: 3, index: 1 },
        { t: 158, type: 'MEMORY_IN',     dur: 3, index: 2 },
        { t: 172, type: 'MEMORY_CHORUS', dur: 8, color: '#FFD9A0', intensity: 0.45, group: 'all' }
      ],
      audio: [
        { t: 130, layer: 'piano',   action: 'fadeIn', dur: 6, to: 0.5 },
        { t: 172, layer: 'strings', action: 'ramp', dur: 10, to: 0.7 }
      ]
    },
    // ───────────────────────── ESCENA 005 ─────────────────────────
    {
      id: 's005',
      number: '005',
      name: 'THE WORLD OPENS',
      start: 185,
      end: 215,
      world: 'garden',
      note: 'Mariposa luminosa → lago → la superficie refleja galaxias → atravesamos.',
      params: { growth: 'full', memories: true, butterfly: true, lake: true },
      camera: [
        { t: 185, pos: [0, 4.0, 14],   target: [0, 2.2, 0],    fov: 46, ease: 'easeInOutCubic' },
        { t: 193, pos: [0.5, 2.4, 10], target: [0.5, 2.0, 2],  fov: 42, ease: 'easeInOutCubic' },
        { t: 205, pos: [0, 1.6, -6],   target: [0, 0.6, -16],  fov: 40, ease: 'easeInOutCubic' },
        { t: 211, pos: [0, 0.6, -14],  target: [0, -0.4, -18], fov: 44, ease: 'easeInOutCubic' },
        { t: 215, pos: [0, -1.8, -16], target: [0, -8, -18],   fov: 50, ease: 'easeInCubic' }
      ],
      cues: [
        { t: 185, type: 'BUTTERFLY',   dur: 2 },
        { t: 205, type: 'WATER_TOUCH', dur: 3, color: '#7FE3FF', intensity: 0.3, group: 'hue' },
        { t: 211, type: 'OCEAN_BLUE',  dur: 6, color: '#0A6E8C', intensity: 0.3, group: 'all' }
      ],
      audio: [
        { t: 205, layer: 'water',  action: 'play', gain: 0.6 },
        { t: 211, layer: 'forest', action: 'fadeOut', dur: 4 },
        { t: 211, layer: 'ocean',  action: 'fadeIn', dur: 6, to: 0.5 },
        { t: 211, layer: 'lowpass', action: 'set', to: 0.35 }
      ],
      transitionOut: { via: 'dive', duration: 4 }
    },
    // ───────────────────────── ESCENA 006 ─────────────────────────
    {
      id: 's006',
      number: '006',
      name: 'THE OCEAN',
      start: 215,
      end: 250,
      world: 'ocean',
      note: 'Descenso, bancos de peces, medusas. Ballena en STORY y otra en CEILING.',
      params: { fishDensity: 1, luminosity: 1, depth: 1, speed: 1 },
      camera: [
        { t: 215, pos: [0, 10, 24],  target: [0, 2, 0],    fov: 50, ease: 'easeOutCubic' },
        { t: 224, pos: [0, 0, 20],   target: [0, -1, 0],   fov: 46, ease: 'easeInOutCubic' },
        { t: 236, pos: [-6, -2, 18], target: [2, -2, -4],  fov: 44, ease: 'easeInOutCubic' },
        { t: 246, pos: [-2, -1, 16], target: [4, 3, -6],   fov: 46, ease: 'easeInOutCubic' },
        { t: 250, pos: [0, 2, 14],   target: [2, 12, -8],  fov: 48, ease: 'easeInOutCubic' }
      ],
      cues: [
        { t: 215, type: 'OCEAN_BLUE', dur: 9, color: '#063D56', intensity: 0.3, group: 'all' },
        { t: 236, type: 'WHALE_PASS', dur: 10, color: '#7FE3FF', intensity: 0.22, group: 'hue' },
        { t: 246, type: 'ASCEND',     dur: 4 }
      ],
      audio: [
        { t: 215, layer: 'ocean', action: 'ramp', dur: 9, to: 0.65 },
        { t: 236, layer: 'whale', action: 'play', gain: 0.55 },
        { t: 246, layer: 'pad',   action: 'ramp', dur: 6, to: 0.6 }
      ]
    },
    // ───────────────────────── ESCENA 007 ─────────────────────────
    {
      id: 's007',
      number: '007',
      name: 'THE SKY BEYOND',
      start: 250,
      end: 275,
      world: 'sky',
      transitionIn: { via: 'surface-break', duration: 3 },
      note: 'Rompemos la superficie. El agua se convierte en nubes. Avión. Cae la noche.',
      params: { timeOfDay: 'sunset' },
      camera: [
        { t: 250, pos: [0, -6, 14],  target: [0, 6, 0],    fov: 48, ease: 'easeOutCubic' },
        { t: 257, pos: [0, 6, 16],   target: [0, 7, -6],   fov: 44, ease: 'easeInOutCubic' },
        { t: 264, pos: [-4, 11, 18], target: [3, 10, -10], fov: 42, ease: 'easeInOutCubic' },
        { t: 270, pos: [0, 18, 16],  target: [0, 22, -12], fov: 46, ease: 'easeInOutCubic' },
        { t: 275, pos: [0, 30, 12],  target: [0, 42, -18], fov: 52, ease: 'easeInOutCubic' }
      ],
      cues: [
        { t: 250, type: 'SURFACE_BREAK', dur: 3 },
        { t: 257, type: 'SUNSET_AMBER',  dur: 10, color: '#FFD9A0', intensity: 0.42, group: 'all' },
        { t: 264, type: 'PLANE',         dur: 6 },
        { t: 270, type: 'NIGHT_FALL',    dur: 8, color: '#2A3B6B', intensity: 0.15, group: 'all' }
      ],
      audio: [
        { t: 250, layer: 'lowpass', action: 'set', to: 1.0 },
        { t: 250, layer: 'ocean',   action: 'fadeOut', dur: 5 },
        { t: 252, layer: 'wind',    action: 'fadeIn', dur: 8, to: 0.45 },
        { t: 264, layer: 'plane',   action: 'play', gain: 0.3 },
        { t: 270, layer: 'strings', action: 'ramp', dur: 10, to: 0.6 }
      ]
    },
    // ───────────────────────── ESCENA 008 ─────────────────────────
    {
      id: 's008',
      number: '008',
      name: 'THE UNIVERSE',
      start: 275,
      end: 300,
      world: 'cosmos',
      transitionIn: { via: 'nightfall', duration: 4 },
      note: 'Galaxia, nave lejana, regresa la estrella, revelación UNIVERSO 1/1.',
      params: { travel: true },
      camera: [
        { t: 275, pos: [0, 0, 40],   target: [0, 0, 0],   fov: 52, ease: 'easeOutCubic' },
        { t: 284, pos: [0, 2, 10],   target: [0, 1, -30], fov: 54, ease: 'easeInOutCubic' },
        { t: 289, pos: [0, 0.5, -6], target: [0, 0, -40], fov: 48, ease: 'easeInOutCubic' },
        { t: 294, pos: [0, 0, -18],  target: [0, 0, -46], fov: 42, ease: 'easeOutCubic' },
        { t: 300, pos: [0, 0, -22],  target: [0, 0, -48], fov: 40, ease: 'easeInOutCubic' }
      ],
      cues: [
        { t: 275, type: 'GALAXY_PURPLE', dur: 10, color: '#B06BFF', intensity: 0.12, group: 'all' },
        { t: 289, type: 'STAR_RETURN',   dur: 5 },
        { t: 294, type: 'FINAL_REVEAL',  dur: 6, color: '#FFD9A0', intensity: 0.6, group: 'all' },
        { t: 300, type: 'IDLE_INTERACTIVE', dur: 2 }
      ],
      audio: [
        { t: 275, layer: 'space',   action: 'fadeIn', dur: 8, to: 0.5 },
        { t: 275, layer: 'wind',    action: 'fadeOut', dur: 6 },
        { t: 289, layer: 'strings', action: 'ramp', dur: 6, to: 0.85 },
        { t: 294, layer: 'climax',  action: 'play', gain: 0.9 }
      ],
      // Al terminar NO corta a negro: se disuelve en el mundo explorable.
      endBehaviour: { mode: 'dissolve-to-world', world: 'cosmos', interactive: true }
    }
  ],
  markers: [
    { t: 0,   label: 'Oscuridad' },
    { t: 35,  label: 'Estrella' },
    { t: 75,  label: 'Impacto' },
    { t: 130, label: 'Recuerdos' },
    { t: 185, label: 'Mariposa' },
    { t: 215, label: 'Océano' },
    { t: 236, label: 'Ballena' },
    { t: 250, label: 'Cielo' },
    { t: 275, label: 'Cosmos' },
    { t: 294, label: 'REVELACIÓN' }
  ],
  /**
   * Pausas interactivas: el reloj narrativo se detiene y espera una acción,
   * pero el ambiente sigue vivo. Vacío por defecto en la v1 automática;
   * se activan desde el panel (toggle "Pausas interactivas").
   */
  interactiveHolds: [
    { t: 128, id: 'touch-plant',  prompt: 'Toca una planta para que crezca', optional: true },
    { t: 183, id: 'pick-memory',  prompt: 'Elige un recuerdo', optional: true },
    { t: 292, id: 'follow-star',  prompt: 'Sigue la estrella', optional: true }
  ]
};

/** Mundos de biblioteca: se activan desde el panel como ambiente continuo. */
export const WORLD_LIBRARY = [
  { id: 'sky',     code: 'A', label: 'INFINITE SKY',    variants: ['day', 'sunset', 'night'], defaultVariant: 'sunset' },
  { id: 'ocean',   code: 'B', label: 'DEEP OCEAN',      variants: ['shallow', 'deep', 'abyss'], defaultVariant: 'deep' },
  { id: 'garden',  code: 'C', label: 'ENCHANTED JUNGLE', variants: ['day', 'night', 'magic'], defaultVariant: 'magic' },
  { id: 'cosmos',  code: 'D', label: 'THE COSMOS',      variants: ['nebula', 'travel', 'planets'], defaultVariant: 'nebula' },
  { id: 'sky',     code: 'E', label: 'CLOUD NINE',      variants: ['dawn', 'golden'], defaultVariant: 'golden', preset: 'cloudnine' },
  { id: 'redroom', code: 'F', label: 'THE RED ROOM',    variants: ['romantic', 'intimate', 'cinematic', 'custom'], defaultVariant: 'romantic' },
  { id: 'memories', code: 'G', label: 'OUR MEMORIES',   variants: ['nature', 'stars', 'gallery'], defaultVariant: 'nature' }
];

export function sceneAt(showTime, show = OPENING) {
  const list = show.scenes;
  for (let i = 0; i < list.length; i++) {
    if (showTime >= list[i].start && showTime < list[i].end) return list[i];
  }
  return showTime >= show.duration ? list[list.length - 1] : list[0];
}

export function sceneIndexAt(showTime, show = OPENING) {
  const s = sceneAt(showTime, show);
  return show.scenes.indexOf(s);
}

export default OPENING;

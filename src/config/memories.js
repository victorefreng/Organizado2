/**
 * RECUERDOS — el ÚNICO archivo que hay que editar para cambiar fotos y mensajes.
 *
 * Al sustituir una imagen, el motor actualiza automáticamente todas las escenas que
 * la usan y conserva la animación: las escenas referencian el `id`, no el archivo.
 *
 * IMPORTANTE: todas las entradas de abajo son PLACEHOLDERS generados
 * proceduralmente (tools/make-placeholders.mjs). No son fotografías reales y están
 * marcadas visualmente como tal. Sustituir `src` por las fotos reales en
 * /public/assets/memories/ y poner `placeholder: false`.
 *
 * Reglas del motor con las imágenes:
 *  - La relación de aspecto original SIEMPRE se preserva (encaje tipo `cover`
 *    dentro del marco orgánico). Nunca se estira ni se deforman los rostros.
 *  - `focus` indica dónde está lo importante (0..1 en x,y) para el recorte.
 */

/** Tipos de animación de entrada disponibles (implementados en fx/PhotoFrame.js). */
export const MEMORY_ANIMATIONS = [
  'branch-frame',   // una rama crece, se curva y rodea el vacío; la foto emerge dentro
  'trunk-open',     // la corteza de un árbol se abre y revela la foto
  'floating',       // flota a media distancia sostenida por lianas luminosas
  'stone-light',    // sobre una piedra con musgo, iluminada por un haz
  'canopy-lantern', // colgada del dosel como farolillo, desenfocada
  'star-window',    // dentro de una estrella (mundo cosmos)
  'light-frame'     // marco luminoso puro (mundo memories/gallery)
];

export const MEMORIES = [
  {
    id: 'mem-01',
    type: 'image',
    src: '/assets/memories/placeholder-01.png',
    placeholder: true,
    title: 'Recuerdo 01',
    description: 'Placeholder — sustituir por fotografía real.',
    date: null,
    order: 1,
    world: 'garden',
    animation: 'branch-frame',
    // Posición en el stage virtual del mundo (metros)
    position: [-4.2, 1.7, -2.4],
    rotation: [0, 0.35, 0],
    scale: 1.0,
    screenDuration: 12,
    focus: [0.5, 0.45],
    message: 'El día que todo empezó.'
  },
  {
    id: 'mem-02',
    type: 'image',
    src: '/assets/memories/placeholder-02.png',
    placeholder: true,
    title: 'Recuerdo 02',
    description: 'Placeholder — sustituir por fotografía real.',
    date: null,
    order: 2,
    world: 'garden',
    animation: 'trunk-open',
    position: [2.6, 1.9, -3.2],
    rotation: [0, -0.4, 0],
    scale: 1.0,
    screenDuration: 12,
    focus: [0.5, 0.42],
    message: 'Tu risa es mi lugar favorito.'
  },
  {
    id: 'mem-03',
    type: 'image',
    src: '/assets/memories/placeholder-03.png',
    placeholder: true,
    title: 'Recuerdo 03',
    description: 'Placeholder — sustituir por fotografía real.',
    date: null,
    order: 3,
    world: 'garden',
    animation: 'stone-light',
    position: [5.2, 1.0, -2.6],
    rotation: [0, -0.7, 0],
    scale: 0.95,
    screenDuration: 12,
    focus: [0.5, 0.5],
    message: 'Aquel viaje.'
  },
  {
    id: 'mem-04',
    type: 'image',
    src: '/assets/memories/placeholder-04.png',
    placeholder: true,
    title: 'Recuerdo 04',
    description: 'Placeholder — sustituir por fotografía real.',
    date: null,
    order: 4,
    world: 'garden',
    animation: 'floating',
    position: [-7.5, 3.0, -8.0],
    rotation: [0, 0.5, 0],
    scale: 0.85,
    screenDuration: 10,
    focus: [0.5, 0.45],
    message: null
  },
  {
    id: 'mem-05',
    type: 'image',
    src: '/assets/memories/placeholder-05.png',
    placeholder: true,
    title: 'Recuerdo 05',
    description: 'Placeholder — sustituir por fotografía real.',
    date: null,
    order: 5,
    world: 'garden',
    animation: 'canopy-lantern',
    position: [1.5, 5.5, -6.0],
    rotation: [0, -0.2, 0],
    scale: 0.7,
    screenDuration: 8,
    focus: [0.5, 0.5],
    message: null
  },
  {
    id: 'mem-06',
    type: 'image',
    src: '/assets/memories/placeholder-06.png',
    placeholder: true,
    title: 'Recuerdo 06',
    description: 'Placeholder — sustituir por fotografía real.',
    date: null,
    order: 6,
    world: 'memories',
    animation: 'star-window',
    position: [0, 1.2, -8.0],
    rotation: [0, 0, 0],
    scale: 1.1,
    screenDuration: 10,
    focus: [0.5, 0.45],
    message: 'Siempre.'
  }
];

/** Mensajes editables del show (no van dentro de los recuerdos). */
export const MESSAGES = {
  title: 'UNIVERSO 1/1',
  finalMessage: 'Este universo existe solo para ti.',
  // Se muestra en el modo interactivo tras el opening
  idleHint: ''
};

/** Videos personales (vacío por ahora; misma estructura que MEMORIES con type:'video'). */
export const PERSONAL_VIDEOS = [];

export function memoriesForWorld(worldId) {
  return MEMORIES.filter((m) => m.world === worldId).sort((a, b) => a.order - b.order);
}

export function memoryById(id) {
  return MEMORIES.find((m) => m.id === id) || null;
}

export default MEMORIES;

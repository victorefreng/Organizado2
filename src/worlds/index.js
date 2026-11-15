/** Registro de mundos. Añadir uno aquí no requiere tocar el motor. */
import voidWorld from './void.js';
import garden from './garden.js';
import ocean from './ocean.js';
import sky from './sky.js';
import cosmos from './cosmos.js';
import redroom from './redroom.js';
import memories from './memories.js';

export const WORLDS = {
  void: voidWorld,
  garden,
  ocean,
  sky,
  cosmos,
  redroom,
  memories
};

export function getWorld(id) {
  return WORLDS[id] || WORLDS.void;
}

export default WORLDS;

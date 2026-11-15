/**
 * WORLD F: THE RED ROOM — universo independiente y OPCIONAL.
 * No aparece nunca en el opening automáticamente (requisito del brief).
 */
import * as THREE from 'three';
import { PALETTE } from '../config/palette.js';
import { applyFog } from '../fx/common.js';
import { RedRoom, RED_ROOM_PRESETS } from '../fx/RedRoom.js';

export default {
  id: 'redroom',
  label: 'THE RED ROOM',
  palette: PALETTE.redroom,
  /** Nunca se activa desde el timeline del opening. Solo manualmente. */
  optional: true,
  excludeFromOpening: true,
  presets: RED_ROOM_PRESETS,
  params: { preset: 'romantic', ...RED_ROOM_PRESETS.romantic },

  build({ scene, surface, quality, rng, variant = 'romantic' }) {
    const h = { surface };
    scene.background = new THREE.Color(PALETTE.redroom.base);
    h.fog = applyFog(scene, PALETTE.redroom);
    h.room = new RedRoom({ rng, preset: variant, palette: PALETTE.redroom, quality });
    scene.add(h.room.group);
    h.ambient = new THREE.AmbientLight(new THREE.Color(PALETTE.redroom.wine), 0.25);
    scene.add(h.ambient);
    return h;
  },

  update({ handles: h, ambientTime, dt, params = {}, focus = 14 }) {
    if (params.preset && params.preset !== h.room.presetName) h.room.setPreset(params.preset);
    // parámetros sueltos del panel (custom)
    const live = {};
    for (const k of ['hue', 'saturation', 'brightness', 'speed', 'amberMix', 'foldDepth', 'dustIntensity', 'shadowContrast']) {
      if (params[k] !== undefined) live[k] = params[k];
    }
    if (Object.keys(live).length) h.room.setParams(live);
    h.room.update({ ambientTime, dt, focus, intensity: 1 });
    h.ambient.intensity = 0.15 + h.room.params.brightness * 0.2;
  },

  cameraRig({ ambientTime, handles }) {
    return handles?.room
      ? handles.room.cameraRig({ ambientTime })
      : { position: [0, 1.4, 8], target: [0, 1, 0], fov: 46 };
  },

  dispose(h) { h.room?.dispose(); }
};

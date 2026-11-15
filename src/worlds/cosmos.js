/**
 * WORLD: THE COSMOS — escena 008, WORLD D y mundo explorable final.
 * Aquí regresa la estrella del inicio y se revela UNIVERSO 1/1.
 */
import * as THREE from 'three';
import { PALETTE } from '../config/palette.js';
import { applyFog } from '../fx/common.js';
import { StarField, Nebula, Planet, Starship, WarpStreaks } from '../fx/Cosmos.js';
import { ShootingStar } from '../fx/ShootingStar.js';
import { TitleReveal } from '../fx/TitleReveal.js';
import { MESSAGES } from '../config/memories.js';
import { clamp01, smoothstep, lerp, ease } from '../core/easing.js';

const VARIANTS = {
  nebula:  { warp: 0,    planets: 2, ship: 1, nebulaI: 1.0 },
  travel:  { warp: 1,    planets: 1, ship: 0, nebulaI: 0.7 },
  planets: { warp: 0,    planets: 4, ship: 1, nebulaI: 0.6 }
};

/** Trayectoria del regreso de la estrella: viene de frente hacia nosotros. */
const RETURN_PATH = [
  new THREE.Vector3(0, 0, -160),
  new THREE.Vector3(10, 6, -120),
  new THREE.Vector3(-8, -4, -86),
  new THREE.Vector3(6, 3, -62),
  new THREE.Vector3(0, 0, -48)
];

export default {
  id: 'cosmos',
  label: 'THE COSMOS',
  palette: PALETTE.cosmos,
  params: { nebulaIntensity: 1, warpSpeed: 0, variant: 'nebula' },

  build({ scene, surface, quality, rng, variant = 'nebula' }) {
    const h = { surface, variant };
    const V = VARIANTS[variant] || VARIANTS.nebula;
    h.V = V;
    scene.background = new THREE.Color(PALETTE.cosmos.base);
    h.fog = applyFog(scene, { ...PALETTE.cosmos, fogDensity: 0.0012 });

    h.stars = new StarField({ rng, count: quality.starCount, radius: 900, palette: PALETTE.cosmos });
    scene.add(h.stars.points);

    h.nebula = new Nebula({
      rng,
      patches: Math.max(30, Math.round(quality.instanceBudget / 42)),
      radius: 460,
      palette: PALETTE.cosmos
    });
    scene.add(h.nebula.mesh);

    h.planets = [];
    // Apartados del eje del título (que se forma en z=-48, centrado):
    // ningún planeta debe cruzar el encuadre de la revelación.
    const positions = [
      [230, -70, -300], [-280, 95, -420], [150, 180, -620], [-210, -150, -260]
    ];
    for (let i = 0; i < V.planets; i++) {
      const p = new Planet({
        rng, radius: [26, 38, 18, 30][i], ring: i % 2 === 0,
        palette: PALETTE.cosmos, seed: i * 7 + 3
      });
      p.group.position.fromArray(positions[i]);
      scene.add(p.group);
      h.planets.push(p);
    }

    if (V.ship) {
      h.ship = new Starship({ scale: 1.6, palette: PALETTE.cosmos });
      scene.add(h.ship.group);
    }

    h.warp = new WarpStreaks({ rng, count: Math.round(quality.particleBudget * 0.025), radius: 90, length: 520 });
    scene.add(h.warp.lines);

    // la estrella que regresa
    h.star = new ShootingStar({
      rng,
      trailCount: Math.min(2600, Math.round(quality.particleBudget * 0.06)),
      fragmentCount: 180,
      path: RETURN_PATH,
      scale: 1.3
    });
    h.star.addTo(scene);
    h.star.hide();

    // revelación del título
    h.title = new TitleReveal({
      rng,
      text: MESSAGES.title,
      message: MESSAGES.finalMessage,
      width: 26,
      step: quality.name === 'low' ? 5 : quality.name === 'ultra' ? 2 : 3
    });
    h.title.group.position.set(0, 0, -48);
    scene.add(h.title.group);

    return h;
  },

  update({ handles: h, showTime, ambientTime, dt, params = {}, focus = 60, mode = 'show' }) {
    const t = showTime;
    const V = h.V;
    const nebI = (params.nebulaIntensity ?? 1) * V.nebulaI;

    h.stars.update({ ambientTime, intensity: 1 });
    h.nebula.update({ ambientTime, intensity: nebI });
    for (const p of h.planets) p.update({ ambientTime, opacity: 1 });

    if (mode === 'library') {
      const warp = params.warpSpeed ?? V.warp;
      h.warp.update({ ambientTime, speed: warp * 160, opacity: warp });
      h.ship?.update({ t: ambientTime, opacity: 0.9, distance: 240, speed: 1 });
      h.star.hide();
      h.title.update({ p: 0 });
      return;
    }

    // ── ESCENA 008: 275→300 ──
    // viaje por la galaxia (275-284)
    const travel = smoothstep(275, 280, t) * (1 - smoothstep(286, 290, t));
    h.warp.update({ ambientTime, speed: travel * 120, opacity: travel * 0.55 });

    // nave lejana (284-289)
    h.ship?.update({
      t: (t - 280) * 1.4,
      opacity: smoothstep(283, 285, t) * (1 - smoothstep(289, 292, t)),
      distance: 260, speed: 1
    });

    // regreso de la estrella (289-295)
    const starOp = smoothstep(288, 290, t) * (1 - smoothstep(294.5, 296, t));
    if (starOp > 0.01) {
      const k = clamp01((t - 288) / 7);
      h.star.setProgress(ease('easeOutCubic', k), dt);
      h.star.update({ dt, intensity: starOp, emit: true, ambientTime, focus });
    } else {
      h.star.update({ dt, intensity: 0, emit: false, ambientTime, focus });
      if (t > 296) h.star.hide();
    }

    // revelación del título (294→300) y dispersión posterior (>300)
    // p: 0→0.5 convergen, 0.5→0.78 mensaje, 0.78→1 se dispersan en estrellas
    let p = 0;
    if (t >= 293) {
      p = clamp01((t - 293) / 7) * 0.78;
      if (t >= 300) {
        // el show terminó: dispersión suave hacia el mundo explorable
        p = 0.78 + clamp01((t - 300) / 6) * 0.22;
      }
    }
    h.title.update({ p, ambientTime, focus: 48 });
  },

  interact(h, { type, planetIndex }) {
    if (type === 'select-planet' && h.planets[planetIndex]) {
      const pos = h.planets[planetIndex].group.position;
      const r = h.planets[planetIndex].radius;
      return {
        position: [pos.x + r * 2.2, pos.y + r * 0.6, pos.z + r * 3.4],
        target: pos.toArray(),
        fov: 44
      };
    }
    return null;
  },

  setMessage(h, text) { h.title.setMessage(text, 26); },

  cameraRig({ ambientTime }) {
    // deriva libre lenta por el cosmos (mundo explorable tras el opening)
    const a = ambientTime * 0.008;
    return {
      position: [Math.sin(a) * 40, Math.sin(ambientTime * 0.03) * 10, Math.cos(a) * 40 - 20],
      target: [Math.sin(a + 1.9) * 90, Math.sin(ambientTime * 0.02) * 20, Math.cos(a + 1.9) * 90 - 120],
      fov: 54
    };
  },

  dispose(h) {
    h.stars?.dispose(); h.nebula?.dispose();
    h.planets?.forEach((p) => p.dispose());
    h.ship?.dispose(); h.warp?.dispose();
    h.star?.dispose(); h.title?.dispose();
  }
};

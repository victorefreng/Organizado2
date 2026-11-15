/**
 * WORLD: INFINITE SKY / CLOUD NINE — escena 007, WORLD A y WORLD E.
 * El agua se convierte en nubes: mismo lenguaje, otra densidad y otro color.
 */
import * as THREE from 'three';
import { PALETTE } from '../config/palette.js';
import { applyFog } from '../fx/common.js';
import { SkyDome, CloudField, BirdFlock, Airplane, MeteorShower, Aurora } from '../fx/Sky.js';
import { SuspendedParticles } from '../fx/Marine.js';
import { clamp01, smoothstep, lerp } from '../core/easing.js';

const VARIANTS = {
  day:     { tod: 0.35, drift: 1.4, aurora: 0,   meteors: 0,   birds: 1,   plane: 1 },
  sunset:  { tod: 0.6,  drift: 1.1, aurora: 0,   meteors: 0,   birds: 0.8, plane: 1 },
  night:   { tod: 0.95, drift: 0.7, aurora: 0.8, meteors: 1,   birds: 0.2, plane: 0.5 },
  dawn:    { tod: 0.12, drift: 1.0, aurora: 0.2, meteors: 0.2, birds: 0.6, plane: 0.6 },
  golden:  { tod: 0.52, drift: 0.8, aurora: 0,   meteors: 0,   birds: 0.9, plane: 1 }
};

export default {
  id: 'sky',
  label: 'INFINITE SKY',
  palette: PALETTE.sky,
  params: { drift: 1.1, timeOfDay: 0.6, variant: 'sunset' },

  build({ scene, surface, quality, rng, variant = 'sunset', preset = null }) {
    const h = { surface, variant, preset };
    const V = VARIANTS[variant] || VARIANTS.sunset;
    h.V = V;
    scene.background = new THREE.Color(PALETTE.sky.dusk);
    h.fog = applyFog(scene, { ...PALETTE.sky, fogDensity: 0.004 });

    h.dome = new SkyDome({ radius: 900, palette: PALETTE.sky });
    h.dome.setTimeOfDay(V.tod, PALETTE.sky);
    scene.add(h.dome.mesh);

    // Cloud Nine: más nubes, más bajas, más rosa
    const cn = preset === 'cloudnine';
    h.clouds = new CloudField({
      rng,
      layers: cn ? 6 : 5,
      perLayer: Math.max(10, Math.round(quality.instanceBudget / (cn ? 110 : 150))),
      spread: 420,
      height: cn ? [-20, 70] : [8, 130],
      palette: PALETTE.sky,
      scale: cn ? [80, 240] : [60, 190]
    });
    scene.add(h.clouds.mesh);

    // segunda capa de nubes, por encima: para el techo
    h.cloudsHigh = new CloudField({
      rng,
      layers: 3,
      perLayer: Math.max(6, Math.round(quality.instanceBudget / 260)),
      spread: 520,
      height: [150, 260],
      palette: PALETTE.sky,
      scale: [140, 320]
    });
    scene.add(h.cloudsHigh.mesh);

    h.birds = new BirdFlock({ rng, count: Math.max(12, Math.round(quality.instanceBudget / 170)), scale: 0.9 });
    scene.add(h.birds.mesh);
    h.birds2 = new BirdFlock({ rng, count: 16, scale: 0.6 });
    h.birds2.mesh.position.set(0, 20, -80);
    scene.add(h.birds2.mesh);

    h.plane = new Airplane({ palette: PALETTE.sky, scale: 1.1 });
    scene.add(h.plane.group);

    h.meteors = new MeteorShower({ rng, count: Math.max(10, Math.round(quality.particleBudget / 2200)), color: PALETTE.cosmos.stars, radius: 300 });
    scene.add(h.meteors.points);

    h.aurora = new Aurora({ rng, bands: 5 });
    h.aurora.setIntensity(V.aurora);
    scene.add(h.aurora.group);

    // motas de luz en el aire: lo que hace que el cielo tenga "aire"
    h.motes = new SuspendedParticles({
      rng, count: Math.round(quality.particleBudget * 0.02),
      radius: 160, height: 160, color: PALETTE.sky.cloudLit, size: 0.4
    });
    scene.add(h.motes.points);

    h.sun = new THREE.DirectionalLight(new THREE.Color(PALETTE.sky.gold), 0.9);
    h.sun.position.set(60, 20, -120);
    scene.add(h.sun);
    h.ambient = new THREE.HemisphereLight(new THREE.Color(PALETTE.sky.cloudLit), new THREE.Color(PALETTE.sky.dusk), 0.6);
    scene.add(h.ambient);

    return h;
  },

  update({ handles: h, showTime, ambientTime, dt, params = {}, focus = 40, mode = 'show' }) {
    const t = showTime;
    const V = h.V;

    if (mode === 'library') {
      const tod = params.timeOfDay ?? V.tod;
      h.dome.setTimeOfDay(tod, PALETTE.sky);
      h.dome.update({ ambientTime });
      const drift = params.drift ?? V.drift;
      h.clouds.update({ ambientTime, drift, opacity: 1 });
      h.cloudsHigh.update({ ambientTime, drift: drift * 0.5, opacity: 0.8 });
      h.birds.update({ ambientTime, opacity: V.birds, speed: 1, path: [0, 46, -130] });
      h.birds2.update({ ambientTime: ambientTime * 0.8 + 11, opacity: V.birds * 0.7, speed: 0.8, path: [0, 70, -200] });
      h.plane.update({ t: ambientTime, ambientTime, speed: 1, altitude: 52, opacity: V.plane, loop: 420 });
      h.meteors.update({ ambientTime, rate: V.meteors, intensity: V.meteors, focus });
      h.aurora.update({ ambientTime, intensity: V.aurora });
      h.motes.update({ dt, ambientTime, intensity: 0.5, focus });
      return;
    }

    // ── ESCENA 007: 250→275 ──
    // 250-257 rompemos la superficie; el cielo pasa de dorado a noche
    const tod = lerp(0.42, 0.9, smoothstep(262, 275, t));
    h.dome.setTimeOfDay(tod, PALETTE.sky);
    h.dome.update({ ambientTime });

    const cloudOp = smoothstep(252, 260, t);
    h.clouds.update({ ambientTime, drift: lerp(2.2, 0.9, smoothstep(252, 272, t)), opacity: cloudOp });
    h.cloudsHigh.update({ ambientTime, drift: 0.6, opacity: cloudOp * 0.8 });

    h.birds.update({
      ambientTime, speed: 1,
      opacity: smoothstep(256, 262, t) * (1 - smoothstep(272, 275, t)),
      path: [0, 46, -130]
    });
    h.birds2.update({ ambientTime: ambientTime * 0.8 + 11, speed: 0.8, opacity: smoothstep(256, 263, t) * 0.7, path: [0, 70, -200] });

    // el avión cruza en 264 (cue PLANE) y se aleja
    h.plane.update({
      t: (t - 262) * 1.0, ambientTime, speed: 1, altitude: 50,
      opacity: smoothstep(263, 266, t) * (1 - smoothstep(272, 276, t)),
      loop: 26
    });

    h.meteors.update({ ambientTime, rate: smoothstep(270, 275, t), intensity: smoothstep(270, 275, t) * 0.8, focus });
    h.aurora.setIntensity(smoothstep(271, 275, t) * 0.35);
    h.aurora.update({ ambientTime, intensity: smoothstep(271, 275, t) });
    h.motes.update({ dt, ambientTime, intensity: 0.4, focus });

    h.sun.intensity = lerp(1.0, 0.08, smoothstep(260, 275, t));
    h.ambient.intensity = lerp(0.7, 0.15, smoothstep(260, 275, t));
  },

  cameraRig({ ambientTime }) {
    const a = ambientTime * 0.01;
    return {
      position: [Math.sin(a) * 28, 44 + Math.sin(ambientTime * 0.04) * 4, Math.cos(a) * 28],
      target: [Math.sin(a + 2.6) * 60, 48, Math.cos(a + 2.6) * 60 - 60],
      fov: 50
    };
  },

  dispose(h) {
    h.dome?.dispose(); h.clouds?.dispose(); h.cloudsHigh?.dispose();
    h.birds?.dispose(); h.birds2?.dispose(); h.plane?.dispose();
    h.meteors?.dispose(); h.aurora?.dispose(); h.motes?.dispose();
  }
};

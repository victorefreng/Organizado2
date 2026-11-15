/**
 * WORLD: GARDEN / ENCHANTED JUNGLE — escenas 003, 004, 005 y WORLD C.
 *
 * Secuencia: impacto → un brote → raíces de luz → propagación → dosel →
 * recuerdos creciendo → mariposa → lago que refleja galaxias.
 */
import * as THREE from 'three';
import { PALETTE } from '../config/palette.js';
import { applyFog, softSprite } from '../fx/common.js';
import { GrowthField, LightRoots, Fireflies, Canopy } from '../fx/Plants.js';
import { MemoryGarden } from '../fx/PhotoFrame.js';
import { EnergyWave } from '../fx/ShootingStar.js';
import { LightShafts } from '../fx/Marine.js';
import { Butterfly } from '../fx/Butterfly.js';
import { WaterSurface } from '../fx/Water.js';
import { memoriesForWorld } from '../config/memories.js';
import { clamp01, ease, smoothstep, lerp } from '../core/easing.js';

const VARIANTS = {
  day:   { fogDensity: 0.016, ambient: 0.55, shafts: 0.9,  fireflies: 0.0, sunColor: '#FFD98A' },
  night: { fogDensity: 0.03,  ambient: 0.14, shafts: 0.12, fireflies: 1.0, sunColor: '#9FD8FF' },
  magic: { fogDensity: 0.024, ambient: 0.3,  shafts: 0.5,  fireflies: 0.8, sunColor: '#FFD98A' }
};

export default {
  id: 'garden',
  label: 'ENCHANTED JUNGLE',
  palette: PALETTE.garden,
  params: { wind: 0.12, density: 1, growthScale: 1, variant: 'magic' },

  build({ scene, surface, quality, rng, assets, nodes = [], variant = 'magic' }) {
    const h = { surface, variant };
    const V = VARIANTS[variant] || VARIANTS.magic;
    scene.background = new THREE.Color(PALETTE.garden.base);
    h.fog = applyFog(scene, { ...PALETTE.garden, fogDensity: V.fogDensity });

    // suelo
    const groundGeo = new THREE.CircleGeometry(90, 72);
    h.groundMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSoil: { value: new THREE.Color(PALETTE.garden.soil) },
        uMoss: { value: new THREE.Color(PALETTE.garden.foliageDark) },
        uGlow: { value: new THREE.Color(PALETTE.garden.sprout) },
        uImpact: { value: 0 },
        uAmbient: { value: V.ambient }
      },
      vertexShader: `varying vec2 vUv; varying vec3 vP;
        void main(){ vUv=uv; vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `
        uniform vec3 uSoil, uMoss, uGlow; uniform float uTime, uImpact, uAmbient;
        varying vec2 vUv; varying vec3 vP;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
        float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){s+=noise(p)*a;p*=2.07;a*=0.5;} return s; }
        void main(){
          float n = fbm(vP.xy * 0.35);
          vec3 c = mix(uSoil, uMoss, smoothstep(0.25, 0.8, n)) * 2.1;
          // manchas de musgo iluminado: dan lectura de suelo en vez de vacío
          c += uMoss * pow(max(0.0, n - 0.55), 1.5) * 1.6;
          // cráter incandescente del impacto, que se apaga
          float d = length(vP.xy);
          c += uGlow * exp(-d * 0.55) * uImpact * 2.2;
          c *= 0.75 + uAmbient * 1.6;
          // oscurecimiento hacia el borde: el jardín se pierde en la niebla
          c *= 1.0 - smoothstep(14.0, 56.0, d) * 0.9;
          gl_FragColor = vec4(c, 1.0);
        }
      `
    });
    h.ground = new THREE.Mesh(groundGeo, h.groundMat);
    h.ground.rotation.x = -Math.PI / 2;
    scene.add(h.ground);

    // Nodos de germinación: los genera el propio jardín, en su escala.
    // (Los nodos de VOID viven en la escala del viaje de la estrella —decenas de
    // metros— y reproyectarlos producía raíces que cruzaban todo el encuadre.)
    const nodeCount = 18;
    const nodeList = [];
    for (let i = 0; i < nodeCount; i++) {
      const a = (i / nodeCount) * Math.PI * 2 + rng.range(-0.22, 0.22);
      const r = 3.5 + Math.pow(rng(), 0.7) * 10.5;
      nodeList.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
    }
    h.nodeList = nodeList;
    h.roots = new LightRoots({ rng, origin: new THREE.Vector3(0, 0, 0), nodes: nodeList, color: PALETTE.garden.sprout });
    scene.add(h.roots.group);

    // vegetación: el presupuesto depende de la calidad y de la superficie
    const plantCount = Math.max(160, Math.round(quality.instanceBudget * 0.26));
    h.growth = new GrowthField({
      rng, count: plantCount, radius: 26,
      origin: new THREE.Vector3(0, 0, 0),
      palette: PALETTE.garden,
      segments: quality.plantSegments,
      spread: 7,
      nodes: nodeList,
      scale: 1
    });
    scene.add(h.growth.group);

    // DOSEL: lo que ve el proyector de techo. Sin esto, CEILING se queda vacío
    // porque toda la vegetación vive a elevaciones bajas respecto a su cámara.
    h.canopy = new Canopy({
      rng,
      count: Math.max(600, Math.round(quality.instanceBudget * 0.95)),
      radius: 26, height: 9.5, spreadY: 4.2,
      palette: PALETTE.garden, growthSpread: 9
    });
    scene.add(h.canopy.mesh);

    // haces de sol entre las hojas
    // Haces de sol: pocos, estrechos y MUY altos, para que entren por el dosel
    // y no aparezcan como cuerpos geométricos dentro del encuadre.
    h.shafts = new LightShafts({
      rng, count: Math.max(3, Math.round(quality.instanceBudget / 1100)),
      height: 46, radius: 13, color: PALETTE.garden.sun,
      spreadTop: 0.35, spreadBottom: 1.6
    });
    h.shafts.group.position.y = 24;
    scene.add(h.shafts.group);

    // luciérnagas
    h.fireflies = new Fireflies({
      rng, count: Math.max(60, Math.round(quality.particleBudget * 0.012)),
      radius: 26, height: 8, color: PALETTE.garden.accent, size: 1.4
    });
    scene.add(h.fireflies.points);

    // recuerdos
    h.memories = new MemoryGarden({
      memories: memoriesForWorld('garden'),
      assets, palette: PALETTE.garden, rng, maxSize: [2.6, 2.0]
    });
    scene.add(h.memories.group);

    // mariposa
    h.butterfly = new Butterfly({ rng, scale: 0.55 });
    scene.add(h.butterfly.group);

    // lago al fondo
    h.lake = new WaterSurface({ size: 76, segments: 96, palette: PALETTE.ocean, amp: 0.18, chop: 0.5 });
    h.lake.mesh.position.set(0, 0.05, -44);
    h.lake.mat.uniforms.uSky.value.set(PALETTE.garden.foliageDark);
    scene.add(h.lake.mesh);

    h.wave = new EnergyWave({ color: PALETTE.garden.sprout, maxRadius: 26 });
    scene.add(h.wave.mesh);

    h.ambientLight = new THREE.HemisphereLight(
      new THREE.Color(PALETTE.garden.sun), new THREE.Color(PALETTE.garden.soil), V.ambient * 1.5
    );
    scene.add(h.ambientLight);
    h.sunLight = new THREE.DirectionalLight(new THREE.Color(V.sunColor), V.shafts * 2.2);
    h.sunLight.position.set(8, 16, -6);
    scene.add(h.sunLight);
    // Contraluz cálido bajo: despega la vegetación del fondo y da profundidad.
    h.rimLight = new THREE.DirectionalLight(new THREE.Color(PALETTE.garden.sun), 0.9);
    h.rimLight.position.set(-10, 3, -16);
    scene.add(h.rimLight);

    h._impactDone = false;
    h.V = V;
    return h;
  },

  update({ handles: h, showTime, ambientTime, dt, params = {}, focus = 14, mode = 'show' }) {
    const t = showTime;
    const V = h.V;
    const wind = params.wind ?? 0.12;
    const growthScale = params.growthScale ?? 1;

    // ── modo biblioteca: jardín ya crecido, ambiente continuo ──
    if (mode === 'library') {
      h.growth.update({ growthTime: 40, ambientTime, wind, growthScale, opacity: 1 });
      h.canopy.update({ growthTime: 40, ambientTime, wind, opacity: 1, growthScale });
      h.roots.update({ progress: 1, ambientTime, opacity: 0.08 });
      h.groundMat.uniforms.uImpact.value = 0;
      h.fireflies.update({ ambientTime, intensity: V.fireflies, focus });
      h.shafts.update({ ambientTime, intensity: V.shafts });
      h.memories.update({ t: 99, ambientTime, chorus: 0.4, focus, reveal: params.memories === false ? 0 : 1 });
      h.butterfly.update({ p: (ambientTime * 0.03) % 1, ambientTime, opacity: 0.8 });
      h.lake.mesh.visible = true;
      h.lake.update({ ambientTime, dt, galaxy: 0.15, opacity: 1 });
      h.groundMat.uniforms.uTime.value = ambientTime;
      h.wave.update(dt);
      return;
    }

    // ── ESCENA 003: 75→130 ──
    // crecimiento narrativo: growthTime arranca en el impacto
    const growthTime = Math.max(0, t - 78);

    if (t >= 75 && t < 80 && !h._impactDone) {
      h._impactDone = true;
      h.wave.trigger(new THREE.Vector3(0, 0.05, 0), 3.2);
    }
    if (t < 75) h._impactDone = false;

    // destello del cráter
    h.groundMat.uniforms.uImpact.value = Math.max(0, 1 - Math.abs(t - 76.5) / 5) * 0.9;
    h.groundMat.uniforms.uTime.value = ambientTime;

    // raíces: corren entre 78 y 95
    h.roots.update({
      progress: clamp01((t - 78) / 17),
      ambientTime,
      opacity: smoothstep(78, 82, t) * (1 - smoothstep(100, 118, t))
    });

    h.growth.update({ growthTime, ambientTime, wind, growthScale, opacity: 1 });
    // el dosel se cierra sobre nosotros a partir de la propagación (shot 003.E)
    h.canopy.update({ growthTime: Math.max(0, growthTime - 6), ambientTime, wind, opacity: 1, growthScale });

    // haces de sol entran en 112 (cue SUN_RAYS)
    h.shafts.update({ ambientTime, intensity: smoothstep(108, 124, t) * V.shafts });
    h.sunLight.intensity = smoothstep(104, 126, t) * V.shafts * 2.2;
    h.rimLight.intensity = smoothstep(100, 124, t) * 1.1;
    h.ambientLight.intensity = lerp(0.06, V.ambient * 1.5, smoothstep(80, 118, t));

    h.fireflies.update({
      ambientTime,
      intensity: smoothstep(100, 125, t) * (V.fireflies || 0.6),
      focus
    });

    // ── ESCENA 004: 130→185. Los recuerdos crecen. ──
    const memT = t - 130;
    const chorus = Math.max(0, 1 - Math.abs(t - 178) / 7);
    h.memories.update({
      t: memT,
      ambientTime,
      chorus,
      focus,
      starts: [0, 14, 28, 6, 20, 0],
      reveal: smoothstep(128, 134, t)
    });

    // ── ESCENA 005: 185→215. Mariposa y lago. ──
    const bK = clamp01((t - 187) / 20);
    h.butterfly.update({
      p: bK,
      ambientTime,
      opacity: smoothstep(185, 190, t) * (1 - smoothstep(210, 214, t)),
      dt
    });
    // al tocar el agua (≈205) dispara la onda y empieza el reflejo de galaxias
    if (t >= 205 && !h._lakeTouched) {
      h._lakeTouched = true;
      const p = h.butterfly.position;
      h.lake.ripple(p.x, p.z + 24);
    }
    if (t < 205) h._lakeTouched = false;

    // El lago se descubre al alejarnos (escena 005). Antes no debe verse.
    h.lake.mesh.visible = t > 180;
    h.lake.update({
      ambientTime, dt,
      galaxy: smoothstep(205, 212, t),
      opacity: smoothstep(180, 192, t),
      amp: lerp(0.18, 0.4, smoothstep(205, 215, t))
    });

    h.wave.update(dt);
  },

  /** Interacción: tocar una planta para que crezca. */
  interact(h, { type, x, z, memoryId }) {
    if (type === 'touch-plant') return h.growth.boostAt(x, z, 2.2, 2.4);
    if (type === 'pick-memory') {
      const f = h.memories.frames.find((m) => m.memory.id === memoryId);
      if (f) { f.setSelected(true); return f.cameraTarget; }
    }
    return null;
  },

  cameraRig({ ambientTime }) {
    // deriva para el modo biblioteca
    const a = ambientTime * 0.028;
    return {
      position: [Math.sin(a) * 11, 2.6 + Math.sin(ambientTime * 0.07) * 0.6, Math.cos(a) * 11],
      target: [Math.sin(a + 2.1) * 4, 2.0, Math.cos(a + 2.1) * 4],
      fov: 44
    };
  },

  dispose(h) {
    h.growth?.dispose();
    h.canopy?.dispose();
    h.roots?.dispose();
    h.fireflies?.dispose();
    h.shafts?.dispose();
    h.memories?.dispose();
    h.butterfly?.dispose();
    h.lake?.dispose();
    h.wave?.dispose();
    h.ground?.geometry.dispose();
    h.groundMat?.dispose();
  }
};

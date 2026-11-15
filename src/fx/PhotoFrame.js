/**
 * RECUERDOS DENTRO DE ESTRUCTURAS NATURALES.
 *
 * Regla dura del brief: las fotografías NO se deforman. El marco se adapta a la
 * foto, nunca al contrario:
 *   1. Se lee la relación de aspecto real de la imagen al cargarla.
 *   2. El plano se dimensiona para ENCAJAR dentro de una caja máxima preservando
 *      esa relación (ajuste "contain"): cero estiramiento, cero recorte de rostros.
 *   3. La rama se genera alrededor del rectángulo resultante.
 *
 * La foto no "aparece": emerge por disolución luminosa controlada por un umbral de
 * ruido, mientras la rama la rodea y las flores brotan en el perímetro.
 */
import * as THREE from 'three';
import { softSprite, makeParticleMaterial, allocParticles, buildParticleGeometry, setColorAt } from './common.js';
import { clamp01, ease, lerp } from '../core/easing.js';
import { PALETTE } from '../config/palette.js';

const PHOTO_VS = /* glsl */`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Disolución luminosa: la imagen se revela por zonas según un ruido, con un borde
 * incandescente en el frente del revelado. Nunca un fade plano.
 */
const PHOTO_FS = /* glsl */`
  uniform sampler2D uMap;
  uniform float uReveal;      // 0..1
  uniform float uOpacity;
  uniform vec3  uGlow;
  uniform float uTime;
  uniform float uPlaceholder; // 1 = marcar visualmente como placeholder
  varying vec2 vUv;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }

  void main(){
    vec4 tex = texture2D(uMap, vUv);

    // El revelado avanza de abajo arriba, modulado por ruido: parece orgánico.
    // field en [0,1]: 0 = primero en aparecer (abajo), 1 = ultimo (arriba).
    float n = noise(vUv * 5.0) * 0.30 + noise(vUv * 17.0) * 0.12;
    float field = clamp((1.0 - vUv.y) * 0.62 + n, 0.0, 1.0);
    float edge = uReveal * 1.30 - 0.15;
    float rev = clamp(smoothstep(edge + 0.13, edge - 0.02, field), 0.0, 1.0);

    // borde incandescente en el frente del revelado
    float front = exp(-pow((field - edge) * 9.0, 2.0)) * step(0.02, uReveal) * (1.0 - uReveal * 0.3);
    vec3 c = tex.rgb * rev;
    c += uGlow * front * 0.85 * (1.0 - uReveal * 0.6);

    // viñeta suave: integra la foto en el entorno, sin bordes de "cuadro pegado"
    vec2 d = vUv - 0.5;
    float vig = 1.0 - smoothstep(0.34, 0.52, length(d * vec2(1.0, 1.08)));
    float a = rev * uOpacity * mix(0.55, 1.0, vig);

    // marca discreta de placeholder (franjas diagonales tenues)
    if (uPlaceholder > 0.5) {
      float s = sin((vUv.x + vUv.y) * 90.0);
      c = mix(c, uGlow * 0.5, smoothstep(0.96, 1.0, s) * 0.25 * rev);
    }

    if (a < 0.004) discard;
    gl_FragColor = vec4(c, a);
  }
`;

/** Curva de la rama: entra por una esquina, se extiende y rodea el vacío. */
function branchCurve(w, h, rng, variant = 0) {
  const pad = 0.16;
  const W = w / 2 + pad, H = h / 2 + pad;
  const jitter = (m) => (rng() - 0.5) * m;
  // arranca fuera de cuadro, abraza el rectángulo por 3 lados y se abre
  const pts = variant % 2 === 0
    ? [
        new THREE.Vector3(-W - 1.9, -H - 1.3, -0.05),
        new THREE.Vector3(-W - 0.7, -H - 0.3, 0.02),
        new THREE.Vector3(-W - 0.08 + jitter(0.06), -H * 0.2, 0.01),
        new THREE.Vector3(-W * 0.95, H * 0.75, 0.02),
        new THREE.Vector3(-W * 0.3, H + 0.1 + jitter(0.05), 0.01),
        new THREE.Vector3(W * 0.55, H + 0.06, 0.02),
        new THREE.Vector3(W + 0.08, H * 0.35, 0.01),
        new THREE.Vector3(W + 0.02, -H * 0.55, 0.02),
        new THREE.Vector3(W * 0.5, -H - 0.1, 0.01),
        new THREE.Vector3(-W * 0.15, -H - 0.14, 0.02),
        new THREE.Vector3(-W * 0.8, -H - 0.5, -0.04)
      ]
    : [
        new THREE.Vector3(W + 2.1, H + 1.2, -0.05),
        new THREE.Vector3(W + 0.6, H + 0.35, 0.02),
        new THREE.Vector3(W + 0.06, H * 0.2, 0.01),
        new THREE.Vector3(W * 0.92, -H * 0.7, 0.02),
        new THREE.Vector3(W * 0.2, -H - 0.1, 0.01),
        new THREE.Vector3(-W * 0.6, -H - 0.07, 0.02),
        new THREE.Vector3(-W - 0.08, -H * 0.3, 0.01),
        new THREE.Vector3(-W - 0.03, H * 0.5, 0.02),
        new THREE.Vector3(-W * 0.45, H + 0.1, 0.01),
        new THREE.Vector3(W * 0.25, H + 0.16, 0.02)
      ];
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

export class PhotoFrame {
  /**
   * @param o.memory      entrada de src/config/memories.js
   * @param o.textureInfo { texture, aspect, placeholder } de AssetManager
   * @param o.maxSize     [ancho, alto] de la caja máxima en metros
   */
  constructor(o = {}) {
    const {
      memory,
      textureInfo,
      maxSize = [2.6, 2.0],
      palette = PALETTE.garden,
      rng = Math.random,
      segments = 96,
      flowers = 22
    } = o;

    this.memory = memory;
    this.group = new THREE.Group();
    this.group.name = `memory-${memory.id}`;
    this.group.position.fromArray(memory.position || [0, 1.6, 0]);
    if (memory.rotation) this.group.rotation.fromArray(memory.rotation);
    const s = memory.scale ?? 1;
    this.group.scale.setScalar(s);

    // ── 1. dimensionar SIN deformar (ajuste contain) ──
    const aspect = textureInfo?.aspect || 1.5;
    const [mw, mh] = maxSize;
    let w = mw, h = mw / aspect;
    if (h > mh) { h = mh; w = mh * aspect; }
    this.width = w;
    this.height = h;
    this.aspect = aspect;

    // ── 2. la fotografía ──
    const planeGeo = new THREE.PlaneGeometry(w, h, 1, 1);
    this.photoMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: textureInfo?.texture || null },
        uReveal: { value: 0 },
        uOpacity: { value: 1 },
        uGlow: { value: new THREE.Color(palette.sun || '#FFD98A') },
        uTime: { value: 0 },
        uPlaceholder: { value: memory.placeholder ? 1 : 0 }
      },
      vertexShader: PHOTO_VS,
      fragmentShader: PHOTO_FS,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.photo = new THREE.Mesh(planeGeo, this.photoMat);
    this.group.add(this.photo);

    // halo detrás: integra la foto con el entorno y da volumen al aire
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softSprite(256, 1.5),
      color: new THREE.Color(palette.sun || '#FFD98A'),
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.halo.scale.set(w * 2.4, h * 2.4, 1);
    this.halo.position.z = -0.12;
    this.group.add(this.halo);

    // ── 3. la rama que crece y rodea ──
    const variant = ['branch-frame', 'trunk-open', 'floating', 'stone-light', 'canopy-lantern', 'star-window', 'light-frame']
      .indexOf(memory.animation || 'branch-frame');
    this.curve = branchCurve(w, h, rng, Math.max(0, variant));
    const tube = new THREE.TubeGeometry(this.curve, segments, 0.026, 5, false);
    // atributo de recorrido para revelar la rama progresivamente
    const count = tube.attributes.position.count;
    const along = new Float32Array(count);
    const radialSegs = 6, tubular = segments + 1;
    for (let i = 0; i < count; i++) along[i] = Math.floor(i / radialSegs) / Math.max(1, tubular - 1);
    tube.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
    this.branchMat = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uBase: { value: new THREE.Color(palette.foliageDark || '#1C4433') },
        uTip: { value: new THREE.Color(palette.foliageLit || '#7FC79A') },
        uGlow: { value: new THREE.Color(palette.sun || '#FFD98A') },
        uOpacity: { value: 1 }
      },
      vertexShader: `
        attribute float aAlong;
        varying float vAlong;
        varying vec3 vN;
        void main(){
          vAlong = aAlong;
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress, uOpacity;
        uniform vec3 uBase, uTip, uGlow;
        varying float vAlong;
        varying vec3 vN;
        void main(){
          if (vAlong > uProgress) discard;
          float lit = 0.45 + 0.55 * max(0.0, dot(vN, normalize(vec3(0.4,0.8,0.5))));
          vec3 c = mix(uBase, uTip, vAlong) * lit;
          // punta incandescente mientras crece
          float head = 1.0 - smoothstep(0.0, 0.06, uProgress - vAlong);
          c += uGlow * head * 1.4;
          gl_FragColor = vec4(c, uOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.branch = new THREE.Mesh(tube, this.branchMat);
    this.group.add(this.branch);

    // ── 4. flores en el perímetro ──
    this.flowerCount = flowers;
    this._fl = allocParticles(flowers);
    this._flAlong = new Float32Array(flowers);
    const cFlower = new THREE.Color(palette.flower || '#F2B6C6');
    const cLight = new THREE.Color(palette.sun || '#FFD98A');
    for (let i = 0; i < flowers; i++) {
      const t = (i + 0.5) / flowers;
      const p = this.curve.getPointAt(t);
      const off = 0.055;
      this._fl.position[i * 3]     = p.x + (rng() - 0.5) * off;
      this._fl.position[i * 3 + 1] = p.y + (rng() - 0.5) * off;
      this._fl.position[i * 3 + 2] = p.z + (rng() - 0.5) * off + 0.02;
      this._fl.aSize[i] = rng.range ? rng.range(0.5, 1.5) : 0.5 + rng();
      this._fl.aAlpha[i] = 0;
      this._fl.aPhase[i] = rng();
      setColorAt(this._fl.aColor, i, rng() < 0.4 ? cLight : cFlower);
      this._flAlong[i] = t;
    }
    this.flowerGeo = buildParticleGeometry(flowers, this._fl);
    this.flowerMat = makeParticleMaterial({ map: softSprite(128, 2.0), size: 0.9, color: 0xffffff });
    this.flowers = new THREE.Points(this.flowerGeo, this.flowerMat);
    this.flowers.frustumCulled = false;
    this.group.add(this.flowers);

    // ── 5. luz propia del recuerdo ──
    this.light = new THREE.PointLight(new THREE.Color(palette.sun || '#FFD98A'), 0, 6, 2);
    this.light.position.z = 0.5;
    this.group.add(this.light);

    this.progress = 0;
    this.selected = false;
  }

  /**
   * @param p 0..1 progreso del recuerdo: 0 nada, 0.45 rama completa,
   *          0.5→1 foto revelándose.
   */
  update({ p = 0, ambientTime = 0, chorus = 0, focus = 14 } = {}) {
    this.progress = clamp01(p);

    // la rama crece primero
    const branchP = clamp01(this.progress / 0.52);
    this.branchMat.uniforms.uProgress.value = ease('easeInOutCubic', branchP);

    // las flores brotan detrás de la punta de la rama
    const head = this.branchMat.uniforms.uProgress.value;
    const a = this._fl.aAlpha;
    for (let i = 0; i < this.flowerCount; i++) {
      const d = head - this._flAlong[i];
      const open = clamp01(d * 5.5);
      const breathe = 0.82 + 0.18 * Math.sin(ambientTime * 1.2 + this._fl.aPhase[i] * 6.2831);
      a[i] = open * breathe * (0.7 + chorus * 0.5);
    }
    this.flowerGeo.attributes.aAlpha.needsUpdate = true;
    this.flowerMat.uniforms.uTime.value = ambientTime;
    this.flowerMat.uniforms.uFocus.value = focus;

    // la foto emerge después
    const reveal = clamp01((this.progress - 0.34) / 0.58);
    this.photoMat.uniforms.uReveal.value = ease('easeOutCubic', reveal);
    this.photoMat.uniforms.uTime.value = ambientTime;
    this.photoMat.uniforms.uOpacity.value = 1;

    const glowK = reveal * (0.55 + chorus * 0.45) * (this.selected ? 1.4 : 1);
    this.halo.material.opacity = glowK * 0.3;
    this.light.intensity = glowK * 2.6;
  }

  /** Interacción: al seleccionar un recuerdo el entorno se acerca a él. */
  setSelected(v) {
    this.selected = v;
    return this.group.getWorldPosition(new THREE.Vector3());
  }

  /** Punto al que debe acercarse la cámara al elegir este recuerdo. */
  get cameraTarget() {
    const p = this.group.getWorldPosition(new THREE.Vector3());
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
    return {
      position: p.clone().addScaledVector(n, Math.max(this.width, this.height) * 1.35).toArray(),
      target: p.toArray(),
      fov: 32
    };
  }

  /** Sustituir la imagen en caliente conservando la animación. */
  replaceTexture(textureInfo) {
    const aspect = textureInfo?.aspect || this.aspect;
    this.photoMat.uniforms.uMap.value = textureInfo?.texture || null;
    this.photoMat.uniforms.uPlaceholder.value = textureInfo?.placeholder ? 1 : 0;
    if (Math.abs(aspect - this.aspect) > 0.001) {
      // redimensiona el plano respetando la nueva relación de aspecto
      const box = [this.width, this.height];
      const mw = Math.max(box[0], box[1] * this.aspect);
      let w = mw, h = mw / aspect;
      const mh = Math.max(box[1], box[0] / this.aspect);
      if (h > mh) { h = mh; w = mh * aspect; }
      this.photo.geometry.dispose();
      this.photo.geometry = new THREE.PlaneGeometry(w, h, 1, 1);
      this.width = w; this.height = h; this.aspect = aspect;
      this.halo.scale.set(w * 2.4, h * 2.4, 1);
    }
  }

  dispose() {
    this.photo.geometry.dispose(); this.photoMat.dispose();
    this.branch.geometry.dispose(); this.branchMat.dispose();
    this.flowerGeo.dispose(); this.flowerMat.dispose();
    this.halo.material.dispose();
    this.group.parent?.remove(this.group);
  }
}

/**
 * Gestor de recuerdos de un mundo: los monta, decide cuándo aparece cada uno
 * y expone la selección interactiva. El timeline solo le pasa el tiempo.
 */
export class MemoryGarden {
  constructor({ memories, assets, palette, rng, maxSize = [2.6, 2.0] }) {
    this.group = new THREE.Group();
    this.group.name = 'memory-garden';
    this.frames = [];
    this.memories = memories;
    this._ready = false;
    this._init(memories, assets, palette, rng, maxSize);
  }

  async _init(memories, assets, palette, rng, maxSize) {
    for (const m of memories) {
      const info = await assets.loadTexture(m.src);
      const f = new PhotoFrame({ memory: m, textureInfo: info, palette, rng, maxSize });
      this.frames.push(f);
      this.group.add(f.group);
    }
    this._ready = true;
  }

  /**
   * @param t       tiempo narrativo de la escena de recuerdos
   * @param starts  [{id, t}] momento de aparición de cada recuerdo
   */
  update({ t = 0, ambientTime = 0, chorus = 0, focus = 14, starts = null, reveal = 1 }) {
    for (let i = 0; i < this.frames.length; i++) {
      const f = this.frames[i];
      const start = starts ? (starts[i] ?? i * 14) : i * 14;
      const dur = f.memory.screenDuration || 12;
      const p = clamp01((t - start) / (dur * 0.62)) * reveal;
      f.update({ p, ambientTime, chorus, focus });
    }
  }

  /** Devuelve el recuerdo más cercano a un rayo (interacción con cursor). */
  pick(raycaster) {
    const hits = raycaster.intersectObjects(this.frames.map((f) => f.photo), false);
    if (!hits.length) return null;
    const f = this.frames.find((x) => x.photo === hits[0].object);
    return f || null;
  }

  dispose() {
    for (const f of this.frames) f.dispose();
    this.frames = [];
    this.group.parent?.remove(this.group);
  }
}

export default PhotoFrame;

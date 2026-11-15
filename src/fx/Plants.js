/**
 * VEGETACIÓN PROCEDURAL QUE CRECE.
 *
 * Decisión de arquitectura: TODA la vegetación de una escena se fusiona en 2 draw
 * calls (tallos + hojas). El crecimiento no reconstruye geometría: cada vértice
 * lleva `aBirth` (cuándo le toca nacer) y `aAlong` (posición a lo largo del tallo),
 * y el shader revela la planta comparando `uTime` con esos atributos.
 *
 * Consecuencia: 600 plantas crecen a 4 velocidades distintas con coste de 2 draws,
 * y las tres superficies generan exactamente la misma geometría a partir de la
 * misma semilla (sin transmitir vértices).
 */
import * as THREE from 'three';
import { leafSprite, softSprite, makeParticleMaterial, allocParticles, buildParticleGeometry, setColorAt } from './common.js';
import { PALETTE } from '../config/palette.js';

const SPECIES = [
  // h: altura (m), bend: curvatura, leaves: nº hojas, leafSize (m), radius: grosor
  // del tallo, speed: velocidad de crecimiento, minR: distancia mínima al centro.
  // Las hojas están dimensionadas para una cámara a ~1.6-2.5 m: por encima de
  // ~0.35 m una hoja empieza a leerse como decorado, no como vegetación.
  { id: 'sprout', h: [0.18, 0.4],  bend: 0.22, leaves: 7,  leafSize: [0.06, 0.12], radius: 0.008, speed: 1.6, minR: 0 },
  { id: 'fern',   h: [0.5, 1.1],   bend: 0.55, leaves: 26, leafSize: [0.09, 0.18], radius: 0.011, speed: 1.0, minR: 0 },
  { id: 'stalk',  h: [1.2, 2.4],   bend: 0.30, leaves: 24, leafSize: [0.13, 0.25], radius: 0.017, speed: 0.75, minR: 2.5 },
  { id: 'vine',   h: [2.0, 3.8],   bend: 0.95, leaves: 34, leafSize: [0.10, 0.20], radius: 0.013, speed: 0.6, minR: 3.5 },
  // los árboles forman el fondo y el dosel: nunca junto a la cámara
  { id: 'tree',   h: [6.0, 12.0],  bend: 0.16, leaves: 90, leafSize: [0.26, 0.55],  radius: 0.09,  speed: 0.4, minR: 9 }
];

/** Tallo curvo: bezier cuadrática con deriva lateral. */
function stemCurve(rng, height, bend) {
  const dir = new THREE.Vector3(rng() - 0.5, 0, rng() - 0.5).normalize();
  const mid = new THREE.Vector3(dir.x * bend * height * 0.45, height * 0.55, dir.z * bend * height * 0.45);
  const top = new THREE.Vector3(dir.x * bend * height, height, dir.z * bend * height);
  // leve contracurva para que no parezca un arco de circunferencia
  const ctrl = new THREE.Vector3(
    mid.x - dir.z * bend * height * 0.18,
    mid.y,
    mid.z + dir.x * bend * height * 0.18
  );
  return new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), ctrl, top);
}

const STEM_VS = /* glsl */`
  attribute vec3  aBase;      // posición de la planta en el suelo
  attribute float aAlong;     // 0 en la base, 1 en la punta
  attribute float aBirth;     // segundo en que empieza a crecer
  attribute float aSpeed;     // velocidad de crecimiento
  attribute float aPhase;     // fase de viento propia
  attribute vec3  aTint;

  uniform float uTime;
  uniform float uWind;
  uniform float uGrowthScale;

  varying float vAlong;
  varying float vReach;
  varying vec3  vTint;

  void main() {
    // progreso de crecimiento de ESTA planta
    float age = max(0.0, (uTime - aBirth) * aSpeed * uGrowthScale);
    // arranca despacio, acelera y se asienta con un pequeño overshoot
    float g = 1.0 - pow(max(0.0, 1.0 - min(age, 1.0)), 2.4);
    g += sin(min(age, 1.0) * 3.14159) * 0.06 * (1.0 - min(age, 1.0));
    g = clamp(g, 0.0, 1.06);

    // IMPORTANTE: position es LOCAL a la planta. La posicion en el mundo es
    // aBase + local. (Guardar posiciones absolutas y escalarlas hacia que las
    // plantas se desplazaran por el mundo al crecer en vez de agrandarse.)
    vec3 local = position * g;

    // la punta aún no ha llegado a esta altura: se oculta en el fragment
    vReach = clamp((g - aAlong) * 7.0, 0.0, 1.0) * step(0.001, age);

    // viento: dos frecuencias, amplitud creciente con la altura al cuadrado
    float sway = aAlong * aAlong;
    float w1 = sin(uTime * 0.9 + aPhase * 6.2831) * 0.55;
    float w2 = sin(uTime * 2.3 + aPhase * 12.566) * 0.2;
    local.x += (w1 + w2) * sway * uWind;
    local.z += (w1 * 0.6 - w2 * 0.8) * sway * uWind * 0.7;

    vAlong = aAlong;
    vTint = aTint;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(aBase + local, 1.0);
  }
`;

const STEM_FS = /* glsl */`
  uniform vec3 uBase;
  uniform vec3 uTip;
  uniform float uOpacity;
  varying float vAlong;
  varying float vReach;
  varying vec3 vTint;
  void main() {
    if (vReach < 0.03) discard;
    // El tallo es soporte, no protagonista: oscuro, con apenas luz en la punta.
    vec3 c = mix(uBase * 0.55, uTip * 0.75, pow(vAlong, 1.6)) * vTint;
    gl_FragColor = vec4(c, uOpacity * vReach);
  }
`;

const LEAF_VS = /* glsl */`
  attribute vec3  aBase;      // posición de la planta en el suelo
  attribute vec3  aOffset;    // posición de la hoja RELATIVA a la planta
  attribute float aBirth;
  attribute float aSpeed;
  attribute float aAlong;     // altura relativa en el tallo
  attribute float aPhase;
  attribute float aScale;
  attribute vec3  aTint;
  attribute vec3  aNormalDir;

  uniform float uTime, uWind, uGrowthScale;
  varying vec2  vUv;
  varying float vGrown;
  varying vec3  vTint;

  mat3 basisFrom(vec3 n) {
    vec3 up = abs(n.y) < 0.9 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
    vec3 t = normalize(cross(up, n));
    vec3 b = cross(n, t);
    return mat3(t, b, n);
  }

  void main() {
    float age = max(0.0, (uTime - aBirth) * aSpeed * uGrowthScale);
    float g = 1.0 - pow(max(0.0, 1.0 - min(age, 1.0)), 2.4);
    // la hoja solo brota cuando el tallo ya pasó su altura
    float reach = clamp((g - aAlong) * 5.0, 0.0, 1.0);
    // despliegue elástico de la hoja
    float unfold = clamp((age - aAlong) * 1.8, 0.0, 1.0);
    unfold = 1.0 - pow(1.0 - unfold, 3.0);
    vGrown = reach * unfold * step(0.001, age);

    // igual que los tallos: el offset es LOCAL, la base es el ancla en el suelo
    vec3 c = aBase + aOffset * g;

    float sway = aAlong * aAlong;
    float w1 = sin(uTime * 0.9 + aPhase * 6.2831) * 0.55;
    float w2 = sin(uTime * 2.3 + aPhase * 12.566) * 0.2;
    c.x += (w1 + w2) * sway * uWind;
    c.z += (w1 * 0.6 - w2 * 0.8) * sway * uWind * 0.7;

    mat3 B = basisFrom(normalize(aNormalDir));
    // flameo propio de la hoja
    float flutter = sin(uTime * 3.1 + aPhase * 20.0) * 0.14 * uWind;
    vec3 local = vec3(position.x, position.y, 0.0) * aScale * vGrown;
    vec3 world = c + B * local;
    world.x += flutter * aScale * 0.6;

    vUv = uv;
    vTint = aTint;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`;

const LEAF_FS = /* glsl */`
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vGrown;
  varying vec3 vTint;
  void main() {
    if (vGrown < 0.02) discard;
    vec4 t = texture2D(uMap, vUv);
    if (t.a < 0.08) discard;
    gl_FragColor = vec4(t.rgb * vTint * 1.9, t.a * uOpacity);
  }
`;

export class GrowthField {
  /**
   * @param o.rng           PRNG con semilla (determinismo entre superficies)
   * @param o.count         número de plantas
   * @param o.radius        radio de dispersión
   * @param o.origin        centro (el punto de impacto de la estrella)
   * @param o.palette       paleta del mundo
   * @param o.segments      segmentos por tallo (calidad)
   * @param o.spread        retardo máximo de nacimiento, en "unidades de crecimiento"
   * @param o.nodes         puntos preferentes de germinación (los que despertó la estrella)
   */
  constructor(o = {}) {
    const {
      rng,
      count = 420,
      radius = 22,
      origin = new THREE.Vector3(0, 0, 0),
      palette = PALETTE.garden,
      segments = 8,
      spread = 6,
      nodes = [],
      speciesWeights = [0.3, 0.26, 0.22, 0.14, 0.08],
      scale = 1
    } = o;

    this.group = new THREE.Group();
    this.group.name = 'growth-field';
    this.palette = palette;
    this.rng = rng;
    this.plants = [];

    const stemPos = [], stemBase = [], stemAlong = [], stemBirth = [], stemSpeed = [], stemPhase = [], stemTint = [], stemIdx = [];
    const leafOffset = [], leafBase = [], leafBirth = [], leafSpeed = [], leafAlong = [], leafPhase = [], leafScale = [], leafTint = [], leafNormal = [];
    const leafPos = [], leafUv = [], leafIdx = [];

    const tintBase = new THREE.Color(palette.foliage || '#2F6B4F');
    const tintLit = new THREE.Color(palette.foliageLit || '#7FC79A');
    const tintSprout = new THREE.Color(palette.sprout || '#A8E6A1');

    let vOffset = 0, lQuad = 0;
    const RADIAL = 3; // prisma triangular: barato y suficiente para tallos finos

    for (let p = 0; p < count; p++) {
      // especie por ruleta ponderada
      let r = rng(), acc = 0, si = 0;
      for (let i = 0; i < speciesWeights.length; i++) { acc += speciesWeights[i]; if (r <= acc) { si = i; break; } }
      const sp = SPECIES[si];

      // posición: preferencia por los nodos despertados por la estrella,
      // respetando la distancia mínima de la especie (los árboles al fondo)
      let px, pz, dist;
      let tries = 0;
      do {
        if (nodes.length && rng() < 0.45) {
          const n = nodes[Math.floor(rng() * nodes.length)];
          const [dx, dz] = rng.disk(2.6);
          px = n.x + dx; pz = n.z + dz;
        } else {
          const [dx, dz] = rng.disk(radius);
          px = origin.x + dx; pz = origin.z + dz;
        }
        dist = Math.hypot(px - origin.x, pz - origin.z);
      } while (dist < (sp.minR || 0) && ++tries < 12);
      if (dist < (sp.minR || 0)) {
        // fuerza la distancia mínima en vez de descartar la planta
        const a = rng() * Math.PI * 2;
        const rr = sp.minR + rng() * Math.max(1, radius - sp.minR);
        px = origin.x + Math.cos(a) * rr; pz = origin.z + Math.sin(a) * rr;
        dist = rr;
      }

      const h = rng.range(sp.h[0], sp.h[1]) * scale;
      const curve = stemCurve(rng, h, sp.bend);
      // nace más tarde cuanto más lejos del impacto: la onda de vida se propaga
      const birth = (dist / Math.max(1, radius)) * spread * rng.range(0.7, 1.25) + rng() * 0.4;
      const speed = sp.speed * rng.range(0.75, 1.35);
      const phase = rng();
      const tint = si === 0 ? tintSprout : (rng() < 0.3 ? tintLit : tintBase);

      // ── tallo: prisma de RADIAL lados a lo largo de la curva ──
      const pts = curve.getPoints(segments);
      const frames = curve.computeFrenetFrames(segments, false);
      const baseR = sp.radius * scale;
      for (let s = 0; s <= segments; s++) {
        const along = s / segments;
        const rad = baseR * (1 - along * 0.78);
        const P = pts[s];
        const N = frames.normals[s], B = frames.binormals[s];
        for (let k = 0; k < RADIAL; k++) {
          const a = (k / RADIAL) * Math.PI * 2;
          // posiciones LOCALES: el ancla en el mundo va aparte, en aBase
          const x = P.x + (N.x * Math.cos(a) + B.x * Math.sin(a)) * rad;
          const y = P.y + (N.y * Math.cos(a) + B.y * Math.sin(a)) * rad;
          const z = P.z + (N.z * Math.cos(a) + B.z * Math.sin(a)) * rad;
          stemPos.push(x, y, z);
          stemBase.push(px, 0, pz);
          stemAlong.push(along);
          stemBirth.push(birth);
          stemSpeed.push(speed);
          stemPhase.push(phase);
          stemTint.push(tint.r, tint.g, tint.b);
        }
      }
      for (let s = 0; s < segments; s++) {
        for (let k = 0; k < RADIAL; k++) {
          const a0 = vOffset + s * RADIAL + k;
          const a1 = vOffset + s * RADIAL + ((k + 1) % RADIAL);
          const b0 = a0 + RADIAL, b1 = a1 + RADIAL;
          stemIdx.push(a0, b0, a1, a1, b0, b1);
        }
      }
      vOffset += (segments + 1) * RADIAL;

      // ── hojas ──
      const nLeaves = Math.round(sp.leaves * rng.range(0.7, 1.2));
      for (let l = 0; l < nLeaves; l++) {
        const along = si === 4 ? rng.range(0.55, 1.0) : rng.range(0.22, 0.98);
        const P = curve.getPointAt(Math.min(0.999, along));
        const ang = rng() * Math.PI * 2;
        const out = sp.id === 'tree' ? rng.range(0.4, 2.2) * scale : rng.range(0.02, 0.12) * scale;
        const ox = P.x + Math.cos(ang) * out;
        const oy = P.y + (sp.id === 'tree' ? rng.range(-0.3, 0.6) : 0);
        const oz = P.z + Math.sin(ang) * out;
        const ls = rng.range(sp.leafSize[0], sp.leafSize[1]) * scale;
        const lt = rng() < 0.25 ? tintLit : tintBase;
        const nd = new THREE.Vector3(Math.cos(ang), rng.range(-0.1, 0.85), Math.sin(ang)).normalize();

        // quad
        leafPos.push(-0.5, -0.5, 0,  0.5, -0.5, 0,  0.5, 0.5, 0,  -0.5, 0.5, 0);
        leafUv.push(0, 0, 1, 0, 1, 1, 0, 1);
        for (let q = 0; q < 4; q++) {
          leafOffset.push(ox, oy, oz);
          leafBase.push(px, 0, pz);
          leafBirth.push(birth);
          leafSpeed.push(speed);
          leafAlong.push(along);
          leafPhase.push(rng());
          leafScale.push(ls);
          leafTint.push(lt.r, lt.g, lt.b);
          leafNormal.push(nd.x, nd.y, nd.z);
        }
        const b = lQuad * 4;
        leafIdx.push(b, b + 1, b + 2, b, b + 2, b + 3);
        lQuad++;
      }

      this.plants.push({ x: px, z: pz, h, birth, speed, species: sp.id, index: p });
    }

    // ── geometría de tallos ──
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(stemPos, 3));
    sg.setAttribute('aBase',    new THREE.Float32BufferAttribute(stemBase, 3));
    sg.setAttribute('aAlong',   new THREE.Float32BufferAttribute(stemAlong, 1));
    sg.setAttribute('aBirth',   new THREE.Float32BufferAttribute(stemBirth, 1));
    sg.setAttribute('aSpeed',   new THREE.Float32BufferAttribute(stemSpeed, 1));
    sg.setAttribute('aPhase',   new THREE.Float32BufferAttribute(stemPhase, 1));
    sg.setAttribute('aTint',    new THREE.Float32BufferAttribute(stemTint, 3));
    sg.setIndex(stemIdx);
    this.stemGeo = sg;
    this.stemMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: 0.12 },
        uGrowthScale: { value: 1 },
        uBase: { value: new THREE.Color(palette.foliageDark || '#1C4433') },
        uTip: { value: new THREE.Color(palette.foliageLit || '#7FC79A') },
        uOpacity: { value: 1 }
      },
      vertexShader: STEM_VS,
      fragmentShader: STEM_FS,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.stems = new THREE.Mesh(sg, this.stemMat);
    this.stems.frustumCulled = false;
    this.group.add(this.stems);

    // ── geometría de hojas ──
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position',   new THREE.Float32BufferAttribute(leafPos, 3));
    lg.setAttribute('uv',         new THREE.Float32BufferAttribute(leafUv, 2));
    lg.setAttribute('aOffset',    new THREE.Float32BufferAttribute(leafOffset, 3));
    lg.setAttribute('aBase',      new THREE.Float32BufferAttribute(leafBase, 3));
    lg.setAttribute('aBirth',     new THREE.Float32BufferAttribute(leafBirth, 1));
    lg.setAttribute('aSpeed',     new THREE.Float32BufferAttribute(leafSpeed, 1));
    lg.setAttribute('aAlong',     new THREE.Float32BufferAttribute(leafAlong, 1));
    lg.setAttribute('aPhase',     new THREE.Float32BufferAttribute(leafPhase, 1));
    lg.setAttribute('aScale',     new THREE.Float32BufferAttribute(leafScale, 1));
    lg.setAttribute('aTint',      new THREE.Float32BufferAttribute(leafTint, 3));
    lg.setAttribute('aNormalDir', new THREE.Float32BufferAttribute(leafNormal, 3));
    lg.setIndex(leafIdx);
    this.leafGeo = lg;
    this.leafMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: 0.12 },
        uGrowthScale: { value: 1 },
        uMap: { value: leafSprite(128, palette.foliageLit || '#7FC79A') },
        uOpacity: { value: 1 }
      },
      vertexShader: LEAF_VS,
      fragmentShader: LEAF_FS,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true
    });
    this.leaves = new THREE.Mesh(lg, this.leafMat);
    this.leaves.frustumCulled = false;
    this.group.add(this.leaves);

    this.stats = {
      plants: count,
      stemTris: stemIdx.length / 3,
      leafQuads: lQuad,
      drawCalls: 2
    };
  }

  /**
   * @param growthTime tiempo de crecimiento (0 = nada ha nacido). Lo controla la
   *                   narrativa, así que HOLD lo congela.
   * @param ambientTime tiempo ambiental para el viento (nunca se congela).
   */
  update({ growthTime = 0, ambientTime = 0, wind = 0.12, growthScale = 1, opacity = 1 } = {}) {
    this.stemMat.uniforms.uTime.value = growthTime;
    this.stemMat.uniforms.uWind.value = wind;
    this.stemMat.uniforms.uGrowthScale.value = growthScale;
    this.stemMat.uniforms.uOpacity.value = opacity;
    this.leafMat.uniforms.uTime.value = growthTime;
    this.leafMat.uniforms.uWind.value = wind;
    this.leafMat.uniforms.uGrowthScale.value = growthScale;
    this.leafMat.uniforms.uOpacity.value = opacity;
    // El viento usa ambientTime: las hojas siguen moviéndose en HOLD.
    this._windTime = ambientTime;
    this.stemMat.uniforms.uWind.value = wind * (0.85 + 0.15 * Math.sin(ambientTime * 0.23));
    this.leafMat.uniforms.uWind.value = this.stemMat.uniforms.uWind.value;
  }

  /** Riega una planta concreta (interacción: "al tocar una planta, crece"). */
  boostAt(x, z, radius = 1.5, amount = 2) {
    const birth = this.stemGeo.attributes.aBirth;
    const speed = this.stemGeo.attributes.aSpeed;
    let touched = 0;
    for (const pl of this.plants) {
      if (Math.hypot(pl.x - x, pl.z - z) < radius) {
        pl.speed *= amount;
        touched++;
      }
    }
    // Aplicar al atributo exige recorrer vértices: lo hacemos solo al interactuar
    if (touched) {
      // (se recalcula perezosamente: el mapa vértice→planta se reconstruye aquí)
      this._reapplySpeeds(birth, speed);
    }
    return touched;
  }

  _reapplySpeeds(birthAttr, speedAttr) {
    // Reaplicación simple: los atributos se escribieron en orden de planta,
    // así que recorremos en el mismo orden.
    let vi = 0;
    const segs = (this.stemGeo.attributes.aAlong.count / this.plants.length);
    for (const pl of this.plants) {
      const n = Math.round(segs);
      for (let k = 0; k < n && vi < speedAttr.count; k++, vi++) speedAttr.array[vi] = pl.speed;
    }
    speedAttr.needsUpdate = true;
  }

  dispose() {
    this.stemGeo.dispose(); this.stemMat.dispose();
    this.leafGeo.dispose(); this.leafMat.dispose();
    this.group.parent?.remove(this.group);
  }
}

/**
 * RAÍCES DE LUZ — corren bajo tierra desde el impacto hacia los nodos.
 * Lo que justifica que la vida aparezca lejos del punto de impacto.
 */
export class LightRoots {
  constructor({ rng, origin = new THREE.Vector3(), nodes = [], color = '#A8E6A1', segments = 26 }) {
    this.group = new THREE.Group();
    const pos = [], along = [], idx = [];
    let v = 0;
    this.lines = [];
    for (const n of nodes) {
      const dir = new THREE.Vector3(n.x - origin.x, 0, n.z - origin.z);
      const len = dir.length();
      dir.normalize();
      const side = new THREE.Vector3(-dir.z, 0, dir.x);
      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        // serpenteo: las raíces no van en línea recta
        const wig = Math.sin(t * Math.PI * 3.2 + rng() * 0.2) * len * 0.055 * (1 - t);
        const p = new THREE.Vector3()
          .copy(origin)
          .addScaledVector(dir, len * t)
          .addScaledVector(side, wig);
        p.y = 0.012;
        pos.push(p.x, p.y, p.z);
        along.push(t);
      }
      for (let s = 0; s < segments; s++) idx.push(v + s, v + s + 1);
      v += segments + 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    g.setIndex(idx);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 1 },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float aAlong;
        varying float vAlong;
        void main(){ vAlong = aAlong; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: `
        uniform float uProgress, uOpacity, uTime;
        uniform vec3 uColor;
        varying float vAlong;
        void main(){
          if (vAlong > uProgress) discard;
          // cabeza brillante + cola que se apaga
          // Cabeza brillante corta + cuerpo muy tenue: la raíz debe insinuarse
          // bajo la tierra, no dibujar una línea sobre la escena.
          float head = 1.0 - smoothstep(0.0, 0.10, uProgress - vAlong);
          float body = 0.10 + 0.08 * sin(uTime * 1.4 - vAlong * 9.0);
          float a = (head * 0.65 + body * 0.18) * uOpacity;
          gl_FragColor = vec4(uColor * (0.45 + head * 0.8), a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.mesh = new THREE.LineSegments(g, this.mat);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
  }
  update({ progress = 0, ambientTime = 0, opacity = 1 }) {
    this.mat.uniforms.uProgress.value = progress;
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uOpacity.value = opacity;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.group.parent?.remove(this.group); }
}

/** Luciérnagas / polen luminoso. Vida ambiental que no se congela en HOLD. */
export class Fireflies {
  constructor({ rng, count = 300, radius = 26, height = 7, color = '#FFD9A0', size = 1.2 }) {
    this.count = count;
    this.arr = allocParticles(count);
    this._base = new Float32Array(count * 3);
    this._freq = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const [x, z] = rng.disk(radius);
      const y = Math.pow(rng(), 1.6) * height + 0.15;
      this._base[i * 3] = x; this._base[i * 3 + 1] = y; this._base[i * 3 + 2] = z;
      this._freq[i * 3] = rng.range(0.1, 0.4);
      this._freq[i * 3 + 1] = rng.range(0.08, 0.3);
      this._freq[i * 3 + 2] = rng.range(0.1, 0.4);
      this.arr.position[i * 3] = x; this.arr.position[i * 3 + 1] = y; this.arr.position[i * 3 + 2] = z;
      this.arr.aSize[i] = rng.range(0.5, 1.6);
      this.arr.aAlpha[i] = 0;
      this.arr.aPhase[i] = rng();
      setColorAt(this.arr.aColor, i, c);
    }
    this.geo = buildParticleGeometry(count, this.arr);
    this.mat = makeParticleMaterial({ map: softSprite(128, 2.8), size, color: 0xffffff });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
  }
  update({ ambientTime = 0, intensity = 1, focus = 14 }) {
    const p = this.arr.position, a = this.arr.aAlpha;
    for (let i = 0; i < this.count; i++) {
      const ph = this.arr.aPhase[i] * 6.2831;
      p[i * 3]     = this._base[i * 3]     + Math.sin(ambientTime * this._freq[i * 3] + ph) * 1.1;
      p[i * 3 + 1] = this._base[i * 3 + 1] + Math.sin(ambientTime * this._freq[i * 3 + 1] + ph * 1.7) * 0.5;
      p[i * 3 + 2] = this._base[i * 3 + 2] + Math.sin(ambientTime * this._freq[i * 3 + 2] + ph * 2.3) * 1.1;
      // pulso de luciérnaga: encendido corto, apagado largo
      const blink = Math.pow(Math.max(0, Math.sin(ambientTime * 0.9 + ph * 3.1)), 7);
      a[i] = blink * intensity;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uFocus.value = focus;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.points.parent?.remove(this.points); }
}

/**
 * DOSEL — el mundo que se extiende SOBRE la cabeza del espectador.
 *
 * Existe por una razón concreta: la cámara de CEILING mira casi en vertical, y
 * la vegetación normal vive a elevaciones bajas respecto a ella, así que el
 * techo se quedaba vacío. El dosel es una capa de hojas sobre el eje de la
 * cámara, con parallax y viento propios, que SÍ entra en ese encuadre.
 */
export class Canopy {
  constructor({ rng, count = 900, radius = 22, height = 11, spreadY = 4, palette, growthSpread = 7, scale = 1 }) {
    const pos = [], uv = [], idx = [], base = [], phase = [], sz = [], tint = [], birth = [], nrm = [];
    const cDark = new THREE.Color(palette.foliageDark || '#1C4433');
    const cLit = new THREE.Color(palette.foliageLit || '#8FD6A8');
    let q = 0;
    for (let i = 0; i < count; i++) {
      const [x, z] = rng.disk(radius);
      const d = Math.hypot(x, z);
      const y = height + rng.gauss(0, spreadY * 0.4) + (d / radius) * spreadY * 0.5;
      const s = rng.range(0.34, 1.15) * scale;
      const t = rng() < 0.42 ? cLit : cDark;
      // nace más tarde cuanto más lejos: el dosel se cierra de dentro a fuera
      const b = (d / radius) * growthSpread * rng.range(0.8, 1.3);
      // orientación: las hojas del dosel miran hacia abajo, con dispersión
      const nd = new THREE.Vector3(rng.range(-0.5, 0.5), -1, rng.range(-0.5, 0.5)).normalize();
      pos.push(-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      for (let v = 0; v < 4; v++) {
        base.push(x, y, z);
        phase.push(rng());
        sz.push(s);
        tint.push(t.r, t.g, t.b);
        birth.push(b);
        nrm.push(nd.x, nd.y, nd.z);
      }
      const o = q * 4;
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
      q++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('aBase', new THREE.Float32BufferAttribute(base, 3));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
    g.setAttribute('aScale', new THREE.Float32BufferAttribute(sz, 1));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(tint, 3));
    g.setAttribute('aBirth', new THREE.Float32BufferAttribute(birth, 1));
    g.setAttribute('aNormalDir', new THREE.Float32BufferAttribute(nrm, 3));
    g.setIndex(idx);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: 0.12 },
        uMap: { value: leafSprite(128, palette.foliageLit || '#8FD6A8') },
        uOpacity: { value: 1 },
        uGrowthScale: { value: 1 }
      },
      vertexShader: `
        attribute vec3 aBase; attribute float aPhase, aScale, aBirth; attribute vec3 aTint, aNormalDir;
        uniform float uTime, uWind, uGrowthScale;
        varying vec2 vUv; varying vec3 vTint; varying float vGrown;
        mat3 basisFrom(vec3 n){
          vec3 up = abs(n.y) < 0.9 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
          vec3 t = normalize(cross(up, n));
          return mat3(t, cross(n, t), n);
        }
        void main(){
          float age = max(0.0, (uTime - aBirth) * 0.55 * uGrowthScale);
          float g = 1.0 - pow(max(0.0, 1.0 - min(age, 1.0)), 2.6);
          vGrown = g * step(0.001, age);
          vec3 c = aBase;
          float ph = aPhase * 6.2831;
          c.x += sin(uTime * 0.7 + ph) * uWind * 2.6;
          c.z += cos(uTime * 0.6 + ph * 1.3) * uWind * 2.6;
          c.y += sin(uTime * 0.5 + ph * 0.7) * uWind * 0.9;
          mat3 B = basisFrom(normalize(aNormalDir));
          vec3 world = c + B * (vec3(position.x, position.y, 0.0) * aScale * vGrown);
          vUv = uv; vTint = aTint;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uOpacity;
        varying vec2 vUv; varying vec3 vTint; varying float vGrown;
        void main(){
          if (vGrown < 0.02) discard;
          vec4 t = texture2D(uMap, vUv);
          if (t.a < 0.08) discard;
          gl_FragColor = vec4(t.rgb * vTint * 2.6, t.a * uOpacity);
        }
      `,
      transparent: true, side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.stats = { leaves: q, drawCalls: 1 };
  }
  update({ growthTime = 0, ambientTime = 0, wind = 0.12, opacity = 1, growthScale = 1 }) {
    this.mat.uniforms.uTime.value = growthTime;
    this.mat.uniforms.uWind.value = wind * (0.85 + 0.15 * Math.sin(ambientTime * 0.21));
    this.mat.uniforms.uOpacity.value = opacity;
    this.mat.uniforms.uGrowthScale.value = growthScale;
  }
  dispose(){ this.geo.dispose(); this.mat.dispose(); this.mesh.parent?.remove(this.mesh); }
}

export { SPECIES };
export default GrowthField;

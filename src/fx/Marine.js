/**
 * VIDA MARINA.
 *
 * DECISIÓN IMPORTANTE DE SINCRONIZACIÓN: no se usa simulación de boids.
 * Un boids real es caótico: tres ventanas con deltas de frame distintos
 * divergirían en segundos y la ballena del techo no coincidiría con la de la
 * pantalla principal. Aquí todo el movimiento es ANALÍTICO, función pura del
 * tiempo: `pos = f(t, índice)`. Mismo t → misma posición en las tres superficies,
 * exacto, sin transmitir nada.
 *
 * El banco de peces sigue leyéndose como un banco porque el centro describe una
 * trayectoria sinuosa y cada pez orbita ese centro con fase propia, corrección
 * hacia el vecino virtual y retardo por distancia (el banco "ondula").
 */
import * as THREE from 'three';
import { softSprite, makeParticleMaterial, allocParticles, buildParticleGeometry, setColorAt } from './common.js';
import { clamp01, lerp, smoothstep } from '../core/easing.js';
import { PALETTE } from '../config/palette.js';

// ───────────────────────────── BALLENA ─────────────────────────────

/** Perfil radial del cuerpo a lo largo del eje (0 = hocico, 1 = cola). */
function whaleRadius(u) {
  if (u < 0.06) return lerp(0.12, 0.55, u / 0.06);
  if (u < 0.3)  return lerp(0.55, 1.0, smoothstep(0, 1, (u - 0.06) / 0.24));
  if (u < 0.55) return lerp(1.0, 0.82, (u - 0.3) / 0.25);
  if (u < 0.86) return lerp(0.82, 0.2, smoothstep(0, 1, (u - 0.55) / 0.31));
  return lerp(0.2, 0.05, (u - 0.86) / 0.14);
}

const WHALE_VS = /* glsl */`
  attribute float aU;          // 0..1 a lo largo del cuerpo
  uniform float uTime;
  uniform float uSwim;         // amplitud del nado
  uniform float uBeat;         // frecuencia
  varying float vU;
  varying vec3 vN;
  varying vec3 vView;

  void main(){
    vU = aU;
    vec3 p = position;

    // onda que recorre el cuerpo de cabeza a cola: la cola se mueve más
    float amp = pow(aU, 2.1) * uSwim;
    float wave = sin(uTime * uBeat - aU * 3.4);
    p.x += wave * amp;
    // cabeceo vertical muy leve: respiración del animal
    p.y += sin(uTime * uBeat * 0.5 - aU * 1.2) * amp * 0.25;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vView = -mv.xyz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const WHALE_FS = /* glsl */`
  uniform vec3 uTop, uBelly, uWater;
  uniform float uOpacity, uFogK;
  varying float vU;
  varying vec3 vN;
  varying vec3 vView;

  void main(){
    vec3 n = normalize(vN);
    // luz desde arriba, como en el océano real
    float up = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 base = mix(uBelly, uTop, pow(up, 0.8));
    // fresnel: silueta luminosa en los bordes, es lo que da escala y volumen
    float fres = pow(1.0 - clamp(dot(n, normalize(vView)), 0.0, 1.0), 2.4);
    vec3 c = base + uWater * fres * 0.55;
    // surcos ventrales
    float groove = smoothstep(0.42, 0.5, abs(sin(vU * 62.0))) * step(vU, 0.5) * (1.0 - up);
    c *= 1.0 - groove * 0.18;
    gl_FragColor = vec4(c, uOpacity);
  }
`;

export class Whale {
  /**
   * @param o.length  longitud en metros (jorobada adulta ≈ 14 m)
   * @param o.segments  resolución a lo largo del cuerpo
   */
  constructor(o = {}) {
    const {
      length = 14,
      segments = 54,
      radial = 14,
      palette = PALETTE.ocean,
      model = null  // GLB si existe; si no, procedural
    } = o;

    this.group = new THREE.Group();
    this.group.name = 'whale';
    this.length = length;
    this.usingModel = false;

    if (model?.scene) {
      // Si llega el GLB del manifiesto se usa tal cual y se ignora lo procedural.
      this.usingModel = true;
      this.group.add(model.scene);
      if (model.animations?.length) {
        this.mixer = new THREE.AnimationMixer(model.scene);
        const clip = model.animations.find((a) => /swim/i.test(a.name)) || model.animations[0];
        this.mixer.clipAction(clip).play();
      }
    } else {
      const L = length;
      const pos = [], nor = [], us = [], idx = [];
      for (let s = 0; s <= segments; s++) {
        const u = s / segments;
        const r = whaleRadius(u) * L * 0.085;
        const z = (0.5 - u) * L;
        // sección elíptica: más ancha que alta, como una ballena real
        for (let k = 0; k <= radial; k++) {
          const a = (k / radial) * Math.PI * 2;
          const ca = Math.cos(a), sa = Math.sin(a);
          const x = ca * r * 1.0;
          const y = sa * r * 0.78 - (u > 0.5 ? 0 : 0.03 * L * (0.5 - u));
          pos.push(x, y, z);
          const n = new THREE.Vector3(ca, sa * 0.78, 0.22 * (u - 0.5)).normalize();
          nor.push(n.x, n.y, n.z);
          us.push(u);
        }
      }
      const stride = radial + 1;
      for (let s = 0; s < segments; s++) {
        for (let k = 0; k < radial; k++) {
          const a0 = s * stride + k, a1 = a0 + 1;
          const b0 = a0 + stride, b1 = a1 + stride;
          idx.push(a0, b0, a1, a1, b0, b1);
        }
      }
      const bodyGeo = new THREE.BufferGeometry();
      bodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      bodyGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      bodyGeo.setAttribute('aU', new THREE.Float32BufferAttribute(us, 1));
      bodyGeo.setIndex(idx);

      this.mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSwim: { value: length * 0.055 },
          uBeat: { value: 0.72 },   // lento: pausado y creíble
          uTop: { value: new THREE.Color(palette.abyss || '#01121C') },
          uBelly: { value: new THREE.Color(palette.mid || '#063D56') },
          uWater: { value: new THREE.Color(palette.caustic || '#7FE3FF') },
          uOpacity: { value: 1 },
          uFogK: { value: 1 }
        },
        vertexShader: WHALE_VS,
        fragmentShader: WHALE_FS,
        transparent: true,
        side: THREE.DoubleSide
      });
      this.body = new THREE.Mesh(bodyGeo, this.mat);
      this.group.add(this.body);

      // cola (aletas caudales) y pectorales: siluetas planas, suficiente y barato
      const fluke = this._makeFin(L * 0.3, L * 0.1, true);
      fluke.position.z = L * 0.5;
      this.group.add(fluke);
      this.fluke = fluke;

      for (const side of [-1, 1]) {
        const pec = this._makeFin(L * 0.055, L * 0.22, false);
        pec.position.set(side * L * 0.07, -L * 0.012, -L * 0.1);
        pec.rotation.z = side * 0.5;
        pec.rotation.y = side * 0.25;
        this.group.add(pec);
      }
      // aleta dorsal
      const dorsal = this._makeFin(L * 0.03, L * 0.05, false);
      dorsal.position.set(0, L * 0.072, L * 0.08);
      dorsal.rotation.z = Math.PI / 2;
      this.group.add(dorsal);
    }

    this.position = new THREE.Vector3();
    this.heading = new THREE.Vector3(0, 0, -1);
  }

  _makeFin(w, h, horizontal) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(w * 0.6, h * 0.18, w * 0.95, h * 0.55, w, h);
    shape.bezierCurveTo(w * 0.5, h * 0.72, w * 0.18, h * 0.42, 0, h * 0.1);
    shape.bezierCurveTo(-w * 0.18, h * 0.42, -w * 0.5, h * 0.72, -w, h);
    shape.bezierCurveTo(-w * 0.95, h * 0.55, -w * 0.6, h * 0.18, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x071a26, transparent: true, opacity: 0.96, side: THREE.DoubleSide
    });
    const m = new THREE.Mesh(geo, mat);
    if (horizontal) m.rotation.x = -Math.PI / 2;
    return m;
  }

  /**
   * Trayectoria ANALÍTICA. Determinista: mismo t → misma pose.
   * @param o.t         tiempo (narrativo o ambiental según el mundo)
   * @param o.path      'cross' cruza el encuadre | 'ascend' sube a superficie | 'ceiling' pasa por arriba
   * @param o.offset    desfase temporal para que dos ballenas no vayan sincronizadas
   */
  update({ t = 0, dt = 0.016, path = 'cross', offset = 0, speed = 1, depth = 0, opacity = 1 } = {}) {
    const tt = (t + offset) * speed;
    const p = this.position;

    if (path === 'cross') {
      // cruza de izquierda a derecha, con deriva vertical suave
      p.x = -34 + ((tt * 1.5) % 68);
      p.y = depth + Math.sin(tt * 0.18) * 1.6;
      p.z = -16 + Math.sin(tt * 0.11) * 5;
      this.heading.set(1, Math.cos(tt * 0.18) * 0.09, Math.cos(tt * 0.11) * 0.22).normalize();
    } else if (path === 'ascend') {
      const k = clamp01(tt * 0.06);
      p.x = lerp(6, 1, k) + Math.sin(tt * 0.2) * 1.2;
      p.y = lerp(depth, depth + 46, Math.pow(k, 1.5));
      p.z = lerp(-14, -5, k);
      this.heading.set(Math.sin(tt * 0.2) * 0.12, 0.85, -0.5).normalize();
    } else if (path === 'ceiling') {
      // Cruza JUSTO encima de la cabeza del espectador: tiene que caer dentro
      // del cono casi vertical de la cámara de techo, no en el horizonte.
      p.x = 26 - ((tt * 1.1 + 12) % 56);
      p.y = depth + 12.5 + Math.sin(tt * 0.14) * 1.6;
      p.z = 2 + Math.cos(tt * 0.1) * 6;
      this.heading.set(-1, Math.cos(tt * 0.14) * 0.06, -Math.sin(tt * 0.1) * 0.22).normalize();
    } else if (path === 'orbit') {
      const a = tt * 0.045;
      const R = 30;
      p.set(Math.cos(a) * R, depth + Math.sin(tt * 0.12) * 2.5, Math.sin(a) * R);
      this.heading.set(-Math.sin(a), 0.03, Math.cos(a)).normalize();
    }

    this.group.position.copy(p);
    // orientación: mirar hacia donde nada
    const look = new THREE.Vector3().copy(p).add(this.heading);
    this.group.lookAt(look);
    // el modelo mira a -Z por construcción
    this.group.rotateY(Math.PI);

    if (this.mat) {
      this.mat.uniforms.uTime.value = tt;
      this.mat.uniforms.uOpacity.value = opacity;
    }
    if (this.fluke) {
      this.fluke.rotation.z = Math.sin(tt * 0.72 - 3.4) * 0.22;
    }
    this.mixer?.update(dt);
  }

  setVisible(v) { this.group.visible = v; }

  dispose() {
    this.group.traverse((o) => {
      o.geometry?.dispose?.();
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
      else o.material?.dispose?.();
    });
    this.group.parent?.remove(this.group);
  }
}

// ───────────────────────────── BANCO DE PECES ─────────────────────────────

const FISH_VS = /* glsl */`
  attribute vec3 aOffset;      // posición relativa en el banco
  attribute float aPhase;
  attribute float aScale;
  attribute vec3 aTint;

  uniform float uTime, uSpeed, uSpread, uDensity;
  uniform vec3 uCenter;
  varying vec3 vTint;
  varying float vFade;

  void main(){
    float t = uTime * uSpeed;
    // ondulación del banco: la fase recorre el grupo, así el banco "respira"
    float ph = aPhase * 6.2831;
    vec3 off = aOffset * uSpread;
    off.x += sin(t * 1.1 + ph) * 0.55;
    off.y += sin(t * 0.9 + ph * 1.7) * 0.4;
    off.z += cos(t * 1.05 + ph * 1.3) * 0.55;

    // retardo por posición: los de atrás siguen a los de delante
    float lag = off.z * 0.06;
    vec3 c = uCenter;
    c.x += sin(t * 0.3 - lag) * 7.0;
    c.y += sin(t * 0.21 - lag) * 2.2;
    c.z += cos(t * 0.25 - lag) * 7.0;

    vec3 world = c + off;

    // coleteo del pez individual
    vec3 p = position;
    p.x += sin(t * 7.0 + ph) * p.z * 0.5;

    // orientación: el pez mira hacia donde se mueve el banco
    vec3 dir = normalize(vec3(cos(t * 0.3 - lag), 0.08, -sin(t * 0.25 - lag)));
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 right = normalize(cross(up, dir));
    vec3 realUp = cross(dir, right);
    mat3 B = mat3(right, realUp, dir);

    vec3 fp = world + B * (p * aScale);
    vTint = aTint;
    // los peces fuera del presupuesto de densidad se descartan
    vFade = step(aPhase, uDensity);
    vec4 mv = modelViewMatrix * vec4(fp, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FISH_FS = /* glsl */`
  uniform float uOpacity;
  varying vec3 vTint;
  varying float vFade;
  void main(){
    if (vFade < 0.5) discard;
    gl_FragColor = vec4(vTint, uOpacity);
  }
`;

export class FishSchool {
  constructor({ rng, count = 420, spread = 6, palette = PALETTE.ocean, center = [0, -2, -10], scale = 1, speed = 1 }) {
    this.count = count;
    // geometría de pez: rombo alargado + cola. 6 triángulos, instanciado por atributos.
    const base = new THREE.BufferGeometry();
    const s = 0.115 * scale;
    const verts = [
      0, 0, -1.8 * s,     0.34 * s, 0, -0.5 * s,   0, 0.26 * s, -0.4 * s,
      0, 0, -1.8 * s,     0, 0.26 * s, -0.4 * s,  -0.34 * s, 0, -0.5 * s,
      0, 0, -1.8 * s,    -0.34 * s, 0, -0.5 * s,   0, -0.2 * s, -0.4 * s,
      0, 0, -1.8 * s,     0, -0.2 * s, -0.4 * s,   0.34 * s, 0, -0.5 * s,
      0.34 * s, 0, -0.5 * s, 0, 0.26 * s, -0.4 * s, 0, 0, 1.0 * s,
      -0.34 * s, 0, -0.5 * s, 0, 0, 1.0 * s, 0, 0.26 * s, -0.4 * s,
      // cola
      0, 0, 1.0 * s,  0.4 * s, 0.34 * s, 1.7 * s,  -0.4 * s, 0.34 * s, 1.7 * s
    ];
    const positions = [], offsets = [], phases = [], scales = [], tints = [];
    const cols = [
      new THREE.Color(palette.caustic || '#7FE3FF'),
      new THREE.Color(palette.biolum || '#6AFFD8'),
      new THREE.Color(palette.rays || '#E8F7FF'),
      new THREE.Color(palette.accent || '#FFD9A0')
    ];
    for (let i = 0; i < count; i++) {
      const [ox, oz] = rng.disk(1);
      const oy = rng.gauss(0, 0.4);
      const sc = rng.range(0.6, 1.5);
      // Paleta contenida: el banco debe leerse como un banco, no como confeti.
      const tint = cols[rng() < 0.06 ? 3 : (rng() < 0.3 ? 1 : (rng() < 0.5 ? 2 : 0))].clone()
        .multiplyScalar(rng.range(0.3, 0.68));
      for (let v = 0; v < verts.length; v += 3) {
        positions.push(verts[v], verts[v + 1], verts[v + 2]);
        offsets.push(ox, oy, oz);
        phases.push(i / count);
        scales.push(sc);
        tints.push(tint.r, tint.g, tint.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('aOffset', new THREE.Float32BufferAttribute(offsets, 3));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    g.setAttribute('aScale', new THREE.Float32BufferAttribute(scales, 1));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(tints, 3));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: speed },
        uSpread: { value: spread },
        uDensity: { value: 1 },
        uCenter: { value: new THREE.Vector3(...center) },
        uOpacity: { value: 1 }
      },
      vertexShader: FISH_VS,
      fragmentShader: FISH_FS,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    base.dispose();
  }
  /** `density` 0..1 permite regular la cantidad de peces en vivo, como pide el brief. */
  update({ t = 0, density = 1, speed = 1, spread = 6, opacity = 1 }) {
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uDensity.value = clamp01(density);
    this.mat.uniforms.uSpeed.value = speed;
    this.mat.uniforms.uSpread.value = spread;
    this.mat.uniforms.uOpacity.value = opacity;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.mesh.parent?.remove(this.mesh); }
}

// ───────────────────── RAYOS DE LUZ SUBMARINOS ─────────────────────

export class LightShafts {
  /** Haces cónicos que atraviesan el agua (o el follaje). Aditivos, muy barato. */
  constructor({ rng, count = 14, height = 60, radius = 34, color = '#E8F7FF', spreadTop = 1.4, spreadBottom = 6 }) {
    this.group = new THREE.Group();
    this.group.name = 'light-shafts';
    this.mats = [];
    for (let i = 0; i < count; i++) {
      const geo = new THREE.CylinderGeometry(
        rng.range(0.4, spreadTop), rng.range(spreadBottom * 0.5, spreadBottom),
        height, 16, 1, true
      );
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: rng.range(0.018, 0.055) },
          uTime: { value: 0 },
          uPhase: { value: rng() * 6.2831 }
        },
        vertexShader: `
          varying vec2 vUv; varying vec3 vN;
          void main(){ vUv = uv; vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
          uniform vec3 uColor; uniform float uOpacity, uTime, uPhase;
          varying vec2 vUv; varying vec3 vN;
          void main(){
            // Sin bordes duros: el haz se apaga hacia abajo y, sobre todo, en
            // silueta (cuando la normal mira a cámara el cono se ve de canto y
            // debe desaparecer, no mostrar su geometría).
            // El cono es estrecho arriba (superficie) y ancho abajo: el haz
            // debe ser intenso donde nace y perderse con la profundidad.
            float fade = pow(vUv.y, 1.7) * smoothstep(0.0, 0.08, vUv.y);
            float rim = pow(abs(sin(vUv.x * 3.14159)), 2.2);
            float flicker = 0.8 + 0.2 * sin(uTime * 0.5 + uPhase);
            gl_FragColor = vec4(uColor, uOpacity * fade * rim * flicker);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const m = new THREE.Mesh(geo, mat);
      const [x, z] = rng.disk(radius);
      m.position.set(x, height * 0.42, z);
      m.rotation.z = rng.range(-0.16, 0.16);
      m.rotation.x = rng.range(-0.1, 0.1);
      this.group.add(m);
      this.mats.push(mat);
    }
  }
  update({ ambientTime = 0, intensity = 1 }) {
    for (const m of this.mats) {
      m.uniforms.uTime.value = ambientTime;
      m.uniforms.uOpacity.value = m.uniforms.uOpacity.value; // base fija
      m.uniforms.uColor.value.multiplyScalar(1);
    }
    this.group.visible = intensity > 0.01;
    this.group.scale.setScalar(1);
    for (const m of this.mats) m.uniforms.uOpacity.value = Math.max(0.01, m.uniforms.uOpacity.value);
    this._intensity = intensity;
    this.group.traverse((o) => { if (o.material?.uniforms?.uOpacity) o.material.opacity = 1; });
  }
  dispose() {
    this.group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    this.group.parent?.remove(this.group);
  }
}

// ───────────────────── MEDUSAS BIOLUMINISCENTES ─────────────────────

export class Jellyfish {
  constructor({ rng, count = 26, radius = 30, palette = PALETTE.ocean }) {
    this.count = count;
    this.group = new THREE.Group();
    this.items = [];
    const col = new THREE.Color(palette.biolum || '#6AFFD8');
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const bellGeo = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const mat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      });
      const bell = new THREE.Mesh(bellGeo, mat);
      g.add(bell);
      // tentáculos como líneas
      const tp = [], ti = [];
      const nT = 8;
      for (let k = 0; k < nT; k++) {
        const a = (k / nT) * Math.PI * 2;
        const base = nT * 0 + k * 5;
        for (let s = 0; s < 5; s++) {
          tp.push(Math.cos(a) * 0.6 * (1 - s * 0.1), -s * 0.7, Math.sin(a) * 0.6 * (1 - s * 0.1));
          if (s > 0) ti.push(base + s - 1, base + s);
        }
      }
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
      tg.setIndex(ti);
      const tm = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
      g.add(new THREE.LineSegments(tg, tm));

      const [x, z] = rng.disk(radius);
      const s = rng.range(0.4, 1.3);
      g.scale.setScalar(s);
      g.position.set(x, rng.range(-14, 10), z);
      this.group.add(g);
      this.items.push({ g, bell, mat, tm, phase: rng() * 6.2831, speed: rng.range(0.25, 0.6), baseY: g.position.y, s });
    }
  }
  update({ ambientTime = 0, intensity = 1 }) {
    for (const it of this.items) {
      // pulso de propulsión: se contrae y asciende
      const pulse = Math.sin(ambientTime * it.speed + it.phase);
      it.bell.scale.set(1 + pulse * 0.16, 1 - pulse * 0.2, 1 + pulse * 0.16);
      it.g.position.y = it.baseY + Math.sin(ambientTime * it.speed * 0.5 + it.phase) * 2.2;
      it.mat.opacity = (0.18 + 0.16 * (0.5 + 0.5 * pulse)) * intensity;
      it.tm.opacity = 0.16 * intensity;
    }
  }
  dispose() {
    this.group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    this.group.parent?.remove(this.group);
  }
}

// ───────────────────── PARTÍCULAS EN SUSPENSIÓN ─────────────────────

/** Plancton / polvo: lo que vende la sensación de "estar dentro" de un medio. */
export class SuspendedParticles {
  constructor({ rng, count = 3000, radius = 40, height = 50, color = '#E8F7FF', size = 0.55 }) {
    this.count = count;
    this.arr = allocParticles(count);
    this._drift = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const [x, z] = rng.disk(radius);
      this.arr.position[i * 3] = x;
      this.arr.position[i * 3 + 1] = rng.range(-height / 2, height / 2);
      this.arr.position[i * 3 + 2] = z;
      this._drift[i * 3] = rng.range(-0.12, 0.12);
      this._drift[i * 3 + 1] = rng.range(0.02, 0.2);
      this._drift[i * 3 + 2] = rng.range(-0.12, 0.12);
      this.arr.aSize[i] = rng.range(0.25, 1.3);
      this.arr.aAlpha[i] = rng.range(0.1, 0.5);
      this.arr.aPhase[i] = rng();
      setColorAt(this.arr.aColor, i, c);
    }
    this.height = height;
    this.geo = buildParticleGeometry(count, this.arr);
    this.mat = makeParticleMaterial({ map: softSprite(64, 2.4), size, color: 0xffffff, opacity: 0.8 });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
  }
  update({ dt = 0.016, ambientTime = 0, intensity = 1, focus = 14 }) {
    const p = this.arr.position;
    for (let i = 0; i < this.count; i++) {
      p[i * 3]     += this._drift[i * 3] * dt;
      p[i * 3 + 1] += this._drift[i * 3 + 1] * dt;
      p[i * 3 + 2] += this._drift[i * 3 + 2] * dt;
      if (p[i * 3 + 1] > this.height / 2) p[i * 3 + 1] = -this.height / 2;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uOpacity.value = intensity;
    this.mat.uniforms.uFocus.value = focus;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.points.parent?.remove(this.points); }
}

export default { Whale, FishSchool, LightShafts, Jellyfish, SuspendedParticles };

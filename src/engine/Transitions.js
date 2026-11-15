/**
 * SISTEMA DE TRANSICIONES REUTILIZABLE.
 *
 * Requisito del brief (§6): ningún mundo desaparece para que aparezca otro como
 * diapositivas. Cada transición tiene un RECURSO VISUAL que la justifica.
 *
 * Cómo funciona: el mundo entrante se renderiza a un render target y se compone
 * sobre el saliente con una máscara propia de cada recurso. Se inserta como una
 * pasada del composer justo después del RenderPass, así que bloom y salida se
 * aplican al resultado ya mezclado (la transición participa de la luz, no se pega
 * encima).
 *
 * Añadir una transición = añadir un caso en el shader y una entrada en TRANSITIONS.
 */
import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { clamp01, ease } from '../core/easing.js';

export const TRANSITIONS = {
  'crossfade':     { mode: 0, label: 'Disolvencia',            duration: 2.0, note: 'Último recurso. Evitar.' },
  'light-wave':    { mode: 1, label: 'Onda de energía',        duration: 2.6, note: 'Estrella → nacimiento de plantas' },
  'roots':         { mode: 2, label: 'Raíces',                 duration: 3.0, note: 'Planta → raíces → bosque' },
  'dive':          { mode: 3, label: 'Inmersión',              duration: 4.0, note: 'Mariposa → lago → océano' },
  'surface-break': { mode: 4, label: 'Romper la superficie',   duration: 3.0, note: 'Agua → reflejo → nubes' },
  'nightfall':     { mode: 5, label: 'Caída de la noche',      duration: 4.0, note: 'Nubes → cielo nocturno → espacio' },
  'particles':     { mode: 6, label: 'Partículas',             duration: 2.6, note: 'Nebulosa → partículas → fotografía' },
  'leaves':        { mode: 7, label: 'Hojas',                  duration: 2.8, note: 'Fotografía → hojas → selva' },
  'bloom':         { mode: 8, label: 'Floración de luz',       duration: 2.2, note: 'Estrellas → luciérnagas → jardín' },
  'ember':         { mode: 9, label: 'Brasa',                  duration: 3.2, note: 'Atardecer → tonos rojizos → Red Room' }
};

/** Qué transición usar por defecto entre dos mundos cualesquiera. */
export const DEFAULT_ROUTES = {
  'void>garden': 'light-wave',
  'garden>ocean': 'dive',
  'ocean>sky': 'surface-break',
  'sky>cosmos': 'nightfall',
  'cosmos>memories': 'particles',
  'memories>garden': 'leaves',
  'cosmos>garden': 'bloom',
  'sky>redroom': 'ember',
  'garden>redroom': 'ember',
  'cosmos>redroom': 'ember',
  'ocean>garden': 'roots',
  'garden>sky': 'surface-break',
  'garden>cosmos': 'bloom',
  'ocean>cosmos': 'particles',
  'void>cosmos': 'particles'
};

export function routeFor(fromId, toId) {
  return DEFAULT_ROUTES[`${fromId}>${toId}`]
      || DEFAULT_ROUTES[`${toId}>${fromId}`]
      || 'light-wave';
}

const TransitionShader = {
  uniforms: {
    tDiffuse: { value: null },   // mundo saliente (lo da el composer)
    tIncoming: { value: null },  // mundo entrante (render target)
    uMix: { value: 0 },
    uMode: { value: 0 },
    uTime: { value: 0 },
    uAspect: { value: 1.777 },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uTintA: { value: new THREE.Color('#FFD9A0') },
    uTintB: { value: new THREE.Color('#7FE3FF') },
    uActive: { value: 0 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tIncoming;
    uniform float uMix, uTime, uAspect, uActive;
    uniform int uMode;
    uniform vec2 uCenter;
    uniform vec3 uTintA, uTintB;
    varying vec2 vUv;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
    }
    float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=noise(p)*a; p*=2.07; a*=0.5; } return s; }

    void main(){
      if (uActive < 0.5) { gl_FragColor = texture2D(tDiffuse, vUv); return; }

      vec2 uv = vUv;
      vec2 ar = vec2(uAspect, 1.0);
      float m = clamp(uMix, 0.0, 1.0);
      float mask = 0.0;      // 0 = saliente, 1 = entrante
      float glow = 0.0;      // energía en el frente de la transición
      vec3 glowColor = uTintA;
      vec2 warp = vec2(0.0);

      // ── 1. ONDA DE ENERGÍA: anillo que corre desde el centro ──
      if (uMode == 1) {
        float d = length((uv - uCenter) * ar) / 0.85;
        float r = m * 1.5;
        mask = smoothstep(r + 0.04, r - 0.12, d);
        glow = exp(-pow((d - r) * 11.0, 2.0));
        warp = normalize((uv - uCenter) + 1e-5) * glow * 0.02;
      }
      // ── 2. RAÍCES: la máscara crece como venas ──
      else if (uMode == 2) {
        float veins = fbm(uv * ar * 6.0 + 3.1);
        float trunk = 1.0 - abs(uv.x - uCenter.x) * 2.0;
        float field = veins * 0.65 + trunk * 0.35 + (1.0 - uv.y) * 0.25;
        float th = m * 1.55 - 0.2;
        mask = smoothstep(th - 0.1, th + 0.06, field);
        glow = exp(-pow((field - th) * 13.0, 2.0));
        glowColor = vec3(0.66, 0.9, 0.63);
      }
      // ── 3. INMERSIÓN: la superficie sube pasando la cámara ──
      else if (uMode == 3) {
        float surf = 1.25 - m * 1.6;
        float wobble = sin(uv.x * 22.0 + uTime * 3.0) * 0.012 + fbm(uv * 9.0 + uTime * 0.3) * 0.02;
        float line = surf + wobble;
        mask = smoothstep(line + 0.015, line - 0.015, uv.y);
        glow = exp(-pow((uv.y - line) * 26.0, 2.0)) * 0.9;
        glowColor = uTintB;
        // refracción justo bajo la línea de agua
        float below = smoothstep(line, line - 0.25, uv.y);
        warp = vec2(sin(uv.y * 40.0 + uTime * 2.0) * 0.012, 0.0) * below;
      }
      // ── 4. ROMPER LA SUPERFICIE: destello y barrido hacia arriba ──
      else if (uMode == 4) {
        float line = -0.25 + m * 1.6;
        float wobble = fbm(uv * 7.0 - uTime * 0.4) * 0.03;
        mask = smoothstep(line - 0.02, line + 0.06, uv.y + wobble);
        glow = exp(-pow((uv.y + wobble - line) * 9.0, 2.0)) * 1.5;
        glowColor = vec3(0.91, 0.97, 1.0);
      }
      // ── 5. CAÍDA DE LA NOCHE: oscurece y revela el cielo profundo ──
      else if (uMode == 5) {
        float d = length((uv - vec2(0.5, 0.62)) * ar);
        float dark = smoothstep(0.0, 0.5, m);
        mask = smoothstep(0.75 - m * 0.95, 0.1 - m * 0.2, d);
        // las dos imágenes se oscurecen juntas en el centro de la transición
        float dip = 1.0 - pow(sin(m * 3.14159), 1.4) * 0.72;
        vec4 A = texture2D(tDiffuse, uv);
        vec4 B = texture2D(tIncoming, uv);
        vec3 c = mix(A.rgb, B.rgb, mask) * dip;
        // primeras estrellas apareciendo durante la transición
        float st = step(0.9988, hash(floor(uv * ar * 520.0)));
        c += vec3(1.0, 0.95, 0.86) * st * smoothstep(0.35, 1.0, m);
        gl_FragColor = vec4(c, 1.0);
        return;
      }
      // ── 6. PARTÍCULAS: disolución granular con chispas ──
      else if (uMode == 6) {
        float n = fbm(uv * ar * 14.0) * 0.6 + hash(floor(uv * ar * 240.0)) * 0.4;
        float th = m * 1.4 - 0.2;
        mask = smoothstep(th - 0.08, th + 0.02, n);
        glow = exp(-pow((n - th) * 16.0, 2.0)) * 1.2;
        glowColor = uTintA;
      }
      // ── 7. HOJAS: manchas orgánicas que se expanden ──
      else if (uMode == 7) {
        vec2 g = uv * ar * 5.0;
        vec2 cell = floor(g);
        vec2 f = fract(g) - 0.5;
        float r = hash(cell);
        // forma de hoja: elipse rotada
        float ang = r * 6.2831;
        mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
        vec2 q = R * f;
        float leaf = 1.0 - length(vec2(q.x * 1.9, q.y * 0.75));
        float th = (m * 1.5 - 0.25) + (r - 0.5) * 0.35;
        mask = smoothstep(th - 0.25, th + 0.1, leaf + th * 0.6);
        mask = max(mask, smoothstep(0.92, 1.0, m));
        glow = exp(-pow((leaf - th) * 7.0, 2.0)) * 0.6;
        glowColor = vec3(0.65, 0.88, 0.62);
      }
      // ── 8. FLORACIÓN DE LUZ: sobreexposición puntual ──
      else if (uMode == 8) {
        float n = fbm(uv * ar * 8.0 + uTime * 0.2);
        float th = m * 1.4 - 0.2;
        mask = smoothstep(th - 0.14, th + 0.06, n);
        float peak = pow(sin(m * 3.14159), 2.0);
        glow = (exp(-pow((n - th) * 9.0, 2.0)) + peak * 0.35) * 1.4;
        glowColor = uTintA;
      }
      // ── 9. BRASA: hacia el Red Room. El calor avanza desde abajo. ──
      else if (uMode == 9) {
        float n = fbm(uv * ar * 5.0 - vec2(0.0, uTime * 0.25));
        float field = (1.0 - uv.y) * 0.75 + n * 0.45;
        float th = m * 1.5 - 0.2;
        mask = smoothstep(th - 0.14, th + 0.05, field);
        glow = exp(-pow((field - th) * 10.0, 2.0)) * 1.1;
        glowColor = vec3(0.78, 0.16, 0.2);
      }
      // ── 0. DISOLVENCIA (fallback) ──
      else {
        mask = m;
      }

      vec4 A = texture2D(tDiffuse, uv + warp);
      vec4 B = texture2D(tIncoming, uv - warp * 0.5);
      vec3 c = mix(A.rgb, B.rgb, clamp(mask, 0.0, 1.0));
      c += glowColor * glow * 0.55 * (1.0 - abs(m - 0.5) * 0.6);
      gl_FragColor = vec4(c, 1.0);
    }
  `
};

export class TransitionPass extends ShaderPass {
  constructor() {
    super(TransitionShader);
    this.needsSwap = true;
  }
}

/**
 * Controlador de una transición en curso.
 * El SceneManager lo consulta cada frame.
 */
export class Transition {
  constructor({ from, to, via = 'light-wave', duration = null, center = [0.5, 0.5] }) {
    const def = TRANSITIONS[via] || TRANSITIONS['light-wave'];
    this.via = via;
    this.mode = def.mode;
    this.duration = duration ?? def.duration;
    this.from = from;
    this.to = to;
    this.t = 0;
    this.center = center;
    this.done = false;
  }
  update(dt) {
    this.t += dt;
    if (this.t >= this.duration) { this.t = this.duration; this.done = true; }
    return this.progress;
  }
  /** Curva: arranca y termina suave para que no se vea el principio ni el final. */
  get progress() {
    return ease('easeInOutCubic', clamp01(this.t / this.duration));
  }
  get raw() { return clamp01(this.t / this.duration); }
}

export default Transition;

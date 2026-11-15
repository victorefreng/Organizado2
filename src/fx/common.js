/**
 * Utilidades compartidas por los sistemas de FX.
 * Texturas generadas en canvas (cero assets externos), materiales de partículas con
 * atenuación por distancia y rack-focus simulado.
 */
import * as THREE from 'three';

const cache = new Map();

/** Punto gaussiano suave. Es la base de casi todo lo luminoso del show. */
export function softSprite(size = 128, power = 2.2) {
  const key = `soft-${size}-${power}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - half + 0.5, y - half + 0.5) / half;
      const a = Math.max(0, 1 - d);
      const v = Math.pow(a, power);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(v * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

/** Destello con 4 púas: para el núcleo de la estrella y estrellas brillantes. */
export function flareSprite(size = 256) {
  const key = `flare-${size}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const half = size / 2;
  const rg = g.createRadialGradient(half, half, 0, half, half, half);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.12, 'rgba(255,250,235,0.85)');
  rg.addColorStop(0.3, 'rgba(255,225,170,0.3)');
  rg.addColorStop(1, 'rgba(255,210,150,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'lighter';
  for (const ang of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
    const len = ang % (Math.PI / 2) === 0 ? half * 0.95 : half * 0.5;
    const w = ang % (Math.PI / 2) === 0 ? size * 0.012 : size * 0.006;
    g.save();
    g.translate(half, half);
    g.rotate(ang);
    const lg = g.createLinearGradient(-len, 0, len, 0);
    lg.addColorStop(0, 'rgba(255,230,190,0)');
    lg.addColorStop(0.5, 'rgba(255,248,230,0.55)');
    lg.addColorStop(1, 'rgba(255,230,190,0)');
    g.fillStyle = lg;
    g.fillRect(-len, -w, len * 2, w * 2);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

/** Hoja: silueta orgánica para instanciado de vegetación. */
export function leafSprite(size = 128, tint = '#7FC79A') {
  const key = `leaf-${size}-${tint}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  const grad = g.createLinearGradient(0, -size / 2, 0, size / 2);
  grad.addColorStop(0, tint);
  grad.addColorStop(1, 'rgba(20,50,36,0.95)');
  g.fillStyle = grad;
  g.beginPath();
  // hoja lanceolada
  g.moveTo(0, -size * 0.46);
  g.bezierCurveTo(size * 0.34, -size * 0.2, size * 0.3, size * 0.26, 0, size * 0.46);
  g.bezierCurveTo(-size * 0.3, size * 0.26, -size * 0.34, -size * 0.2, 0, -size * 0.46);
  g.fill();
  // nervio central
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.lineWidth = size * 0.012;
  g.beginPath();
  g.moveTo(0, -size * 0.42);
  g.lineTo(0, size * 0.42);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

/** Nube: parche de ruido suave para capas de cielo. */
export function cloudSprite(size = 256, seed = 1) {
  const key = `cloud-${size}-${seed}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  // suma de discos difusos: lee como cúmulo sin textura externa
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.pow(rnd(), 0.6) * size * 0.3;
    const x = size / 2 + Math.cos(a) * r;
    const y = size / 2 + Math.sin(a) * r * 0.55;
    const rad = size * (0.08 + rnd() * 0.17);
    const rg = g.createRadialGradient(x, y, 0, x, y, rad);
    const al = 0.1 + rnd() * 0.12;
    rg.addColorStop(0, `rgba(255,255,255,${al})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

/** Terciopelo: para el Red Room. Trama fina + degradado, nada de rojo plano. */
export function velvetTexture(size = 512) {
  const key = `velvet-${size}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#2B060D';
  g.fillRect(0, 0, size, size);
  // pliegues verticales
  for (let x = 0; x < size; x++) {
    const f = 0.5 + 0.5 * Math.sin(x * 0.055) * Math.sin(x * 0.013 + 1.7);
    const v = 0.35 + 0.65 * Math.pow(f, 1.8);
    g.fillStyle = `rgba(142,18,38,${0.14 * v})`;
    g.fillRect(x, 0, 1, size);
  }
  // pelo del tejido
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n * 0.4));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n * 0.5));
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  cache.set(key, t);
  return t;
}

/**
 * Material de partículas luminosas.
 * - Atenuación por distancia real (perspectiva).
 * - `uFocus` + `uFocusRange` simulan profundidad de campo: lo que está fuera del
 *   plano de foco crece y pierde opacidad. Es el rack-focus "viable" del brief.
 */
export function makeParticleMaterial({
  map = null,
  size = 1,
  color = 0xffffff,
  opacity = 1,
  blending = THREE.AdditiveBlending,
  depthWrite = false,
  sizeAttenuation = true
} = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map || softSprite() },
      uSize: { value: size },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
      uFocus: { value: 14 },
      uFocusRange: { value: 26 },
      uBokeh: { value: 0.3 },
      uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1 },
      uAttenuate: { value: sizeAttenuation ? 1 : 0 }
    },
    vertexShader: /* glsl */`
      attribute float aSize;
      attribute float aAlpha;
      attribute vec3 aColor;
      attribute float aPhase;
      uniform float uSize, uTime, uFocus, uFocusRange, uBokeh, uPixelRatio, uAttenuate;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dist = -mv.z;
        // desenfoque: fuera del plano de foco la partícula se agranda y se diluye
        float coc = clamp(abs(dist - uFocus) / uFocusRange, 0.0, 1.0);
        float blur = 1.0 + coc * uBokeh * 1.5;
        float atten = mix(1.0, 110.0 / max(dist, 1.0), uAttenuate);
        gl_PointSize = uSize * aSize * atten * blur * uPixelRatio;
        gl_PointSize = clamp(gl_PointSize, 0.0, 190.0);
        // twinkle sutil y determinista
        float tw = 0.82 + 0.18 * sin(uTime * 1.7 + aPhase * 6.2831);
        vAlpha = aAlpha * tw * mix(1.0, 0.32, coc);
        vColor = aColor;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float a = t.a * vAlpha * uOpacity;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor * vColor * t.rgb, a);
      }
    `,
    transparent: true,
    depthWrite,
    blending
  });
  return mat;
}

/** Rellena los atributos estándar que espera makeParticleMaterial. */
export function allocParticles(count) {
  return {
    position: new Float32Array(count * 3),
    aSize: new Float32Array(count),
    aAlpha: new Float32Array(count),
    aColor: new Float32Array(count * 3),
    aPhase: new Float32Array(count)
  };
}

export function buildParticleGeometry(count, arrays) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arrays.position, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(arrays.aSize, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(arrays.aAlpha, 1));
  g.setAttribute('aColor', new THREE.BufferAttribute(arrays.aColor, 3));
  g.setAttribute('aPhase', new THREE.BufferAttribute(arrays.aPhase, 1));
  g.setDrawRange(0, count);
  return g;
}

export function setColorAt(arr, i, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
}

/** Niebla exponencial coherente en todos los mundos. */
export function applyFog(scene, palette) {
  const [r, g, b] = palette.fog;
  scene.fog = new THREE.FogExp2(new THREE.Color(r, g, b), palette.fogDensity);
  return scene.fog;
}

export function disposeObject(obj) {
  if (!obj) return;
  obj.traverse?.((o) => {
    o.geometry?.dispose?.();
    if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
    else o.material?.dispose?.();
  });
  obj.parent?.remove(obj);
}

export default { softSprite, flareSprite, leafSprite, cloudSprite, velvetTexture, makeParticleMaterial };

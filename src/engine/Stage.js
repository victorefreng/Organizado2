/**
 * STAGE — un renderer + composer por superficie de proyección.
 *
 * Responsable solo de: contexto WebGL, post-proceso, fade maestro, calibración de
 * salida (flip, brillo, gamma, keystone) y bucle de render. No sabe nada de
 * narrativa ni de mundos.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { TransitionPass } from './Transitions.js';
import { getProjector } from '../config/projectors.js';
import { resolveQuality } from '../config/quality.js';

/**
 * Pasada final: fade a negro, brillo, gamma, viñeta suave y grano.
 * El grano evita que el negro absoluto parezca "pantalla apagada" y rompe el
 * banding en los degradados oscuros, que es donde más se nota en proyección.
 */
const OutputShader = {
  uniforms: {
    tDiffuse: { value: null },
    uFade: { value: 1 },
    uBrightness: { value: 1 },
    uGamma: { value: 1 },
    uVignette: { value: 0.25 },
    uGrain: { value: 0.025 },
    uTime: { value: 0 },
    uFlip: { value: new THREE.Vector2(0, 0) }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uFade, uBrightness, uGamma, uVignette, uGrain, uTime;
    uniform vec2 uFlip;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      if (uFlip.x > 0.5) uv.x = 1.0 - uv.x;
      if (uFlip.y > 0.5) uv.y = 1.0 - uv.y;

      vec3 c = texture2D(tDiffuse, uv).rgb;

      // viñeta: concentra la mirada, evita bordes duros de proyección
      vec2 d = uv - 0.5;
      float vig = 1.0 - uVignette * dot(d, d) * 2.4;
      c *= vig;

      c *= uBrightness * uFade;
      c = pow(max(c, 0.0), vec3(1.0 / uGamma));

      // grano temporal: mata el banding en negros
      float n = hash(uv * 1024.0 + fract(uTime) * 91.7) - 0.5;
      c += n * uGrain * (1.0 - 0.6 * smoothstep(0.0, 0.5, max(c.r, max(c.g, c.b))));

      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }
  `
};

export class Stage {
  constructor(canvas, surface, qualityName = 'balanced') {
    this.canvas = canvas;
    this.surface = surface;
    this.projector = getProjector(surface);
    this.quality = resolveQuality(qualityName, this.projector.budget);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.quality.antialias,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: true
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = this.quality.shadows;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(this.projector.fov, 16 / 9, 0.1, 6000);

    this._buildComposer();
    this.applyKeystone(this.projector.keystone);

    // render target del mundo entrante
    this.incomingTarget = new THREE.WebGLRenderTarget(1920, 1080, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      depthBuffer: true
    });

    this._clock = new THREE.Clock();
    this.fps = 0;
    this._frames = 0;
    this._fpsT = 0;
    this.onResize = this.resize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.resize();
  }

  _buildComposer() {
    const size = this.renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Mezcla del mundo entrante durante una transición. Va ANTES del bloom para
    // que la transición participe de la luz y no quede pegada encima.
    this.transitionPass = new TransitionPass();
    this.transitionPass.uniforms.uActive.value = 0;
    this.composer.addPass(this.transitionPass);

    if (this.quality.bloom) {
      this.bloom = new UnrealBloomPass(
        new THREE.Vector2(size.x || 1920, size.y || 1080),
        this.quality.bloomStrength,
        0.55,   // radio: halo contenido, no una mancha
        0.78    // umbral: solo lo realmente luminoso florece
      );
      this.composer.addPass(this.bloom);
    }

    this.outputPass = new ShaderPass(OutputShader);
    this.outputPass.uniforms.uBrightness.value = this.projector.brightness;
    this.outputPass.uniforms.uGamma.value = this.projector.gamma;
    this.outputPass.uniforms.uFlip.value.set(
      this.projector.flipH ? 1 : 0,
      this.projector.flipV ? 1 : 0
    );
    this.outputPass.renderToScreen = true;
    this.composer.addPass(this.outputPass);
  }

  /** Calibración de proyección por CSS matrix3d: corrige trapecio sin coste GPU. */
  applyKeystone(ks) {
    if (!ks) return;
    const isIdentity =
      ks.tl[0] === 0 && ks.tl[1] === 0 && ks.tr[0] === 1 && ks.tr[1] === 0 &&
      ks.br[0] === 1 && ks.br[1] === 1 && ks.bl[0] === 0 && ks.bl[1] === 1;
    if (isIdentity) { this.canvas.style.transform = ''; return; }
    const w = this.canvas.clientWidth || 1920;
    const h = this.canvas.clientHeight || 1080;
    const src = [[0, 0], [w, 0], [w, h], [0, h]];
    const dst = [
      [ks.tl[0] * w, ks.tl[1] * h],
      [ks.tr[0] * w, ks.tr[1] * h],
      [ks.br[0] * w, ks.br[1] * h],
      [ks.bl[0] * w, ks.bl[1] * h]
    ];
    const m = solveHomography(src, dst);
    if (!m) return;
    this.canvas.style.transformOrigin = '0 0';
    this.canvas.style.transform = `matrix3d(${[
      m[0], m[3], 0, m[6],
      m[1], m[4], 0, m[7],
      0, 0, 1, 0,
      m[2], m[5], 0, 1
    ].join(',')})`;
  }

  setQuality(name) {
    this.quality = resolveQuality(name, this.projector.budget);
    this.renderer.shadowMap.enabled = this.quality.shadows;
    if (this.bloom) this.bloom.strength = this.quality.bloomStrength;
    this.resize();
    return this.quality;
  }

  setFade(v) { this.outputPass.uniforms.uFade.value = v; }
  setExposure(v) { this.renderer.toneMappingExposure = v; }
  setBrightness(v) { this.outputPass.uniforms.uBrightness.value = v; }
  setGrain(v) { this.outputPass.uniforms.uGrain.value = v; }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const pr = Math.min(this.quality.pixelRatio, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.incomingTarget?.setSize(Math.max(2, Math.round(w * pr)), Math.max(2, Math.round(h * pr)));
    if (this.transitionPass) this.transitionPass.uniforms.uAspect.value = w / Math.max(1, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.applyKeystone(this.projector.keystone);
  }

  /**
   * Prepara la pasada de transición: renderiza el mundo entrante a su target.
   * @param incoming {scene, camera} o null para desactivar
   */
  prepareTransition(incoming, { mix = 0, mode = 0, center = [0.5, 0.5], time = 0, tintA = null, tintB = null } = {}) {
    const tp = this.transitionPass;
    if (!incoming) { tp.uniforms.uActive.value = 0; return; }
    const prev = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.incomingTarget);
    this.renderer.clear(true, true, true);
    this.renderer.render(incoming.scene, incoming.camera);
    this.renderer.setRenderTarget(prev);
    tp.uniforms.tIncoming.value = this.incomingTarget.texture;
    tp.uniforms.uActive.value = 1;
    tp.uniforms.uMix.value = mix;
    tp.uniforms.uMode.value = mode;
    tp.uniforms.uTime.value = time;
    tp.uniforms.uCenter.value.set(center[0], center[1]);
    if (tintA) tp.uniforms.uTintA.value.set(tintA);
    if (tintB) tp.uniforms.uTintB.value.set(tintB);
  }

  /** Cambia la escena activa del RenderPass (al completarse una transición). */
  setScene(scene) {
    this.scene = scene;
    this.renderPass.scene = scene;
  }

  render(elapsed) {
    this.outputPass.uniforms.uTime.value = elapsed;
    this.composer.render();
    // FPS medido en ventana de 0.5 s
    this._frames++;
    const now = performance.now();
    if (now - this._fpsT > 500) {
      this.fps = Math.round((this._frames * 1000) / (now - this._fpsT));
      this._frames = 0;
      this._fpsT = now;
    }
  }

  get stats() {
    const info = this.renderer.info;
    return {
      fps: this.fps,
      calls: info.render.calls,
      triangles: info.render.triangles,
      textures: info.memory.textures,
      geometries: info.memory.geometries,
      quality: this.quality.name
    };
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.incomingTarget?.dispose();
    this.composer?.dispose?.();
    this.renderer.dispose();
  }
}

/** Homografía 2D (8 incógnitas) por eliminación gaussiana. Para el keystone. */
function solveHomography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const n = 8;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    if (Math.abs(A[p][i]) < 1e-10) return null;
    [A[i], A[p]] = [A[p], A[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  return b.map((v, i) => v / A[i][i]);
}

export default Stage;

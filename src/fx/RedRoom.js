/**
 * THE RED ROOM — elegante, romántico, nunca vulgar.
 *
 * Reglas de diseño (docs/01-direccion-creativa.md §3) aplicadas en código:
 *   - Nunca un plano rojo saturado: lo que se ve son SOMBRAS sobre terciopelo.
 *   - Saturación máxima 0.75, sin magentas puros, sin cian, sin estrobo.
 *   - Iluminación INDIRECTA: focos suaves que lamen la cortina en ángulo.
 *   - Movimiento ≤ 0.04 rad/s. El ambiente se mueve, no la cámara.
 */
import * as THREE from 'three';
import { velvetTexture, softSprite, makeParticleMaterial, allocParticles, buildParticleGeometry, setColorAt } from './common.js';
import { clamp, clamp01, lerp } from '../core/easing.js';
import { PALETTE } from '../config/palette.js';

export const RED_ROOM_PRESETS = {
  romantic: {
    label: 'Romantic',
    desc: 'Cálido, elegante y sutil',
    hue: 0.98, saturation: 0.52, brightness: 0.70, speed: 0.5,
    amberMix: 0.42, fogDensity: 0.022, foldDepth: 0.55, dustIntensity: 0.5, shadowContrast: 0.55
  },
  intimate: {
    label: 'Intimate',
    desc: 'Rojo profundo, poca luz, movimientos lentos',
    hue: 0.975, saturation: 0.68, brightness: 0.42, speed: 0.28,
    amberMix: 0.2, fogDensity: 0.038, foldDepth: 0.8, dustIntensity: 0.7, shadowContrast: 0.8
  },
  cinematic: {
    label: 'Cinematic',
    desc: 'Efectos teatrales, sombras y ambiente de película',
    hue: 0.99, saturation: 0.6, brightness: 0.58, speed: 0.42,
    amberMix: 0.3, fogDensity: 0.03, foldDepth: 0.95, dustIntensity: 0.85, shadowContrast: 1.0
  },
  custom: {
    label: 'Custom',
    desc: 'Control total de parámetros',
    hue: 0.98, saturation: 0.6, brightness: 0.58, speed: 0.4,
    amberMix: 0.35, fogDensity: 0.028, foldDepth: 0.7, dustIntensity: 0.6, shadowContrast: 0.7
  }
};

const CURTAIN_VS = /* glsl */`
  uniform float uTime, uFold, uSpeed;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vView;
  varying float vFold;

  void main(){
    vUv = uv;

    // La cortina es un cilindro visto desde DENTRO: la normal útil apunta hacia
    // el centro, no hacia +Z. (Tratarla como un plano dejaba la iluminación
    // plana y la sala prácticamente negra.)
    vec3 nIn = normalize(-normal);

    // Pliegues: desplazamiento RADIAL, a lo largo de la normal del cilindro.
    float ang = atan(position.z, position.x);
    float t = uTime * uSpeed;
    float f1 = sin(ang * 9.0 + t * 0.30);
    float f2 = sin(ang * 23.0 - t * 0.21);
    float fold = (f1 * 0.68 + f2 * 0.32);
    // El tejido cae: más pliegue abajo que arriba
    float drop = mix(0.45, 1.0, 1.0 - uv.y);
    vFold = fold;

    vec3 p = position + nIn * (fold * uFold * drop * 1.6);

    // Normal perturbada por la derivada angular del pliegue: esto es lo que
    // hace que la luz rasante dibuje las crestas y los valles del terciopelo.
    float dAng = (cos(ang * 9.0 + t * 0.30) * 9.0 * 0.68
                + cos(ang * 23.0 - t * 0.21) * 23.0 * 0.32) * uFold * drop;
    vec3 tangent = normalize(vec3(-sin(ang), 0.0, cos(ang)));
    vec3 n = normalize(nIn + tangent * dAng * 0.09);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vView = -mv.xyz;
    vN = normalize(normalMatrix * n);
    gl_Position = projectionMatrix * mv;
  }
`;

const CURTAIN_FS = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uWine, uCrimson, uVelvet, uAmber, uShadow;
  uniform float uBrightness, uSaturation, uAmberMix, uShadowContrast, uTime, uSpeed;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vView;
  varying float vFold;

  vec3 desat(vec3 c, float s){
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(l), c, s);
  }

  void main(){
    vec3 tex = texture2D(uMap, vUv * vec2(4.0, 1.0)).rgb;
    vec3 n = normalize(vN);
    vec3 v = normalize(vView);

    // DOS luces prácticas indirectas que laman la cortina en rasante.
    // Es esto —y no un plano rojo— lo que da el aspecto de terciopelo.
    vec3 l1 = normalize(vec3(-0.9, 0.3, 0.3));
    vec3 l2 = normalize(vec3(0.85, -0.1, 0.5));
    float d1 = pow(max(0.0, dot(n, l1)) * 0.5 + 0.5, 2.2);
    float d2 = pow(max(0.0, dot(n, l2)) * 0.5 + 0.5, 3.0);

    float breath = 0.9 + 0.1 * sin(uTime * uSpeed * 0.35);

    // base: de sombra a vino según la luz principal
    vec3 c = mix(uShadow * 1.5, uWine * 2.6, d1);
    c += uCrimson * d2 * 1.15;

    // sheen del terciopelo: realce solo en las crestas (retrodispersión)
    float sheen = pow(1.0 - max(0.0, dot(n, v)), 3.0);
    c += uVelvet * sheen * 0.55;

    // ámbar práctico: la luz de lámpara que da calidez
    c += uAmber * uAmberMix * d1 * 0.5;

    // el tejido modula, no apaga
    c *= 0.72 + tex * 1.5;
    c *= breath * (0.55 + uBrightness * 1.25);

    // contraste de sombra, sin hundir los medios
    c = pow(max(c, 0.0), vec3(mix(0.95, 1.22, uShadowContrast)));

    // tope de saturación: regla anti-vulgar de docs/01-direccion-creativa.md
    c = desat(c, min(uSaturation, 0.75) / 0.75);

    // viñeta: la cortina se pierde arriba y en los extremos
    float vig = 1.0 - smoothstep(0.55, 1.0, vUv.y) * 0.75;
    vig *= 0.55 + 0.45 * smoothstep(0.0, 0.25, vUv.y);
    c *= vig;

    gl_FragColor = vec4(c, 1.0);
  }
`;

export class RedRoom {
  constructor({ rng, preset = 'romantic', palette = PALETTE.redroom, quality = null } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'red-room';
    this.palette = palette;
    this.params = { ...RED_ROOM_PRESETS[preset] };
    this.presetName = preset;

    // cortina principal (cilindro abierto: envuelve al espectador)
    const geo = new THREE.CylinderGeometry(15, 16.5, 17, 128, 20, true);
    this.curtainMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: velvetTexture(512) },
        uWine: { value: new THREE.Color(palette.wine) },
        uCrimson: { value: new THREE.Color(palette.crimson) },
        uVelvet: { value: new THREE.Color(palette.velvet) },
        uAmber: { value: new THREE.Color(palette.amber) },
        uShadow: { value: new THREE.Color(palette.shadow) },
        uBrightness: { value: this.params.brightness },
        uSaturation: { value: this.params.saturation },
        uAmberMix: { value: this.params.amberMix },
        uShadowContrast: { value: this.params.shadowContrast },
        uFold: { value: this.params.foldDepth },
        uSpeed: { value: this.params.speed }
      },
      vertexShader: CURTAIN_VS,
      fragmentShader: CURTAIN_FS,
      side: THREE.BackSide
    });
    this.curtain = new THREE.Mesh(geo, this.curtainMat);
    this.curtain.position.y = 3.2;
    this.group.add(this.curtain);

    // suelo: reflejo suave, no espejo
    const floorGeo = new THREE.CircleGeometry(17, 96);
    this.floorMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWine: { value: new THREE.Color(palette.wine) },
        uShadow: { value: new THREE.Color(palette.base) },
        uBrightness: { value: this.params.brightness }
      },
      vertexShader: `varying vec2 vUv; varying vec3 vP;
        void main(){ vUv=uv; vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `
        uniform vec3 uWine, uShadow; uniform float uTime, uBrightness;
        varying vec2 vUv; varying vec3 vP;
        void main(){
          float r = length(vUv - 0.5) * 2.0;
          // reflejo difuso de la cortina, estirado radialmente
          float refl = pow(clamp(r, 0.0, 1.0), 2.2) * (0.55 + 0.45 * sin(atan(vP.y, vP.x) * 9.0 + uTime * 0.1));
          vec3 c = mix(uShadow * 1.4, uWine * 1.9, refl * 0.75);
          c *= (0.5 + uBrightness) * (1.0 - smoothstep(0.5, 1.0, r) * 0.55);
          gl_FragColor = vec4(c, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });
    this.floor = new THREE.Mesh(floorGeo, this.floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -5.0;
    this.group.add(this.floor);

    // polvo en suspensión iluminado en rasante: textura del aire
    const dustCount = Math.min(2600, quality?.particleBudget ? Math.round(quality.particleBudget * 0.06) : 1800);
    this.dustCount = dustCount;
    this.dust = allocParticles(dustCount);
    const cDust = new THREE.Color(palette.amber);
    for (let i = 0; i < dustCount; i++) {
      const [x, z] = rng.disk(13);
      this.dust.position[i * 3] = x;
      this.dust.position[i * 3 + 1] = rng.range(-5, 12);
      this.dust.position[i * 3 + 2] = z;
      this.dust.aSize[i] = rng.range(0.2, 1.1);
      this.dust.aAlpha[i] = rng.range(0.08, 0.4);
      this.dust.aPhase[i] = rng();
      setColorAt(this.dust.aColor, i, cDust);
    }
    this.dustGeo = buildParticleGeometry(dustCount, this.dust);
    this.dustMat = makeParticleMaterial({ map: softSprite(64, 2.6), size: 0.6, color: 0xffffff, opacity: 0.5 });
    this.dustPoints = new THREE.Points(this.dustGeo, this.dustMat);
    this.dustPoints.frustumCulled = false;
    this.group.add(this.dustPoints);

    // dos luces prácticas: ámbar cálido, muy suaves
    this.lampA = new THREE.PointLight(new THREE.Color(palette.amber), 0.8, 30, 2);
    this.lampA.position.set(-9, 1.5, -5);
    this.lampB = new THREE.PointLight(new THREE.Color(palette.crimson), 0.5, 26, 2);
    this.lampB.position.set(8, -0.5, 4);
    this.group.add(this.lampA, this.lampB);

    this._dustBase = Float32Array.from(this.dust.position);
  }

  /** Cambia de intensidad: romantic / intimate / cinematic / custom. */
  setPreset(name) {
    if (!RED_ROOM_PRESETS[name]) return;
    this.presetName = name;
    this.params = { ...RED_ROOM_PRESETS[name] };
    this.applyParams();
  }

  /** Control total: color, saturación, velocidad, movimiento, brillo, elementos. */
  setParams(partial) {
    Object.assign(this.params, partial);
    // tope duro de saturación: la regla anti-vulgar no es negociable
    this.params.saturation = clamp(this.params.saturation, 0, 0.75);
    this.params.speed = clamp(this.params.speed, 0, 1);
    this.params.brightness = clamp(this.params.brightness, 0.05, 1);
    this.applyParams();
  }

  applyParams() {
    const u = this.curtainMat.uniforms;
    u.uBrightness.value = this.params.brightness;
    u.uSaturation.value = this.params.saturation;
    u.uAmberMix.value = this.params.amberMix;
    u.uShadowContrast.value = this.params.shadowContrast;
    u.uFold.value = this.params.foldDepth;
    u.uSpeed.value = this.params.speed;
    this.floorMat.uniforms.uBrightness.value = this.params.brightness;
    this.dustMat.uniforms.uOpacity.value = this.params.dustIntensity * 0.6;
    this.lampA.intensity = 0.9 + this.params.amberMix * 2.0;
    this.lampB.intensity = 0.6 + this.params.saturation * 1.1;
    // el tono se puede desplazar sin salir del rango vino → carmesí
    const h = this.params.hue;
    u.uWine.value.setHSL(h % 1, Math.min(0.8, this.params.saturation + 0.1), 0.17);
    u.uCrimson.value.setHSL((h + 0.005) % 1, Math.min(0.78, this.params.saturation + 0.05), 0.31);
    u.uVelvet.value.setHSL((h + 0.012) % 1, Math.min(0.6, this.params.saturation), 0.52);
  }

  update({ ambientTime = 0, dt = 0.016, focus = 14, intensity = 1 }) {
    this.curtainMat.uniforms.uTime.value = ambientTime;
    this.floorMat.uniforms.uTime.value = ambientTime;
    // deriva del polvo: lenta, hacia arriba, con remolino mínimo
    const p = this.dust.position, b = this._dustBase;
    const s = this.params.speed;
    for (let i = 0; i < this.dustCount; i++) {
      const ph = this.dust.aPhase[i] * 6.2831;
      p[i * 3]     = b[i * 3]     + Math.sin(ambientTime * 0.08 * s + ph) * 1.4;
      p[i * 3 + 1] = b[i * 3 + 1] + ((ambientTime * 0.22 * s + this.dust.aPhase[i] * 17) % 17) - 2;
      p[i * 3 + 2] = b[i * 3 + 2] + Math.cos(ambientTime * 0.07 * s + ph * 1.3) * 1.4;
    }
    this.dustGeo.attributes.position.needsUpdate = true;
    this.dustMat.uniforms.uTime.value = ambientTime;
    this.dustMat.uniforms.uFocus.value = focus;
    this.dustMat.uniforms.uOpacity.value = this.params.dustIntensity * 0.6 * intensity;
    this.curtainMat.uniforms.uBrightness.value = this.params.brightness * intensity;
  }

  /** Cámara: deriva lentísima, dentro del límite anti-mareo. */
  cameraRig({ ambientTime = 0 }) {
    const a = ambientTime * 0.012 * (0.5 + this.params.speed);
    return {
      position: [Math.sin(a) * 3.5, 1.0 + Math.sin(ambientTime * 0.05) * 0.4, Math.cos(a) * 3.5],
      target: [Math.sin(a + 1.5) * 15, 0.6, Math.cos(a + 1.5) * 15],
      fov: 52
    };
  }

  dispose() {
    this.curtain.geometry.dispose(); this.curtainMat.dispose();
    this.floor.geometry.dispose(); this.floorMat.dispose();
    this.dustGeo.dispose(); this.dustMat.dispose();
    this.group.parent?.remove(this.group);
  }
}

export default RedRoom;

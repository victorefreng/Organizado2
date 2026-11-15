/**
 * DIRECCIÓN DE CÁMARA.
 *
 * Mueve un único `masterRig` en el stage virtual. Cada superficie deriva su cámara
 * aplicando el offset y la orientación de su proyector. De ahí sale la continuidad
 * entre pantallas: las tres miran el MISMO espacio desde ángulos distintos.
 *
 * Gramática implementada: dolly in/out, slow orbit, tracking, traveling forward,
 * camera follow, rotaciones suaves, parallax y rack-focus simulado.
 *
 * Límites anti-mareo (docs/01-direccion-creativa.md §4): velocidad y aceleración
 * acotadas, sin roll salvo en cosmos, suavizado exponencial en todo.
 */
import * as THREE from 'three';
import { ease, clamp, damp, lerp } from '../core/easing.js';
import { fbm1 } from '../core/rng.js';

const DEG = Math.PI / 180;
const BASE_FOV = 42; // el fov de los keyframes es relativo a este

export class CameraDirector {
  constructor(projector) {
    this.projector = projector;
    // masterRig
    this.position = new THREE.Vector3(0, 0, 60);
    this.target = new THREE.Vector3(0, 0, 0);
    this.fovScale = 1;
    this.roll = 0;

    // destinos (los keyframes escriben aquí; el suavizado los persigue)
    this._wantPos = this.position.clone();
    this._wantTarget = this.target.clone();
    this._wantFovScale = 1;

    // offset del proyector
    this.offset = new THREE.Vector3(
      projector.offset.x, projector.offset.y, projector.offset.z
    );
    this.surfaceQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        projector.euler.pitch * DEG,
        projector.euler.yaw * DEG,
        projector.euler.roll * DEG,
        'YXZ'
      )
    );

    this._tmpQ = new THREE.Quaternion();
    this._tmpM = new THREE.Matrix4();
    this._up = new THREE.Vector3(0, 1, 0);
    this.mode = 'keyframes';
    this.followTargetObj = null;
    this.followOffset = new THREE.Vector3(0, 1.2, 6);
    this.followLag = 1.6;
    this.shake = 0;
    this.parallax = new THREE.Vector2(0, 0); // input de cursor, suave
    this._parallaxSmooth = new THREE.Vector2(0, 0);
    this.focusDistance = 12;  // para rack-focus simulado
    this.rollEnabled = false;
  }

  /** Interpola los keyframes de la escena en `showTime`. */
  applyKeyframes(keys, showTime) {
    if (!keys || keys.length === 0) return;
    if (showTime <= keys[0].t) {
      this._setWant(keys[0]);
      return;
    }
    const last = keys[keys.length - 1];
    if (showTime >= last.t) { this._setWant(last); return; }
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1].t <= showTime) i++;
    const a = keys[i], b = keys[i + 1];
    const raw = (showTime - a.t) / Math.max(0.0001, b.t - a.t);
    const k = ease(b.ease || 'easeInOutCubic', raw);
    this._wantPos.set(
      lerp(a.pos[0], b.pos[0], k),
      lerp(a.pos[1], b.pos[1], k),
      lerp(a.pos[2], b.pos[2], k)
    );
    this._wantTarget.set(
      lerp(a.target[0], b.target[0], k),
      lerp(a.target[1], b.target[1], k),
      lerp(a.target[2], b.target[2], k)
    );
    this._wantFovScale = lerp((a.fov || BASE_FOV) / BASE_FOV, (b.fov || BASE_FOV) / BASE_FOV, k);
  }

  _setWant(kf) {
    this._wantPos.set(kf.pos[0], kf.pos[1], kf.pos[2]);
    this._wantTarget.set(kf.target[0], kf.target[1], kf.target[2]);
    this._wantFovScale = (kf.fov || BASE_FOV) / BASE_FOV;
  }

  /** Movimiento libre dirigido por el mundo (modo biblioteca / interactivo). */
  applyRig(rig) {
    if (!rig) return;
    if (rig.position) this._wantPos.set(rig.position[0], rig.position[1], rig.position[2]);
    if (rig.target) this._wantTarget.set(rig.target[0], rig.target[1], rig.target[2]);
    if (rig.fov) this._wantFovScale = rig.fov / BASE_FOV;
  }

  /** Seguimiento de un ser vivo (estrella, mariposa, ballena). */
  follow(object3D, offset = null, lag = 1.6) {
    this.followTargetObj = object3D;
    if (offset) this.followOffset.set(offset[0], offset[1], offset[2]);
    this.followLag = lag;
  }
  stopFollow() { this.followTargetObj = null; }

  /** Entrada de parallax (cursor). Muy sutil: nunca protagonista. */
  setParallax(x, y) { this.parallax.set(clamp(x, -1, 1), clamp(y, -1, 1)); }

  /**
   * Escribe en la cámara real de esta superficie.
   * @param camera THREE.PerspectiveCamera
   * @param dt segundos
   * @param ambientTime para deriva viva cuando el show está en HOLD
   */
  update(camera, dt, ambientTime = 0) {
    // seguimiento
    if (this.followTargetObj) {
      const p = this.followTargetObj.getWorldPosition(new THREE.Vector3());
      this._wantTarget.copy(p);
      this._wantPos.copy(p).add(this.followOffset);
    }

    // suavizado exponencial: nada entra con corte
    const lambda = 3.2;
    this.position.set(
      damp(this.position.x, this._wantPos.x, lambda, dt),
      damp(this.position.y, this._wantPos.y, lambda, dt),
      damp(this.position.z, this._wantPos.z, lambda, dt)
    );
    this.target.set(
      damp(this.target.x, this._wantTarget.x, lambda, dt),
      damp(this.target.y, this._wantTarget.y, lambda, dt),
      damp(this.target.z, this._wantTarget.z, lambda, dt)
    );
    this.fovScale = damp(this.fovScale, this._wantFovScale, 2.4, dt);

    // parallax suavizado + micro-deriva ambiental (la cámara nunca está muerta)
    this._parallaxSmooth.x = damp(this._parallaxSmooth.x, this.parallax.x, 2.0, dt);
    this._parallaxSmooth.y = damp(this._parallaxSmooth.y, this.parallax.y, 2.0, dt);
    const driftX = fbm1(ambientTime * 0.07, 2, 11) * 0.09;
    const driftY = fbm1(ambientTime * 0.055, 2, 29) * 0.06;

    // orientación del masterRig: mirar al target
    this._tmpM.lookAt(this.position, this.target, this._up);
    this._tmpQ.setFromRotationMatrix(this._tmpM);
    if (this.rollEnabled) {
      const rollQ = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1), this.roll
      );
      this._tmpQ.multiply(rollQ);
    }

    // cámara final = masterRig ∘ offset del proyector
    const worldOffset = this.offset.clone().applyQuaternion(this._tmpQ);
    camera.position.copy(this.position).add(worldOffset);
    camera.position.x += (this._parallaxSmooth.x * 0.35 + driftX);
    camera.position.y += (this._parallaxSmooth.y * 0.22 + driftY);

    camera.quaternion.copy(this._tmpQ).multiply(this.surfaceQuat);

    // fov: lente física del proyector modulada por la dramaturgia del keyframe
    const fov = clamp(this.projector.fov * this.fovScale, 14, 100);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // distancia de foco para el rack-focus simulado de los sistemas de partículas
    this.focusDistance = damp(
      this.focusDistance,
      this.position.distanceTo(this.target),
      2.0,
      dt
    );
  }

  /** Teletransporte sin suavizado (seek del operador, cambio de mundo). */
  snap() {
    this.position.copy(this._wantPos);
    this.target.copy(this._wantTarget);
    this.fovScale = this._wantFovScale;
  }
}

export default CameraDirector;

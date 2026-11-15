/**
 * RELOJ DE SHOW — autoridad temporal del sistema (vive en el panel del operador).
 *
 * Dos relojes, como exige el brief:
 *   showTime    → narrativa. HOLD lo congela.
 *   ambientTime → viento, hojas, peces, partículas. HOLD NO lo congela.
 *
 * Dispara cues una sola vez por pasada y detecta cambios de escena.
 */
import { OPENING, sceneAt, sceneIndexAt } from '../config/show.js';

export const STATE = {
  IDLE: 'idle',
  RUNNING: 'running',
  HOLD: 'hold',
  WAITING: 'waiting',    // pausa interactiva: espera acción
  FADING: 'fading',      // fade to black en curso
  BLACKOUT: 'blackout',
  FINISHED: 'finished'
};

export class ShowClock {
  constructor(show = OPENING, opts = {}) {
    this.show = show;
    this.state = STATE.IDLE;
    this.showTime = 0;
    this.ambientTime = 0;
    this.rate = 1;
    this.fadeLevel = 1;         // 1 = visible, 0 = negro
    this.fadeTarget = 1;
    this.fadeSpeed = 0.5;       // unidades/segundo
    this.sceneId = show.scenes[0].id;
    this.interactiveHoldsEnabled = opts.interactiveHolds ?? false;
    this._firedCues = new Set();
    this._consumedHolds = new Set();
    this._listeners = { cue: new Set(), scene: new Set(), state: new Set(), hold: new Set(), end: new Set() };
    this._lastTime = 0;
  }

  on(evt, fn) {
    this._listeners[evt]?.add(fn);
    return () => this._listeners[evt]?.delete(fn);
  }
  _emit(evt, payload) {
    this._listeners[evt]?.forEach((fn) => { try { fn(payload); } catch (e) { console.error('[clock]', e); } });
  }

  // ───────────────────────────── Comandos del panel ─────────────────────────────

  go() {
    if (this.state === STATE.WAITING) { this.release(); return; }
    if (this.state === STATE.FINISHED) { this.restartShow(); return; }
    this._setState(STATE.RUNNING);
    this.fadeTarget = 1;
  }

  hold() {
    if (this.state === STATE.RUNNING) this._setState(STATE.HOLD);
    else if (this.state === STATE.HOLD) this._setState(STATE.RUNNING);
  }

  /** Retrocede al inicio de la escena anterior. */
  back() {
    const i = sceneIndexAt(this.showTime, this.show);
    const cur = this.show.scenes[i];
    // Si llevamos más de 2 s en la escena, BACK reinicia la actual (convención de show control)
    const target = this.showTime - cur.start > 2 ? cur : this.show.scenes[Math.max(0, i - 1)];
    this.seek(target.start);
  }

  nextCue() {
    const all = this._allCues();
    const next = all.find((c) => c.absT > this.showTime + 0.01);
    if (next) this.seek(next.absT);
    else this.seek(this.show.duration);
  }

  prevCue() {
    const all = this._allCues();
    const prev = [...all].reverse().find((c) => c.absT < this.showTime - 0.25);
    this.seek(prev ? prev.absT : 0);
  }

  restartScene() {
    const s = sceneAt(this.showTime, this.show);
    this.seek(s.start);
  }

  restartShow() {
    this.seek(0);
    this._setState(STATE.RUNNING);
    this.fadeTarget = 1;
  }

  seek(t) {
    const prev = this.sceneId;
    this.showTime = Math.max(0, Math.min(this.show.duration, t));
    // Re-armar cues: los anteriores al punto se consideran ya disparados (sin efecto),
    // los posteriores vuelven a estar disponibles.
    this._firedCues = new Set(this._allCues().filter((c) => c.absT <= this.showTime).map((c) => c.key));
    this._consumedHolds = new Set(
      (this.show.interactiveHolds || []).filter((h) => h.t <= this.showTime).map((h) => h.id)
    );
    const s = sceneAt(this.showTime, this.show);
    this.sceneId = s.id;
    if (prev !== s.id) this._emit('scene', { scene: s, seeked: true });
    if (this.state === STATE.FINISHED) this._setState(STATE.HOLD);
  }

  goToScene(sceneId) {
    const s = this.show.scenes.find((x) => x.id === sceneId);
    if (s) this.seek(s.start);
  }

  fadeToBlack(seconds = 2) {
    this.fadeSpeed = 1 / Math.max(0.1, seconds);
    this.fadeTarget = 0;
    this._setState(STATE.FADING);
  }

  fadeIn(seconds = 2) {
    this.fadeSpeed = 1 / Math.max(0.1, seconds);
    this.fadeTarget = 1;
    if (this.state === STATE.BLACKOUT) this._setState(STATE.HOLD);
  }

  blackout() {
    this.fadeLevel = 0;
    this.fadeTarget = 0;
    this._setState(STATE.BLACKOUT);
  }

  /** Parada de emergencia: negro inmediato, reloj detenido, cues de luz a cero. */
  emergencyStop() {
    this.fadeLevel = 0;
    this.fadeTarget = 0;
    this._setState(STATE.BLACKOUT);
    this._emit('cue', { type: 'BLACKOUT', dur: 0, emergency: true, absT: this.showTime });
  }

  /** Libera una pausa interactiva. */
  release() {
    if (this.state === STATE.WAITING) {
      this._setState(STATE.RUNNING);
      this.showTime += 0.001; // evita re-disparo inmediato
    }
  }

  setRate(r) { this.rate = Math.max(0.1, Math.min(4, r)); }

  // ───────────────────────────── Tick ─────────────────────────────

  /** @param dt segundos reales transcurridos */
  tick(dt) {
    dt = Math.min(dt, 0.25); // protege ante pestañas en segundo plano
    this.ambientTime += dt;  // nunca se congela

    // Fade
    if (this.fadeLevel !== this.fadeTarget) {
      const dir = Math.sign(this.fadeTarget - this.fadeLevel);
      this.fadeLevel = Math.max(0, Math.min(1, this.fadeLevel + dir * this.fadeSpeed * dt));
      if (this.fadeLevel === this.fadeTarget) {
        if (this.fadeTarget === 0) this._setState(STATE.BLACKOUT);
        else if (this.state === STATE.FADING) this._setState(STATE.HOLD);
      }
    }

    if (this.state !== STATE.RUNNING) return;

    const prevT = this.showTime;
    this.showTime += dt * this.rate;

    // Fin del show: no corta a negro, se queda en el mundo explorable
    if (this.showTime >= this.show.duration) {
      this.showTime = this.show.duration;
      this._setState(STATE.FINISHED);
      this._emit('end', { show: this.show });
    }

    // Cambio de escena
    const s = sceneAt(this.showTime, this.show);
    if (s.id !== this.sceneId) {
      this.sceneId = s.id;
      this._emit('scene', { scene: s, seeked: false });
    }

    // Cues cruzados en este intervalo
    for (const c of this._allCues()) {
      if (c.absT > prevT && c.absT <= this.showTime && !this._firedCues.has(c.key)) {
        this._firedCues.add(c.key);
        this._emit('cue', c);
      }
    }

    // Pausas interactivas
    if (this.interactiveHoldsEnabled) {
      for (const h of this.show.interactiveHolds || []) {
        if (h.t > prevT && h.t <= this.showTime && !this._consumedHolds.has(h.id)) {
          this._consumedHolds.add(h.id);
          this._setState(STATE.WAITING);
          this._emit('hold', h);
          break;
        }
      }
    }
  }

  // ───────────────────────────── Consultas ─────────────────────────────

  get scene() { return sceneAt(this.showTime, this.show); }
  get sceneIndex() { return sceneIndexAt(this.showTime, this.show); }
  get nextScene() { return this.show.scenes[this.sceneIndex + 1] || null; }
  get sceneProgress() {
    const s = this.scene;
    return (this.showTime - s.start) / Math.max(0.001, s.end - s.start);
  }
  get remaining() { return Math.max(0, this.show.duration - this.showTime); }

  snapshot() {
    const s = this.scene;
    return {
      state: this.state,
      showTime: this.showTime,
      ambientTime: this.ambientTime,
      rate: this.rate,
      fadeLevel: this.fadeLevel,
      sceneId: s.id,
      sceneName: s.name,
      sceneNumber: s.number,
      world: s.world,
      params: s.params || {},
      sceneStart: s.start,
      sceneEnd: s.end,
      duration: this.show.duration,
      showId: this.show.id
    };
  }

  _allCues() {
    if (this._cueCache) return this._cueCache;
    const out = [];
    for (const s of this.show.scenes) {
      for (const c of s.cues || []) {
        out.push({ ...c, absT: c.t, scene: s.id, key: `${s.id}:${c.type}:${c.t}` });
      }
    }
    out.sort((a, b) => a.absT - b.absT);
    this._cueCache = out;
    return out;
  }

  _setState(s) {
    if (this.state === s) return;
    this.state = s;
    this._emit('state', s);
  }
}

/**
 * SEGUIDOR DE RELOJ — vive en cada ventana de proyección.
 * Recibe estado a 10 Hz y lo extrapola localmente a la tasa de refresco real,
 * corrigiendo la deriva. Sin esto, el movimiento se vería a 10 fps.
 */
export class ClockFollower {
  constructor() {
    this.state = STATE.IDLE;
    this.showTime = 0;
    this.ambientTime = 0;
    this.rate = 1;
    this.fadeLevel = 1;
    this.sceneId = null;
    this.world = 'void';
    this.params = {};
    this.duration = 300;
    this.drift = 0;
    this._hasSync = false;
  }

  /** Mensaje del panel. */
  sync(snap) {
    if (!snap) return;
    this.state = snap.state;
    this.rate = snap.rate ?? 1;
    this.fadeLevel = snap.fadeLevel ?? 1;
    this.sceneId = snap.sceneId;
    this.world = snap.world;
    this.params = snap.params || {};
    this.duration = snap.duration ?? 300;
    this.sceneStart = snap.sceneStart;
    this.sceneEnd = snap.sceneEnd;
    this.sceneName = snap.sceneName;
    this.sceneNumber = snap.sceneNumber;

    this.drift = snap.showTime - this.showTime;
    if (!this._hasSync || Math.abs(this.drift) > 0.25) {
      // Salto duro: primer sync, seek del operador o deriva inaceptable
      this.showTime = snap.showTime;
      this.ambientTime = snap.ambientTime;
      this._hasSync = true;
    }
    // Deriva pequeña: se corrige suave en `advance`
    this._ambientRef = snap.ambientTime;
  }

  /** Avance local por frame. */
  advance(dt) {
    dt = Math.min(dt, 0.1);
    this.ambientTime += dt;
    if (this._ambientRef !== undefined) {
      const ad = this._ambientRef - this.ambientTime;
      if (Math.abs(ad) > 0.5) this.ambientTime = this._ambientRef;
      else this.ambientTime += ad * Math.min(1, dt * 2);
    }
    if (this.state === STATE.RUNNING) {
      this.showTime += dt * this.rate;
      // Corrección proporcional de deriva (máx 10% del dt para no verse)
      if (Math.abs(this.drift) > 0.004) {
        const corr = this.drift * Math.min(1, dt * 3);
        this.showTime += corr;
        this.drift -= corr;
      }
      if (this.showTime > this.duration) this.showTime = this.duration;
    }
  }
}

export default ShowClock;

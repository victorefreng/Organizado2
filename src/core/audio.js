/**
 * SISTEMA DE AUDIO — WebAudio, 100% local, cero red.
 *
 * Doble fuente por capa:
 *   1. Si existe el archivo en /assets/audio/<layer>.* se usa el archivo.
 *   2. Si no existe, se SINTETIZA una pista temporal procedural equivalente.
 *
 * Así el show tiene banda sonora desde el primer arranque sin depender de assets
 * con licencia, y sustituir una capa es copiar un archivo con el nombre correcto.
 * Ver docs/04-assets.md para la lista de archivos y la licencia requerida.
 *
 * El audio es la referencia de sincronización en las secuencias lineales: el panel
 * expone `audio.position` y el reloj puede engancharse a él (`bindToAudio`).
 */

export const LAYERS = {
  pad:     { kind: 'pad',    base: 110,  gain: 0.0, loop: true,  desc: 'Pad sostenido: columna del show' },
  sparkle: { kind: 'bells',  base: 1320, gain: 0.0, loop: true,  desc: 'Brillos cristalinos del nacimiento' },
  strings: { kind: 'strings', base: 220, gain: 0.0, loop: true,  desc: 'Cuerdas: carga emocional' },
  piano:   { kind: 'piano',  base: 440,  gain: 0.0, loop: true,  desc: 'Piano "ella": entra con el primer recuerdo' },
  forest:  { kind: 'noise',  tone: 'green', gain: 0.0, loop: true, desc: 'Hojas, viento entre ramas, insectos' },
  ocean:   { kind: 'noise',  tone: 'deep',  gain: 0.0, loop: true, desc: 'Presión submarina, corrientes' },
  wind:    { kind: 'noise',  tone: 'air',   gain: 0.0, loop: true, desc: 'Viento de altura' },
  space:   { kind: 'drone',  base: 55,   gain: 0.0, loop: true,  desc: 'Sub-bass del vacío' },
  impact:  { kind: 'impact', gain: 0.0, loop: false, desc: 'Golpe de energía' },
  whoosh:  { kind: 'whoosh', gain: 0.0, loop: false, desc: 'Paso de la estrella' },
  water:   { kind: 'water',  gain: 0.0, loop: false, desc: 'Contacto con el agua' },
  whale:   { kind: 'whale',  gain: 0.0, loop: false, desc: 'Canto de ballena' },
  plane:   { kind: 'plane',  gain: 0.0, loop: false, desc: 'Avión lejano' },
  climax:  { kind: 'climax', gain: 0.0, loop: false, desc: 'Clímax de la revelación' }
};

const AUDIO_DIR = '/assets/audio';
const EXTS = ['.ogg', '.mp3', '.wav'];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.lowpass = null;
    this.layers = new Map();
    this.ready = false;
    this.muted = false;
    this.masterGain = 0.8;
    this.usingFiles = new Set();
    this.startedAt = 0;
  }

  /** Debe llamarse tras un gesto del usuario (política de autoplay). */
  async init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('[audio] WebAudio no disponible'); return; }
    this.ctx = new AC({ latencyHint: 'interactive' });

    this.lowpass = this.ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 20000;
    this.lowpass.Q.value = 0.7;

    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterGain;

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.3;

    this.lowpass.connect(this.master);
    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    for (const [name, def] of Object.entries(LAYERS)) {
      this.layers.set(name, await this._buildLayer(name, def));
    }
    this.ready = true;
    this.startedAt = this.ctx.currentTime;
  }

  async resume() { if (this.ctx?.state === 'suspended') await this.ctx.resume(); }

  get position() { return this.ctx ? this.ctx.currentTime - this.startedAt : 0; }

  // ─────────────────────── construcción de capas ───────────────────────

  async _buildLayer(name, def) {
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.lowpass);

    // 1) intenta archivo
    for (const ext of EXTS) {
      const url = `${AUDIO_DIR}/${name}${ext}`;
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (res.ok) {
          const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
          this.usingFiles.add(name);
          return { name, def, gain, buffer: buf, source: null, synth: null, kind: 'file' };
        }
      } catch (_) { /* no existe: seguimos */ }
    }
    // 2) síntesis procedural temporal
    const synth = this._makeSynth(name, def, gain);
    return { name, def, gain, buffer: null, source: null, synth, kind: 'synth' };
  }

  _noiseBuffer(seconds, tone) {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * seconds);
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        // ruido rosa/marrón según el tono pedido
        b0 = 0.99765 * b0 + w * 0.0990460;
        b1 = 0.96300 * b1 + w * 0.2965164;
        b2 = 0.57000 * b2 + w * 1.0526913;
        let v = b0 + b1 + b2 + w * 0.1848;
        if (tone === 'deep') v = b0 * 2.2 + b1 * 0.4;
        else if (tone === 'air') v = b1 * 0.8 + w * 0.25;
        else if (tone === 'green') v = b1 * 0.5 + b2 * 0.3 + w * 0.12;
        d[i] = v * 0.09;
        // crossfade de bucle para que no se oiga el corte
        const fade = sr * 0.5;
        if (i < fade) d[i] *= i / fade;
        if (i > len - fade) d[i] *= (len - i) / fade;
      }
    }
    return buf;
  }

  _makeSynth(name, def, out) {
    const ctx = this.ctx;
    const nodes = [];

    const makeOsc = (freq, type, gainVal, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gainVal;
      o.connect(g); g.connect(out);
      o.start();
      nodes.push(o, g);
      return { o, g };
    };

    switch (def.kind) {
      case 'pad': {
        // acorde suspendido con leve movimiento: no resuelve, sostiene
        const f = def.base;
        [1, 1.5, 2, 3, 4.5].forEach((m, i) => {
          const v = makeOsc(f * m, i < 2 ? 'sine' : 'triangle', 0.22 / (i + 1), (i - 2) * 6);
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.05 + i * 0.017;
          const lg = ctx.createGain();
          lg.gain.value = 2.5;
          lfo.connect(lg); lg.connect(v.o.detune); lfo.start();
          nodes.push(lfo, lg);
        });
        break;
      }
      case 'drone': {
        const f = def.base;
        [1, 1.005, 2, 2.01].forEach((m, i) => makeOsc(f * m, 'sine', 0.3 / (i + 1)));
        break;
      }
      case 'strings': {
        const f = def.base;
        [1, 1.25, 1.5, 2].forEach((m, i) => {
          const v = makeOsc(f * m, 'sawtooth', 0.07 / (i + 1), (i - 1) * 9);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass'; lp.frequency.value = 900 + i * 300; lp.Q.value = 0.6;
          v.g.disconnect(); v.g.connect(lp); lp.connect(out);
          nodes.push(lp);
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 4.1 + i * 0.3;
          const lg = ctx.createGain(); lg.gain.value = 3.5;
          lfo.connect(lg); lg.connect(v.o.detune); lfo.start();
          nodes.push(lfo, lg);
        });
        break;
      }
      case 'bells': case 'piano': {
        // campanas/piano por pulsos programados: patrón determinista y escaso
        const scale = def.kind === 'piano' ? [0, 3, 5, 7, 10, 12] : [0, 4, 7, 12, 16, 19];
        const root = def.base;
        const schedule = () => {
          if (!this._layerAudible(name)) { nodes.timer = setTimeout(schedule, 700); return; }
          const semi = scale[Math.floor(Math.random() * scale.length)];
          const freq = root * Math.pow(2, semi / 12);
          const o = ctx.createOscillator();
          o.type = def.kind === 'piano' ? 'triangle' : 'sine';
          o.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.value = 0;
          const now = ctx.currentTime;
          const dur = def.kind === 'piano' ? 3.2 : 2.2;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.14, now + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          o.connect(g); g.connect(out);
          o.start(now); o.stop(now + dur + 0.1);
          nodes.timer = setTimeout(schedule, (def.kind === 'piano' ? 1400 : 900) + Math.random() * 1600);
        };
        nodes.timer = setTimeout(schedule, 300);
        break;
      }
      case 'noise': {
        const buf = this._noiseBuffer(8, def.tone);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = def.tone === 'deep' ? 'lowpass' : def.tone === 'air' ? 'bandpass' : 'highpass';
        bp.frequency.value = def.tone === 'deep' ? 320 : def.tone === 'air' ? 900 : 480;
        bp.Q.value = 0.8;
        src.connect(bp); bp.connect(out); src.start();
        nodes.push(src, bp);
        // movimiento del filtro: el ambiente nunca es estático
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
        const lg = ctx.createGain(); lg.gain.value = def.tone === 'deep' ? 90 : 260;
        lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
        nodes.push(lfo, lg);
        break;
      }
      default:
        // one-shots: se construyen en el momento del play
        break;
    }
    return { nodes, out };
  }

  _layerAudible(name) {
    const l = this.layers.get(name);
    return l && l.gain.gain.value > 0.005;
  }

  // ─────────────────────── one-shots procedurales ───────────────────────

  _oneShot(name, gainVal = 0.6) {
    const ctx = this.ctx;
    const l = this.layers.get(name);
    if (!l) return;
    const now = ctx.currentTime;
    const out = l.gain;
    l.gain.gain.cancelScheduledValues(now);
    l.gain.gain.setValueAtTime(gainVal, now);

    if (l.kind === 'file' && l.buffer) {
      const s = ctx.createBufferSource();
      s.buffer = l.buffer;
      s.connect(out);
      s.start(now);
      return;
    }

    const mk = (type, f0, f1, dur, g0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, now);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(g0, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(g); g.connect(out);
      o.start(now); o.stop(now + dur + 0.05);
    };
    const noise = (dur, type, f0, f1, g0, q = 1) => {
      const b = this._noiseBuffer(Math.max(1, dur), 'air');
      const s = ctx.createBufferSource(); s.buffer = b;
      const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(f0, now);
      f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), now + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(g0, now + dur * 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      s.connect(f); f.connect(g); g.connect(out);
      s.start(now); s.stop(now + dur + 0.05);
    };

    switch (name) {
      case 'impact':
        mk('sine', 120, 28, 1.8, 0.7);
        noise(1.2, 'lowpass', 2400, 180, 0.35);
        break;
      case 'whoosh':
        noise(2.4, 'bandpass', 300, 4200, 0.5, 2.5);
        noise(2.4, 'highpass', 1800, 600, 0.22);
        break;
      case 'water':
        noise(1.6, 'lowpass', 5200, 420, 0.5);
        mk('sine', 420, 90, 0.7, 0.2);
        break;
      case 'whale': {
        // glissando largo, dos armónicos: lectura reconocible sin sample
        mk('sine', 180, 92, 3.4, 0.5);
        mk('sine', 268, 141, 3.4, 0.18);
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 0.6;
        const g = ctx.createGain(); g.gain.value = 0.06;
        o.connect(g); g.connect(out); o.start(now); o.stop(now + 3.6);
        break;
      }
      case 'plane':
        noise(6, 'bandpass', 220, 150, 0.3, 1.4);
        mk('triangle', 90, 70, 6, 0.08);
        break;
      case 'climax':
        [1, 1.5, 2, 2.5, 3, 4].forEach((m, i) => mk('triangle', 110 * m, 110 * m, 6 - i * 0.4, 0.12 / (i * 0.5 + 1)));
        noise(5, 'highpass', 600, 3000, 0.18);
        break;
      default:
        mk('sine', 440, 220, 1, 0.3);
    }
  }

  // ─────────────────────── API usada por el timeline ───────────────────────

  /** Arranca las capas en bucle (las de archivo). Las sintéticas ya suenan a gain 0. */
  startLoops() {
    if (!this.ready) return;
    for (const l of this.layers.values()) {
      if (l.kind === 'file' && l.def.loop && !l.source && l.buffer) {
        const s = this.ctx.createBufferSource();
        s.buffer = l.buffer; s.loop = true;
        s.connect(l.gain); s.start();
        l.source = s;
      }
    }
  }

  apply(event) {
    if (!this.ready) return;
    const { layer, action, dur = 1, to = 0.5, gain = 0.6 } = event;
    if (layer === 'lowpass') {
      const now = this.ctx.currentTime;
      const target = 300 + (20000 - 300) * Math.pow(Math.max(0.001, to), 2);
      this.lowpass.frequency.cancelScheduledValues(now);
      this.lowpass.frequency.setValueAtTime(this.lowpass.frequency.value, now);
      this.lowpass.frequency.linearRampToValueAtTime(target, now + Math.max(0.05, dur));
      return;
    }
    const l = this.layers.get(layer);
    if (!l) return;
    const now = this.ctx.currentTime;
    const g = l.gain.gain;
    switch (action) {
      case 'play': this._oneShot(layer, gain); break;
      case 'fadeIn':
      case 'ramp':
        g.cancelScheduledValues(now);
        g.setValueAtTime(Math.max(0.0001, g.value), now);
        g.linearRampToValueAtTime(to, now + Math.max(0.05, dur));
        break;
      case 'fadeOut':
        g.cancelScheduledValues(now);
        g.setValueAtTime(Math.max(0.0001, g.value), now);
        g.linearRampToValueAtTime(0, now + Math.max(0.05, dur));
        break;
      case 'set':
        g.cancelScheduledValues(now);
        g.setValueAtTime(to, now);
        break;
    }
  }

  /** Reposiciona todas las capas al estado que les corresponde en `showTime`. */
  rebuildStateAt(showTime, show) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    for (const l of this.layers.values()) {
      l.gain.gain.cancelScheduledValues(now);
      l.gain.gain.setValueAtTime(0, now);
    }
    this.lowpass.frequency.setValueAtTime(20000, now);
    for (const s of show.scenes) {
      for (const e of s.audio || []) {
        if (e.t <= showTime && e.action !== 'play') {
          this.apply({ ...e, dur: 0.05 });
        }
      }
    }
  }

  setMasterGain(v) {
    this.masterGain = v;
    if (this.master) this.master.gain.value = this.muted ? 0 : v;
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.masterGain;
  }

  /** Qué capas usan archivo real y qué capas están sintetizadas (para el panel). */
  get inventory() {
    return Object.entries(LAYERS).map(([name, def]) => ({
      name, desc: def.desc,
      source: this.usingFiles.has(name) ? 'archivo' : 'sintetizado (temporal)',
      expected: `${AUDIO_DIR}/${name}.ogg|.mp3|.wav`
    }));
  }

  dispose() {
    for (const l of this.layers.values()) {
      try { l.source?.stop(); } catch (_) {}
      if (l.synth?.nodes?.timer) clearTimeout(l.synth.nodes.timer);
      if (l.synth?.nodes) for (const n of l.synth.nodes) { try { n.stop?.(); n.disconnect?.(); } catch (_) {} }
    }
    try { this.ctx?.close(); } catch (_) {}
    this.ready = false;
  }
}

let shared = null;
export function getAudio() {
  if (!shared) shared = new AudioEngine();
  return shared;
}

export default AudioEngine;

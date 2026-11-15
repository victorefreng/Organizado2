/**
 * Canal de comunicación entre el panel del operador y las ventanas de proyección.
 * BroadcastChannel: mismo origen, sin servidor, sin red. Funciona offline.
 *
 * Preparado para que más adelante un puente local (WebSocket en localhost) replique
 * estos mismos mensajes desde celulares como controladores: la API no cambia,
 * solo se añade un transporte en `attachTransport`.
 */

export const CHANNEL = 'universo-1-1';

export const MSG = {
  // panel -> salidas
  STATE: 'state',          // estado completo del show (10 Hz)
  COMMAND: 'command',      // GO/HOLD/BACK/... puntual
  CONFIG: 'config',        // proyectores, calidad, params de mundo
  CUE: 'cue',              // disparo manual de cue
  INTERACT: 'interact',    // evento interactivo
  // salidas -> panel
  HELLO: 'hello',          // una salida se registra
  STATS: 'stats',          // fps, drawcalls, deriva
  PREVIEW: 'preview',      // miniatura JPEG de la salida
  BYE: 'bye'
};

export class Bus {
  constructor(name = CHANNEL) {
    this.name = name;
    this.handlers = new Map();
    this.transports = [];
    this.ch = null;
    if (typeof BroadcastChannel !== 'undefined') {
      this.ch = new BroadcastChannel(name);
      this.ch.onmessage = (e) => this._dispatch(e.data, 'broadcast');
    }
  }

  /** Añade un transporte extra (p. ej. WebSocket local para celulares). */
  attachTransport(transport) {
    // transport: { send(msg), onMessage(cb), close() }
    transport.onMessage((data) => this._dispatch(data, 'transport'));
    this.transports.push(transport);
    return () => {
      const i = this.transports.indexOf(transport);
      if (i >= 0) this.transports.splice(i, 1);
      transport.close?.();
    };
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.off(type, fn);
  }

  off(type, fn) {
    this.handlers.get(type)?.delete(fn);
  }

  send(type, payload) {
    const msg = { type, payload, t: Date.now() };
    try { this.ch?.postMessage(msg); } catch (_) { /* canal cerrado */ }
    for (const tr of this.transports) { try { tr.send(msg); } catch (_) {} }
  }

  _dispatch(msg, _origin) {
    if (!msg || !msg.type) return;
    const set = this.handlers.get(msg.type);
    if (set) for (const fn of set) { try { fn(msg.payload, msg); } catch (e) { console.error('[bus]', e); } }
    const all = this.handlers.get('*');
    if (all) for (const fn of all) { try { fn(msg); } catch (e) { console.error('[bus]', e); } }
  }

  close() {
    try { this.ch?.close(); } catch (_) {}
    for (const tr of this.transports) { try { tr.close?.(); } catch (_) {} }
    this.handlers.clear();
  }
}

let shared = null;
export function getBus() {
  if (!shared) shared = new Bus();
  return shared;
}

export default getBus;

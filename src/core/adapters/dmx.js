/**
 * Adaptador DMX512 — NO IMPLEMENTADO TODAVÍA.
 *
 * NO afirmar que los PAR o los Flasher están conectados. Interfaz fijada para
 * cuando se valide el hardware.
 *
 * Camino previsto:
 *   - Interfaz USB-DMX (Enttec DMX USB Pro o compatible) desde un proceso local.
 *   - O Art-Net / sACN por UDP si se usa un nodo de red.
 *   - El navegador no puede hablar DMX directamente: hace falta el puente local.
 *
 * Direccionamiento declarado (provisional, a confirmar con los equipos reales):
 *   par1..par5    → canales 1, 7, 13, 19, 25 (6 ch por fixture: R G B Dim Strobe Macro)
 *   flasher1..2   → canales 31, 33
 *   Dark Fazer    → canal 35
 *
 * SEGURIDAD: `allowStrobe` es false. Los Flasher 200 quedan fuera de la
 * reproducción automática hasta decisión explícita del operador.
 */
export const STATUS = 'not-implemented';

export class DmxAdapter {
  constructor(config = {}) {
    this.config = { allowStrobe: false, allowFlashers: false, ...config };
    this.connected = false;
  }
  async connect() {
    throw new Error('DmxAdapter: integración física no verificada todavía. El sistema trabaja con el simulador virtual.');
  }
  async send(_universe) {
    throw new Error('DmxAdapter: no implementado.');
  }
  get info() {
    return {
      status: STATUS,
      transport: 'USB-DMX (Enttec compatible) o Art-Net/sACN desde proceso local',
      patch: { par1: 1, par2: 7, par3: 13, par4: 19, par5: 25, flasher1: 31, flasher2: 33, fazer: 35 },
      safety: { allowStrobe: false, allowFlashers: false, lasers: 'fuera de alcance en esta versión' }
    };
  }
}
export default DmxAdapter;

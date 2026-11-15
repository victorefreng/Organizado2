/**
 * Adaptador Philips Hue — NO IMPLEMENTADO TODAVÍA.
 *
 * La integración física real no está verificada, así que este adaptador existe
 * únicamente para fijar la interfaz. NO afirmar que las luces están conectadas.
 *
 * Camino previsto cuando se valide:
 *   1. Descubrir el Bridge en la red local (mDNS o https://<bridge-ip>/api).
 *   2. Crear usuario pulsando el botón del Bridge una vez.
 *   3. Usar la Entertainment API (DTLS, puerto 2100) para streaming a ~25 Hz,
 *      que es la única vía con latencia suficiente para un show.
 *   4. Mapear playbar_l/r, gu10_l/r y go a light IDs reales.
 *
 * Requiere un proceso local (Node/Electron) porque el navegador no habla DTLS.
 */
export const STATUS = 'not-implemented';

export class HueAdapter {
  constructor(config = {}) {
    this.config = config;
    this.connected = false;
  }
  async connect() {
    throw new Error('HueAdapter: integración física no verificada todavía. El sistema trabaja con el simulador virtual.');
  }
  async send(_state) {
    throw new Error('HueAdapter: no implementado.');
  }
  get info() {
    return {
      status: STATUS,
      requires: 'Proceso local (Node o Electron) con DTLS para la Hue Entertainment API',
      mapping: { playbar_l: null, playbar_r: null, gu10_l: null, gu10_r: null, go: null }
    };
  }
}
export default HueAdapter;

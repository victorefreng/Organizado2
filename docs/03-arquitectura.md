# Arquitectura técnica

## Decisión central: stage virtual compartido

El sistema **no** reparte un video en tres pantallas. Define un único espacio 3D en
metros (el *stage virtual*) y coloca en él tres cámaras, una por proyector, con
posición y orientación configurables (`src/config/projectors.js`).

```
                    [ CEILING ]  pitch +72°
                         ▲
                         │
   [ ENVIRONMENT ] ◄───  ⦿ masterRig  ───► [ STORY ]  yaw 0°
       yaw -52°          (lo mueve el CameraDirector)
```

Consecuencia directa: si una ballena está en `(x=18, y=6, z=-40)` del stage, STORY
la ve cruzar por su derecha y CEILING la ve pasar por encima **en el mismo
fotograma**, porque es el mismo objeto. La continuidad entre pantallas es
geométrica, no un truco de animación sincronizada.

## Procesos y ventanas

- `index.html` → **panel del operador** (React). Es el reloj maestro. No renderiza 3D
  salvo miniaturas de previsualización.
- `output.html?surface=story|environment|ceiling` → **una ventana por proyector**.
  Three.js a pantalla completa. En Windows: abrir 3 ventanas, arrastrar cada una a
  su proyector, `F11`.

Comunicación: `BroadcastChannel('universo-1-1')`. Sin servidor, sin red.

## Modelo de sincronización

El panel emite estado a 10 Hz: `{state, showTime, rate, sceneId, worldId, quality}`.
Cada salida corre su propio `requestAnimationFrame` y **estima** el tiempo de show
localmente, corrigiendo deriva contra el último tick (corrección proporcional, salto
duro solo si el error > 250 ms). Resultado: movimiento suave a la tasa de refresco
real de cada salida, sin tirones por latencia de mensajes.

Todo contenido procedural se deriva de `showTime` y de un **PRNG con semilla fija por
mundo** (`src/core/rng.js`), así que las tres ventanas generan geometría idéntica sin
transmitir ni un vértice.

## Dos relojes

| Reloj | Qué mueve | `HOLD` lo congela |
| --- | --- | --- |
| `showTime` (narrativo) | escenas, cues, cámara dirigida, apariciones | **sí** |
| `ambientTime` (ambiental) | viento, hojas, peces, partículas, deriva | **no** |

Esto cumple el requisito del punto 7: una pausa interactiva detiene la narrativa sin
congelar el mundo.

## Capas (separación estricta exigida en el punto 13)

```
src/
├─ config/        datos editables sin tocar el motor
│   ├─ projectors.js   posición/orientación/calibración de cada salida
│   ├─ show.js         timeline: escenas, subescenas, cues, marcadores
│   ├─ memories.js     fotos/videos/mensajes (el usuario edita SOLO esto)
│   ├─ palette.js      paleta por mundo
│   └─ quality.js      presets low/balanced/high/ultra
├─ core/          servicios sin dependencia de Three.js
│   ├─ bus.js          BroadcastChannel + API de mensajes
│   ├─ clock.js        reloj de show, GO/HOLD/BACK/cues
│   ├─ rng.js          PRNG mulberry32 con semilla
│   ├─ easing.js       curvas
│   ├─ assets.js       carga de texturas/GLB/audio + placeholders
│   ├─ audio.js        WebAudio, capas por mundo, maestro de sync
│   └─ lighting.js     motor de cues → estado virtual Hue/DMX
├─ engine/        Three.js
│   ├─ Stage.js        renderer + composer por superficie
│   ├─ CameraDirector.js  dolly/orbit/follow/traveling + masterRig
│   ├─ SceneManager.js    monta/desmonta mundos, cross-fade
│   └─ Transitions.js     biblioteca de transiciones reutilizables
├─ worlds/        un módulo por mundo, misma interfaz
├─ fx/            sistemas reutilizables (estrella, plantas, peces, nubes…)
├─ panel/         React: UI del operador
└─ output/        bootstrap de la ventana de proyección
```

## Interfaz de un mundo

Todo mundo implementa el mismo contrato, así que añadir uno no toca el motor:

```js
export default {
  id: 'ocean',
  palette: PALETTE.ocean,
  // Construye la escena para UNA superficie
  build({ scene, surface, quality, rng, assets }) { ... return handles },
  // Llamado cada frame
  update({ handles, showTime, ambientTime, dt, surface, params }) { ... },
  // Dónde pone la cámara maestra este mundo (si no lo dirige el timeline)
  cameraRig({ showTime, ambientTime }) { return { position, target, fov } },
  dispose(handles) { ... },
  params: { fishDensity: 1, luminosity: 1, depth: 1, speed: 1 }  // editables en vivo
};
```

## Interfaz de una transición

```js
transition({ from, to, duration, via })
// via: 'dive' | 'particles' | 'roots' | 'light-wave' | 'clouds' | 'leaves' | 'bloom'
```

Cada transición tiene un **recurso visual** que justifica el cambio (punto 6 del
brief). `Transitions.js` las registra por nombre y cualquier par de mundos puede
unirse con cualquiera de ellas.

## Iluminación

`core/lighting.js` consume los cues del timeline y produce un **estado virtual**:

```js
{ hue: { playbar_l:{r,g,b,bri}, playbar_r:{...}, gu10_l:{...}, gu10_r:{...}, go:{...} },
  dmx: { par1..par5: {r,g,b,dim}, flasher1..2: {dim} } }
```

El panel lo dibuja. **Ningún dispositivo físico está conectado todavía.** Los
adaptadores (`adapters/hue.js`, `adapters/dmx.js`) están declarados con su firma y
lanzan `NotImplemented` hasta que se valide la integración real. Los Flasher 200
están excluidos de la reproducción automática y el estrobo está desactivado por
defecto.

## Rendimiento en Windows con 3 salidas

- Un contexto WebGL por ventana (3 en total). El presupuesto de partículas se
  reparte por superficie según el peso del storyboard (50/30/20).
- `InstancedMesh` para vegetación, peces, estrellas y nubes. Sin un `Mesh` por hoja.
- Post-proceso: solo bloom selectivo. DOF simulado por tamaño/opacidad de partícula.
- `powerPreference: 'high-performance'`, `antialias` solo en `high`/`ultra`.
- Presets de calidad escalan: partículas, segmentos de geometría, resolución de
  render (`pixelRatio`), pasadas de post y sombras.

## Lo que requiere assets externos (ver `docs/04-assets.md`)

El motor funciona **hoy** con geometría procedural y placeholders explícitos. Está
preparado para recibir GLB/GLTF, videos ambientales y texturas profesionales sin
cambiar código de escena, solo el manifiesto de assets.

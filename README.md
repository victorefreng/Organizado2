# UNIVERSO 1/1

> Un universo único creado para una sola persona.

Motor visual inmersivo, show control y experiencia cinematográfica para una
instalación privada de tres proyectores, con iluminación escénica y audio
sincronizado.

**No es** una presentación, ni un bucle de vídeo duplicado en tres pantallas.
Es un stage 3D compartido con tres cámaras: cuando una ballena cruza la pantalla
principal y aparece en el techo, es el mismo animal visto desde dos ángulos.

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre `http://127.0.0.1:5173` (panel del operador) y pulsa **Abrir las 3** para
las ventanas de proyección. Guía completa: [`docs/05-operacion.md`](docs/05-operacion.md).

## Documentación

| Documento | Contenido |
| --- | --- |
| [`docs/01-direccion-creativa.md`](docs/01-direccion-creativa.md) | Tesis visual, referencias, paleta por mundo, lenguaje de cámara, dramaturgia de luz |
| [`docs/02-storyboard.md`](docs/02-storyboard.md) | Storyboard y shot list del opening (300 s), reparto entre proyectores, criterios de validación |
| [`docs/03-arquitectura.md`](docs/03-arquitectura.md) | Stage virtual, sincronización, capas, interfaces de mundo y transición |
| [`docs/04-assets.md`](docs/04-assets.md) | Qué funciona hoy y qué assets externos hay que producir |
| [`docs/05-operacion.md`](docs/05-operacion.md) | Manual del operador |
| [`docs/06-flujo-runway.md`](docs/06-flujo-runway.md) | Flujo de producción con Runway: prompt, planchas, cues y grandMA2 |

## Qué hay implementado

- **Opening completo** "THE FIRST LIGHT", 8 escenas, 300 s, reproducible de
  principio a fin: oscuridad → estrella fugaz → nacimiento de la vegetación →
  recuerdos creciendo en ramas → mariposa → lago → océano con ballenas → cielo
  → cosmos → revelación del título. No termina en corte a negro: se disuelve en
  un mundo explorable.
- **Siete mundos**: VOID, GARDEN/JUNGLE, OCEAN, SKY/CLOUD NINE, COSMOS,
  RED ROOM, OUR MEMORIES, con variantes y parámetros editables en vivo.
- **Tres salidas independientes y coordinadas**, cada una con su cámara,
  calibración, brillo, gamma, flip y keystone.
- **Transiciones justificadas** (10 recursos: onda de energía, raíces, inmersión,
  romper la superficie, caída de la noche, partículas, hojas, floración, brasa).
- **Show control** completo: GO / HOLD / BACK / cues / fade / blackout / parada
  de emergencia, línea de tiempo con marcadores y cues, pausas interactivas.
- **Motor de cues de iluminación** con simulador virtual de las 12 luminarias.
- **Audio** WebAudio por capas, con síntesis procedural temporal sustituible por
  archivos, sin ninguna dependencia de internet.

## Flujo de producción con Runway

Los planos protagonistas se generan con Runway; el motor produce las
perspectivas secundarias (techo y ambiente), el audio maestro, el LTC y los
cues. Un plano se produce con:

```bash
npm run audio   production/<plano>/shot.json
npm run plates  -- --shot production/<plano>/shot.json --plate ceiling
npm run plates  -- --shot production/<plano>/shot.json --plate environment
npm run produce production/<plano>/shot.json
```

El paquete resultante se carga y se reproduce desde el panel, con los tres
proyectores sincronizados y los cues disparando en su timecode.
Ver [`docs/06-flujo-runway.md`](docs/06-flujo-runway.md).

## Estado del hardware

**Ninguna luz está conectada todavía.** El sistema trabaja con el simulador
virtual. Los adaptadores Hue y DMX están declarados pero sin verificar, y lo
dicen explícitamente. Sin estrobo por defecto; Flasher 200 fuera de la
reproducción automática; láseres fuera de alcance en esta versión.

## Fotografías

Todas las imágenes del repositorio son **placeholders generados
proceduralmente** y están marcadas como tal. No son fotografías reales.
Para sustituirlas, ver [`docs/04-assets.md`](docs/04-assets.md).

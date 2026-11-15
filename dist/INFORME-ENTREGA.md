# Informe de entrega a UNIVERSO CONTROL

Generado con `node tools/audit-delivery.mjs`, que abre cada archivo y lo mide: no
repite lo que dijo el constructor. Destino: `C:\UNIVERSO\universo-control\experiences\<ID>\`.

## Resultado

**Las 25 carpetas cumplen. Ninguna desviación.**


Comprobado en cada carpeta: nombre igual al ID; en la raíz solo `experience.json`,
`main.mp4`, `ceiling.mp4`, `side.mp4` y `audio.wav`, y todo lo demás en `extras/`;
vídeo H.264 yuv420p a 30 fps constantes, 1280x720, **una sola pista y sin audio**, con
fotograma clave exactamente cada 30 fotogramas (medido de clave a clave) y faststart;
audio WAV PCM 16 bits, 48 kHz, estéreo; `id`, `type`, `durationMs`, `timecodeShow`,
`timecodeSlot` 2, offset y `exitAmbient`; ningún `lightingCommand`; y cue sheets con el
timecode absoluto.

## Tabla por pieza

En los mundos la duración es la de main / ceiling / side. El peso es el de los cinco
archivos de la raíz, sin `extras/`.

| ID | Pieza | Duración exacta | Resolución | Audio | Peso | timecodeShow | Offset | exitAmbient | Cues | Versión |
|---|---|---|---|---|---|---|---|---|---|---|
| `AMBIENT-001` | CLOUDS | 130.000 / 150.000 / 170.000 s | 1280x720 | 480.0 s | 160.5 MB | 0 | — | — | — | 1.0.1 |
| `AMBIENT-002` | OCEAN | 120.000 / 140.000 / 160.000 s | 1280x720 | 480.0 s | 160.5 MB | 0 | — | — | — | 1.0.1 |
| `AMBIENT-003` | JUNGLE | 125.000 / 145.000 / 165.000 s | 1280x720 | 480.0 s | 155.0 MB | 0 | — | — | — | 1.0.1 |
| `AMBIENT-004` | GALAXY | 135.000 / 155.000 / 175.000 s | 1280x720 | 480.0 s | 146.4 MB | 0 | — | — | — | 1.0.1 |
| `AMBIENT-005` | RED ROOM | 120.000 / 140.000 / 160.000 s | 1280x720 | 480.0 s | 136.0 MB | 0 | — | — | — | 1.0.1 |
| `AMBIENT-106` | CAPSULE | 120.000 / 140.000 / 160.000 s | 1280x720 | 480.0 s | 126.9 MB | 0 | — | — | — | 1.0.1 |
| `TR-001` | TRANSICION A CLOUDS | 10.000 s (300 fotogramas) | 1280x720 | 10.5 s | 7.2 MB | 0 | 13:10:00:00 | AMBIENT-001 | 4 | 1.0.1 |
| `TR-002` | TRANSICION A OCEAN | 10.000 s (300 fotogramas) | 1280x720 | 10.5 s | 8.0 MB | 0 | 13:20:00:00 | AMBIENT-002 | 4 | 1.0.1 |
| `TR-003` | TRANSICION A JUNGLE | 10.000 s (300 fotogramas) | 1280x720 | 10.5 s | 7.5 MB | 0 | 13:30:00:00 | AMBIENT-003 | 4 | 1.0.1 |
| `TR-004` | TRANSICION A GALAXY | 10.000 s (300 fotogramas) | 1280x720 | 10.5 s | 7.1 MB | 0 | 13:40:00:00 | AMBIENT-004 | 4 | 1.0.1 |
| `TR-005` | TRANSICION A RED ROOM | 10.000 s (300 fotogramas) | 1280x720 | 10.5 s | 6.6 MB | 0 | 13:50:00:00 | AMBIENT-005 | 4 | 1.0.1 |
| `SH-001` | THE AWAKENING | 220.000 s (6600 fotogramas) | 1280x720 | 220.5 s | 154.7 MB | 1 | 01:00:00:00 | AMBIENT-001 | 24 | 1.0.0 |
| `SH-002` | OUR STORY | 60.000 s (1800 fotogramas) | 1280x720 | 60.5 s | 50.0 MB | 0 | 02:00:00:00 | AMBIENT-001 | 4 | 1.0.1 |
| `SH-003` | THE MYSTERY BOX | 60.000 s (1800 fotogramas) | 1280x720 | 60.5 s | 39.5 MB | 3 | 03:00:00:00 | AMBIENT-002 | 10 | 1.0.0 |
| `SH-004` | DESTINATION UNKNOWN | 60.000 s (1800 fotogramas) | 1280x720 | 60.5 s | 49.5 MB | 0 | 04:00:00:00 | AMBIENT-001 | 6 | 1.0.1 |
| `SH-006` | MESSAGES TO THE FUTURE | 60.000 s (1800 fotogramas) | 1280x720 | 60.5 s | 33.5 MB | 0 | 06:00:00:00 | AMBIENT-004 | 5 | 1.0.1 |
| `SH-007` | RED ROOM | 60.000 s (1800 fotogramas) | 1280x720 | 60.5 s | 34.4 MB | 0 | 07:00:00:00 | AMBIENT-005 | 4 | 1.0.1 |
| `SH-008` | PIZZA EXPERIENCE | 50.000 s (1500 fotogramas) | 1280x720 | 50.5 s | 27.7 MB | 0 | 08:00:00:00 | AMBIENT-003 | 7 | 1.0.1 |
| `SH-009` | RELAX & SPA | 45.000 s (1350 fotogramas) | 1280x720 | 45.5 s | 36.4 MB | 0 | 09:00:00:00 | AMBIENT-003 | 4 | 1.0.1 |
| `SH-010` | PLAYER TWO | 45.000 s (1350 fotogramas) | 1280x720 | 45.5 s | 50.4 MB | 0 | 10:00:00:00 | AMBIENT-004 | 8 | 1.0.1 |
| `SH-011` | BBQ EXPERIENCE | 50.000 s (1500 fotogramas) | 1280x720 | 50.5 s | 33.9 MB | 0 | 11:00:00:00 | AMBIENT-005 | 7 | 1.0.1 |
| `SH-012` | GRAND FINALE | 120.000 s (3600 fotogramas) | 1280x720 | 120.5 s | 89.8 MB | 12 | 12:00:00:00 | AMBIENT-004 | 11 | 1.0.0 |
| `SH-051` | GALAXY BAR - PRIMERA LUZ | 50.000 s (1500 fotogramas) | 1280x720 | 50.5 s | 43.6 MB | 0 | 05:10:00:00 | AMBIENT-004 | 6 | 1.0.1 |
| `SH-052` | GALAXY BAR - MAR DE LA TRANQUILIDAD | 50.000 s (1500 fotogramas) | 1280x720 | 50.5 s | 41.3 MB | 0 | 05:20:00:00 | AMBIENT-004 | 6 | 1.0.1 |
| `SH-053` | GALAXY BAR - SUPERNOVA | 50.000 s (1500 fotogramas) | 1280x720 | 50.5 s | 42.8 MB | 0 | 05:30:00:00 | AMBIENT-004 | 6 | 1.0.1 |

Total: **1649 MB** en 25 carpetas (75 vídeos y 25 audios).

## Show de luces por timecode

Solo tres piezas lo llevan. Su cue sheet usa el timecode absoluto: un cue a los 45 s
del opening figura como `01:00:45:00`.

| ID | timecodeShow | Offset | timecodeSlot | fps |
|---|---|---|---|---|
| `SH-001` | 1 | 01:00:00:00 | 2 | 30 |
| `SH-003` | 3 | 03:00:00:00 | 2 | 30 |
| `SH-012` | 12 | 12:00:00:00 | 2 | 30 |

Todas las demás van con `timecodeShow` 0. Su `extras/cue-sheet.csv` se queda como
referencia para programar la consola a mano; no lo dispara ningún show.

## Cuatro cosas que conviene que confirme UNIVERSO CONTROL

No son desviaciones del brief, pero la lista de comprobación de esta entrega es más
genérica que el brief en estos puntos y prefiero decirlo a suponerlo.

1. **Los mundos no duran lo mismo en las tres pantallas, y llevan `durationMs` 0.**
   Es lo que pide el brief (§5.4: «en un ambient, durationMs es 0»; §5.6: «cada video
   puede durar distinto: así el conjunto no se repite igual»). En capítulos y
   transiciones los tres vídeos sí duran exactamente lo mismo y `durationMs` es esa
   duración. Si el importador exige duración igual también en los mundos, hay que
   volver a renderizar los seis: unos 30 minutos.
2. **Los mundos llevan `grandma2: { timecodeShow: 0, timecodeSlot: 2 }`** para cumplir
   «todas las demás, timecodeShow 0». No llevan bloque `timecode`, porque el brief los
   define sin timecode. Si el importador prefiere los mundos sin bloque `grandma2`, se
   quita con una línea.
3. **En las piezas con show 0, el resto del bloque `grandma2`** (`source`,
   `armCondition`, `expectedState`) se quedó como en el ejemplo válido del brief. Si una
   pieza sin show debe llevar otros valores ahí, decidme cuáles.
4. **Los offsets de las piezas con show 0** se conservan de la tabla 5.5 del brief
   (02:00:00:00, 04:00:00:00…). No se ha tocado ninguno.

## Pendiente del operador

Sin tocar: textos de Arantza, opciones de la ruleta, fotos extra, láser y música
definitiva. Todo entra como material de prueba (`testMaterial: true`).

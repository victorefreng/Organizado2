# THE FIRST LIGHT — Storyboard y shot list

**Duración total: 300 s (5:00).** Rango objetivo 4–6 min cumplido.
Timecode = reloj de show en segundos. El audio es la referencia maestra.

Leyenda de superficies: **S** = STORY (principal) · **E** = ENVIRONMENT · **C** = CEILING.
Todas las posiciones son coordenadas del *stage virtual* compartido (metros), así que
un objeto que sale de S puede entrar en E o C sin ningún truco: es el mismo objeto
visto por otra cámara.

---

## ESCENA 001 — ABSOLUTE DARKNESS · 0 → 35 s

| Shot | TC | Superficie | Plano | Descripción | Cámara | Cue |
| --- | --- | --- | --- | --- | --- | --- |
| 001.A | 0–8 | S E C | — | Negro absoluto. Silencio. La sala respira. Grano casi imperceptible para que no parezca pantalla apagada. | fija | `BLACKOUT` |
| 001.B | 8–18 | S | PPP | Nace un punto de luz a 60 m. Subpíxel → 2 px. Pad entra a -30 dB. | fija, FOV 42° | `AMBIENCE_IN` |
| 001.C | 8–18 | E C | — | Bruma `#0B1020` al 3%, sin forma. Solo sugiere volumen de aire. | fija | — |
| 001.D | 18–28 | S | PP | El punto vibra (ruido 0.6 Hz) y suelta sus primeras partículas, que caen y se apagan. | dolly in muy lento 60→38 m | — |
| 001.E | 28–35 | S E C | — | La luz gana cuerpo. E y C captan el primer halo frío lejano. Pad sube a -20 dB. | dolly in 38→22 m | `LIGHT_FADE_IN` 6% |

**Intención:** que el invitado dude de si ya empezó. El primer segundo de luz debe
ser un acontecimiento.

---

## ESCENA 002 — THE SHOOTING STAR · 35 → 75 s

| Shot | TC | Superficie | Plano | Descripción | Cámara | Cue |
| --- | --- | --- | --- | --- | --- | --- |
| 002.A | 35–42 | S | PM | El punto colapsa y estalla: nace la estrella. Núcleo sobreexpuesto `#FFF6E0`, corona ámbar. | dolly out rápido suave 22→30 m | `STAR_BIRTH` |
| 002.B | 42–58 | S → E → C | PG | La estrella entra en trayectoria **curva** (Catmull-Rom) por el stage. Estela de 3 capas: núcleo, partículas con inercia, fragmentos que se desprenden y mueren. | tracking lateral, lag 0.35 s | `STAR_PASSING` barrido |
| 002.C | 42–58 | C | PG | Al pasar bajo el techo, la estrella **ilumina** la bruma superior: despierta zonas de luz que quedan latentes. | fija con parallax | — |
| 002.D | 58–68 | E | PG | La estela despierta pequeños nodos de luz que quedan suspendidos, como semillas. | orbit lento 0.03 rad/s | — |
| 002.E | 68–75 | S | PG picado | La estrella se inclina hacia abajo. Por primera vez se intuye un **suelo** oscuro. | la cámara gira con ella | `STAR_DESCENT` |

**Nota de dirección:** la estrella no es una línea blanca. Son 4 sistemas
superpuestos (núcleo, corona, estela, fragmentos) con *motion blur* por estiramiento
de billboard en dirección de la velocidad.

---

## ESCENA 003 — THE BIRTH OF NATURE · 75 → 130 s

| Shot | TC | Superficie | Plano | Descripción | Cámara | Cue |
| --- | --- | --- | --- | --- | --- | --- |
| 003.A | 75–80 | S | PM | **Impacto.** Onda de energía circular que corre por el suelo deformándolo. Polvo luminoso. | dolly in al punto de impacto | `IMPACT` |
| 003.B | 80–92 | S | PPP | Del cráter emerge **un** brote. Dos hojas. Crece con *overshoot* elástico, no lineal. | macro, DOF corto | `FOREST_GREEN` 15% |
| 003.C | 80–92 | E | PG | Las raíces corren bajo tierra como venas de luz hacia los nodos que dejó la estrella. | tracking lateral | — |
| 003.D | 92–112 | S E | PG | **Propagación.** Cada nodo germina con retardo propio. Tallos, helechos, flores, árboles. 4 velocidades de crecimiento distintas y 3 capas de profundidad. | dolly out revelando escala | `FOREST_GREEN` 35% |
| 003.E | 92–112 | C | PG contrapicado | Las copas se cierran **sobre nosotros**. Dosel visto desde abajo. | fija, parallax de hojas | — |
| 003.F | 112–130 | S | PG | Recorrido por el jardín ya formado. Viento (dos frecuencias), mariposas, luciérnagas, haces de sol atravesando el follaje. | traveling forward 1.2 m/s | `SUN_RAYS` |

---

## ESCENA 004 — MEMORIES ARE GROWING · 130 → 185 s

El capítulo emocional. **La naturaleza construye los recuerdos.**

| Shot | TC | Superficie | Plano | Descripción | Cámara | Cue |
| --- | --- | --- | --- | --- | --- | --- |
| 004.A | 130–142 | S | PM | Una rama crece desde el borde inferior izquierdo. Se extiende. **Se curva** rodeando un vacío. Brotan flores en el perímetro. Dentro del vacío, una fotografía emerge por disolución luminosa (nunca por corte). | dolly in lento + ligero orbit | `MEMORY_IN` |
| 004.B | 142–156 | S | PM | La cámara abandona ese recuerdo y descubre otro, integrado en el tronco de un árbol, con la corteza abriéndose. | tracking derecha | `MEMORY_IN` |
| 004.C | 142–156 | E | PG | Dos recuerdos flotan a media distancia, sostenidos por lianas luminosas. | orbit lento | — |
| 004.D | 156–172 | S | PG | Tercer recuerdo sobre la superficie de una piedra cubierta de musgo, iluminado por un haz. | dolly in + rack focus simulado | `MEMORY_IN` |
| 004.E | 156–172 | C | PG | Recuerdos colgando del dosel como farolillos, fuera de foco. | fija | — |
| 004.F | 172–185 | S E C | PG | Todos los recuerdos del jardín brillan **a la vez** un instante y se atenúan. El jardín respira. | dolly out | `MEMORY_CHORUS` |

**Reglas de las fotografías (duras):**
- Relación de aspecto original **siempre preservada** (`cover` dentro del marco orgánico, nunca estiramiento).
- Ninguna deformación sobre el plano de la imagen: los marcos se curvan, la foto no.
- Aparición por *luminancia* + crecimiento del marco, 2.5 s mínimo.
- Son **placeholders** hasta que lleguen las fotos reales. Están marcados como tal.

---

## ESCENA 005 — THE WORLD OPENS · 185 → 215 s

| Shot | TC | Superficie | Plano | Descripción | Cámara | Cue |
| --- | --- | --- | --- | --- | --- | --- |
| 005.A | 185–193 | S | PM | Una **mariposa luminosa** nace de una flor. Lleva el mismo ámbar de la estrella. | dolly out → follow | `BUTTERFLY` |
| 005.B | 193–205 | S E | PG | La seguimos: entre árboles, sobre un campo de flores, hacia un lago que aparece al fondo. | camera follow con lag 0.5 s | — |
| 005.C | 205–211 | S | PD | Toca el agua. **Onda de luz.** La superficie empieza a reflejar galaxias en vez de cielo. | dolly in al punto de contacto | `WATER_TOUCH` |
| 005.D | 211–215 | S E C | — | **Atravesamos el agua.** Transición `dive`: la superficie sube pasando la cámara, burbujas, cambio de medio (sonido ahogado, luz filtrada). | traveling hacia abajo | `OCEAN_BLUE` |

---

## ESCENA 006 — THE OCEAN · 215 → 250 s

| Shot | TC | Superficie | Plano | Descripción | Cámara | Cue |
| --- | --- | --- | --- | --- | --- | --- |
| 006.A | 215–224 | S E C | PG | Descenso. Rayos de luz atravesando el agua. Partículas en suspensión. Presión. | dolly down 0.8 m/s | — |
| 006.B | 224–236 | S | PG | Bancos de peces (boids) pasan en grupo; corales; medusas bioluminiscentes al fondo. | tracking lateral lento | — |
| 006.C | 236–246 | S | PGG | **La ballena.** Cruza de izquierda a derecha, enorme, lenta, creíble. Ocupa 70% del encuadre en su paso. | fija, solo parallax | `WHALE_PASS` |
| 006.D | 236–246 | C | PGG | **Una segunda ballena cruza por el techo**, sobre nosotros. Es el mismo stage: realmente está ahí arriba. | fija contrapicado | — |
| 006.E | 246–250 | S | PG | La primera ballena gira y **asciende**. La cámara decide seguirla. | pan up + aceleración suave | `ASCEND` |

---

## ESCENA 007 — THE SKY BEYOND · 250 → 275 s

| Shot | TC | Superficie | Plano | Descripción | Cámara | Cue |
| --- | --- | --- | --- | --- | --- | --- |
| 007.A | 250–257 | S E C | PG | Ascenso tras la ballena. La luz de arriba crece. **Rompemos la superficie.** | traveling up 4 m/s | `SURFACE_BREAK` |
| 007.B | 257–264 | S E | PG | El agua **se convierte en nubes** (mismo shader, otra densidad y color). Azul profundo → dorado. | dolly out, horizonte bajo | `SUNSET_AMBER` |
| 007.C | 257–264 | C | PG | Nubes corriendo sobre nosotros, aves en V. | fija, parallax fuerte | — |
| 007.D | 264–270 | S | PG | Un **avión** cruza entre las nubes, luces de navegación, estela. | tracking suave | `PLANE` |
| 007.E | 270–275 | S E C | PG | Subimos por encima de las nubes. El cielo se oscurece. Primeras estrellas. El avión se aleja. | traveling up, FOV 42°→52° | `NIGHT_FALL` |

---

## ESCENA 008 — THE UNIVERSE · 275 → 300 s

| Shot | TC | Superficie | Plano | Descripción | Cámara | Cue |
| --- | --- | --- | --- | --- | --- | --- |
| 008.A | 275–284 | S E C | PG | Viaje por la galaxia: nebulosas, polvo, estrellas pasando, un sistema planetario a la derecha. | traveling forward 12 m/s + roll 2° | `GALAXY_PURPLE` |
| 008.B | 284–289 | E | PG | Una nave cruza en silueta contra la nebulosa, muy lejos. Escala. | fija | — |
| 008.C | 289–294 | S | PM | **La estrella del inicio reaparece** frente a nosotros. Reconocible: mismo núcleo, misma corona. La seguimos un instante. | follow, desaceleración | `STAR_RETURN` |
| 008.D | 294–298 | S | PM | La estrella **estalla en partículas** que se reorganizan y forman el título: **UNIVERSO 1/1**. Tipografía ligera, tracking amplio, formada por puntos de luz. | fija | `FINAL_REVEAL` |
| 008.E | 298–300 | S | PM | Bajo el título aparece el mensaje editable: *"Este universo existe solo para ti."* | fija | — |
| 008.F | 300+ | S E C | — | **No hay corte a negro.** El título se disuelve en partículas que se convierten en el campo de estrellas del primer mundo explorable (COSMOS interactivo). | deriva libre lenta | `IDLE_INTERACTIVE` |

---

## Distribución de carga entre proyectores

| Superficie | Rol narrativo | Carga GPU | Qué nunca lleva |
| --- | --- | --- | --- |
| **STORY** (P3) | narrativa, fotografías, título, interacción | 50% | nada: es la prioritaria |
| **ENVIRONMENT** (P2) | continuidad del paisaje, segundo punto de vista | 30% | texto, fotografías principales |
| **CEILING** (P1) | mundo sobre nosotros: ballenas, dosel, galaxias, aves | 20% | texto, detalle fino (se ve en ángulo) |

Si el hardware sufre, se degrada en este orden: CEILING → ENVIRONMENT → STORY.
STORY nunca baja de la calidad seleccionada.

## Criterios de validación de la v1

1. `OPENING` + `GO` reproduce los 300 s de principio a fin sin intervención.
2. Las tres ventanas muestran **contenido distinto y coordinado** (verificable: la
   ballena de la escena 006 aparece en STORY y en CEILING en el mismo segundo,
   desde ángulos distintos).
3. `HOLD` congela el reloj narrativo pero **el ambiente sigue vivo** (hojas, peces,
   partículas no se congelan).
4. `BACK` retrocede a la escena anterior; `RESTART SCENE` reinicia la actual.
5. Las fotografías respetan su relación de aspecto y se pueden cambiar editando
   `src/config/memories.js` sin tocar el motor.
6. Los 6 mundos de la biblioteca se activan desde el panel y corren en bucle estable.
7. El simulador de luces refleja cada cue en el panel del operador.
8. ≥ 50 fps en calidad `balanced` a 1920×1080 por salida en GPU de escritorio media.
9. Cero peticiones de red durante la reproducción.

# Catálogo de prompts de Runway — todo el proyecto

Clip por clip, con su destino, su duración y lo que debe y no debe salir.

---

## Antes de empezar: las reglas comunes

### El cierre de estilo

**Pega esto al final de todos los prompts, sin excepción.** Es lo único que hace
que 90 clips generados por separado parezcan la misma película:

```
magical cinematic animation, stylized fantasy realism, volumetric light,
cinematic depth of field, smooth slow motion, rich deep colors, no text
```

### Lo que se excluye siempre

```
text, watermark, logo, people, faces, hands, fast motion, camera shake,
hard cuts, documentary realism, oversaturated, split screen, vertical
```

### Ajustes

| | |
| --- | --- |
| Modelo | Gen-4 Turbo. Gen-4 solo si Turbo falla dos veces seguidas |
| Aspecto | 16:9 |
| Duración | 10 s salvo que la ficha diga otra cosa |
| Semilla | **anótala siempre**, también en las fallidas |
| Movimiento de cámara | bajo o muy bajo |

### Tres cosas que te van a ahorrar créditos

1. **Los clips de mundo tienen que poder repetirse en bucle.** Pide movimiento
   continuo y sin dirección dominante (nada de "la cámara avanza"): si el clip
   avanza, el bucle da un salto. Yo lo cierro con solape, pero solo funciona si
   el movimiento es de deriva, no de viaje.
2. **`CEILING` significa cámara apuntando hacia arriba.** Si el prompt no lo dice
   explícitamente, Runway te da una vista horizontal y el clip no sirve para el
   techo.
3. **Genera primero un fotograma fijo** y úsalo como imagen de partida. Cuesta
   mucho menos que una tirada de video y te deja elegir el encuadre antes de
   gastar los 10 segundos.

### El número

| Bloque | Clips | Segundos | Con 2 intentos |
| --- | --- | --- | --- |
| 1 · Los cinco mundos | 15 | 150 | 300 |
| 2 · SH-001 THE AWAKENING | 18 | 180 | 360 |
| 3 · Las cinco transiciones | 5 | 50 | 100 |
| 4 · Los demás capítulos | 33 | 330 | 660 |
| **Total** | **71** | **710 s** | **~1 420 s** |

Multiplica 1 420 por el coste por segundo de tu plan. Si no da, el orden para
recortar está al final del documento.

---

# BLOQUE 1 · LOS CINCO MUNDOS

**Empieza por aquí.** Son el 95 % de lo que se ve esa noche. Un opening perfecto
con mundos vacíos es una noche fallida; mundos buenos con un opening decente, no.

Los quince son de **10 s**, movimiento de deriva, sin viaje.

## AMBIENT-002 · OCEAN — el mundo base

### `OCEAN-MAIN` → pared de enfrente
```
Deep underwater scene in open ocean. Shafts of sunlight filter down from
far above through clear blue-teal water. A loose school of small silver
fish drifts slowly across the middle distance. Fine marine particles float
suspended in the beams. The water fades from luminous turquoise above into
deep navy below. The camera holds almost still, drifting gently.
```

### `OCEAN-CEILING` → techo
```
Underwater shot looking straight up toward the ocean surface from below.
The rippling surface glows above, breaking sunlight into shifting caustic
patterns. Long shafts of light converge downward toward the camera.
Particles drift upward. Deep blue surrounding darkness at the edges. The
camera floats, facing up, barely moving.
```

### `OCEAN-SIDE` → pared lateral
```
Underwater scene with translucent glowing jellyfish drifting slowly through
deep blue water. Soft bioluminescent teal glow pulses through their bells.
Strands of kelp sway at the edges of frame. Small bubbles rise. Dark
background, the camera drifts sideways very slowly.
```

## AMBIENT-001 · CLOUDS

### `CLOUDS-MAIN`
```
Endless sea of soft clouds seen from just above, stretching to the horizon.
Golden and lavender sunset light rakes across the cloud tops. Slow billowing
movement within the clouds. Warm amber highlights on the ridges, deep violet
in the valleys. The camera hovers, drifting almost imperceptibly.
```

### `CLOUDS-CEILING`
```
Looking straight up at a sky of soft clouds passing slowly overhead. Golden
and pink light glows through the thinner parts. The clouds drift across the
frame from one edge to the other. Lavender and warm gold. The camera lies
still, facing up.
```

### `CLOUDS-SIDE`
```
Close detail of soft cloud texture lit from behind by golden sunset light.
Wisps curl and dissolve slowly. Pink and lavender tones with warm amber
rims. Shallow depth of field, the camera drifts gently sideways.
```

## AMBIENT-003 · JUNGLE

### `JUNGLE-MAIN`
```
Magical tropical jungle interior. Thick green foliage, large glowing
flowers, soft mist between the trunks. Golden shafts of sunlight pierce the
canopy and fall through the mist. Tiny points of light drift like fireflies.
Deep green with warm golden highlights. The camera drifts slowly forward.
```

### `JUNGLE-CEILING`
```
Looking straight up at a dense jungle canopy from the forest floor. Layers
of large green leaves overlap against bright sky. Golden sunlight breaks
through the gaps in moving patches. Leaves sway gently in wind. The camera
lies still, facing up.
```

### `JUNGLE-SIDE`
```
Close detail of glowing tropical leaves and ferns at night, lit by drifting
fireflies. Points of warm golden light float between the fronds. Deep green
shadows, soft mist. Shallow depth of field, the camera drifts slowly.
```

## AMBIENT-004 · GALAXY

### `GALAXY-MAIN`
```
Vast space scene with a glowing violet and deep blue nebula filling the
frame. Clouds of cosmic dust drift slowly, lit from within. Warm golden
stars scatter across the field. Depth and scale, layers receding into
darkness. The camera drifts almost imperceptibly.
```

### `GALAXY-CEILING`
```
Looking straight up at a night sky filled with stars and the glowing band of
the milky way crossing overhead. Violet and deep blue nebula clouds drift
slowly. Warm golden stars twinkle. The camera lies still, facing up.
```

### `GALAXY-SIDE`
```
Field of slowly drifting cosmic dust and distant stars. Soft violet and
magenta nebula wisps curl through the frame. Points of warm golden light.
Dark, deep, no strong focal point. The camera drifts sideways very slowly.
```

## AMBIENT-005 · RED ROOM

### `REDROOM-MAIN`
```
Heavy deep red velvet curtains filling the frame, lit by warm amber light
raking across them from the side. Soft folds catch the light, deep shadows
between. The fabric moves almost imperceptibly, as if breathing. Wine red,
crimson and amber. Elegant and intimate, the camera holds still.
```

### `REDROOM-CEILING`
```
Looking straight up at red silk fabric suspended overhead, rippling very
slowly. Warm amber light glows through the thinner parts. Deep crimson
shadows in the folds. Soft golden bokeh lights blurred far behind. The
camera lies still, facing up.
```

### `REDROOM-SIDE`
```
Close detail of dark red silk fabric in slow motion, catching warm amber
light along its edges. Soft golden bokeh in the background. Deep wine red
and black. Shallow depth of field, elegant and restrained, slow drift.
```

> **Para los tres de RED ROOM:** añade a la exclusión `neon, club lighting,
> strobe, magenta, pink`. Es lo único que separa "íntimo y elegante" de
> "antro barato", y Runway se va a lo segundo si no se lo prohíbes.

---

# BLOQUE 2 · SH-001 · THE AWAKENING

Los dieciocho clips del opening, en orden. Cada ficha dice el timecode y la
pantalla.

## 0:00 – 0:18 · THE FIRST BREATH

### `AWK-01-MAIN` · 0:08 · 10 s
```
A single tiny point of golden light appears in absolute darkness, far away.
It pulses slowly, breathing. Minuscule golden particles drift away from it
and fade. Everything else is black. The camera approaches imperceptibly
slowly.
```

### `AWK-02-CEILING` · 0:08 · 10 s
```
Looking straight up into complete darkness. The faintest stars begin to
appear one by one, very dim, cold white. Almost nothing else. The camera
lies still, facing up.
```

## 0:18 – 0:45 · THE SHOOTING STAR

### `AWK-03-MAIN` · 0:18 · 10 s
```
A point of golden light suddenly bursts outward into a brilliant star with a
blazing core and a trailing tail of sparks. It begins to move across a dark
universe, leaving a long luminous trail of golden particles. Deep black
background. The camera tracks it as it accelerates away.
```

### `AWK-04-CEILING` · 0:23 · 10 s
```
Looking straight up as a golden shooting star streaks across the night sky
overhead, leaving a long trail of glowing particles that slowly fade. Dark
sky with faint stars. The camera lies still, facing up.
```

### `AWK-05-SIDE` · 0:23 · 10 s
```
Clouds of golden particles drift and swirl through dark space, lit from one
side as something bright passes by off-frame. Warm golden motes against deep
black. Slow drifting movement.
```

## 0:45 – 1:18 · THE BIRTH OF LIFE

### `AWK-06-MAIN` · 0:45 · 6 s · **impacto**
```
A blazing golden star strikes dark ground. A ring of golden energy expands
outward across the surface, lighting cracks in the earth as it passes.
Glowing embers and dust rise. Intense warm gold against deep darkness. The
camera holds on the impact point.
```

### `AWK-07-MAIN` · 0:49 · 10 s · **el brote**
```
Extreme close-up on dark soil glowing with golden embers. A single green
sprout pushes up through the cracked ground, unfurling two delicate leaves
in slow motion. Golden particles rise around it. Warm amber light from
below, deep shadows. Macro lens, shallow depth of field, slow upward drift.
```

### `AWK-08-MAIN` · 0:59 · 10 s · **la propagación**
```
Lush magical vegetation grows rapidly across dark ground: stems rise, ferns
unfurl, flowers bloom open, vines spiral upward. Golden light spreads
outward from the center like a wave. Fireflies drift between the leaves.
The camera slowly pulls back revealing a garden coming alive.
```

### `AWK-09-CEILING` · 0:59 · 10 s
```
Looking straight up as branches and leaves grow across the sky above,
closing into a canopy over the camera. Golden light filters through the gaps
between the new leaves. Dark at the edges. The camera lies still, facing up.
```

### `AWK-10-SIDE` · 0:49 · 10 s
```
Roots of golden light spread outward beneath dark earth, branching like
veins and glowing as they travel. Small plants sprout where they pass. Deep
green and warm gold. The camera drifts slowly sideways.
```

## 1:18 – 1:30 · PARA TI

> **Sin Runway.** El texto se forma con partículas y lo compongo yo: Runway no
> escribe texto legible y, aunque lo hiciera, el texto exacto lo decides tú al
> final. Lo que sí hace falta es el fondo:

### `AWK-11-MAIN` · 1:18 · 10 s
```
A clearing in a magical garden in full bloom, flowers glowing softly,
golden particles floating in the air. The center of the frame is open and
uncluttered. Warm golden light, soft green. The camera holds almost still.
```
**Crítico: el centro tiene que quedar despejado.** Ahí va el texto.

### `AWK-12-CEILING` · 1:18 · 10 s
```
Looking straight up as golden petals and points of light drift slowly
downward past the camera against a warm glowing canopy. Soft and warm. The
camera lies still, facing up.
```

## 1:30 – 1:48 · MEMORIES BLOOM

### `AWK-13-MAIN` · 1:30 · 10 s · **el marco**
```
A slender branch grows across the frame in slow motion, curving gracefully
to enclose an empty oval space in the center. Small leaves and tiny white
flowers bloom along it as it extends. Golden particles drift. Soft green and
amber against a dark background. The camera holds almost still.
```
**Crítico: el centro tiene que quedar vacío y oscuro.** Ahí compongo la foto.

### `AWK-14-SIDE` · 1:30 · 10 s
```
Glowing vines hang in a dark magical forest, holding empty luminous oval
frames made of leaves and small flowers. The frames are dark and empty
inside. Golden particles drift. Soft depth of field.
```

## 1:48 – 2:10 · THE WATER PORTAL

### `AWK-15-MAIN` · 1:48 · 10 s
```
A single glowing butterfly made of golden light flies slowly through a dark
magical garden, trailing sparks. It moves toward a still dark lake visible
ahead. Warm gold against deep green. The camera follows it gently.
```

### `AWK-16-MAIN` · 2:00 · 10 s · **el portal**
```
A glowing butterfly touches the surface of a still dark lake. Where it
touches, a ring of light expands and the water's reflection transforms from
forest into a swirling galaxy of stars and violet nebulae. The camera drifts
down toward the water surface.
```

### `AWK-17-CEILING` · 1:48 · 10 s
```
Looking straight up through the canopy of a magical garden as a single
glowing golden butterfly flies past overhead, trailing sparks. Leaves and
soft light above. The camera lies still, facing up.
```

## 2:10 – 3:00 · OCÉANO Y CIELO

> **Reutiliza los clips de los mundos.** `OCEAN-MAIN`, `OCEAN-CEILING`,
> `OCEAN-SIDE`, `CLOUDS-MAIN` y `CLOUDS-CEILING` ya están generados en el
> bloque 1 y sirven tal cual, graduados. Cero créditos nuevos.

Solo hace falta uno:

### `AWK-18-MAIN` · 2:42 · 10 s · **salir del agua**
```
Rising up through the ocean surface from below and breaking out into open
sky. Water falls away from the camera in slow motion droplets. Below, the
sea; above, a golden and lavender sunset sky. The camera rises steadily
upward.
```

## 3:00 – 3:40 · BEYOND THE STARS y THE REVEAL

> **Sin Runway.** El regreso de la estrella, la reunión de partículas y la
> formación del título son composición: tienen que coincidir al fotograma con la
> música y Runway no da ese control. Uso `GALAXY-MAIN` y `GALAXY-CEILING` de
> fondo y compongo encima.

---

# BLOQUE 3 · LAS CINCO TRANSICIONES

8–12 s cada una. La estrella cruza y **repinta** el mundo nuevo. Solo genero la
vista `MAIN`; el techo y el lateral los derivo por composición, porque lo único
que tienen que hacer es cambiar de color al mismo tiempo.

### `TR-001-CLOUDS`
```
A streak of golden light crosses a dark frame from left to right. Where it
passes, the darkness transforms into a vast sea of golden sunset clouds that
bloom outward and fill the frame. Warm gold and lavender.
```

### `TR-002-OCEAN`
```
A streak of golden light crosses a dark frame from left to right. Where it
passes, the darkness transforms into deep blue ocean water with sunlight
shafts filtering down, blooming outward to fill the frame. Gold turning to
deep teal.
```

### `TR-003-JUNGLE`
```
A streak of golden light crosses a dark frame from left to right. Where it
passes, lush green jungle foliage grows outward and fills the frame, with
golden light filtering through the leaves. Gold turning to deep green.
```

### `TR-004-GALAXY`
```
A streak of golden light crosses a dark frame from left to right. Where it
passes, the darkness blooms into a violet and blue nebula filled with golden
stars, expanding to fill the frame. Gold turning to violet.
```

### `TR-005-REDROOM`
```
A streak of golden light crosses a dark frame from left to right. Where it
passes, deep red velvet curtains unfurl outward and fill the frame, lit by
warm amber light. Gold turning to wine red. Elegant, intimate.
```
Excluir también: `neon, club lighting, strobe, magenta`.

---

# BLOQUE 4 · LOS DEMÁS CAPÍTULOS

Tres clips por capítulo salvo donde se indique.

## SH-003 · THE MYSTERY BOX

### `BOX-MAIN`
```
Three ornate golden boxes float in a dark violet void, slowly rotating.
One by one they begin to glow from within, seams of golden light opening
along their edges. Light spills out. Deep violet and warm gold.
```
### `BOX-CEILING`
```
Looking straight up at a vault of drifting golden particles and soft violet
light, slowly swirling overhead. Points of light pulse. The camera lies
still, facing up.
```
### `BOX-SIDE`
```
Golden geometric symbols and sparks drift slowly through a dark violet
space, glowing softly. Deep shadow, warm gold accents.
```

## SH-002 · OUR STORY

### `STORY-MAIN`
```
Flying slowly forward through a vast sea of golden and lavender clouds. Open
empty spaces between the cloud banks. Soft warm light, deep layers receding.
The camera drifts forward gently.
```
**Deja huecos vacíos:** ahí compongo las fotos.
### `STORY-CEILING`
```
Looking straight up at soft golden clouds drifting slowly overhead, with
points of warm light glowing between them. The camera lies still, facing up.
```
### `STORY-SIDE`
```
Soft golden cloud texture drifting slowly, backlit, with warm lavender
tones and floating points of light. Shallow depth of field.
```

## SH-008 · PIZZA EXPERIENCE

### `PIZZA-MAIN`
```
Cinematic food scene in a dark space with warm golden rim light. Pizza dough
spins and stretches in slow motion, flour dust floating in the light.
Ingredients fall slowly onto it. Warm amber and deep shadow.
```
### `PIZZA-CEILING`
```
Looking straight up as pizza ingredients float and drift past overhead in
slow motion against a warm dark background: basil leaves, tomato slices,
flour dust. Warm golden light.
```
### `PIZZA-SIDE`
```
Close detail of a wood fired oven interior, glowing embers and flames in
slow motion, warm amber and orange light against deep shadow.
```

## SH-011 · BBQ EXPERIENCE

### `BBQ-MAIN`
```
Glowing embers float upward through darkness. Below, a grill glows with warm
orange heat. Smoke curls slowly through warm rim light. Deep shadow, amber
and ember orange.
```
### `BBQ-CEILING`
```
Looking straight up as glowing orange embers and sparks drift upward past
the camera through darkness, fading as they rise. Warm and slow.
```
### `BBQ-SIDE`
```
Close detail of slow motion flames and glowing coals against deep darkness.
Warm amber, orange and deep red. Shallow depth of field.
```

## SH-010 · PLAYER TWO

### `P2-MAIN`
```
Two glowing orbs, one violet and one golden, float apart in a dark abstract
space of geometric light. They drift slowly toward each other. Clean, soft
glow, deep shadow.
```
### `P2-CEILING`
```
Looking straight up at a grid of soft glowing geometric lines in violet and
gold, slowly shifting overhead against darkness.
```
### `P2-SIDE`
```
Abstract streaks of violet and golden light drifting slowly through dark
space, soft bloom, clean and minimal.
```

## SH-009 · RELAX & SPA

### `SPA-MAIN`
```
A tranquil magical forest at dusk. Soft mist over still water, glowing
flowers, fireflies drifting slowly. Warm amber light through deep green.
Extremely calm, almost no movement.
```
### `SPA-CEILING`
```
Looking straight up through a soft forest canopy at dusk as fireflies drift
slowly overhead. Warm points of light against deep green and dark sky.
```
### `SPA-SIDE`
```
Close detail of water droplets on glowing green leaves, mist drifting
slowly, warm golden light. Shallow depth of field, very calm.
```

## SH-004 · DESTINATION UNKNOWN

### `DEST-MAIN`
```
A stylized airplane flies slowly through towering golden sunset clouds,
seen from the side at a distance. Long shafts of warm light between the
cloud banks. The camera tracks alongside it gently.
```
### `DEST-CEILING`
```
Looking straight up as an airplane passes high overhead through golden
clouds, leaving a soft contrail. Warm light, slow.
```
### `DEST-SIDE`
```
Golden sunset clouds rushing slowly past, seen from a window perspective.
Warm amber and lavender, soft motion blur.
```

## SH-051 / 052 / 053 · GALAXY BAR

Una base común, tres variaciones de color.

### `BAR-GOLD-MAIN`
```
Golden stardust swirls slowly in a dark space, coalescing into a glowing
liquid that pours in zero gravity. Fragments of light orbit around it. Warm
gold and deep black, elegant.
```
### `BAR-BLUE-MAIN`
```
Turquoise cosmic liquid floats and swirls in zero gravity against deep
space, catching light. Ice crystals drift around it. Cool turquoise and deep
blue, elegant.
```
### `BAR-VIOLET-MAIN`
```
A violet nebula swirls into a vortex and bursts into magenta light in slow
motion against deep space. Glowing particles spiral outward. Violet and deep
blue.
```
Para las tres, el techo y el lateral se derivan de `GALAXY-CEILING` y
`GALAXY-SIDE` recoloreados. Cero créditos nuevos.

## SH-007 · RED ROOM (entrada)

### `RED-ENTRY-MAIN`
```
Golden particles drift through darkness and slowly transform into flowing
deep red silk, which unfurls and becomes heavy velvet curtains parting to
reveal a dark intimate space with warm amber light. Wine red and gold.
```
Techo y lateral: `REDROOM-CEILING` y `REDROOM-SIDE` del bloque 1.

## AMBIENT-106 · MESSAGES TO THE FUTURE

### `MSG-MAIN`
```
A glass sphere floats slowly in deep space, surrounded by drifting stars.
Soft points of golden light orbit it. Inside, a faint warm glow. Deep violet
and blue, very calm, almost no movement.
```
### `MSG-CEILING`
```
Looking straight up at a calm field of stars drifting very slowly overhead,
with soft violet nebula light. Extremely slow and peaceful.
```

## SH-006 · MESSAGES (cierre)

### `MSG-CLOSE-MAIN`
```
A glass sphere gathers points of golden light from around it, absorbing
them one by one until it glows brightly. Then it rises slowly upward
through a field of stars. Deep violet, warm gold.
```

## SH-012 · GRAND FINALE

### `FIN-01-MAIN`
```
A golden star travels through a landscape that transforms continuously
around it: clouds become forest, forest becomes ocean, ocean becomes
galaxy. One continuous flowing movement. Warm gold throughout.
```
### `FIN-02-MAIN`
```
A golden star rises upward through a vast starfield, leaving a long
luminous trail. Particles gather and spiral behind it. The camera follows
it up. Deep violet and warm gold.
```
### `FIN-03-CEILING`
```
Looking straight up as thousands of golden points of light slowly gather
and arrange themselves into a constellation overhead against deep violet
space.
```

---

# Si los créditos no dan

Orden de recorte, de lo primero que sacrificaría a lo último:

1. **Bloque 4, los techos y laterales.** Se derivan de los mundos recoloreados
   y casi nadie va a notar la diferencia. Ahorro: ~15 clips.
2. **`AWK-02`, `AWK-05`, `AWK-10`, `AWK-12`, `AWK-14`, `AWK-17`.** Son techos y
   laterales de apoyo del opening; los hago con el motor. Ahorro: 6 clips.
3. **Bloque 3 completo.** Las transiciones las puedo hacer con el elemento de la
   estrella que ya está renderizado más un recoloreado. Ahorro: 5 clips.
4. **Bloque 4, los MAIN de los capítulos menores** (PLAYER TWO, DESTINATION
   UNKNOWN). Ahorro: 2 clips.

Lo que **no** recortaría nunca, por orden de importancia:

1. Los tres de `OCEAN` — es el 95 % de la noche.
2. `AWK-07`, `AWK-08`, `AWK-13`, `AWK-16` — el brote, la propagación, el marco
   y el portal. Es lo único del proyecto que no existe en ningún banco.
3. Los tres de `CLOUDS` — donde aterriza el opening.

---

# Cómo me los mandas

Carpeta por bloque, con el nombre del clip tal cual:

```
production\runway\
   OCEAN-MAIN.mp4
   OCEAN-CEILING.mp4
   AWK-07-MAIN.mp4
   ...
```

Si una tirada te gusta a medias, mándamela igual con `-v2` al final: muchas
veces se salva recortando o cambiando la velocidad.

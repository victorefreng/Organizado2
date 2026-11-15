# Lista de búsqueda de material de stock

Qué buscar, para qué pantalla y cuántos clips. Los términos van **en inglés**
porque los buscadores de los bancos son ingleses y en español devuelven mucho
menos.

## Las tres pantallas

| Carpeta | Proyector | Qué pide | Cómo reconocer un clip bueno |
| --- | --- | --- | --- |
| `main/` | Pared de enfrente de la cama | **Lo que mira de frente.** La vista principal del mundo | Horizonte estable, profundidad, algo que ocurre en el centro |
| `ceiling/` | Techo | **Lo que se ve mirando hacia arriba** | La cámara apunta al cielo, a la superficie del agua o a las copas |
| `side/` | Pared lateral | **Textura y vida secundaria** | Detalle, movimiento de borde, nada que reclame atención |

La prueba rápida para `ceiling/`: si al verlo piensas "esto está encima de mí",
va al techo. Si piensas "esto está delante de mí", va a `main/`.

---

## AMBIENT-002 · OCEAN — el mundo base, el más importante

Es lo que se ve más del 95 % de la noche. Si solo bajas un mundo, baja este.

### `main/` — 3 o 4 clips
```
underwater ocean blue
school of fish underwater
coral reef slow motion
sea turtle swimming underwater
whale underwater
manta ray underwater
```
Busca azul profundo y turquesa, cámara lenta, nada de buceadores.

### `ceiling/` — 2 o 3 clips
```
underwater looking up at surface
water surface from below
sun rays underwater
underwater caustics
ocean surface sunlight from underwater
```
Este es el más difícil de encontrar y el que más cambia la habitación. Tómate
tiempo con él.

### `side/` — 2 o 3 clips
```
jellyfish underwater
bubbles rising underwater
kelp forest underwater
seaweed moving underwater
plankton particles underwater
```

---

## AMBIENT-001 · CLOUDS

### `main/` — 3 clips
```
above the clouds aerial
golden sunset clouds timelapse
flying over clouds
sea of clouds sunrise
```

### `ceiling/` — 2 clips
```
clouds looking up
sky timelapse from below
clouds moving overhead
```

### `side/` — 2 clips
```
cloud texture slow motion
lavender sky clouds
soft clouds pink sunset
```

Paleta: dorado, lavanda, azul. Descarta cualquier cielo gris o plomizo.

---

## AMBIENT-003 · JUNGLE

### `main/` — 3 clips
```
tropical rainforest green
jungle river slow
rainforest mist morning
tropical plants wind
```

### `ceiling/` — 2 clips
```
forest canopy looking up
sun rays through trees
tree tops sky view from below
```

### `side/` — 2 o 3 clips
```
fireflies night forest
tropical leaves close up
fern jungle detail
waterfall jungle slow motion
```

Verde con destellos dorados. Nada de bosque seco ni otoñal.

---

## AMBIENT-004 · GALAXY

### `main/` — 3 clips
```
nebula space
flying through stars
milky way timelapse
galaxy space travel
```

### `ceiling/` — 2 clips
```
starfield looking up
night sky stars timelapse
milky way overhead
```

### `side/` — 2 clips
```
space dust particles
purple nebula clouds
star field slow drift
```

**Extra que vale mucho:** las galerías de **NASA** y **ESA/Hubble** tienen
imágenes fijas de nebulosas en altísima resolución y de dominio público. Bájate
4 o 5 en el tamaño más grande: yo les doy movimiento 2.5D por capas y quedan
mejor que casi cualquier video de stock.

---

## AMBIENT-005 · RED ROOM

### `main/` — 2 o 3 clips
```
red velvet curtain
red silk fabric slow motion
dark red smoke
```

### `ceiling/` — 2 clips
```
red fabric overhead
dark red bokeh lights
amber light particles dark
```

### `side/` — 2 clips
```
red silk texture
candle light bokeh dark
red smoke slow motion
```

Rojo vino y ámbar, sombras suaves. **Nada que parezca discoteca:** sin estrobo,
sin magentas eléctricos, sin luces de antro.

---

## Audio

Va a `production/stock/_audio/`.

### `musica/` — 4 o 5 piezas
```
cinematic ambient
underwater ambient music
space ambient
emotional piano
dreamy atmosphere
```
Busca cosas largas (3 min o más), sin voz, sin batería marcada, sin subidas
bruscas. Si te gusta una, bájala aunque no sepas para qué mundo: casi todas
sirven recortadas.

### `efectos/` — los que encuentres
```
underwater ambience
ocean waves underwater
forest ambience birds
wind high altitude
whale song
magical sparkle
deep space drone
```

---

## Cómo descargar

1. **Pexels** y **Pixabay** son los que más rinden. Mixkit y Coverr tienen menos
   pero son más limpios.
2. Filtra por **Videos** y orientación **horizontal**.
3. Descarga **la resolución más grande** que ofrezcan. Sobra resolución, nunca falta.
4. Mételo en la carpeta del mundo y de la pantalla que le toque. Si dudas,
   `_sin-clasificar/`.
5. **Apunta la fila en `production/stock/SOURCES.csv`.** Enlace, autor, licencia
   y fecha. Es obligatorio: sin eso no puedo escribir `extras/licenses.md` y el
   paquete no se entrega.

## Cuántos hacen falta para empezar

| Prioridad | Mundo | Mínimo para producirlo |
| --- | --- | --- |
| 1 | OCEAN | 8 clips |
| 2 | CLOUDS | 7 clips |
| 3 | GALAXY | 7 clips + 4 imágenes de NASA/ESA |
| 4 | JUNGLE | 7 clips |
| 5 | RED ROOM | 6 clips |

Con OCEAN completo ya tienes cubierto el 95 % de la noche. Empieza por ahí y
avísame: en cuanto estén, lo rehago con material real.

# SH-001 · THE AWAKENING

Opening cinematografico de bienvenida. Nace la estrella, cae, da vida a un jardin, le habla a Arantza, abre sus recuerdos y recorre los mundos de la noche hasta revelar UNIVERSO 1/1.

- **Duración:** 220 s · **offset** 01:00:00:00 · **timecodeShow** 1 · slot 2
- **Aterriza en:** AMBIENT-001
- **Material de prueba:** sí

Los tres videos van sincronizados y duran exactamente 220 s.

**Textos.** Salen de `production/config/textos.json`: «Celebrando tu vida, Arantza», «Feliz cumpleaños», «UNIVERSO 1/1» y «Este universo existe solo para ti.». Los de PARA TI y el mensaje final siguen marcados como pendientes de confirmar: por eso el paquete va como material de prueba. Cambiar una palabra es volver a renderizar, no volver a animar.

**Fotos.** Cinco fotografias reales, en su proporcion original, sin recortar ni deformar: en MAIN, Arantza de bebe, bajo el arbol y el atardecer; en SIDE, la capa y en casa. El orden esta en `production/config/fotos.json`.

**Aterrizaje.** Los ultimos fotogramas son el final exacto del bucle de CLOUDS: al terminar, AMBIENT-001 arranca en su fotograma cero y no hay empalme.

**Musica.** Maqueta sintetizada, compuesta sobre la linea de tiempo real: cada golpe cae en el fotograma del golpe. Se puede sustituir por musica con licencia respetando los tiempos de la tabla de cues.

Regenerar: `bash engine2/capitulo.sh SH-001`, `node tools/make-sh001-audio.mjs dist/packages/SH-001/audio.wav` y `node tools/build-cinematic-package.mjs SH-001`.

## Cues

| ms | timecode | tipo | qué pasa |
|---|---|---|---|
| 0 | 01:00:00:00 | AMBIENT_FADE | penumbra en las tres pantallas |
| 8000 | 01:00:08:00 | AMBIENT_FADE | nace un punto dorado que pulsa |
| 19250 | 01:00:19:08 | IMPACT | el punto colapsa y nace la estrella |
| 20500 | 01:00:20:15 | COLOR_TRANSITION | se enciende el cielo en las tres pantallas |
| 27000 | 01:00:27:00 | MUSICAL_BUMP | la estrella cruza el techo |
| 31000 | 01:00:31:00 | MUSICAL_BUMP | la estrella cruza la pared lateral |
| 41500 | 01:00:41:15 | RISER | la estrella cae hacia el suelo |
| 45080 | 01:00:45:02 | IMPACT | onda dorada que corre por el suelo |
| 49000 | 01:00:49:00 | COLOR_TRANSITION | del crater sale un brote; raices de luz en la lateral |
| 69000 | 01:01:09:00 | AMBIENT_FADE | la selva ya crecida; se abren las flores |
| 78000 | 01:01:18:00 | REVEAL | el texto se forma con particulas doradas |
| 90000 | 01:01:30:00 | AMBIENT_FADE | las fotografias, enmarcadas en hojas y flores |
| 108000 | 01:01:48:00 | AMBIENT_FADE | una mariposa luminosa nos lleva al lago |
| 120000 | 01:02:00:00 | RISER | toca el agua y el reflejo se vuelve galaxia |
| 126250 | 01:02:06:08 | IMPACT | atravesamos la superficie |
| 130000 | 01:02:10:00 | COLOR_TRANSITION | oceano en las tres pantallas |
| 150000 | 01:02:30:00 | MUSICAL_BUMP | una ballena se acerca; otra pasa por el techo |
| 162000 | 01:02:42:00 | RISER | la luz de arriba crece |
| 165200 | 01:02:45:06 | REVEAL | rompemos la superficie: cielo dorado y lavanda |
| 180000 | 01:03:00:00 | COLOR_TRANSITION | las nubes se vuelven estrellas |
| 188000 | 01:03:08:00 | MUSICAL_BUMP | la estrella regresa en espiral |
| 201000 | 01:03:21:00 | RISER | la estrella reune particulas de todos los mundos |
| 208080 | 01:03:28:02 | FINAL_HIT | estalla y se forma el titulo; constelacion en el techo |
| 215200 | 01:03:35:06 | OUTRO_FADE | el titulo se disuelve en nubes calidas |

## Seguridad

El láser aparece en un único cue y es OPCIONAL: solo se programa si el operador confirma una zona segura (haz por encima de 2,2 m, nunca hacia la cama ni a la altura de los ojos). Si hay duda, se deja fuera: la pieza funciona igual sin él. Sin estrobo: el Flasher, cuando aparece, es un único destello.

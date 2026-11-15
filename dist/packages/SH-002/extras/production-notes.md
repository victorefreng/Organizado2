# SH-002 · OUR STORY

Un viaje por nuestros recuerdos: la camara avanza entre nubes doradas y lavanda y las fotos pasan a distintas distancias.

- **Duración:** 60 s · **offset** 02:00:00:00 · **timecodeShow** 0 (sin show de luces por timecode) · slot 2
- **Aterriza en:** AMBIENT-001
- **Material de prueba:** sí

Las fotos salen de `production/config/fotos.json`, en su proporcion real. MAIN lleva las protagonistas y la foto especial (el atardecer), donde la camara se detiene y la musica baja; SIDE las secundarias; CEILING recuerdos lejanos entre nubes.

**Para alargarlo:** el reparto y los tiempos estan en `PLAN`, al principio de `engine2/shows/sh002.mjs`. Se anaden fotos al registro, se suman al plan y se sube `DURATION`. Nada mas cambia.

## Cues

| ms | timecode | tipo | qué pasa |
|---|---|---|---|
| 0 | 02:00:00:00 | AMBIENT_FADE | la camara avanza entre nubes; primeros recuerdos |
| 27000 | 02:00:27:00 | COLOR_TRANSITION | el atardecer llega al centro y la camara se detiene |
| 43500 | 02:00:43:15 | COLOR_TRANSITION | los recuerdos se vuelven particulas doradas |
| 54000 | 02:00:54:00 | OUTRO_FADE | look de reposo de CLOUDS |

## Seguridad

Sin láser en esta pieza. Sin estrobo: el Flasher, cuando aparece, es un único destello.

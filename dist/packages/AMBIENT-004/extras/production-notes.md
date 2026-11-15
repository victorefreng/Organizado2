# AMBIENT-004 · GALAXY

Cielo violeta con nebulosas y estrellas doradas.

## Cómo está hecho

Animación procedural dibujada en lienzo nativo (Skia) y codificada con ffmpeg a
1280x720, 30 fps. Ningún metraje externo.

**Bucle perfecto por construcción.** Cada capa se anima con funciones periódicas
cuyo ciclo divide exactamente la duración de la composición, así que el último
fotograma y el primero son el mismo por matemática. No hay solape ni fundido que
pueda dejar rastro, que es lo que importa en algo que va a estar en pantalla
horas.

Las tres pantallas duran distinto a propósito (main 135s, ceiling 155s, side 175s):
así el conjunto no vuelve a coincidir nunca.

No hay continuidad geométrica entre pantallas, que sería imposible de sostener.
Comparten paleta, profundidad y ritmo, que es lo que hace que se lean como el
mismo sitio.

## Look de reposo

respiracion muy lenta, 60 s por ciclo

- **Halo PAR (3):** #B06BFF al 14 %
- **Flasher 200:** sin uso
- **Láser:** sin uso
- **Haze:** sin uso

Nivel REPOSO del brief §9: un solo estado, sin golpes, que no compita con los
proyectores.

## Audio

Sintetizado, 8 minutos en bucle sin corte audible.
Mezclado para una Sonos por Bluetooth: corte de graves por debajo de
45 Hz, -1 dBFS de pico,
y la información importante sobrevive en mono.

**Es maqueta.** Fija el carácter y la duración; conviene sustituirlo por música
con licencia cuando esté disponible. Las pistas se regeneran con:

    node tools/make-piece-audio.mjs production/pieces/AMBIENT-004/piece.json dist/packages/AMBIENT-004/audio.wav

## Regenerar

    node engine2/render.mjs GALAXY main      (y ceiling, side)
    node tools/build-ambient-package.mjs AMBIENT-004

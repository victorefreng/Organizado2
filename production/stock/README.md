# Material de stock

Aquí va todo lo que descargues de bancos con licencia. Yo lo recorto, lo
recoloro a nuestra paleta, lo compongo en capas y lo convierto en bucle.

## Dónde va cada cosa

```
production/stock/
  AMBIENT-002-OCEAN/
    main/              → pared de enfrente de la cama. Lo que ella mira de frente
    ceiling/           → techo. Todo lo que se ve MIRANDO HACIA ARRIBA
    side/              → pared lateral. Vida y textura secundaria
    _sin-clasificar/   → si dudas, aquí. Yo lo coloco
```

Lo mismo para `AMBIENT-001-CLOUDS`, `AMBIENT-003-JUNGLE`, `AMBIENT-004-GALAXY`
y `AMBIENT-005-REDROOM`. El audio va en `_audio/musica` y `_audio/efectos`.

**La carpeta es la que manda.** El nombre del archivo da igual mientras se
entienda; si quieres uno ordenado:

```
ocean-main-01-banco-de-peces.mp4
ocean-ceiling-02-superficie-desde-abajo.mp4
```

## Lo único obligatorio

Apunta cada descarga en `SOURCES.csv`. Sin eso no puedo escribir
`extras/licenses.md`, y sin ese archivo el paquete no se entrega.

```csv
archivo,mundo,pantalla,titulo,autor,sitio,url,licencia,fecha
ocean-main-01.mp4,AMBIENT-002,main,Underwater fish,Jane Doe,Pexels,https://...,Pexels License,2026-11-15
```

## Qué sirve y qué no

**Sirve:** horizontal, 1080p o más, movimiento lento y continuo, sin cortes
dentro del clip, 10 s o más, sin gente reconocible, sin texto ni marcas de agua.

**No sirve:** vertical, cámara temblorosa, cortes internos, zoom rápido, gente
mirando a cámara, logos, marcas de agua, colores chillones.

Si un clip dura 8 s y es bueno, tráelo igual: lo alargo.

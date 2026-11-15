# Fotos

## Dónde van

```
production/fotos/
  protagonistas/   las 6-8 importantes: salen grandes, en MAIN, con su momento
  secundarias/     el resto: fondo, techo y pared lateral
```

Si no sabes cuáles son protagonistas, mételas todas en `secundarias/` y dime
cuáles quieres destacar. También vale decirme "la de la playa" y yo la muevo.

## Formato

Cualquiera: JPG o PNG, **cualquier proporción**. El motor lee la relación de
aspecto real de cada una y adapta el marco a la foto, nunca al revés. Ningún
rostro se deforma y no se recorta nada.

Lado largo de 2000 px o más está bien. Más no hace falta.

## Nombres

Da igual el nombre del archivo. Si quieres controlar el orden, numéralas:

```
01-primera-cita.jpg
02-el-viaje.jpg
```

## Una cosa que ayuda

Si alguna tiene una historia que quieres que acompañe —una fecha, una frase—,
apúntala en `PIES.txt`, una línea por foto:

```
01-primera-cita.jpg   El día que todo empezó
02-el-viaje.jpg       Agosto, y no queríamos volver
```

No es obligatorio. Las que no tengan pie salen sin texto, que también funciona.

## Qué pasa cuando las subas

Las animaciones ya están hechas y usan marcadores. Sustituir un marcador por tu
foto **no obliga a rehacer nada**: la rama sigue creciendo igual, el marco se
ajusta a la proporción de tu foto y listo.

Súbelas con:

    git add production/fotos
    git commit -m "fotos"
    git push

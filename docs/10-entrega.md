# Entrega · qué hay, cómo probarlo y qué falta decidir

Todo está en `dist/packages/`, una carpeta por pieza, con el formato del Brief
Maestro V3.2 §5. Esa carpeta contiene **solo** los 25 paquetes, para poder
copiarla tal cual a `C:\UNIVERSO\universo-control\experiences\`.

- [`dist/INFORME-ENTREGA.md`](../dist/INFORME-ENTREGA.md): la auditoría, medida
  archivo por archivo. Se regenera con `node tools/audit-delivery.mjs`.
- [`dist/INDICE.md`](../dist/INDICE.md): el índice. Se regenera con
  `node tools/make-index.mjs`.

## Cómo bajarla

El repositorio es `victorefreng/Organizado2`, en GitHub. Los MP4 y los WAV van
en git normal, **sin Git LFS**: se bajan con un clon corriente, sin instalar
nada más. Esto baja solo la última foto de la rama, sin el historial:

    git clone --depth 1 --single-branch --branch claude/design-brand-tools-zi127f https://github.com/victorefreng/Organizado2.git
    robocopy Organizado2\dist\packages C:\UNIVERSO\universo-control\experiences /E

Son unos 1,8 GB. Para comprobar que es la entrega que se auditó, `git rev-parse HEAD`
tiene que dar el commit que figura en el mensaje de entrega.

## Cómo probarlo

1. Baja la entrega y cópiala como se indica arriba.
2. Valida cada una con el validador del sistema, que es el que manda:

       cd C:\UNIVERSO\universo-control
       npm run validate -- "ruta\al\paquete\SH-001"

   Aquí ya pasaron el validador de este repositorio (`tools/validate-package.mjs`),
   que aplica las reglas de §5.4. Si el del sistema rechaza algo que este
   acepta, el que tiene razón es el del sistema: avísame con el mensaje exacto.
3. Para ver una pieza sin instalar nada, cada carpeta trae
   `extras/preview-triptico.mp4`: techo arriba, lateral en medio, pared de
   enfrente abajo, con su audio.

## Qué lleva cada carpeta

    SH-001/
      experience.json        id, tipo, duración, timecode, mundo de aterrizaje y cues
      main.mp4 ceiling.mp4 side.mp4     H.264 yuv420p, 30 fps constantes, 1280x720, sin audio,
                                        un fotograma clave por segundo, faststart
      audio.wav              48 kHz estéreo PCM 16, desde el tiempo cero, sin timecode
      extras/
        cue-sheet.csv        las luces, una fila por cue, con el timecode ya sumado
        preview-triptico.mp4
        production-notes.md  qué es, cómo está hecho y cómo se regenera
        licenses.md

## Lo que hay que saber antes de la noche

- **Los mundos cierran solos.** Cada bucle está construido para que su último
  fotograma sea el anterior al primero. Está comprobado sobre los fotogramas sin
  comprimir: la costura mide lo mismo que cualquier otro paso entre fotogramas.
- **Los capítulos y las transiciones aterrizan sin empalme.** Sus últimos
  fotogramas son el final exacto del bucle del mundo al que llegan.
- **Todo empieza con un destello.** Tapa el fundido de entrada, así que
  cualquier pieza se puede lanzar desde cualquier mundo.
- **Las tres pantallas de un mundo duran distinto a propósito** (por ejemplo
  120, 140 y 160 s): el conjunto no se repite igual.
- **Solo tres piezas llevan show de luces por timecode**: SH-001 (show 1),
  SH-003 (show 3) y SH-012 (show 12). Todas las demás van con `timecodeShow` 0;
  su cue sheet es una referencia para programar la consola a mano.
- **El láser es opcional y aparece en dos cues nada más**: el golpe final del
  opening y el del finale. Solo se programa si confirmas una zona segura, con
  el haz por encima de 2,2 m y nunca hacia la cama. Sin él todo funciona igual.
- **No hay ningún BLACKOUT.** El cue más oscuro de cada pieza es un nivel bajo.

## Lo que decides tú

Todo va marcado como material de prueba (`testMaterial: true`) hasta que lo
confirmes. Cambiar cualquiera de estas cosas es editar un archivo y volver a
renderizar; ninguna obliga a rehacer animación.

| Qué | Dónde se cambia | Estado |
|---|---|---|
| Texto de PARA TI y mensaje final | `production/config/textos.json` | Puesto, **pendiente de que lo confirmes** |
| Nombres de las tres bebidas | `production/config/textos.json` | Puestos: PRIMERA LUZ, MAR DE LA TRANQUILIDAD, SUPERNOVA |
| Fotos y su orden | `production/config/fotos.json` y `production/fotos/` | 11 fotos reales en uso; el brief habla de 30 |
| Opciones de la ruleta de RED ROOM | `production/assets/ruleta/ruleta.svg` | **Vacías a propósito**: las escribes tú |
| Música | `audio.wav` de cada carpeta | Maqueta sintetizada y sincronizada; se puede sustituir respetando los tiempos del cue sheet |
| Láser | `extras/cue-sheet.csv` de SH-001 y SH-012 | Opcional, lo decides en la sala |

## Volver a generar algo

    bash engine2/mundo.sh OCEAN AMBIENT-002        un mundo (tres pantallas y paquete)
    bash engine2/transicion.sh TR-002              una transición
    bash engine2/entregar.sh SH-002 SH-003         uno o varios capítulos
    bash engine2/capitulo.sh SH-001 && node tools/make-sh001-audio.mjs dist/packages/SH-001/audio.wav \
      && node tools/build-cinematic-package.mjs SH-001        el opening
    node tools/make-index.mjs                      el índice
    node tools/audit-delivery.mjs                  la auditoría de entrega
    node tools/build-chapter.mjs SH-002 --meta-only --bump     solo metadatos, sin tocar vídeo ni audio

Para mirar un momento concreto sin renderizar la pieza entera (el número son
segundos):

    node engine2/render-show.mjs SH-001 main --still 81,94,208

## Por qué no se renderizó con Remotion

Se midió antes de decidir. En esta máquina, que no tiene tarjeta gráfica,
Remotion daba entre 1,2 y 2,2 fotogramas por segundo: el navegador repinta por
software cientos de capas desenfocadas en cada fotograma, y los 70.000
fotogramas de los mundos eran unas diez horas. La propia documentación de
Remotion dice qué hacer en ese caso: precalcular los efectos caros.

`engine2/` hace exactamente eso sin navegador: dibuja en un lienzo nativo, todo
desenfoque se paga una vez al crear cada sprite, y los fotogramas van crudos a
ffmpeg. El resultado son unos 30 fotogramas por segundo por proceso, y las tres
pantallas de un mundo salen en unos cinco minutos.

El proyecto `remotion/` se conserva como referencia. En un equipo con tarjeta
gráfica (tu portátil con RTX 3050) Remotion sí rinde, usando `--gl=angle`.

## Lo que esto es y lo que no

Es animación procedural estilizada: cuento ilustrado, no imagen real. Cumple la
dirección del brief (fantasía con aspecto de película animada, «que se vea
bien») y cubre la noche entera, que era la prioridad frente a un opening
perfecto con horas vacías detrás. Si más adelante generas planos con Runway o
bajas clips de stock, entran como una capa más sobre estas mismas piezas, sin
tocar tiempos, audio ni cues.

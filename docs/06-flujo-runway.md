# Flujo de producción con Runway

## Qué cambia

Hasta ahora cada plano se calculaba en tiempo real con Three.js. A partir de
aquí el reparto es otro:

| | Antes | Ahora |
| --- | --- | --- |
| **Plano protagonista** | 3D procedural en tiempo real | **clip de Runway**, graduado y compuesto |
| **Perspectivas secundarias** | 3D procedural | **planchas** del motor, ligeras, graduadas para casar |
| **Reproducción** | render en vivo en 3 ventanas | **3 archivos H.264** sincronizados al reloj |
| **Audio** | síntesis WebAudio en vivo | **WAV maestro** de fuente única |
| **Luces** | cues internos | cues + **LTC SMPTE** para grandMA2 |

El motor no se tira: pasa de ser el que hace la película a ser el que hace las
capas de apoyo y el que reproduce el paquete. Eso es lo que permite que el
cambio no cueste reescribir nada.

## La regla que gobierna las tres pantallas

**No hay continuidad geométrica entre proyectores.** Un clip de IA no tiene
cámara ni espacio 3D recuperable, así que fingir que la ballena "sale" de una
pantalla y "entra" en otra sería mentira y se notaría.

Lo que sí comparten las tres es **color, luz, ritmo y densidad de movimiento**.
Esa es la continuidad real: el ojo lee las tres como el mismo lugar porque
tienen la misma temperatura, la misma profundidad de niebla y el mismo tempo,
no porque los objetos crucen de una a otra.

Reparto por pantalla:

- **MAIN (P3)** — el clip de Runway. Es el sujeto. Lleva el peso narrativo.
- **CEILING (P1)** — el océano visto **desde abajo**: cáusticas en la superficie,
  haces de luz convergiendo, siluetas a la deriva. Plancha propia del motor.
- **ENVIRONMENT (P2)** — ambiente lateral: banco de peces, plancton en
  suspensión, medusas, relieve del fondo. Plancha propia del motor.

Ninguna de las tres es una copia de otra.

---

## Prompt de Runway para la ballena protagonista

### Ajustes

| | |
| --- | --- |
| Modelo | **Gen-4** (o Gen-3 Alpha Turbo si prima el coste) |
| Relación de aspecto | **16:9** |
| Duración | **10 s** |
| Semilla | **fija y anotada** — sin ella no se puede repetir una toma que funcione |
| Movimiento de cámara | bajo. El movimiento lo lleva el animal, no la cámara |

### Prompt principal (texto a vídeo)

```
Underwater wide shot in deep open ocean. A colossal humpback whale glides
slowly from left to right across the frame, weightless and unhurried, its
full body revealed. Thick volumetric shafts of sunlight pierce the surface
far above and sweep across its back as it passes. Fine marine particles
drift through the beams. Soft caustic light ripples over its skin. The
water fades from luminous teal near the surface into deep navy blue below.
The camera drifts backward almost imperceptibly, revealing the animal's
scale. Cinematic photoreal, anamorphic 35mm, shallow depth of field,
volumetric god rays, deep teal and warm amber highlights, serene and
reverent.
```

### Variante recomendada: imagen a vídeo

Más control y menos tiradas fallidas. Genera primero un fotograma fijo con el
mismo texto, elige el que tenga la silueta y la paleta correctas, y úsalo como
primer fotograma con este prompt de movimiento:

```
The whale glides slowly left to right, body undulating gently. Sunlight
shafts sweep across its back. Particles drift. The camera drifts backward
very slowly. Nothing else moves quickly.
```

### Qué excluir

En el campo de exclusión, o repitiendo la tirada si aparece:

```
text, watermark, logo, people, divers, boats, submarines, coral reef in
foreground, dense fish swarms, fast motion, camera shake, hard cuts,
cartoon, illustration, oversaturated colors, surface view, split screen
```

### Por qué está escrito así

- **"glides slowly", "unhurried", "weightless"** — el error más común es una
  ballena que nada como un pez. La dirección pide movimientos pausados y
  creíbles.
- **"volumetric shafts of sunlight"** — es lo que casa el clip con las planchas,
  que tienen haces y cáusticas propios. Sin esto las tres pantallas no pegan.
- **"deep teal into navy"** — fija la paleta del mundo OCEAN
  (`#021E2E` → `#0A6E8C`) para que el grado posterior sea un ajuste, no un rescate.
- **"camera drifts backward almost imperceptibly"** — un poco de movimiento
  propio evita que el clip se note congelado; mucho pelea con la respiración
  2.5D que le añadimos después.
- **Sin cortes ni acción** — el plano dura 10 s y tiene un solo gesto.

### Sobre el timecode

**Runway no acierta un timecode.** No pidas que la ballena cruce el centro en el
segundo 4,67: no lo hará. El orden correcto es al revés:

1. Generas el clip.
2. Miras en qué segundo ocurre de verdad el paso.
3. Ajustas `cues[].timecode` en `shot.json` a lo que hay.
4. Vuelves a producir.

Los cues se adaptan al clip, no al contrario.

---

## Cómo se usa

### 1. Coloca el clip

```
production/ocean-test/source/whale-runway.mp4
```

El nombre lo fija `main.source` en `shot.json`. Mientras ese archivo no exista,
el productor usa un **sustituto** renderizado con el motor y lo avisa en todas
partes: en consola, en el manifiesto y en el panel. Sirve para validar el flujo
sin gastar créditos; no es el entregable.

### 2. Produce

```bash
npm run audio   production/ocean-test/shot.json   # master WAV + LTC
npm run plates  -- --shot production/ocean-test/shot.json --plate ceiling
npm run plates  -- --shot production/ocean-test/shot.json --plate environment
npm run produce production/ocean-test/shot.json   # compone y publica todo
```

El último paso además copia el paquete a `public/packages/<id>/` para que
UNIVERSO CONTROL lo encuentre.

### 3. Reproduce

Abre el panel, pestaña **Visual Engine → Paquetes de plano**, pulsa *cargar* y
luego **GO**. Cada proyector reproduce su propio archivo, el audio sale por una
sola fuente y los cues disparan en sus timecodes.

El panel muestra la **deriva de vídeo** de cada pantalla en milisegundos.
Medido en esta máquina: **entre 2 y 5 ms**, muy por debajo de un fotograma
(33 ms a 30 fps).

---

## Entregables de un plano

| Archivo | Qué es |
| --- | --- |
| `<id>-MAIN.mp4` | P3 · el clip graduado, 1280×720 H.264, sin audio |
| `<id>-CEILING.mp4` | P1 · plancha del océano desde abajo, sin audio |
| `<id>-ENVIRONMENT.mp4` | P2 · plancha de ambiente, sin audio |
| `<id>-TRIPTICO.mp4` | las tres apiladas, **con audio**, timecode y cues quemados |
| `<id>-master.wav` | música y efectos, 48 kHz estéreo |
| `<id>-ltc.wav` | **LTC SMPTE**, 48 kHz mono |
| `<id>-cues.csv` | lista de cues para dar de alta a mano |
| `<id>-cues.json` | la que consume UNIVERSO CONTROL |
| `<id>-cues-ma2.xml` | importación a grandMA2 |

Las tres pistas de proyección van **sin audio** a propósito: en sala el sonido
sale de una sola fuente. Tres reproductores con audio derivarían entre sí.

---

## Integración con grandMA2

### Vía recomendada: LTC

`<id>-ltc.wav` es timecode SMPTE lineal, 30 fps no-drop, arrancando en
`00:00:00:00`, a −6 dBFS. Se reproduce en sincronía con el master por un canal
de audio y la consola lo chasea por entrada.

Es la vía correcta porque no depende de red, no depende del ordenador de vídeo
y es lo que cualquier técnico de la consola espera encontrar.

El generador se verifica a sí mismo: tras escribir el WAV lo vuelve a decodificar
y comprueba que los frames salen bien. Si falla, el proceso devuelve error.

### Alta de los cues

`<id>-cues-ma2.xml` sigue la estructura de exportación de grandMA2.

> **No está verificado en una consola real.** Impórtalo primero en una show
> vacía y compruébalo. Si no cuadra, usa el CSV: son tres cues, se dan de alta
> a mano en dos minutos. Prefiero decírtelo a que te lo encuentres el día de la
> función.

### Cues del OCEAN TEST

| # | Timecode | Frame | Nombre | Qué hace la música | Luz |
| --- | --- | --- | --- | --- | --- |
| 1 | `00:00:01:15` | 45 | APPROACH | Entra el sub, el pad abre | `OCEAN_DEEP` `#063D56` @0.28, fade 2.5 s |
| 2 | `00:00:04:20` | 140 | WHALE PASS | Canto de ballena, floración de brillos | `CAUSTIC_SWEEP` `#7FE3FF` @0.42, fade 1.2 s, barrido |
| 3 | `00:00:07:25` | 235 | RELEASE | Resuelve una quinta abajo, cola | `OCEAN_SETTLE` `#021E2E` @0.16, fade 3 s |

---

## Para los siguientes capítulos

Un capítulo nuevo es una carpeta y un `shot.json`:

```
production/<capitulo>/
  shot.json
  source/<clip-de-runway>.mp4
  out/
```

Todo lo demás —planchas, grado, audio, cues, LTC, tríptico, publicación— sale de
los mismos comandos. Lo único que se escribe a mano por plano es el `shot.json`:
encuadres de las planchas, grado y timecodes de los cues.

> Nota: en el repositorio el opening se llama **THE FIRST LIGHT**. Si
> *THE AWAKENING* es otro capítulo o un cambio de nombre, dímelo y lo ajusto
> antes de empezarlo.

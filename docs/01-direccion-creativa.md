# UNIVERSO 1/1 — Dirección creativa

> Un universo único creado para una sola persona.

## 1. Tesis visual

La experiencia sostiene **una sola idea**: una chispa de luz nace en la nada, y todo
lo que vemos después —la vegetación, el océano, el cielo, la galaxia— es consecuencia
de esa chispa. No hay escenas; hay **un solo viaje continuo**. La estrella es el
personaje. Nosotros somos la cámara.

Tres reglas que no se rompen:

1. **Nada aparece, todo nace.** Ningún elemento entra por corte o fade. Cada
   elemento es traído por algo anterior: una onda, una raíz, una burbuja, una
   partícula. Si no se puede justificar de dónde viene, no entra.
2. **La luz cuenta la historia, el color cuenta la emoción.** La dramaturgia se
   escribe con temperatura e intensidad, no con texto. El texto aparece dos veces
   en 5 minutos.
3. **Contención.** Un gesto grande por escena, y silencio visual alrededor. El
   asombro viene del contraste, no de la acumulación. Sin corazones, sin brillos
   rosas, sin tipografía decorativa.

## 2. Referencias de lenguaje

| Eje | Referencia de trabajo | Qué tomamos |
| --- | --- | --- |
| Escala y silencio | *Arrival*, *Blade Runner 2049* | planos largos, aire alrededor del sujeto, niebla volumétrica |
| Naturaleza viva | *Planet Earth* macro, teamLab *Borderless* | crecimiento orgánico, reacción al observador |
| Océano | *Avatar: The Way of Water* | luz filtrada, escala de la ballena, calma |
| Cosmos | *Cosmos* (planetario), *Interstellar* | nebulosa como neblina de color, no como textura |
| Red Room | *In the Mood for Love*, *Suspiria* (1977) | rojo como material, no como filtro; sombra y terciopelo |
| Tipografía | Suiza, editorial | una sola familia, peso ligero, tracking amplio, nunca centrada en exceso |

**Realismo mágico cinematográfico**: el mundo es físicamente creíble (luz, escala,
inercia) y una sola cosa en él es imposible (la estrella, los recuerdos que crecen).

## 3. Paleta maestra

Cada mundo tiene identidad propia, pero todos comparten el **ámbar de la estrella**
(`#FFD9A0`) como hilo conductor. Ese ámbar es "ella": aparece en cada mundo, aunque
sea en una luciérnaga o en el borde de una nube.

### Hilo conductor
| Rol | Hex | Uso |
| --- | --- | --- |
| Starlight (ámbar) | `#FFD9A0` | núcleo de la estrella, luciérnagas, bordes de nube, reflejos |
| Starlight core | `#FFF6E0` | sobreexposición del núcleo, destellos |
| Deep void | `#05070D` | negro base de todo el show (nunca `#000` puro salvo blackout) |

### VOID — nacimiento
`#05070D` base · `#0B1020` bruma · `#9FD8FF` frío lejano · `#FFF6E0` punto de luz

### GARDEN — jardín mágico
`#07150F` tierra · `#2F6B4F` follaje medio · `#7FC79A` follaje iluminado ·
`#A8E6A1` brote nuevo · `#F2B6C6` flor (uso < 5% del encuadre) · `#FFD98A` sol entre hojas

### OCEAN — océano profundo
`#021E2E` abismo · `#063D56` medio · `#0A6E8C` superficie · `#7FE3FF` cáusticas ·
`#6AFFD8` bioluminiscencia (uso puntual) · `#E8F7FF` rayos de luz

### SKY — cielo infinito
`#FFB27A` amanecer · `#FFD9A0` dorado · `#6FB4E8` día · `#2A3B6B` azul tarde ·
`#141B33` noche entrando · `#E6EEF8` nube iluminada

### COSMOS — universo
`#06060F` espacio · `#2B1B4D` nebulosa fría · `#B06BFF` nebulosa magenta ·
`#5FD8FF` nebulosa cian · `#FFE9B0` estrellas · `#1A0F2E` polvo oscuro

### RED ROOM — elegante, no vulgar
`#0A0507` negro cálido · `#2B060D` sombra vino · `#4A0D16` rojo vino ·
`#8E1226` carmesí · `#C9435A` realce terciopelo (uso < 8%) · `#D98B3A` ámbar práctico

> **Regla anti-antro:** saturación máxima 0.75, sin magentas puros, sin cian, sin
> estrobo. El rojo se ilumina *indirectamente*: lo que vemos son sombras sobre
> terciopelo, no un plano rojo plano. Movimiento de cámara ≤ 0.04 rad/s.

## 4. Lenguaje de cámara

- **Lente**: 35 mm equivalente para mundos (FOV 42°), 50 mm (FOV 32°) para recuerdos,
  24 mm (FOV 58°) para cosmos y techo.
- **Velocidad**: traslación ≤ 1.6 m/s en interiores, ≤ 6 m/s en océano/cosmos.
  Rotación ≤ 0.08 rad/s. Nunca aceleración instantánea: todo movimiento entra y
  sale con `easeInOutCubic` mínimo 1.2 s.
- **Gramática**: *dolly in* para intimidad, *slow orbit* para revelar escala,
  *tracking* para seguir un ser vivo (estrella, mariposa, ballena), *dolly out*
  para cerrar un capítulo.
- **Anti-mareo**: sin roll salvo en el cosmos (≤ 3°), sin shake, horizonte estable
  en todo mundo con suelo, y un plano "de respiro" (cámara casi quieta ≥ 4 s)
  cada 45 s.
- **Rack focus**: simulado por *bokeh* de partículas + atenuación de nitidez por
  distancia (DOF barato), no por post-proceso costoso.

## 5. Dramaturgia de luz (cómo se siente la sala)

| Momento | Sala | Hue | Escénico |
| --- | --- | --- | --- |
| Oscuridad | negro total, silencio | apagado | apagado |
| Estrella | un solo acento frío que cruza | barrido L→R, 6% | apagado |
| Nacimiento | verde bajo creciente | 20% verde cálido | PAR 1-2 ámbar 10% |
| Recuerdos | ámbar cálido, cómodo | 35% `#FFD98A` | PAR ámbar 25% |
| Océano | azul envolvente, frío | 30% `#0A6E8C` | PAR azul 20% |
| Cielo | dorado → azul noche | rampa 40%→15% | PAR ámbar → apagado |
| Cosmos | casi oscuro, magenta lejano | 12% `#B06BFF` | apagado |
| Revelación | ámbar cálido pleno | 60% `#FFD9A0` | PAR ámbar 45% |

Los **Flasher 200 quedan fuera de la reproducción automática**. Sin estrobo por
defecto. La haze es *opcional*: los visuales deben leerse sin ella (por eso la
niebla es volumétrica *en pantalla*).

## 6. Sonido (criterio, no ejecución)

- Pad sostenido continuo como columna (nunca silencio total después del segundo 8).
- Un instrumento "ella": piano con mucho reverb, entra con el primer recuerdo.
- Capas ambientales por mundo (hojas/viento, agua/presión, aire/altura, vacío/sub-bass).
- El clímax es el único momento con rango dinámico completo; todo lo anterior vive
  entre -24 y -14 LUFS para que el final golpee.
- **Sin dependencia de internet**: todo audio es local y sustituible.

## 7. Qué NO es este proyecto

- No es una presentación, ni una landing, ni un sitio comercial.
- No es un bucle de video duplicado en tres pantallas.
- No es "romántico" por acumulación de símbolos. Es romántico por atención al detalle.
- No usa modelos 3D pesados para fingir realismo: usa **luz, partículas, niebla y
  silueta**, con ganchos declarados para los GLB que lleguen después.

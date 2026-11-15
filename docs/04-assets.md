# Assets: qué existe hoy y qué hay que producir

## Principio

El motor **funciona completo hoy**, sin un solo asset externo. Todo lo que
normalmente requeriría modelos o texturas comprados está resuelto con geometría
y shaders procedurales. Los assets externos **mejoran** el resultado; no lo
desbloquean. Nada queda a medias esperando un archivo.

Cuando un asset llega, se coloca en su ruta y el motor lo usa **sin tocar código
de escena**.

## 1. Fotografías (lo único que necesito de ti pronto)

| Qué | Dónde | Cómo |
| --- | --- | --- |
| Fotos reales | `/public/assets/memories/` | Cualquier nombre; JPG o PNG |
| Registro | `src/config/memories.js` | Cambiar `src`, poner `placeholder: false` |

- **Cualquier relación de aspecto sirve.** El motor lee la proporción real al
  cargar y dimensiona el plano para que encaje preservándola. Los marcos se
  adaptan a la foto, nunca al revés. Cero deformación de rostros, cero recorte.
- Los 6 placeholders actuales tienen a propósito proporciones distintas
  (3:2, 3:4, 1:1, 16:9, 4:5, 4:3) precisamente para comprobarlo.
- Resolución recomendada: lado largo 2000–3000 px. Por encima no se nota en
  proyección y cuesta memoria.
- Para añadir más de 6: duplicar una entrada en `MEMORIES` con nuevo `id`,
  `position`, `animation` y `order`.

Regenerar los placeholders: `npm run placeholders`.

## 2. Audio

| Capa | Archivo esperado | Estado hoy |
| --- | --- | --- |
| `pad` | `/public/assets/audio/pad.ogg\|mp3\|wav` | sintetizado |
| `strings` | `strings.*` | sintetizado |
| `piano` | `piano.*` | sintetizado |
| `sparkle` | `sparkle.*` | sintetizado |
| `forest` | `forest.*` | sintetizado |
| `ocean` | `ocean.*` | sintetizado |
| `wind` | `wind.*` | sintetizado |
| `space` | `space.*` | sintetizado |
| `impact` | `impact.*` | sintetizado |
| `whoosh` | `whoosh.*` | sintetizado |
| `water` | `water.*` | sintetizado |
| `whale` | `whale.*` | sintetizado |
| `plane` | `plane.*` | sintetizado |
| `climax` | `climax.*` | sintetizado |

Basta con copiar el archivo con el nombre de la capa: el motor lo detecta al
arrancar y deja de sintetizar esa capa. El panel muestra cuáles usan archivo.

**Licencia**: usar música propia o con licencia comercial explícita. No hay
descarga automática ni dependencia de internet en reproducción.

## 3. Modelos 3D (GLB/GLTF) — opcionales

Manifiesto en `src/core/assets.js`. Ruta: `/public/assets/models/<nombre>.glb`.

| Clave | Archivo | Hoy | Nota de producción |
| --- | --- | --- | --- |
| `whale` | `whale.glb` | procedural | Jorobada. Si trae clip "swim" se usa automáticamente. ≤ 25k tris. |
| `dolphin` | `dolphin.glb` | procedural | ≤ 8k tris |
| `turtle` | `turtle.glb` | procedural | ≤ 8k tris |
| `fish` | `fish.glb` | procedural | Para instanciado: **≤ 800 tris**, sin rig |
| `jellyfish` | `jellyfish.glb` | procedural | Translúcida |
| `plane` | `plane.glb` | procedural | Comercial, en silueta. ≤ 12k tris |
| `ship` | `ship.glb` | procedural | Nave; se lee en silueta contra nebulosa |
| `bird` | `bird.glb` | procedural | Para bandadas: ≤ 400 tris |
| `butterfly` | `butterfly.glb` | procedural | Alas separadas si se quiere aleteo propio |
| `tree` | `tree.glb` | procedural | Árbol grande. ≤ 30k tris |
| `fern` | `fern.glb` | procedural | Sotobosque instanciado. ≤ 1k tris |
| `coral` | `coral.glb` | procedural | ≤ 5k tris |
| `planet` | `planet.glb` | procedural | Esfera + anillo |

**Formato**: glTF 2.0 binario (`.glb`), ejes Y-up, escala en **metros**, origen en
la base del objeto (o en el centro para los que nadan/vuelan), materiales PBR
con texturas embebidas ≤ 2048 px.

El panel (pestaña Media Manager) lista en vivo cuáles están presentes y cuáles
siguen en modo procedural.

## 4. Vídeos ambientales — opcionales

`/public/assets/videos/`. Todavía no hay ninguno conectado al motor; la estructura
de carpetas y la entrada `PERSONAL_VIDEOS` en `memories.js` están preparadas
(`type: 'video'`). Formato recomendado: MP4 H.264, 1920×1080, sin audio.

## 5. Lo que NO hace falta producir

Resuelto proceduralmente y sin plan de reemplazo:

- Estrellas, nebulosas, polvo cósmico, estela de la estrella fugaz.
- Nubes volumétricas, auroras, lluvia de meteoritos.
- Cáusticas submarinas, rayos de luz, plancton en suspensión.
- Vegetación que crece, dosel, raíces de luz, luciérnagas.
- Terciopelo del Red Room, pliegues, polvo iluminado.
- Agua (lago y superficie oceánica), reflejo de galaxias.
- Marcos orgánicos de los recuerdos.
- Tipografía del título (se forma con partículas).

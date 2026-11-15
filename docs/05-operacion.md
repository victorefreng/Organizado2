# Guía de operación

## Arranque

```bash
npm install          # genera también los placeholders
npm run dev          # desarrollo, http://127.0.0.1:5173
# o, para la función real:
npm run build && npm run preview     # http://127.0.0.1:4173
```

## Montaje en Windows con 3 proyectores

1. Conecta los tres proyectores como pantallas extendidas (no duplicadas).
2. Abre el panel en el monitor del operador.
3. Pulsa **Abrir las 3**. Se abren tres ventanas.
4. Arrastra cada ventana a su proyector. El título de la ventana dice cuál es.
5. En cada una, pulsa **F** para pantalla completa.
6. Pulsa **I** (o el botón *Prueba de imagen* del panel) para verificar que cada
   proyector muestra la rejilla y el nombre correctos.
7. Ajusta en **Projector Manager**: resolución, yaw/pitch, offset, brillo, gamma
   y keystone de cada salida. Los cambios se aplican en vivo.

> El navegador debe permitir ventanas emergentes para este sitio.

## Reproducir el opening

| Acción | Botón | Atajo |
| --- | --- | --- |
| Arrancar / continuar | GO | `Espacio` |
| Pausar (el ambiente sigue vivo) | HOLD | `H` |
| Escena anterior / reiniciar la actual | BACK | `B` |
| Cue anterior / siguiente | ◂ Cue / Cue ▸ | `←` `→` |
| Reiniciar escena | Reiniciar escena | `R` |
| Fundido a negro | Fade a negro | — |
| Negro inmediato | Blackout | — |
| **Parada de emergencia** | ■ | `Esc` |

- Clic en la línea de tiempo para ir a cualquier punto.
- Doble clic en una escena para saltar a su inicio.
- El audio arranca con el primer GO (política de autoplay del navegador).

## Mundos de biblioteca

Pestaña **Visual Engine** → *Biblioteca de mundos*. Elige la variante en el
desplegable y pulsa *activar*. El reloj narrativo se pausa y el mundo corre en
bucle. Para volver, **Opening · THE FIRST LIGHT**.

**THE RED ROOM** es independiente y opcional: nunca se activa solo. Sus cuatro
intensidades (Romantic / Intimate / Cinematic / Custom) y el control fino de
tono, saturación, brillo, velocidad, pliegues y polvo aparecen al activarlo.

## Interacción

- Mover el cursor sobre una salida genera parallax sutil.
- Clic sobre un recuerdo: la cámara se acerca a él.
- Clic sobre el suelo del jardín: riega esa zona y las plantas crecen más rápido.
- *Pausas interactivas* (casilla en Show Control): el reloj narrativo se detiene
  en los puntos marcados y espera. El ambiente **no** se congela.

## Iluminación

El panel muestra el estado **virtual** de las 5 luminarias Hue y los 7 equipos
DMX. **Ningún dispositivo físico está conectado todavía**: los adaptadores
(`src/core/adapters/`) están declarados con su interfaz y lanzan error a
propósito hasta que se valide la integración real.

Por defecto: sin estrobo, Flasher 200 excluidos de la reproducción automática,
láseres fuera de alcance. La haze es opcional.

## Rendimiento

Presets en *Visual Engine → Calidad*. El presupuesto se reparte por superficie
(STORY 50%, ENVIRONMENT 30%, CEILING 20%). Si el equipo no da, baja a `balanced`
o `low`; el panel muestra fps, draw calls, triángulos y deriva de cada salida.

Una deriva por encima de 80 ms indica que una ventana va perdiendo sincronía:
normalmente es falta de GPU, no del reloj.

import React from 'react';
import { Composition } from 'remotion';
import { OceanMain, OceanCeiling, OceanSide } from './worlds/Ocean.jsx';
import { CloudsMain, CloudsCeiling, CloudsSide } from './worlds/Clouds.jsx';
import { JungleMain, JungleCeiling, JungleSide } from './worlds/Jungle.jsx';
import { GalaxyMain, GalaxyCeiling, GalaxySide } from './worlds/Galaxy.jsx';
import { RedRoomMain, RedRoomCeiling, RedRoomSide } from './worlds/RedRoom.jsx';
import { PruebaCompositing } from './PruebaCompositing.jsx';
import { Transicion } from './Transicion.jsx';

const FPS = 30;

/**
 * Duraciones distintas por pantalla y por mundo (Brief §5.6): el conjunto de
 * las tres pantallas no vuelve a coincidir nunca. Al ser bucles perfectos por
 * construcción, la duración es libre.
 */
const MUNDOS = [
  { id: 'OCEAN',   comps: [OceanMain, OceanCeiling, OceanSide],       dur: [120, 140, 160] },
  { id: 'CLOUDS',  comps: [CloudsMain, CloudsCeiling, CloudsSide],    dur: [130, 150, 170] },
  { id: 'JUNGLE',  comps: [JungleMain, JungleCeiling, JungleSide],    dur: [125, 145, 165] },
  { id: 'GALAXY',  comps: [GalaxyMain, GalaxyCeiling, GalaxySide],    dur: [135, 155, 175] },
  { id: 'REDROOM', comps: [RedRoomMain, RedRoomCeiling, RedRoomSide], dur: [120, 140, 160] }
];
const PANTALLAS = ['MAIN', 'CEILING', 'SIDE'];

/**
 * TR-001 … TR-005 · una transición por mundo de destino.
 * 10 s. El sentido del cruce cambia por pantalla para que las tres no hagan
 * exactamente lo mismo: el brief prohíbe exigir coincidencia de fotograma.
 */
const TRANSICIONES = [
  { tr: 'TR-001', mundo: 'CLOUDS' },
  { tr: 'TR-002', mundo: 'OCEAN' },
  { tr: 'TR-003', mundo: 'JUNGLE' },
  { tr: 'TR-004', mundo: 'GALAXY' },
  { tr: 'TR-005', mundo: 'REDROOM' }
];
const SENTIDOS = ['horizontal', 'vertical', 'horizontal'];

/**
 * Remotion serializa los defaultProps, así que un componente no sobrevive como
 * prop. Se envuelve: cada transición es su propio componente con el mundo de
 * destino ya resuelto dentro.
 */
const envolverTransicion = (Destino, sentido, seed) => {
  const C = () => <Transicion Destino={Destino} sentido={sentido} seed={seed} />;
  C.displayName = `Transicion(${seed})`;
  return C;
};

export const RemotionRoot = () => (
  <>
    {MUNDOS.flatMap((m) =>
      m.comps.map((Comp, i) => (
        <Composition
          key={`${m.id}-${PANTALLAS[i]}`}
          id={`${m.id}-${PANTALLAS[i]}`}
          component={Comp}
          durationInFrames={m.dur[i] * FPS}
          fps={FPS}
          width={1280}
          height={720}
          defaultProps={{}}
        />
      ))
    )}
    {TRANSICIONES.flatMap(({ tr, mundo }) => {
      const m = MUNDOS.find((x) => x.id === mundo);
      return m.comps.map((Comp, i) => (
        <Composition
          key={`${tr}-${PANTALLAS[i]}`}
          id={`${tr}-${PANTALLAS[i]}`}
          component={envolverTransicion(Comp, SENTIDOS[i], `${tr}-${i}`)}
          durationInFrames={10 * FPS}
          fps={FPS}
          width={1280}
          height={720}
        />
      ));
    })}

    <Composition id="PruebaCompositing" component={PruebaCompositing}
      durationInFrames={300} fps={FPS} width={1280} height={720}
      defaultProps={{ titulo: 'UNIVERSO 1/1', mensaje: 'Celebrando tu vida, Arantza' }} />
  </>
);

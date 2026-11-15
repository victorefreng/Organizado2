import React from 'react';
import { Composition } from 'remotion';
import { OceanMain, OceanCeiling, OceanSide } from './worlds/Ocean.jsx';
import { CloudsMain, CloudsCeiling, CloudsSide } from './worlds/Clouds.jsx';
import { JungleMain, JungleCeiling, JungleSide } from './worlds/Jungle.jsx';
import { GalaxyMain, GalaxyCeiling, GalaxySide } from './worlds/Galaxy.jsx';
import { RedRoomMain, RedRoomCeiling, RedRoomSide } from './worlds/RedRoom.jsx';
import { PruebaCompositing } from './PruebaCompositing.jsx';

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
    <Composition id="PruebaCompositing" component={PruebaCompositing}
      durationInFrames={300} fps={FPS} width={1280} height={720}
      defaultProps={{ titulo: 'UNIVERSO 1/1', mensaje: 'Celebrando tu vida, Arantza' }} />
  </>
);

/**
 * OpenMontage atelier entry for the homepage hero film.
 *
 * Two compositions off one scene: a landscape loop for the hero backdrop, and
 * a single high-resolution still used as the poster (and as what reduced-motion
 * and phone visitors see instead of the video).
 */

import { Composition, registerRoot } from "remotion";
import { HeroFilm } from "./Hero";

export const FPS = 30;
/** 10s: long enough not to read as a GIF, short enough to stay ~2MB. */
export const SECONDS = 10;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="HeroLoop"
      component={HeroFilm}
      durationInFrames={FPS * SECONDS}
      fps={FPS}
      width={1280}
      height={720}
    />
    <Composition
      id="HeroStill"
      component={HeroFilm}
      durationInFrames={1}
      fps={FPS}
      width={1280}
      height={720}
    />
  </>
);

registerRoot(RemotionRoot);

/**
 * OpenMontage atelier entry (edit_decisions.render_runtime = "remotion",
 * composition_mode = "atelier") for the genai-data-platform scroll world.
 *
 * Two compositions, one scene graph: the landscape master and a natively
 * portrait cut. The portrait version is a *real* 9:16 render — a wider lens on
 * the same flight, not a centre-crop — which is free here because rendering is
 * local and deterministic rather than metered per generation.
 */

import { Composition, registerRoot } from "remotion";
import { World } from "./World";

/** 6 stations × 5s. Frame 0 of leg i+1 is frame N+1 of leg i — one take. */
export const FPS = 30;
export const SECTION_SECONDS = 5;
export const SECTIONS = 6;
export const TOTAL_FRAMES = FPS * SECTION_SECONDS * SECTIONS;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PlatformWorld"
        component={World}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1280}
        height={720}
        defaultProps={{ portrait: false }}
      />
      <Composition
        id="PlatformWorldPortrait"
        component={World}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={720}
        height={1280}
        defaultProps={{ portrait: true }}
      />
    </>
  );
};

registerRoot(RemotionRoot);

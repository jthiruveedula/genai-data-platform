/**
 * OpenMontage atelier entry for the query-cost film.
 *
 * Rendered through `tools/video/video_compose.py` with
 * `render_runtime: "remotion"`, `composition_mode: "atelier"` — see
 * `render.sh` in this directory, which stages the site's own cost model and
 * pricing data next to this file first, so the film is built from exactly what
 * the site publishes.
 */

import { Composition, registerRoot } from "remotion";
import { QueryCostFilm } from "./Film";

export const FPS = 30;
export const SECONDS = 24;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="QueryCostFilm"
      component={QueryCostFilm}
      durationInFrames={FPS * SECONDS}
      fps={FPS}
      width={1600}
      height={900}
      defaultProps={{ cloud: "gcp" as const }}
    />
    {/* A phone cut of the same beats — same model, taller frame. */}
    <Composition
      id="QueryCostFilmPortrait"
      component={QueryCostFilm}
      durationInFrames={FPS * SECONDS}
      fps={FPS}
      width={900}
      height={1200}
      defaultProps={{ cloud: "gcp" as const }}
    />
  </>
);

registerRoot(RemotionRoot);

"""Render the scroll world through OpenMontage's own tool layer.

Run from an OpenMontage checkout (its `video_compose` tool is what dispatches
the render), with this repo's composition staged into its composer:

    cd /path/to/OpenMontage
    PYTHONPATH=$PWD .venv/bin/python \
      /path/to/genai-data-platform/tools/scroll-world/render-via-openmontage.py \
      /tmp/scroll-world/world.mp4

Requires `remotion-composer/remotion.config.ts` to set
`Config.setChromiumOpenGlRenderer("angle")` — the atelier path builds its own
`npx remotion render` argv and has no `--gl` passthrough, so a WebGL
composition otherwise fails with "Error creating WebGL context".

This renders the whole 30s flight as one file. `encode-legs.sh` is what cuts it
into the six per-section legs the page actually ships; for that, render the PNG
sequence per README.md instead.
"""

import json
import sys

from tools.video.video_compose import VideoCompose

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/scroll-world/world.mp4"

inputs = {
    "operation": "render",
    "output_path": OUT,
    # render_runtime is refused if unset — OpenMontage forbids silent runtime
    # swaps, so the choice has to be explicit here rather than defaulted.
    "edit_decisions": {
        "render_runtime": "remotion",
        "composition_mode": "atelier",
        "renderer_family": "bespoke",
        "bespoke": {
            "entry": "remotion-composer/projects/genai-platform-world/index.tsx",
            "composition_id": "PlatformWorld",
            "crf": 26,
        },
    },
    "asset_manifest": {"assets": []},
}

result = VideoCompose().execute(inputs)
print("SUCCESS:", result.success)
print("ERROR:", result.error)
print("OUTPUT:", json.dumps(getattr(result, "output", None), default=str)[:600])
sys.exit(0 if result.success else 1)

#!/bin/bash
# Render the homepage hero loop through OpenMontage's tool layer.
#
# Usage:  bash render.sh /path/to/OpenMontage [out-dir]
#
# Output: a 10s seamless loop and a poster still. The loop is periodic by
# construction (see Hero.tsx), so it needs no crossfade to hide a seam.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
OM="${1:?usage: render.sh <OpenMontage checkout> [out-dir]}"
OUT="${2:-$REPO/site/public/hero}"

PROJECT="$OM/remotion-composer/projects/hero-film"
mkdir -p "$PROJECT" "$OUT"
cp "$HERE/index.tsx" "$HERE/Hero.tsx" "$PROJECT/"
echo "==> staged composition into $PROJECT"

render() {
  local comp="$1" file="$2"
  PYTHONPATH="$OM" "$OM/.venv/bin/python" - "$comp" "$OUT/$file" <<'PY'
import sys
from tools.video.video_compose import VideoCompose

comp_id, out_path = sys.argv[1], sys.argv[2]
result = VideoCompose().execute({
    "operation": "render",
    "output_path": out_path,
    "edit_decisions": {
        "render_runtime": "remotion",
        "composition_mode": "atelier",
        "renderer_family": "bespoke",
        "bespoke": {
            "entry": "remotion-composer/projects/hero-film/index.tsx",
            "composition_id": comp_id,
            "crf": 27,
        },
    },
    "asset_manifest": {"assets": []},
})
print(f"{comp_id}: success={result.success} error={result.error}")
sys.exit(0 if result.success else 1)
PY
}

render HeroLoop hero-loop.mp4
rm -rf "$OUT/.final_review_frames"

# A backdrop sitting behind copy does not need a master-quality encode: crf 30
# with -tune animation halves the file with no visible difference at the size
# and opacity it is actually shown at (3.0MB -> 1.4MB).
ffmpeg -y -loglevel error -i "$OUT/hero-loop.mp4" -an \
  -c:v libx264 -preset veryslow -tune animation -crf 30 -pix_fmt yuv420p \
  -g 48 -movflags +faststart "$OUT/hero-loop.opt.mp4"
mv "$OUT/hero-loop.opt.mp4" "$OUT/hero-loop.mp4"

# The poster is frame 0 of the loop itself, so the handover from image to video
# is invisible — a separately rendered still could drift by a pixel.
# 960 wide, not 1280: this is the hero's LCP element, it sits behind copy at
# cover-fit, and the larger poster measurably pushed LCP out (3.2s -> see PR).
ffmpeg -y -loglevel error -i "$OUT/hero-loop.mp4" -frames:v 1 -vf scale=960:-2 -q:v 6 "$OUT/hero-poster.jpg"

ls -la "$OUT"
du -sh "$OUT"

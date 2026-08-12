#!/bin/bash
# Render the query-cost film through OpenMontage's tool layer.
#
# Usage:  bash render.sh /path/to/OpenMontage [out-dir]
#
# The film must never quote a number the site doesn't. Rather than keeping a
# second copy of the cost model, this stages the SITE'S `queryCost.ts` and
# `pricing.json` next to the composition before rendering — so a re-verified
# price reaches the film by re-rendering, and by nothing else.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
OM="${1:?usage: render.sh <OpenMontage checkout> [out-dir]}"
OUT="${2:-$REPO/site/public/film}"

PROJECT="$OM/remotion-composer/projects/query-cost-film"
mkdir -p "$PROJECT" "$OUT"

# The composition, plus the site's model and data it imports.
cp "$HERE/index.tsx" "$HERE/Film.tsx" "$PROJECT/"
cp "$REPO/site/src/lib/queryCost.ts" "$PROJECT/queryCost.ts"
mkdir -p "$PROJECT/../data"
cp "$REPO/site/src/data/pricing.json" "$PROJECT/pricing.json"
# queryCost.ts imports "../data/pricing.json"; keep that path valid in the
# staged copy without editing the file the site actually ships.
mkdir -p "$PROJECT/../data" && cp "$REPO/site/src/data/pricing.json" "$PROJECT/../data/pricing.json"

echo "==> staged composition + site model into $PROJECT"

# Render both cuts through OpenMontage's video_compose (atelier path). Its
# governance refuses to run without an explicit render_runtime, which is why
# the payload sets one rather than relying on a default.
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
            "entry": "remotion-composer/projects/query-cost-film/index.tsx",
            "composition_id": comp_id,
            "crf": 24,
        },
    },
    "asset_manifest": {"assets": []},
})
print(f"{comp_id}: success={result.success} error={result.error}")
sys.exit(0 if result.success else 1)
PY
}

render QueryCostFilm query-cost.mp4
render QueryCostFilmPortrait query-cost-portrait.mp4

# OpenMontage writes its own review frames beside the output; useful when
# reviewing a render, not something to publish to a website.
rm -rf "$OUT/.final_review_frames"

# A poster for each, so the page never shows an empty video box.
for f in query-cost query-cost-portrait; do
  ffmpeg -y -loglevel error -ss 12 -i "$OUT/$f.mp4" -frames:v 1 -q:v 4 "$OUT/$f.jpg"
done

du -sh "$OUT"
ls -la "$OUT"

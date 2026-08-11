#!/bin/bash
# Slice the one continuous render into the six per-section legs that
# `site/public/world/` ships. The cut points are exact frame indices, so leg
# i's last frame and leg i+1's first frame are adjacent frames of the same
# take — the seam is continuity, not a match between two generations.
#
# Usage:  bash encode-legs.sh <work-dir> [out-dir]
#   <work-dir> holds frames-desktop/ and (optionally) frames-mobile/, as
#   written by `npx remotion render … --sequence` (see README.md).
#   [out-dir] defaults to <work-dir>/out.
#
# The encode profile was measured on this footage rather than copied from a
# default: it is hairline vector art on near-white, so `-tune animation` is
# worth ~40%, the bitrate is dominated by keyframes rather than by CRF (crf 23
# and crf 26 produced byte-identical files at GOP 8), and moving GOP 8 → 16
# saved ~25% with no visible cost to desktop seek latency.
set -euo pipefail

WORK="${1:?usage: encode-legs.sh <work-dir> [out-dir]}"
OUT="${2:-$WORK/out}"
IDS=(01-sources 02-ingest 03-embed 04-index 05-reason 06-answer)
FRAMES=150

mkdir -p "$OUT"
rm -f "$OUT/"*.mp4 "$OUT/"*.jpg

for i in "${!IDS[@]}"; do
  id="${IDS[$i]}"
  start=$((i * FRAMES))
  padded=$(printf %03d "$start")

  # Desktop master: native 1280x720, GOP 16.
  ffmpeg -y -loglevel error -framerate 30 -start_number "$start" \
    -i "$WORK/frames-desktop/element-%03d.png" -frames:v "$FRAMES" -an \
    -c:v libx264 -preset veryslow -tune animation -crf 26 -pix_fmt yuv420p \
    -g 16 -keyint_min 16 -sc_threshold 0 -movflags +faststart \
    "$OUT/$id.mp4"

  # Phone encode: natively portrait (not a centre-crop of the landscape film),
  # 540 wide, GOP 8 — seek cost on a phone decoder scales with distance from
  # the last keyframe, so phones buy keyframes with file size, not the reverse.
  if [ -d "$WORK/frames-mobile" ]; then
    ffmpeg -y -loglevel error -framerate 30 -start_number "$start" \
      -i "$WORK/frames-mobile/element-%03d.png" -frames:v "$FRAMES" -an \
      -vf scale=540:-2 \
      -c:v libx264 -preset veryslow -tune animation -crf 27 -pix_fmt yuv420p \
      -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart \
      "$OUT/$id-m.mp4"
    ffmpeg -y -loglevel error -i "$WORK/frames-mobile/element-$padded.png" \
      -vf scale=540:-2 -q:v 5 "$OUT/$id-m.jpg"
  fi

  # Posters double as the reduced-motion, no-JS and pre-decode fallback, so
  # each one is its own clip's first frame — never a separate render that
  # could drift from the video it stands in for.
  ffmpeg -y -loglevel error -i "$WORK/frames-desktop/element-$padded.png" \
    -q:v 5 "$OUT/$id.jpg"
done

du -sh "$OUT"

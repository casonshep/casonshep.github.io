#!/usr/bin/env bash
# Bake a boomerang (forward + reversed) version of each given clip:
#   ./scripts/make-boomerang.sh public/media/cow.mp4 [...more files]
# Writes <name>-bounce.mp4 next to each input; originals are untouched.
# Then list the -bounce files in BACKDROP.videoSources (visualConfig.ts).
set -euo pipefail

for src in "$@"; do
  out="${src%.*}-bounce.mp4"
  echo "→ $src  →  $out"
  ffmpeg -y -hide_banner -loglevel error -i "$src" \
    -filter_complex "[0:v]split[fwd][tmp];[tmp]reverse[rev];[fwd][rev]concat=n=2:v=1[v]" \
    -map "[v]" -an -c:v libx264 -crf 20 -preset medium \
    -pix_fmt yuv420p -movflags +faststart "$out"
done
echo "done."

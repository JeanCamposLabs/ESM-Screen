#!/usr/bin/env sh
# Download every background from the ESM-Screen site into ./slides/ (about 38 MB),
# plus backgrounds.json rewritten for a local layout — so a project can host the
# images itself instead of hot-linking them.
#
#   sh fetch-slides.sh            # → ./slides/*.jpg + ./backgrounds.json
#   sh fetch-slides.sh /some/dir  # → /some/dir/slides + /some/dir/backgrounds.json
set -e
BASE="https://jeancamposlabs.github.io/ESM-Screen/"
OUT="${1:-.}"
mkdir -p "$OUT/slides"
curl -fsSL "${BASE}assets/backgrounds.json?t=$(date +%s)" -o "$OUT/manifest.tmp.json"
# "assets/slides/NN-name.jpg" → download to slides/NN-name.jpg
tr -d '[]" \n' < "$OUT/manifest.tmp.json" | tr ',' '\n' | while read -r p; do
  [ -n "$p" ] || continue
  f="$(basename "$p")"
  if [ ! -s "$OUT/slides/$f" ]; then
    printf '%s\n' "$f"
    curl -fsSL "${BASE}${p}" -o "$OUT/slides/$f"
  fi
done
# local manifest: one entry per file, sorted like the site
printf '[\n' > "$OUT/backgrounds.json"
first=1
for f in $(ls "$OUT/slides" | sort); do
  case "$f" in *.jpg|*.jpeg|*.png|*.webp) ;; *) continue ;; esac
  [ $first -eq 1 ] || printf ',\n' >> "$OUT/backgrounds.json"
  printf '  "slides/%s"' "$f" >> "$OUT/backgrounds.json"
  first=0
done
printf '\n]\n' >> "$OUT/backgrounds.json"
rm -f "$OUT/manifest.tmp.json"
echo "done: $(ls "$OUT/slides" | wc -l | tr -d ' ') images in $OUT/slides, manifest at $OUT/backgrounds.json"

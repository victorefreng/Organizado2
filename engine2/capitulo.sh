#!/usr/bin/env bash
# Renderiza las tres pantallas de un capítulo a la vez.
#   bash engine2/capitulo.sh SH-001
set -u
cd "$(dirname "$0")/.."
ID="$1"
mkdir -p "dist/packages/$ID"
for s in main ceiling side; do node engine2/render-show.mjs "$ID" "$s" > "dist/packages/$ID/.render-$s.log" 2>&1 & done
wait
tail -q -n 1 dist/packages/$ID/.render-*.log; rm -f dist/packages/$ID/.render-*.log

#!/usr/bin/env bash
# Renderiza las tres pantallas de una transición y arma el paquete.
#   bash engine2/transicion.sh TR-002
set -u
cd "$(dirname "$0")/.."
ID="$1"
mkdir -p "dist/packages/$ID"
for s in main ceiling side; do node engine2/render-tr.mjs "$ID" "$s" > "dist/packages/$ID/.render-$s.log" 2>&1 & done
wait
tail -q -n 1 dist/packages/$ID/.render-*.log; rm -f dist/packages/$ID/.render-*.log
node tools/build-cinematic-package.mjs "$ID" 2>&1 | tail -22

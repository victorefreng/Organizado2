#!/usr/bin/env bash
# Renderiza las tres pantallas de un mundo a la vez y arma el paquete.
#   bash engine2/mundo.sh OCEAN AMBIENT-002
set -u
cd "$(dirname "$0")/.."
W="$1"; ID="$2"
mkdir -p "dist/packages/$ID"
for s in main ceiling side; do
  node engine2/render.mjs "$W" "$s" > "dist/packages/$ID/.render-$s.log" 2>&1 &
done
wait
tail -q -n 1 dist/packages/$ID/.render-*.log
rm -f dist/packages/$ID/.render-*.log
node tools/build-ambient-package.mjs "$ID" 2>&1 | tail -25

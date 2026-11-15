#!/usr/bin/env bash
# Renderiza, compone y empaqueta uno o varios capítulos, uno detrás de otro.
#   bash engine2/entregar.sh SH-002 SH-003
cd "$(dirname "$0")/.."
for ID in "$@"; do
  bash engine2/capitulo.sh "$ID" && node tools/build-chapter.mjs "$ID" 2>&1 | grep -E "AUDIO|VALIDATED|RECHAZADO|✗|listo en"
done

#!/bin/bash
# Cola secuencial de los mundos que faltan. Espera a que termine OCEAN para no
# pelearse por la CPU con el render que ya está corriendo.
cd "$(dirname "$0")"
CHROME=/opt/pw-browsers/chromium

echo "Esperando a que termine el render de OCEAN..."
while pgrep -f "render-ocean.sh" > /dev/null; do sleep 20; done
echo "OCEAN terminado. Sigo con el resto."

render () {  # $1=id composicion  $2=carpeta paquete  $3=archivo
  local out="../dist/packages/$2/$3"
  if [ -f "$out" ]; then echo "  ya existe $2/$3, salto"; return; fi
  mkdir -p "../dist/packages/$2"
  echo ""
  echo "=== $1 → $2/$3 ==="
  npx remotion render src/index.jsx "$1" "$out" \
    --browser-executable=$CHROME --concurrency=3 \
    --codec=h264 --crf=18 --pixel-format=yuv420p \
    --image-format=jpeg --jpeg-quality=95 --log=error || { echo "  FALLÓ $1"; return; }
  # El contrato exige GOP 30 y faststart
  ffmpeg -hide_banner -loglevel error -y -i "$out" -an \
    -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
    -r 30 -g 30 -keyint_min 30 -sc_threshold 0 \
    -x264-params "keyint=30:min-keyint=30:scenecut=0" \
    -movflags +faststart "${out}.tmp.mp4" && mv "${out}.tmp.mp4" "$out"
  echo "  listo $2/$3"
}

# Lo renderizado se sube en cuanto existe. El contenedor es temporal; el
# repositorio no. Sin esto, una caída de sesión se lleva horas de render.
salvar () {
  cd /home/user/Organizado2
  git add dist/packages "$1" 2>/dev/null
  if ! git diff --cached --quiet; then
    git -c user.email=noreply@anthropic.com -c user.name=Claude \
      commit -q -m "Render: $1" 2>/dev/null
    for i in 1 2 3 4; do
      git push -q origin claude/design-brand-tools-zi127f 2>/dev/null && break
      echo "  reintento de push $i"; sleep $((i*10))
    done
    echo "  >>> $1 guardado en el repositorio"
  fi
  cd /home/user/Organizado2/remotion
}

for par in "CLOUDS:AMBIENT-001" "JUNGLE:AMBIENT-003" "GALAXY:AMBIENT-004" "REDROOM:AMBIENT-005"; do
  mundo="${par%%:*}"; pkg="${par##*:}"
  render "$mundo-MAIN"    "$pkg" main.mp4
  render "$mundo-CEILING" "$pkg" ceiling.mp4
  render "$mundo-SIDE"    "$pkg" side.mp4
  salvar "$pkg"
done

# ── las cinco transiciones, 10 s cada una por pantalla ──
for par in "TR-001:CLOUDS" "TR-002:OCEAN" "TR-003:JUNGLE" "TR-004:GALAXY" "TR-005:REDROOM"; do
  tr="${par%%:*}"
  render "$tr-MAIN"    "$tr" main.mp4
  render "$tr-CEILING" "$tr" ceiling.mp4
  render "$tr-SIDE"    "$tr" side.mp4
  salvar "$tr"
done

echo ""
echo "=== ensamblando y validando los cinco paquetes ==="
cd ..
for id in AMBIENT-001 AMBIENT-002 AMBIENT-003 AMBIENT-004 AMBIENT-005; do
  node tools/build-ambient-package.mjs "$id" || echo "  $id NO valida"
  cd /home/user/Organizado2
  git add dist/packages 2>/dev/null
  git diff --cached --quiet || { git -c user.email=noreply@anthropic.com -c user.name=Claude commit -q -m "Paquete validado: $id"; git push -q origin claude/design-brand-tools-zi127f 2>/dev/null; }
done
echo ""
echo "TODO TERMINADO"

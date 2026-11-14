#!/usr/bin/env bash
# Captura a demo (1440×900) depois de simular uma ação com o relógio virtual.
# Uso: tools/shot.sh <ação:segundos> <saida.png> [ajustes-json] [demo.html]
# Ex.: tools/shot.sh break:8 out/quebra.png
#      tools/shot.sh flow:4 out/muitos.png '{"nmul":3,"tdl":1}'
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
hash=$1; out=$2; cfg=${3:-}; demo=${4:-$ROOT/demo/index.html}
CH=$("$ROOT/tools/chrome.sh")
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
python3 -I "$ROOT/tools/harness.py" "$demo" "$T/a.html"
if [ -n "$cfg" ]; then python3 -I "$ROOT/tools/probes/config.py" "$T/a.html" "$T/a.html" "$cfg"; fi
mkdir -p "$(dirname "$out")"
"$CH" --headless --disable-gpu --hide-scrollbars --window-size=1440,900 --screenshot="$(realpath -m "$out")" "file://$T/a.html#$hash" >/dev/null 2>&1
echo "$out"

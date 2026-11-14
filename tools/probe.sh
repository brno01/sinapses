#!/usr/bin/env bash
# Roda uma sonda sobre a demo com relógio virtual e imprime o JSON que ela mede.
# Uso: tools/probe.sh <sonda.py> <ação:segundos> [ajustes-json] [demo.html]
#   sonda.py     arquivo em tools/probes/ (ex.: kinks.py)
#   ação:seg     hash do harness (ex.: break:10, all-off:16, none:6)
#   ajustes-json valores do painel aplicados antes de simular (ex.: '{"nmul":3,"tdl":1}')
#   demo.html    padrão: demo/index.html
# Variáveis: CORES="2,3" prende o Chrome nesses núcleos (medições de custo mais estáveis).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
probe=$1; hash=$2; cfg=${3:-}; demo=${4:-$ROOT/demo/index.html}
CH=$("$ROOT/tools/chrome.sh")
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
python3 -I "$ROOT/tools/harness.py" "$demo" "$T/a.html"
if [ -n "$cfg" ]; then python3 -I "$ROOT/tools/probes/config.py" "$T/a.html" "$T/a.html" "$cfg"; fi
python3 -I "$ROOT/tools/probes/$probe" "$T/a.html" "$T/b.html"
run=("$CH" --headless --disable-gpu --window-size=1440,900 --dump-dom "file://$T/b.html#$hash")
if [ -n "${CORES:-}" ]; then run=(taskset -c "$CORES" "${run[@]}"); fi
"${run[@]}" 2>/dev/null | grep -o '<pre id="mt">.*</pre>' | sed -e 's/^<pre id="mt">//' -e 's/<\/pre>$//'

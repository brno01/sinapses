#!/usr/bin/env bash
# Imprime o caminho de um Chrome/Chromium que roda headless.
# Ordem: $CHROME, o headless shell baixado pelo Playwright (~/.cache/ms-playwright) e um Chromium no PATH.
set -euo pipefail
if [ -n "${CHROME:-}" ]; then echo "$CHROME"; exit 0; fi
c=$(ls -d "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | sort -V | tail -1 || true)
if [ -n "$c" ]; then echo "$c"; exit 0; fi
for b in chromium chromium-browser google-chrome google-chrome-stable; do
  if command -v "$b" >/dev/null 2>&1; then command -v "$b"; exit 0; fi
done
echo "Chrome headless não encontrado: defina CHROME com o caminho do executável" >&2
exit 1

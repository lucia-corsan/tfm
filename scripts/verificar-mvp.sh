#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PYTHON="$PROJECT_ROOT/.venv/bin/python"

if [[ ! -x "$VENV_PYTHON" ]]; then
  echo "No se encuentra .venv/bin/python. Crea el entorno e instala requirements-dev.txt." >&2
  exit 1
fi

cd "$PROJECT_ROOT"

"$VENV_PYTHON" -c 'import sys; assert sys.version_info[:2] == (3, 9), f"Se esperaba Python 3.9 y se encontró {sys.version.split()[0]}"'
"$VENV_PYTHON" -m ruff check .
"$VENV_PYTHON" -m pytest

cd "$PROJECT_ROOT/app"
npm test
npm run lint
npm run typecheck
npm run export:android

echo "Verificación automática del MVP completada correctamente."

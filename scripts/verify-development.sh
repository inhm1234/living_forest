#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIST_DIR="$ROOT_DIR/dist-dev"

: "${DEV_SUPABASE_URL:?DEV_SUPABASE_URL is required}"
: "${DEV_SUPABASE_PUBLISHABLE_KEY:?DEV_SUPABASE_PUBLISHABLE_KEY is required}"

fail() {
  printf 'DEV VERIFY FAILED: %s\n' "$1" >&2
  exit 1
}

[[ -f "$DEV_DIST_DIR/index.html" ]] || fail "dist-dev/index.html is missing"
[[ -f "$DEV_DIST_DIR/app.html" ]] || fail "dist-dev/app.html is missing"
[[ -f "$DEV_DIST_DIR/todayforest-supabase-config.js" ]] || fail "DEV Supabase config is missing"

for forbidden in dev docs scripts supabase .github; do
  [[ ! -e "$DEV_DIST_DIR/$forbidden" ]] || fail "internal path leaked into DEV artifact: $forbidden"
done

python3 - "$DEV_DIST_DIR/todayforest-supabase-config.js" <<'PY'
from pathlib import Path
import os
import sys

text = Path(sys.argv[1]).read_text(encoding="utf-8")
url = os.environ["DEV_SUPABASE_URL"].strip()
key = os.environ["DEV_SUPABASE_PUBLISHABLE_KEY"].strip()

if url not in text:
    raise SystemExit("DEV URL was not injected into the browser config")
if key not in text:
    raise SystemExit("DEV publishable key was not injected into the browser config")
if 'TODAYFOREST_ENVIRONMENT = "development"' not in text:
    raise SystemExit("development environment marker is missing")
PY

# Production project values must never survive in the DEV artifact.
if grep -RIl --exclude='*.map' 'xdcsppaptcmgpvnzgoab.supabase.co' "$DEV_DIST_DIR" | grep -q .; then
  fail "production Supabase URL leaked into DEV artifact"
fi
if grep -RIl --exclude='*.map' 'sb_publishable_oMrSqUFX9UM1n4Ks-AhYKw_OvcZOfPs' "$DEV_DIST_DIR" | grep -q .; then
  fail "production Supabase publishable key leaked into DEV artifact"
fi

while IFS= read -r -d '' file; do
  node --check "$file" >/dev/null
done < <(find "$DEV_DIST_DIR" -type f -name '*.js' -print0)

printf 'Development artifact verification passed.\n'

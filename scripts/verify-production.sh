#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

fail() {
  printf 'VERIFY FAILED: %s\n' "$1" >&2
  exit 1
}

[[ -f "$DIST_DIR/index.html" ]] || fail "dist/index.html is missing"
[[ -f "$DIST_DIR/app.html" ]] || fail "dist/app.html is missing"
[[ -f "$DIST_DIR/ads.txt" ]] || fail "dist/ads.txt is missing"

for forbidden in dev docs scripts supabase .github; do
  [[ ! -e "$DIST_DIR/$forbidden" ]] || fail "internal path leaked into dist: $forbidden"
done

for forbidden in qa-login.html qa-login.js qa-login.css README.md README.txt UPLOAD_README.txt; do
  [[ ! -e "$DIST_DIR/$forbidden" ]] || fail "internal file leaked into dist: $forbidden"
done

if find "$DIST_DIR" -type f -name '*.sql' -print -quit | grep -q .; then
  fail "SQL file leaked into production artifact"
fi

if find "$DIST_DIR" -maxdepth 1 -type f -name '*.txt' ! -name 'ads.txt' -print -quit | grep -q .; then
  fail "internal root .txt file leaked into production artifact"
fi

if grep -RIl --exclude='*.map' 'forest2026' "$DIST_DIR" | grep -q .; then
  fail "legacy DEV password leaked into production artifact"
fi

# The admin statistics page must not expose the legacy Google Apps Script endpoint/key.
if grep -q 'script.google.com' "$DIST_DIR/admin.js"; then
  fail "legacy admin stats endpoint leaked into admin.js"
fi
if grep -q 'TODAYFOREST_STATS_KEY' "$DIST_DIR/admin.js"; then
  fail "legacy admin stats key leaked into admin.js"
fi

# Syntax-check every shipped JavaScript file.
while IFS= read -r -d '' file; do
  node --check "$file" >/dev/null
 done < <(find "$DIST_DIR" -type f -name '*.js' -print0)

# Validate local src/href references in shipped HTML.
python3 - "$DIST_DIR" <<'PY'
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re, sys

root = Path(sys.argv[1]).resolve()
attr_re = re.compile(r'''(?:src|href)\s*=\s*["']([^"']+)["']''', re.I)
missing = []
for html in root.rglob('*.html'):
    text = html.read_text(encoding='utf-8', errors='ignore')
    for raw in attr_re.findall(text):
        value = raw.strip()
        if not value or value.startswith(('#', 'data:', 'mailto:', 'tel:', 'javascript:')):
            continue
        parts = urlsplit(value)
        if parts.scheme or parts.netloc:
            continue
        path = unquote(parts.path)
        if not path or path == '/':
            continue
        target = (root / path.lstrip('/')) if path.startswith('/') else (html.parent / path)
        # Extensionless application routes can be handled by the host.
        if not target.exists() and Path(path).suffix:
            missing.append((html.relative_to(root), value))

if missing:
    for src, ref in missing[:50]:
        print(f'MISSING LOCAL REF: {src} -> {ref}', file=sys.stderr)
    raise SystemExit(1)
PY

printf 'Production artifact verification passed.\n'

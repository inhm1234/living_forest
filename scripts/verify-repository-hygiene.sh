#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  printf 'REPOSITORY HYGIENE FAILED: %s\n' "$1" >&2
  exit 1
}

[[ -f "$ROOT_DIR/.gitignore" ]] || fail ".gitignore is missing"

EDGE_FN="$ROOT_DIR/supabase/functions/oot-push-invites/index.ts"
[[ -f "$EDGE_FN" ]] || fail "oot-push-invites recovery copy is missing"

if grep -q 'SUPABASE_SERVICE_ROLE_KEY' "$EDGE_FN"; then
  fail "legacy SUPABASE_SERVICE_ROLE_KEY reference returned to oot-push-invites"
fi
grep -q 'SUPABASE_SECRET_KEYS' "$EDGE_FN" || fail "new SUPABASE_SECRET_KEYS access is missing"

# In CI, detect generated/local-only content that was accidentally committed.
if git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  TRACKED="$(git -C "$ROOT_DIR" ls-files)"

  for forbidden in node_modules dist playwright-report test-results blob-report coverage .wrangler; do
    if printf '%s\n' "$TRACKED" | grep -qE "^${forbidden}(/|$)"; then
      fail "generated/local path is tracked by Git: $forbidden"
    fi
  done

  if printf '%s\n' "$TRACKED" | grep -qE '(^|/)TodayForest_data_[^/]*\.sql$|(^|/)backup_[^/]*\.sql$'; then
    fail "real-user/local backup SQL is tracked by Git"
  fi

  if printf '%s\n' "$TRACKED" | grep -qE '(^|/)\.env($|\.)' | grep -vqE '(^|/)\.env\.example$'; then
    fail "local .env file is tracked by Git"
  fi
else
  # Fallback for unpacked ZIP verification.
  if find "$ROOT_DIR" -type f \( -name 'TodayForest_data_*.sql' -o -name 'backup_*.sql' \) -print -quit | grep -q .; then
    fail "real-user/local backup SQL appears inside the repository copy"
  fi
  if find "$ROOT_DIR" -type f -name '.env*' ! -name '.env.example' -print -quit | grep -q .; then
    fail "local .env file appears inside the repository copy"
  fi
fi

printf 'Repository hygiene verification passed.\n'

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Production is intentionally built from an allow-by-exclusion copy.
# Internal development tools, SQL/docs, QA login pages and repository metadata
# must never be published to Cloudflare Pages.
rsync -a --delete \
  --exclude '/dist/' \
  --exclude '/.git/' \
  --exclude '/.github/' \
  --exclude '/.gitignore' \
  --exclude '/dev/' \
  --exclude '/docs/' \
  --exclude '/scripts/' \
  --exclude '/supabase/' \
  --exclude '/qa-login.html' \
  --exclude '/qa-login.js' \
  --exclude '/qa-login.css' \
  --exclude '/README.md' \
  --exclude '/README.txt' \
  --exclude '/UPLOAD_README.txt' \
  --exclude '/*.sql' \
  --exclude '/*.md' \
  --exclude '/*.txt' \
  "$ROOT_DIR/" "$DIST_DIR/"

# ads.txt is the one intentional public text file.
cp "$ROOT_DIR/ads.txt" "$DIST_DIR/ads.txt"

printf 'Built production artifact: %s\n' "$DIST_DIR"

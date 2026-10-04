#!/usr/bin/env bash
# Publish the playable demo to GitHub Pages.
#
#   bash scripts/deploy_pages.sh
#
# Builds the frontend, bundles every world into a backend-free site, and force
# pushes it to the gh-pages branch. The audio and .glb files are deliberately
# force-added: they are gitignored on main (copyright, size) but the demo is
# nothing without them.
set -euo pipefail

REPO_URL="$(git config --get remote.origin.url)"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist_static"
PY="$ROOT/venv/Scripts/python.exe"
[ -x "$PY" ] || PY="python"

cd "$ROOT"
echo "==> building frontend"
npm run build --prefix frontend

# Only the worlds that are part of the submission: the others are test
# fixtures and a chooser full of them reads as unfinished.
WORLDS="${WORLDS:-i-still-break my-way get-lucky billie-jean}"
echo "==> bundling worlds: $WORLDS"
"$PY" scripts/export_static.py --only $WORLDS

# Pages runs Jekyll by default, which silently drops files it does not like.
touch "$OUT/.nojekyll"

echo "==> pushing to gh-pages"
cd "$OUT"
rm -rf .git
git init -q -b gh-pages
git add -A -f
git -c user.name="$(git -C "$ROOT" config user.name)" \
    -c user.email="$(git -C "$ROOT" config user.email)" \
    commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git push -q --force "$REPO_URL" gh-pages
rm -rf .git

echo
echo "==> done"
echo "    https://lluisestape-upc.github.io/unwrapped/"

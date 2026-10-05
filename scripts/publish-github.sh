#!/usr/bin/env bash
# Publish this folder to a GitHub repo in one go.
#
#   ./scripts/publish-github.sh                # creates github.com/<you>/pahunch (needs `gh` logged in)
#   ./scripts/publish-github.sh my-repo-name   # custom repo name
#   ./scripts/publish-github.sh https://github.com/you/pahunch.git   # push to an existing empty repo
#
# Without `gh`: create an empty repo on github.com/new first, then pass its URL.
set -euo pipefail

cd "$(dirname "$0")/.."
target="${1:-pahunch}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init -b main
fi
if [ -z "$(git status --porcelain)" ] && git rev-parse HEAD >/dev/null 2>&1; then
  :
else
  git add -A
  git commit -qm "Pahunch: Meesho COD readiness prototype" || true
fi

if [[ "$target" == http* || "$target" == git@* ]]; then
  git remote remove github 2>/dev/null || true
  git remote add github "$target"
  git push -u github main
  url="${target%.git}"
else
  if ! command -v gh >/dev/null; then
    echo "GitHub CLI (gh) not found. Install from https://cli.github.com or create an empty repo at https://github.com/new and run:"
    echo "  $0 https://github.com/<you>/$target.git"
    exit 1
  fi
  gh auth status >/dev/null 2>&1 || gh auth login
  gh repo create "$target" --public --source . --remote github --push \
    --description "Pahunch: COD readiness and consented neighbour receipt for Meesho/Valmo. Team Pahunch, IIT Bombay."
  url="https://github.com/$(gh api user -q .login)/$target"
fi

echo
echo "Published: $url"
echo "Next: connect it to Vercel so every push redeploys -> https://vercel.com/new/import?s=$url"

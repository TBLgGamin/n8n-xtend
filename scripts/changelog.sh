#!/usr/bin/env bash
set -eo pipefail

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" 2>/dev/null || true

VERSION=$(node -e "console.log(require('./package.json').version)")
LAST_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
RANGE="${LAST_TAG:+${LAST_TAG}..}HEAD"
TODAY=$(date +%Y-%m-%d)

RE_FEAT='^feat(\([^)]+\))?!?: (.+)$'
RE_FIX='^fix(\([^)]+\))?!?: (.+)$'
RE_OTHER='^(refactor|perf|docs|chore)(\([^)]+\))?!?: (.+)$'

ADDED=""
FIXED=""
CHANGED=""

while IFS= read -r msg || [ -n "$msg" ]; do
  if [[ "$msg" =~ $RE_FEAT ]]; then
    ADDED="${ADDED}\n- ${BASH_REMATCH[2]}"
  elif [[ "$msg" =~ $RE_FIX ]]; then
    FIXED="${FIXED}\n- ${BASH_REMATCH[2]}"
  elif [[ "$msg" =~ $RE_OTHER ]]; then
    CHANGED="${CHANGED}\n- ${BASH_REMATCH[3]}"
  fi
done < <(git log "$RANGE" --pretty=format:"%s" 2>/dev/null)

ENTRY="## [${VERSION}] - ${TODAY}\n\n"
[ -n "$ADDED" ]   && ENTRY="${ENTRY}### Added\n${ADDED}\n\n"
[ -n "$FIXED" ]   && ENTRY="${ENTRY}### Fixed\n${FIXED}\n\n"
[ -n "$CHANGED" ] && ENTRY="${ENTRY}### Changed\n${CHANGED}\n\n"

EXISTING=$(cat CHANGELOG.md 2>/dev/null || echo "")
STRIPPED=$(echo "$EXISTING" | awk '/^## \[Unreleased\]/{found=1; next} found && /^## \[/{found=0} !found{print}' | sed '/^# Changelog/d' | sed '/^[[:space:]]*$/{ N; /^\n$/d }')

printf "# Changelog\n\n## [Unreleased]\n\n%b%s\n" "$ENTRY" "$STRIPPED" > CHANGELOG.md

echo "Generated changelog for v${VERSION}"

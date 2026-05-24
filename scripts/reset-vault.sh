#!/usr/bin/env bash
# Reset the dev mockup-vault to the "first-time install" state so the empty
# state + "Import sample pack" flow can be tested end-to-end.
#
# Wipes:
#   - <vault>/<mockupFolder>/  (all files inside, default: Mockup/)
#   - <vault>/.obsidian/plugins/mockup-viewer/data.json  (back to defaults)
#
# Does NOT touch:
#   - mockup-viewer/samples/   (canonical sample-pack sources, bundled into main.js)
#   - other folders inside the vault (e.g. user's own working files)
#
# Usage:
#   scripts/reset-vault.sh                  # default vault (./mockup-vault)
#   scripts/reset-vault.sh /path/to/vault   # custom vault
#   scripts/reset-vault.sh --keep-data      # wipe Mockup/ but preserve data.json
#
# After reset, open the Mockup viewer pane in Obsidian and click "Import sample
# pack" to repopulate the folder from the bundled samples.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEEP_DATA=0
VAULT="$REPO_ROOT/mockup-vault"

for arg in "$@"; do
  case "$arg" in
    --keep-data) KEEP_DATA=1 ;;
    -*) echo "Unknown flag: $arg" >&2; exit 1 ;;
    *) VAULT="$arg" ;;
  esac
done

PLUGIN_DIR="$VAULT/.obsidian/plugins/mockup-viewer"
DATA_JSON="$PLUGIN_DIR/data.json"
MOCKUP_FOLDER_DEFAULT="Mockup"

if [[ ! -d "$VAULT" ]]; then
  echo "Vault not found: $VAULT" >&2
  exit 1
fi

# Resolve mockup folder from data.json (or default to "Mockup").
MOCKUP_FOLDER="$MOCKUP_FOLDER_DEFAULT"
if [[ -f "$DATA_JSON" ]] && command -v jq >/dev/null; then
  FROM_JSON="$(jq -r '.mockupFolder // empty' "$DATA_JSON")"
  [[ -n "$FROM_JSON" ]] && MOCKUP_FOLDER="$FROM_JSON"
fi
MOCKUP_PATH="$VAULT/$MOCKUP_FOLDER"

echo "Vault:         $VAULT"
echo "Mockup folder: $MOCKUP_FOLDER"
echo

# 1. Wipe Mockup folder contents (top-level files only).
if [[ -d "$MOCKUP_PATH" ]]; then
  count="$(find "$MOCKUP_PATH" -maxdepth 1 -type f | wc -l | tr -d ' ')"
  echo "Removing $count file(s) from $MOCKUP_PATH"
  find "$MOCKUP_PATH" -maxdepth 1 -type f -delete
else
  echo "Mockup folder does not exist yet — skipping wipe."
fi

# 2. Reset plugin data.json unless --keep-data.
if [[ "$KEEP_DATA" -eq 0 ]]; then
  if [[ -d "$PLUGIN_DIR" ]]; then
    echo "Resetting $DATA_JSON to defaults"
    cat > "$DATA_JSON" <<EOF
{
  "sources": [],
  "mockupFolder": "$MOCKUP_FOLDER_DEFAULT",
  "obsidianCss": true
}
EOF
  else
    echo "Plugin not installed in vault — skipping data.json reset."
  fi
else
  echo "Skipping data.json reset (--keep-data)."
fi

# 3. Reload plugin if obsidian CLI is available.
if command -v obsidian >/dev/null; then
  VAULT_NAME="$(basename "$VAULT")"
  echo "Reloading plugin in vault '$VAULT_NAME'"
  obsidian "vault=$VAULT_NAME" plugin:reload id=mockup-viewer 2>/dev/null \
    || echo "  (vault not currently open in Obsidian)"
fi

echo
echo "Done. Open the Mockup viewer pane to see the empty state."
echo "Click 'Import sample pack' to repopulate from the bundled samples."

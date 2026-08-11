#!/usr/bin/env bash
# Run every shipped example with the built Kin CLI (dist/bin/kin.js).
# Interactive examples (injiza_amakuru / prompt-sync) need a real TTY, so they
# are exercised in tests/examples.test.ts instead of this script.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

KIN_BIN="${KIN_BIN:-dist/bin/kin.js}"

if [[ ! -f "$KIN_BIN" ]]; then
  echo "Missing $KIN_BIN. Run \`npm run build\` first." >&2
  exit 1
fi

failed=0
ran=0

shopt -s nullglob
examples=(examples/*.kin)
if [[ ${#examples[@]} -eq 0 ]]; then
  echo "No example programs found in examples/" >&2
  exit 1
fi

for example in "${examples[@]}"; do
  name="$(basename "$example")"
  case "$name" in
    io.kin|switch.kin)
      echo "SKIP $name (interactive; covered by tests/examples.test.ts)"
      continue
      ;;
  esac

  echo "RUN  $name"
  if node "$KIN_BIN" run "$example"; then
    echo "PASS $name"
    ran=$((ran + 1))
  else
    echo "FAIL $name" >&2
    failed=1
  fi
done

if [[ "$ran" -eq 0 ]]; then
  echo "No non-interactive examples were executed." >&2
  exit 1
fi

exit "$failed"

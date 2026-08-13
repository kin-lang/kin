#!/usr/bin/env bash
# Run every shipped example with the built Kin CLI (dist/bin/kin.js).
# Includes top-level examples/*.kin and OOP samples under examples/oop/*.kin.
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
examples=(examples/*.kin examples/oop/*.kin examples/importing/*.kin)
if [[ ${#examples[@]} -eq 0 ]]; then
  echo "No example programs found under examples/" >&2
  exit 1
fi

for example in "${examples[@]}"; do
  # Relative path for display: arrays.kin or oop/class-basics.kin
  rel="${example#examples/}"
  name="$(basename "$example")"
  case "$name" in
    io.kin|switch.kin)
      echo "SKIP $rel (interactive; covered by tests/examples.test.ts)"
      continue
      ;;
    # Library modules used only as dependencies of index.kin / with-oop.kin
    methods.kin|constants.kin|person.kin)
      if [[ "$rel" == importing/* ]]; then
        echo "SKIP $rel (imported library; run via index.kin / with-oop.kin)"
        continue
      fi
      ;;
  esac

  echo "RUN  $rel"
  if node "$KIN_BIN" run "$example"; then
    echo "PASS $rel"
    ran=$((ran + 1))
  else
    echo "FAIL $rel" >&2
    failed=1
  fi
done

if [[ "$ran" -eq 0 ]]; then
  echo "No non-interactive examples were executed." >&2
  exit 1
fi

exit "$failed"

#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
node --experimental-strip-types preview/build-fx.ts 2>&1 | grep -v ExperimentalWarning
python3 preview/build-fx.py && python3 preview/embed.py fx

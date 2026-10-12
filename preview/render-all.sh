#!/bin/sh
# 모든 계열의 미리보기 SVG·PNG를 만든다
cd "$(dirname "$0")/.." || exit 1
for k in courage friendship love sincerity knowledge reliability hope light; do
  node --experimental-strip-types preview/render.ts "$k" "preview/out/$k" 2>&1 | grep -v ExperimentalWarning
  python3 preview/zoom.py "preview/out/$k-idle.png" 3 preview/out/$k/idle-0.svg preview/out/$k/idle-1.svg preview/out/$k/idle-4.svg preview/out/$k/idle-6.svg preview/out/$k/idle-9.svg
  python3 preview/zoom.py "preview/out/$k-run.png" 2 preview/out/$k/run-0.svg preview/out/$k/run-1.svg preview/out/$k/run-2.svg preview/out/$k/run-3.svg preview/out/$k/run-4.svg preview/out/$k/run-5.svg preview/out/$k/run-6.svg preview/out/$k/run-7.svg preview/out/$k/run-8.svg preview/out/$k/run-9.svg preview/out/$k/run-10.svg
done

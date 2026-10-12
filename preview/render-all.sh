#!/bin/sh
# 모든 계열의 미리보기 SVG·PNG를 만든다
cd "$(dirname "$0")/.." || exit 1
for k in courage friendship love sincerity knowledge reliability hope light; do
  node --experimental-strip-types preview/render.ts "$k" "preview/out/$k" 2>&1 | grep -v ExperimentalWarning
  python3 preview/zoom.py "preview/out/$k-idle.png" 3.2 preview/out/$k/idle-0.svg preview/out/$k/idle-1.svg preview/out/$k/idle-3.svg preview/out/$k/idle-5.svg preview/out/$k/idle-8.svg
  python3 preview/zoom.py "preview/out/$k-run.png" 2 preview/out/$k/run-0.svg preview/out/$k/run-1.svg preview/out/$k/run-2.svg preview/out/$k/run-3.svg preview/out/$k/run-4.svg preview/out/$k/run-5.svg preview/out/$k/run-6.svg preview/out/$k/run-7.svg preview/out/$k/run-8.svg preview/out/$k/run-9.svg preview/out/$k/run-10.svg
done
python3 preview/zoom.py preview/out/big-check.png 1.6 preview/out/sincerity/big-done-4.svg preview/out/knowledge/big-waiting-9.svg preview/out/hope/big-error-6.svg
for t in 0 1 4 6 9 10; do python3 preview/foe-frame.py preview/out/courage/big-error-$t.svg preview/out/courage/big-error-$t-foe.svg; done
python3 preview/zoom.py preview/out/error-check.png 1.1 preview/out/courage/big-error-0-foe.svg preview/out/courage/big-error-1-foe.svg preview/out/courage/big-error-4-foe.svg
python3 preview/zoom.py preview/out/error-check2.png 1.1 preview/out/courage/big-error-6-foe.svg preview/out/courage/big-error-9-foe.svg preview/out/courage/big-error-10-foe.svg

#!/bin/sh
# 계열마다 공격 순간(주기 0.5~0.6)을 고정한 전투 장면 5컷(Lv.10·40·60·80·90)을 한 줄로 뽑는다
cd "$(dirname "$0")/.." || exit 1
for k in courage friendship love sincerity knowledge reliability hope light; do
  node --experimental-strip-types preview/render.ts "$k" "preview/out/$k" 2>&1 | grep -v ExperimentalWarning
  files=""
  for t in 1 4 6 8 9; do python3 preview/attack-frame.py preview/out/$k/run-$t.svg preview/out/$k/run-$t-atk.svg; files="$files preview/out/$k/run-$t-atk.svg"; done
  python3 preview/zoom.py "preview/out/$k-attack.png" 2 $files
done

# Battle integration contract

Mechanics run in the pinned `@pkmn/sim` Gen III engine. The widget must not recalculate damage, choose an action order from display timing, or execute a second action while the current playback is held. AI planning only proposes legal choices on detached snapshots.

The original FireRed reconstruction is a reference for presentation boundaries, not vendored game code:

- [Turn action selection and ordering](https://github.com/pret/pokefirered/blob/master/src/battle_main.c): `SetActionsAndBattlersTurnOrder`, `RunTurnActionsFunctions`.
- [Move and recovery scripts](https://github.com/pret/pokefirered/blob/master/data/battle_scripts_1.s): `BattleScript_EffectHit`, `BattleScript_MoveUsedWokeUp`.
- [Reused simulator](https://github.com/pkmn/ps): the installed version and dependency integrity are fixed in `package-lock.json`.

Integration requirements:

1. Both sides commit choices at the native request boundary. Native priority, effective Speed, ties, status restrictions and move continuations determine order.
2. A voluntary switch requested after choices were committed waits for the next request. It consumes that side's action; the opponent can then act against the replacement. Forced faint replacements remain distinct.
3. Recovery emitted before a move is shown before its announcement and effect. The status HUD changes after that recovery message. Move-result messages are shown individually in native order, with the affected side as speaker.
4. Hit reactions precede HP interpolation. Result messages finish before another attack, capture, faint, replacement or encounter starts.
5. Saving during playback preserves its phase deadline and the native queue. Resuming must not replay a move, spend PP twice, or recreate the battle when a partner returns from the nursery.
6. Nursery, faint and trap blockers are distinct from animation delays. A persistent blocker remains readable while other actions continue.
7. Bag recovery tools are considered only at a normal trainer-battle choice request. A Bag event replaces that side's move, takes effect before moves, and yields for playback before the opponent's action. Forced replacements and wild encounters never spend supplies. Effect values follow Gen III; recovery mutates the existing native battle, not a reconstructed copy.

Executable regression cases are in `desktop/test/turn-order.test.cjs`, `battle-pacing.test.cjs`, `switch-consistency.test.cjs` and `rules3.test.cjs`. Packaged UI validation uses an isolated profile, never the live saved game.

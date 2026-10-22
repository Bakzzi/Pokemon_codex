'use strict';
// This entry point has no DOM, timers, or Android bridge. Native storage commits
// the game and raw-step cursor together only while it still owns the snapshot.
globalThis.MobileBackground={run(raw,total,now,maxActions=32){
  const saved=JSON.parse(raw),game=new MobileCore.Adventure(saved.game||{},now);
  const progression=new MobileProgression(game,saved.mobile);
  const used=progression.catchUp(total,now,maxActions);
  if(!used&&!progression.dirty)return JSON.stringify({used:0});
  progression.pausedAt=now;
  return JSON.stringify({used,changed:progression.dirty,save:{format:1,game:game.data,mobile:progression.checkpoint(),savedAt:now}});
}};

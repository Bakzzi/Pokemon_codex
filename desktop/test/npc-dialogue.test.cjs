'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,K=require('../../shared/kanto-journey.cjs');
const now=Date.parse('2026-10-27T09:00:00Z');
function ready(Type){const g=new Type({},now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.data.kantoWorld.location='vermilion';g.data.badges=['brock','misty','surge'];g.data.switchUntil=0;g.nextTick=now;return g;}
function rewardState(g){return structuredClone({owned:g.data.owned,items:g.data.kantoStory.items,cleared:g.data.kantoStory.cleared,confirmations:g.data.kantoStory.dialogueConfirmations,memories:g.data.dialogueMemories});}
for(const [label,Type]of [['PC',PC],['Android',Android]]){
 test(label+' each local NPC remains manual through idle work, reload and unrelated completion',()=>{
  let g=ready(Type);g.data.kantoStory.cleared['k-squirtle']=now;g.data.starterGifts[7]=now;
  for(let i=0;i<30;i++){g.data.workTokens+=250;g.tick(now+i*100000);g.sceneTick(now+i*100000);g.controlTick(now+i*100000);}
  g=new Type(structuredClone(g.data),now+3000000);assert.equal(K.done(g,'k-fishing-rod'),false);assert.equal(g.data.kantoStory.items['fishing-rod'],undefined);
  g.data.battle=null;g.data.pendingBattle=null;g.data.switchUntil=0;g.nextTick=now;assert.ok(g.challenge('k-fishing-rod',now));
  assert.equal(g.presentation().sprite,'fishing-guru');assert.equal(g.completeKantoNode('k-fishing-rod',now),false);
  for(let i=0;i<30;i++){g.tick(now+i*100000);g.sceneTick(now+i*100000);}assert.equal(g.presentation().index,0);assert.equal(K.done(g,'k-fishing-rod'),false);
  const first=g.presentation().id+':0';assert.ok(g.advanceScene(first,now));assert.equal(g.advanceScene(first,now),false);
  g=new Type(structuredClone(g.data),now);assert.equal(g.presentation().index,1);assert.equal(g.presentation().confirm,'낚싯대 받기');assert.equal(g.data.kantoStory.items['fishing-rod'],undefined);
  const last=g.presentation().id+':1';assert.ok(g.advanceScene(last,now));assert.equal(g.advanceScene(last,now),false);assert.equal(g.data.kantoStory.items['fishing-rod'],1);assert.equal(g.data.kantoStory.dialogueConfirmations['k-fishing-rod'].at,now);
  const before=rewardState(g);assert.ok(g.requestAction('npc-review','k-fishing-rod',now));while(g.presentation()){const s=g.presentation();assert.ok(g.advanceScene(s.id+':'+s.index,now));}assert.deepEqual(rewardState(g),before);
  g.data.kantoWorld.location='cerulean';assert.equal(g.requestAction('npc-review','k-fishing-rod',now),false);
 });
 test(label+' existing rewards survive portrait repair without inventing another confirmation',()=>{
  let g=ready(Type);assert.ok(g.challenge('k-squirtle',now));g.presentation().sprite='scientist';g.presentation().index=1;
  g=new Type(structuredClone(g.data),now);assert.equal(g.presentation().sprite,'officer-jenny');assert.equal(g.presentation().index,1);assert.equal(K.done(g,'k-squirtle'),false);
  assert.ok(g.advanceScene(g.presentation().id+':1',now));const before=rewardState(g);g=new Type(structuredClone(g.data),now+1);assert.deepEqual(rewardState(g),before);
 });
}
test('NPC portraits are distinct pinned original frames; ordinary class art is unchanged',()=>{
 const root=path.resolve(__dirname,'../..'),manifest=require('../../reference/npc-portraits/manifest.json');
 for(const s of manifest.sprites){const bytes=fs.readFileSync(path.join(root,'reference/npc-portraits',s.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),s.sha256);const out=fs.readFileSync(path.join(root,'desktop/assets/trainers/battle',s.id+'.png'));assert.equal(out.readUInt32BE(16),32);assert.equal(out.readUInt32BE(20),32);}
 for(const [id,sprite]of Object.entries({'k-fishing-rod':'fishing-guru','k-squirtle':'officer-jenny','k-captain':'captain','k-bill':'bill','k-bulbasaur':'melanie'}))assert.equal(K.nodes.get(id).sprite,sprite);
 assert.equal(K.nodes.get('k-seafoam-1').sprite,null);assert.equal(K.nodes.get('k-lift-key').sprite,'item:lift-key');
 assert.ok([...K.nodes.values()].some(n=>n.trainer&&n.sprite==='sailor'));assert.ok([...K.nodes.values()].some(n=>n.trainer&&n.sprite==='fisherman'));
});

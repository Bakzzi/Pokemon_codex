'use strict';
// Unit fixtures for dialogue, native battle and reward transactions below the
// Kanto map/gate layer. Full consumers and imported saves are exercised by
// kanto-journey and kanto-migration tests, without this fixture.
const Shared=require('../../../shared/adventure.cjs').Adventure;
const Story=Object.getPrototypeOf(Object.getPrototypeOf(Shared));
const Android=require('../../../shared/johto-adventure.cjs').withJohto(Story);
const Desktop=require('../../adventure.cjs').Adventure;
class PC extends Android {
 constructor(saved={},now=Date.now(),options={}){super(saved,now,{...options,platform:'desktop'});}
 tick(now=Date.now()){return this.presentation()?this.sceneTick(now):super.tick(now);}
}
for(const name of ['snapshot','observe'])Object.defineProperty(PC.prototype,name,Object.getOwnPropertyDescriptor(Desktop.prototype,name));
module.exports={PC,Android};

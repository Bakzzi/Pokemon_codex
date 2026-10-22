'use strict';
// Explicit pre-journey save for regressions that concern old saves or isolated
// map/battle rules. Fresh-story integration is covered by kanto-journey.test.
const {Game}=require('../../game.cjs');
function existing(Type,now,options){return new Type(new Game({},now).data,now,options);}
module.exports={existing};

'use strict';
// Explicit pre-populated party for existing battle, evolution and queue scenarios.
// Fresh-game and gift progression use the real Game in starter-party.test.cjs.
const source=require('../../game.cjs');
class Game extends source.Game{
  constructor(saved={},now=Date.now(),options={}){
    super(saved,now,options);
    if(saved.version!==2){
      for(const id of [1,4,7]){this.addPokemon(id,5,'starter',now);this.data.starterGifts[id]=now;}
      this.data.slots=[1,4,7,25,null,null];
    }
  }
}
module.exports={...source,Game};

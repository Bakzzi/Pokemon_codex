'use strict';
const fs=require('node:fs');
const path=require('node:path');
class Store {
  constructor(dir){this.dir=dir;this.file=path.join(dir,'progress.json');this.last='';this.loadedVersion=null;}
  load(){
    try{
      const value=JSON.parse(fs.readFileSync(this.file,'utf8'));
      if(![1,2].includes(value.version))throw new Error('Unsupported save version');
      this.loadedVersion=value.version;this.loadedRules=value.game?.rulesRevision||0;this.loadedSeason=value.game?.season?.key||null;return value;
    }catch(error){
      if(error.code!=='ENOENT'){
        try{fs.copyFileSync(this.file,this.file+'.damaged-'+Date.now());}catch{}
        throw new Error('진행 기록을 읽을 수 없습니다. 원본을 보존했으니 복구 후 다시 실행해 주세요.',{cause:error});
      }
      return {};
    }
  }
  save(data){
    const text=JSON.stringify(data,null,2)+'\n';if(text===this.last)return;
    fs.mkdirSync(this.dir,{recursive:true});
    const season=data.game?.season?.key;
    if(this.loadedSeason&&season&&this.loadedSeason!==season){
      fs.copyFileSync(this.file,path.join(this.dir,'progress.before-season-'+Date.now()+'.json'));
    }
    if(this.loadedVersion===1&&data.version===2){
      fs.copyFileSync(this.file,path.join(this.dir,'progress.pre-v2-'+Date.now()+'.json'));
      this.loadedVersion=2;
    }
    if(this.loadedVersion===2&&this.loadedRules<3&&data.game?.rulesRevision===3){
      fs.copyFileSync(this.file,path.join(this.dir,'progress.pre-rules3-'+Date.now()+'.json'));
      this.loadedRules=3;
    }
    const tmp=this.file+'.tmp';fs.writeFileSync(tmp,text);fs.renameSync(tmp,this.file);this.last=text;this.loadedSeason=season||null;
  }
}
module.exports={Store};

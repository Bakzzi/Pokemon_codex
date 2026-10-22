'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),ref=path.join(root,'reference/johto-map');
function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return(n^0xffffffff)>>>0;}
function chunk(name,data){const t=Buffer.from(name),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([n,t,data,c]);}
function build(){
 const source=JSON.parse(fs.readFileSync(path.join(ref,'manifest.json')));for(const f of source.sources){const b=fs.readFileSync(path.join(ref,f.file));assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);}
 const png=fs.readFileSync(path.join(ref,'town_map.png')),packed=[];let width,height,bits;
 for(let i=8;i<png.length;){const n=png.readUInt32BE(i),t=png.toString('ascii',i+4,i+8),d=png.subarray(i+8,i+8+n);if(t==='IHDR'){width=d.readUInt32BE(0);height=d.readUInt32BE(4);bits=d[8];assert.equal(d[9],0);}if(t==='IDAT')packed.push(d);i+=n+12;}
 assert.equal(bits,2);const raw=zlib.inflateSync(Buffer.concat(packed)),stride=width/4,scan=Buffer.alloc(stride*height);
 for(let y=0;y<height;y++)for(let x=0;x<stride;x++){const f=raw[y*(stride+1)],a=x?scan[y*stride+x-1]:0,b=y?scan[(y-1)*stride+x]:0,c=x&&y?scan[(y-1)*stride+x-1]:0;let p=0;if(f===1)p=a;else if(f===2)p=b;else if(f===3)p=Math.floor((a+b)/2);else if(f===4){const q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);p=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}else assert.equal(f,0);scan[y*stride+x]=(raw[y*(stride+1)+x+1]+p)&255;}
 const palette=Buffer.from([...fs.readFileSync(path.join(ref,'pokegear.pal'),'utf8').matchAll(/RGB\s+(\d+),\s*(\d+),\s*(\d+)/g)].flatMap(m=>m.slice(1).map(n=>Math.round(Number(n)*255/31))));
 const keys={BORDER:0,EARTH:1,MOUNTAIN:2,CITY:3,POI:4,POI_MTN:5},pals=fs.readFileSync(path.join(ref,'town_map_palette_map.asm'),'utf8').split('\n').filter(s=>/^\s+townmappals /.test(s)).flatMap(s=>s.replace(/^\s+townmappals /,'').split(',').map(s=>keys[s.trim()]));
 const map=fs.readFileSync(path.join(ref,'johto.bin'));assert.equal(map.length,361);assert.equal(map[360],255);
 const w=144,h=112,rows=Buffer.alloc((w+1)*h),roads=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=x+8,sy=y+24,tile=map[Math.floor(sy/8)*20+Math.floor(sx/8)],tx=tile%16*8+sx%8,ty=Math.floor(tile/16)*8+sy%8;assert.ok(ty<height);const shade=3-((scan[ty*stride+Math.floor(tx/4)]>>((3-tx%4)*2))&3);rows[y*(w+1)+x+1]=pals[tile]*4+shade;}
 for(let y=3;y<17;y++)for(let x=1;x<19;x++)if([10,11,12,13,14,15,25,26].includes(map[y*20+x]))roads.push({x:x*8-4,y:y*8-20});
 const head=Buffer.alloc(13);head.writeUInt32BE(w);head.writeUInt32BE(h,4);head[8]=8;head[9]=3;
 fs.writeFileSync(path.join(root,'desktop/assets/maps/johto-crystal.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('PLTE',palette),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
 const landmarks=Object.fromEntries([...fs.readFileSync(path.join(ref,'landmarks.asm'),'utf8').matchAll(/landmark\s+(-?\d+),\s*(-?\d+),\s*(\w+)Name/g)].map(m=>[m[3],{x:Math.floor(Number(m[1])/8)*8-4,y:Math.floor(Number(m[2])/8)*8-20}]));
 const result={image:'assets/maps/johto-crystal.png',width:w,height:h,landmarks,roads};fs.writeFileSync(path.join(root,'shared/johto-map.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({image:result.image,roads:roads.length,sourceCommit:source.commit}));
}
if(require.main===module)build();module.exports={build};

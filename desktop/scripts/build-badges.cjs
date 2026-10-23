'use strict';
// Decode the pinned 2bpp sprite data with its companion Game Boy palettes.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),source=path.join(root,'desktop/data/badge-sprites');
function crc(b){let n=0xffffffff;for(const v of b){n^=v;for(let i=0;i<8;i++)n=n>>>1^((n&1)?0xedb88320:0);}return(n^0xffffffff)>>>0;}
function chunk(name,data){const t=Buffer.from(name),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([n,t,data,c]);}
function build(){
 const manifest=JSON.parse(fs.readFileSync(path.join(source,'sources.json')));
 for(const f of manifest.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(source,f.file))).digest('hex'),f.sha256,f.file);
 for(const region of ['kanto','johto']){
  const b=fs.readFileSync(path.join(source,region+'_badges.png')),packed=[];let width,height;
  for(let p=8;p<b.length;){const n=b.readUInt32BE(p),t=b.toString('ascii',p+4,p+8),d=b.subarray(p+8,p+8+n);if(t==='IHDR'){width=d.readUInt32BE(0);height=d.readUInt32BE(4);assert.equal(d[8],2);assert.equal(d[9],0);assert.equal(d[12],0);}if(t==='IDAT')packed.push(d);p+=n+12;}
  assert.equal(width,16);assert.ok(height>=128);const raw=zlib.inflateSync(Buffer.concat(packed)),stride=width/4,scan=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++)for(let x=0;x<stride;x++){const f=raw[y*(stride+1)],a=x?scan[y*stride+x-1]:0,b=y?scan[(y-1)*stride+x]:0,c=x&&y?scan[(y-1)*stride+x-1]:0;let p=0;if(f===1)p=a;else if(f===2)p=b;else if(f===3)p=Math.floor((a+b)/2);else if(f===4){const q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);p=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}else assert.equal(f,0);scan[y*stride+x]=(raw[y*(stride+1)+x+1]+p)&255;}
  const palettes=fs.readFileSync(path.join(source,region+'_badges.pal'),'utf8').trim().split(/\r?\n/).map(s=>s.split(';')[0].match(/\d+/g).map(n=>Math.round(Number(n)*255/31)));assert.equal(palettes.length,8);
  // The source sheet puts Mineral before Storm, but its palette table does not.
  const paletteOrder=region==='johto'?[0,1,2,3,5,4,6,7]:[0,1,2,3,4,5,6,7];
  const w=region==='kanto'?128:16,h=region==='kanto'?16:128,rows=Buffer.alloc((w*4+1)*h);
  for(let i=0;i<8;i++)for(let y=0;y<16;y++)for(let x=0;x<16;x++){
   const sy=i*16+y,shade=3-((scan[sy*stride+(x>>2)]>>((3-x%4)*2))&3),dx=region==='kanto'?i*16+x:x,dy=region==='kanto'?y:sy,p=dy*(w*4+1)+1+dx*4,colors=palettes[paletteOrder[i]];
   rows[p]=colors[shade*3];rows[p+1]=colors[shade*3+1];rows[p+2]=colors[shade*3+2];rows[p+3]=shade===0?0:255;
  }
  const head=Buffer.alloc(13);head.writeUInt32BE(w);head.writeUInt32BE(h,4);head[8]=8;head[9]=6;
  fs.writeFileSync(path.join(root,'desktop/assets/badges',region+'-color.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
 }
}
if(require.main===module)build();module.exports={build};

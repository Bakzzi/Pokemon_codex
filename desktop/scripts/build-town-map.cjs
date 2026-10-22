'use strict';
// Render original GBA 4bpp tiles and tilemap entries, without redrawing pixels.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),source=path.join(root,'reference/kanto-map'),out=path.join(root,'desktop/assets/maps');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function crc(bytes){let value=0xffffffff;for(const b of bytes){value^=b;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;}
function chunk(type,bytes){const name=Buffer.from(type),length=Buffer.alloc(4),check=Buffer.alloc(4);length.writeUInt32BE(bytes.length);check.writeUInt32BE(crc(Buffer.concat([name,bytes])));return Buffer.concat([length,name,bytes,check]);}
function decodePNG(bytes){
 const packed=[];let width,height,palette;for(let i=8;i<bytes.length;){const size=bytes.readUInt32BE(i),type=bytes.toString('ascii',i+4,i+8),data=bytes.subarray(i+8,i+8+size);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.equal(data[9],3);assert.equal(data[12],0);}if(type==='PLTE')palette=data;if(type==='IDAT')packed.push(data);i+=size+12;}
 const raw=zlib.inflateSync(Buffer.concat(packed)),pixels=Buffer.alloc(width*height);assert.equal(raw.length,(width+1)*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const filter=raw[y*(width+1)],left=x?pixels[y*width+x-1]:0,up=y?pixels[(y-1)*width+x]:0,corner=x&&y?pixels[(y-1)*width+x-1]:0;let predictor=0;if(filter===1)predictor=left;else if(filter===2)predictor=up;else if(filter===3)predictor=Math.floor((left+up)/2);else if(filter===4){const p=left+up-corner,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-corner);predictor=a<=b&&a<=c?left:b<=c?up:corner;}else assert.equal(filter,0);pixels[y*width+x]=(raw[y*(width+1)+x+1]+predictor)&255;}
 return {width,height,pixels,palette};
}
function render(){
 const manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json')));for(const file of manifest.sources)assert.equal(hash(fs.readFileSync(path.join(source,file.file))),file.sha256,file.file);
 const tiles=decodePNG(fs.readFileSync(path.join(source,'region_map.png'))),map=fs.readFileSync(path.join(source,'kanto.bin'));
 const colors=fs.readFileSync(path.join(source,'region_map.pal'),'utf8').trim().split(/\r?\n/).slice(3).flatMap(line=>line.split(' ').map(Number)),palette=Buffer.from(colors),width=240,height=160;
 assert.equal(map.length,30*20*2);assert.equal(tiles.width%8,0);const pixels=Buffer.alloc(width*height),perRow=tiles.width/8;
 for(let i=0;i<600;i++){const entry=map.readUInt16LE(i*2),tile=entry&1023,pal=entry>>12,tx=tile%perRow*8,ty=Math.floor(tile/perRow)*8;assert.ok(ty+8<=tiles.height);for(let y=0;y<8;y++)for(let x=0;x<8;x++){const sx=tx+(entry&1024?7-x:x),sy=ty+(entry&2048?7-y:y),index=(tiles.pixels[sy*tiles.width+sx]&15)+pal*16;assert.ok(index<palette.length/3);pixels[(Math.floor(i/30)*8+y)*width+i%30*8+x]=index;}}
 // Remove the screen's empty UI margins; retain the original map scenery.
 const crop={x:24,y:16,width:192,height:144};
 const header=Buffer.alloc(13);header.writeUInt32BE(crop.width);header.writeUInt32BE(crop.height,4);header[8]=8;header[9]=3;const rows=Buffer.alloc((crop.width+1)*crop.height);for(let y=0;y<crop.height;y++)pixels.copy(rows,y*(crop.width+1)+1,(y+crop.y)*width+crop.x,(y+crop.y)*width+crop.x+crop.width);
 const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('PLTE',palette),chunk('IDAT',zlib.deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'kanto-frlg.png'),png);fs.copyFileSync(path.join(source,'player_icon_red.png'),path.join(out,'player-red.png'));
 const cells=[...fs.readFileSync(path.join(source,'region_map_layout_kanto.h'),'utf8').matchAll(/\{((?:MAPSEC_[A-Z0-9_]+,?\s*)+)\}/g)].map(m=>m[1].match(/MAPSEC_[A-Z0-9_]+/g));assert.equal(cells.length,30);for(const row of cells)assert.equal(row.length,22);
 const sections={pallet:'PALLET_TOWN',viridian:'VIRIDIAN_CITY',forest:'VIRIDIAN_FOREST',pewter:'PEWTER_CITY','mt-moon':'MT_MOON',cerulean:'CERULEAN_CITY','sea-cottage':'ROUTE_25',vermilion:'VERMILION_CITY','ss-anne':'VERMILION_CITY',diglett:'DIGLETTS_CAVE','rock-tunnel':'ROCK_TUNNEL',lavender:'LAVENDER_TOWN',tower:'POKEMON_TOWER',celadon:'CELADON_CITY',fuchsia:'FUCHSIA_CITY',safari:'KANTO_SAFARI_ZONE',saffron:'SAFFRON_CITY',seafoam:'SEAFOAM_ISLANDS',cinnabar:'CINNABAR_ISLAND',mansion:'POKEMON_MANSION','power-plant':'POWER_PLANT','victory-road':'KANTO_VICTORY_ROAD',indigo:'INDIGO_PLATEAU','cerulean-cave':'CERULEAN_CAVE'};
 for(let i=1;i<=25;i++)sections['route-'+i]='ROUTE_'+i;
 const points={};for(const [id,name] of Object.entries(sections)){const positions=[];for(let y=0;y<30;y++)for(let x=0;x<22;x++)if(cells[y][x]==='MAPSEC_'+name)positions.push({x,y:y%15});assert.ok(positions.length,id);const p=positions[Math.floor(positions.length/2)];points[id]={x:p.x*8+36-crop.x,y:p.y*8+36-crop.y};}
 // The house and ship use their entrances adjacent to the original road/city.
 points['sea-cottage']={x:16*8+36-crop.x,y:1*8+36-crop.y};points['ss-anne']={x:14*8+36-crop.x,y:10*8+36-crop.y};
 const names=new Map(Object.entries(sections).map(([id,name])=>['MAPSEC_'+name,id]));
 names.set('MAPSEC_VERMILION_CITY','vermilion');
 const roadCells=new Map();for(let y=0;y<15;y++)for(let x=0;x<22;x++)if(cells[y][x]!=='MAPSEC_NONE'){
  const name=cells[y][x],place=names.get(name)||(name==='MAPSEC_ROUTE_4_POKECENTER'?'route-4':name==='MAPSEC_ROUTE_10_POKECENTER'?'route-10':null);assert.ok(place,name);
  const cell={x:x*8+36-crop.x,y:y*8+36-crop.y,place};roadCells.set(cell.x+','+cell.y,cell);
 }
 for(const [place,point] of Object.entries(points))if(!roadCells.has(point.x+','+point.y))roadCells.set(point.x+','+point.y,{...point,place});
 const geometry={image:'assets/maps/kanto-frlg.png',width:crop.width,height:crop.height,points,roads:[...roadCells.values()]};fs.writeFileSync(path.join(root,'shared/kanto-map.json'),JSON.stringify(geometry,null,2)+'\n');
 console.log(JSON.stringify({file:'desktop/assets/maps/kanto-frlg.png',...crop,sha256:hash(png),sourceCommit:manifest.commit,places:Object.keys(points).length}));
}
if(require.main===module)render();module.exports={render,decodePNG};

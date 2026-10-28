// Code-native vector mark matching the app's green "s." brand; no image dependencies.
import {writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';

const curves=[
    [[82,43],[73,33],[51,33],[42,44]],
    [[42,44],[30,59],[52,63],[64,67]],
    [[64,67],[85,73],[87,83],[78,93]],
    [[78,93],[68,104],[47,101],[37,92]]
];
const path='M82 43 C73 33 51 33 42 44 C30 59 52 63 64 67 C85 73 87 83 78 93 C68 104 47 101 37 92';
const crc32=bytes=>{
    let crc=0xffffffff;
    for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    return (crc^0xffffffff)>>>0;
};
function chunk(type,bytes){
    const name=Buffer.from(type);const length=Buffer.alloc(4);length.writeUInt32BE(bytes.length);
    const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([name,bytes])));
    return Buffer.concat([length,name,bytes,crc]);
}
export function iconPng(size){
    const scale=size*2/128,side=size*2;
    const pixels=new Uint8Array(side*side*4);
    const paint=(x,y,color)=>{const offset=(y*side+x)*4;pixels.set(color,offset);};
    const green=[40,92,69,255],ivory=[255,254,248,255];
    for(let y=0;y<side;y++)for(let x=0;x<side;x++){
        const px=(x+.5)/scale,py=(y+.5)/scale;
        const dx=Math.max(28-px,px-100,0),dy=Math.max(28-py,py-100,0);
        if(dx*dx+dy*dy<=28*28)paint(x,y,green);
    }
    function circle(cx,cy,radius){
        for(let y=Math.max(0,Math.floor((cy-radius)*scale));y<Math.min(side,(cy+radius)*scale);y++)
            for(let x=Math.max(0,Math.floor((cx-radius)*scale));x<Math.min(side,(cx+radius)*scale);x++)
                if(((x+.5)/scale-cx)**2+((y+.5)/scale-cy)**2<=radius**2)paint(x,y,ivory);
    }
    for(const points of curves)for(let step=0;step<=128;step++){
        const t=step/128,u=1-t;
        const position=axis=>u**3*points[0][axis]+3*u*u*t*points[1][axis]+3*u*t*t*points[2][axis]+t**3*points[3][axis];
        circle(position(0),position(1),5);
    }
    circle(94,96,5);
    const raw=Buffer.alloc(size*(1+size*4));
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)for(let channel=0;channel<4;channel++){
        let total=0;
        for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)total+=pixels[((y*2+dy)*side+x*2+dx)*4+channel];
        raw[y*(1+size*4)+1+x*4+channel]=Math.round(total/4);
    }
    const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
    return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
export async function buildIcons(root=new URL('../',import.meta.url)){
    for(const size of [192,512])await writeFile(new URL('icons/icon-'+size+'.png',root),iconPng(size));
    await writeFile(new URL('icons/mark.svg',root),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#285c45"/><path d="'+path+'" fill="none" stroke="#fffef8" stroke-width="10" stroke-linecap="round"/><circle cx="94" cy="96" r="5" fill="#fffef8"/></svg>\n');
}

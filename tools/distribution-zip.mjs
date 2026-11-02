import {readFile,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
import {verifyDistribution} from './incubator-distribution.mjs';

const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
// Bounded ZIP32 archive. Paths come from a verified build manifest, never a request.
export async function distributionZip(build){
 await verifyDistribution(build.data_bundle);
 const manifest=JSON.parse(await readFile(resolve(build.output,'browser-files.json'),'utf8'));
 if(!Array.isArray(manifest.files)||manifest.files.length>500)throw new Error('Invalid browser manifest.');
 const entries=[];let total=0;
 async function add(name,path,sha){
  if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.split('/').some(p=>!p||p==='.'||p==='..')||entries.some(e=>e.name===name))throw new Error('Unsafe or duplicate ZIP path.');
  const stat=await lstat(path);if(!stat.isFile()||stat.size>32*1024*1024)throw new Error('Invalid ZIP component.');
  total+=stat.size;if(total>128*1024*1024)throw new Error('ZIP exceeds size limit.');
  const bytes=await readFile(path);if(sha&&createHash('sha256').update(bytes).digest('hex')!==sha)throw new Error('Browser file integrity mismatch.');
  entries.push({name,bytes});
 }
 for(const file of manifest.files){if(typeof file.path!=='string'||file.path.includes('\\')||file.path.startsWith('/')||file.path.split('/').includes('..'))throw new Error('Invalid manifest path.');await add('browser-package/'+file.path,resolve(build.browser,file.path),file.sha256);}
 for(const name of ['manifest.json','guide-pack.json','relationships.json','DISTRIBUTION.md'])await add('data-bundle/'+name,resolve(build.data_bundle,name));
 await add('browser-files.json',resolve(build.output,'browser-files.json'));
 const locals=[],central=[];let offset=0;
 for(const {name,bytes} of entries.sort((a,b)=>a.name.localeCompare(b.name))){
  const filename=Buffer.from(name),compressed=deflateRawSync(bytes),crc=crc32(bytes),local=Buffer.alloc(30),directory=Buffer.alloc(46);
  local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);
  directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0x800,8);directory.writeUInt16LE(8,10);directory.writeUInt16LE(33,14);directory.writeUInt32LE(crc,16);directory.writeUInt32LE(compressed.length,20);directory.writeUInt32LE(bytes.length,24);directory.writeUInt16LE(filename.length,28);directory.writeUInt32LE(offset,42);
  locals.push(local,filename,compressed);central.push(directory,filename);offset+=local.length+filename.length+compressed.length;
 }
 const index=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(index.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,index,end]);
}

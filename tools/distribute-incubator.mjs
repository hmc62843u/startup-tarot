import {readFile,lstat,mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateExportEnvelope,validateReleaseReview,writeDistribution,verifyDistribution,buildDistribution} from './incubator-distribution.mjs';

export async function referenceRequest(connection,action,body,{fetchImpl=fetch}={}){
  if(!connection||Object.keys(connection).some(k=>!['origin','token'].includes(k)))throw new Error('Connection file must contain only origin and token.');
  const url=new URL(connection.origin);
  if(!['https:','http:'].includes(url.protocol)||url.pathname!=='/'||url.search||url.hash||url.username||url.password||url.protocol==='http:'&&!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Use a plain reference origin: HTTPS remotely or HTTP on loopback.');
  if(!/^[a-zA-Z0-9_-]{32,200}$/.test(connection.token)||!['dataset','import','distribution/export'].includes(action))throw new Error('A credential and supported operator action are required.');
  const response=await fetchImpl(url.origin+'/v1/'+action,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+connection.token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!response.ok)throw new Error('Workspace request rejected (HTTP '+response.status+'). Check access, selected revision and import expectations.');
  const text=await response.text();if(Buffer.byteLength(text)>6*1024*1024)throw new Error('Response exceeds 6 MiB.');
  try{return JSON.parse(text);}catch{throw new Error('Workspace returned invalid JSON.');}
}
export async function fetchOrganizationExport(connection,revision,options={}){
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(revision||''))throw new Error('An explicit revision is required.');
  const envelope=validateExportEnvelope(await referenceRequest(connection,'distribution/export',{revision},options));
  if(envelope.revision!==revision)throw new Error('Returned revision differs from the explicitly selected revision.');return envelope;
}
async function readJson(path,limit){const info=await lstat(path);if(!info.isFile()||info.size>limit)throw new Error('Expected a bounded regular JSON file.');return JSON.parse(await readFile(path,'utf8'));}
export async function main(args=process.argv.slice(2)){
  const options={};for(let i=0;i<args.length;i+=2){if(!['--connection','--input','--revision','--release','--verify'].includes(args[i])||!args[i+1]||options[args[i]])throw new Error('Usage: node tools/distribute-incubator.mjs --connection .local/connection.json --revision REV --release imports/review.json | --input imports/export.json --release imports/review.json | --verify path/to/data-bundle');options[args[i]]=args[i+1];}
  if(options['--verify']){if(args.length!==2)throw new Error('Use --verify by itself.');const {manifest}=await verifyDistribution(resolve(options['--verify']));console.log(JSON.stringify({verified:true,id:manifest.release.id,version:manifest.release.version,revision:manifest.source.revision}));return;}
  if(!options['--release']||!!options['--connection']===!!options['--input']||options['--input']&&options['--revision'])throw new Error('Choose a connection with explicit revision, or an exported input file, and a release review.');
  const review=validateReleaseReview(await readJson(options['--release'],64000));
  const envelope=options['--connection']?await fetchOrganizationExport(await readJson(options['--connection'],4000),options['--revision']):validateExportEnvelope(await readJson(options['--input'],6*1024*1024));
  const base=fileURLToPath(new URL('../release/',import.meta.url));await mkdir(base,{recursive:true});const staging=await mkdtemp(resolve(base,'approved-data-')),artifact=resolve(staging,'data-bundle');
  await writeDistribution(artifact,envelope,review,{method:options['--connection']?'authenticated-reference-api':'operator-supplied-export'});
  console.log(JSON.stringify(await buildDistribution(artifact)));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error instanceof SyntaxError?'Distribution failed: invalid JSON in an input file.':('Distribution failed: '+error.message));process.exitCode=1;});

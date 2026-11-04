import {rejectPublishingSecrets,validatePublishingEnvelope,validatePublishingReview} from '../js/publishing.js';
import {readFile,writeFile,mkdir,mkdtemp,readdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,sep} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {organizationPackKind,validateBundle,requireReference} from '../enterprise/domain.mjs';
import {exportRelease} from './export-release.mjs';
import {buildFiles} from './build-demo.mjs';
import {renderMarkdown} from './build-docs.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const COMPONENTS=[['guide-pack.json','guide_pack'],['relationships.json','relationships'],['DISTRIBUTION.md','distribution_notes']];
const rejectSensitive=rejectPublishingSecrets;
export const validateExportEnvelope=validatePublishingEnvelope;
export const validateReleaseReview=validatePublishingReview;
function notes(envelope,review){return '# '+review.brand+' distribution '+review.version+'\n\n'+
  'Release: '+review.id+' '+review.version+'\n\nOrganization: '+envelope.organization+'\n\nSelected database revision: '+envelope.revision+'\n\nAudience: '+review.audience+'\n\nReviewed by: '+review.reviewed_by+' on '+review.reviewed_date+'\n\n'+
  (envelope.bundle.relationships.dataset_kind==='fictional'?'FICTIONAL simulation data. This is not evidence about real investors or startups.\n\n':'Organization research; source dates, uncertainties and limitations require review.\n\n')+
  '## Distribution scope\n\n'+review.distribution_statement+'\n\nThe operator approved distribution and declared privacy and rights reviews. These declarations are not independent certification. Private owner graphs, model credentials and research history are not selected by this export. Inspect public/organization text before sharing.\n\n'+
  '## Updates and local copies\n\n'+review.update_instructions+'\n\nThis is a local copy, not a live connection or synchronization service. Corrections, membership changes, revocations and deletion do not automatically reach downloaded copies. Keep the provider/pack identity and browser origin stable when updating; export personal browser work before replacing files. Do not assume browser notes move between file and hosted origins.\n\n'+
  '## Data rights\n\n'+review.attribution_notice+'\n\nRetain the Guide Pack license, rights-review declaration, source metadata and relationship limitations in the accompanying JSON. Source links do not grant unrestricted redistribution.\n\nPack license:\n\n```json\n'+JSON.stringify(envelope.bundle.pack.license,null,2)+'\n```\n\n'+
  '## Use\n\nOpen the adjacent browser package index.html. Graph queries work without the incubator backend or Neo4j. Optional live LLM use requires a user-run local helper and separate consent; it is not enabled merely by distributing this package. General application guides include examples from the development dataset; the manifest and accompanying JSON define this release.\n';}

export async function writeDistribution(directory,envelope,review,{method='operator-supplied-export'}={}){
  validateExportEnvelope(envelope);validateReleaseReview(review);requireReference(['operator-supplied-export','authenticated-reference-api'].includes(method),'Unknown export method.');
  await mkdir(directory);const content=new Map([['guide-pack.json',json(envelope.bundle.pack)],['relationships.json',json(envelope.bundle.relationships)],['DISTRIBUTION.md',Buffer.from(notes(envelope,review))]]);
  const manifest={schema_version:1,kind:'startup_tarot_distribution',release:structuredClone(review),source:{organization:envelope.organization,revision:envelope.revision,method},compatibility:{guide_pack_schema:envelope.bundle.pack.schema_version,relationship_schema:1,graph_contract:'graph-research-1'},private_owner_graphs_selected:false,components:[]};
  for(const [path,role] of COMPONENTS){const bytes=content.get(path);await writeFile(resolve(directory,path),bytes,{flag:'wx'});const identity=role==='guide_pack'?{id:envelope.bundle.pack.id,version:envelope.bundle.pack.version,provider_id:envelope.bundle.pack.provider?.id||'legacy',dataset_kind:organizationPackKind(envelope.bundle.pack)}:role==='relationships'?{id:envelope.bundle.relationships.id,version:envelope.bundle.relationships.version,provider_id:envelope.bundle.relationships.provider_id,dataset_kind:envelope.bundle.relationships.dataset_kind}:null;manifest.components.push({path,role,bytes:bytes.length,sha256:hash(bytes),...(identity?{identity}:{})});}
  await writeFile(resolve(directory,'manifest.json'),json(manifest),{flag:'wx'});await verifyDistribution(directory);return manifest;
}
export async function verifyDistribution(directory){
  requireReference((await lstat(directory)).isDirectory(),'Distribution must be a regular directory.');
  const expected=['manifest.json',...COMPONENTS.map(([path])=>path)].sort();requireReference(JSON.stringify((await readdir(directory)).sort())===JSON.stringify(expected),'Distribution has missing/unexpected files.');
  const read=async path=>{const info=await lstat(resolve(directory,path));requireReference(info.isFile()&&info.size<=6*1024*1024,'Component must be a bounded regular file.');return readFile(resolve(directory,path));};
  const manifest=JSON.parse(await read('manifest.json'));rejectSensitive(manifest,'manifest');requireReference(Object.keys(manifest).length===7&&['schema_version','kind','release','source','compatibility','private_owner_graphs_selected','components'].every(k=>Object.hasOwn(manifest,k)),'Unknown manifest fields.');requireReference(manifest.schema_version===1&&manifest.kind==='startup_tarot_distribution'&&manifest.private_owner_graphs_selected===false,'Unsupported distribution manifest.');validateReleaseReview(manifest.release);
  requireReference(Array.isArray(manifest.components)&&manifest.components.length===3,'Three modular components required.');
  for(const [path,role] of COMPONENTS){const entries=manifest.components.filter(c=>c.path===path&&c.role===role);requireReference(entries.length===1,'Component path/role mismatch.');requireReference(Object.keys(entries[0]).length===(role==='distribution_notes'?4:5)&&['path','role','bytes','sha256',...(role==='distribution_notes'?[]:['identity'])].every(k=>Object.hasOwn(entries[0],k)),'Unknown component metadata.');const bytes=await read(path);requireReference(entries[0].sha256===hash(bytes)&&entries[0].bytes===bytes.length,'Component integrity mismatch: '+path);}
  requireReference(manifest.source&&Object.keys(manifest.source).length===3&&['organization','revision','method'].every(k=>Object.hasOwn(manifest.source,k))&&['operator-supplied-export','authenticated-reference-api'].includes(manifest.source.method),'Invalid source metadata.');
  const envelope={schema_version:1,organization:manifest.source?.organization,revision:manifest.source?.revision,bundle:{schema_version:1,pack:JSON.parse(await read('guide-pack.json')),relationships:JSON.parse(await read('relationships.json'))}};
  validateExportEnvelope(envelope);
  for(const role of ['guide_pack','relationships']){const item=manifest.components.find(c=>c.role===role),value=role==='guide_pack'?envelope.bundle.pack:envelope.bundle.relationships,expected={id:value.id,version:value.version,provider_id:role==='guide_pack'?value.provider?.id||'legacy':value.provider_id,dataset_kind:role==='guide_pack'?organizationPackKind(value):value.dataset_kind};requireReference(item.identity&&Object.keys(item.identity).length===4&&Object.entries(expected).every(([key,val])=>item.identity[key]===val),'Component identity/version mismatch.');}
  requireReference(manifest.compatibility&&Object.keys(manifest.compatibility).length===3,'Unknown compatibility metadata.');
  requireReference(manifest.compatibility?.guide_pack_schema===envelope.bundle.pack.schema_version&&manifest.compatibility?.relationship_schema===1&&manifest.compatibility?.graph_contract==='graph-research-1','Compatibility metadata mismatch.');
  requireReference((await read('DISTRIBUTION.md')).equals(Buffer.from(notes(envelope,manifest.release))),'Distribution notes differ from approved release metadata.');
  return {manifest,envelope};
}
export async function buildDistribution(directory,{parent=new URL('../release/',import.meta.url)}={}){
  const {manifest,envelope}=await verifyDistribution(directory),base=parent instanceof URL?fileURLToPath(parent):resolve(parent);
  await mkdir(base,{recursive:true});const output=await mkdtemp(resolve(base,'incubator-distribution-'));
  const browser=resolve(output,'browser-package'),copied=resolve(output,'data-bundle');await mkdir(copied);
  for(const path of ['manifest.json',...COMPONENTS.map(([p])=>p)])await writeFile(resolve(copied,path),await readFile(resolve(directory,path)),{flag:'wx'});
  await exportRelease({directory:browser,rebuild:false,recipient:true});
  const write=(path,value)=>writeFile(resolve(browser,path),value);
  await write('packs/guide-pack.json',json(envelope.bundle.pack));await write('data/relationships.json',json(envelope.bundle.relationships));
  const text=await readFile(resolve(directory,'DISTRIBUTION.md'),'utf8');await write('DISTRIBUTION.md',text);await write('release-manifest.json',json(manifest));
  const banner='<aside class="card" aria-label="Operator release"><strong>'+escape(manifest.release.brand)+' · '+escape(manifest.release.version)+'</strong><p>'+escape(manifest.release.audience)+'</p><a href="docs/distribution.html">Release, sources and update instructions</a></aside>';
  let html=await readFile(resolve(browser,'index.html'),'utf8');html=html.replace('<title>Startup Tarot</title>','<title>'+escape(manifest.release.brand)+' · Startup Tarot</title>').replace('<main id="screen-content">','<main id="screen-content">\n'+banner);await write('index.html',html);
  const pwa=JSON.parse(await readFile(resolve(browser,'manifest.json'),'utf8'));pwa.name=manifest.release.brand;pwa.short_name=manifest.release.brand.slice(0,30);pwa.description='Operator distribution '+manifest.release.id+' '+manifest.release.version;await write('manifest.json',json(pwa));
  for(const file of ['README.md','LICENSE.md','SOURCES.md','THIRD_PARTY_NOTICES.md','DATA_NOTICE.md'])await write('packs/'+file,text+'\nOriginal pack license and reuse declarations remain in guide-pack.json.\n');
  await write('DATA_LICENSE.md',text);await write('README.md','# '+manifest.release.brand+'\n\nOpen index.html for this operator-configured Startup Tarot release. See DISTRIBUTION.md for the exact release, audience, rights and update rules. The browser graph works without Neo4j or a backend. General help contains development examples; the distributed JSON defines this release.\n');
  let worker=await readFile(resolve(browser,'sw.js'),'utf8');worker=worker.replace("  './index.html',","  './index.html',\n  './DISTRIBUTION.md',\n  './release-manifest.json',\n  './docs/distribution.html',");await write('sw.js',worker);
  const hashValue=await buildFiles(pathToFileURL(browser+sep));
  await write('docs/distribution.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Operator distribution</title><link rel="stylesheet" href="../css/style.css?v='+hashValue+'"></head><body><main class="document-page"><a href="../index.html">Back to the app</a><p><a href="../release-manifest.json">Release manifest</a></p>'+renderMarkdown(text)+'</main></body></html>');
  for(const name of await readdir(resolve(browser,'docs'))){if(!name.endsWith('.html')||name==='distribution.html')continue;const path=resolve(browser,'docs',name),page=await readFile(path,'utf8');await writeFile(path,page.replace('<article>','<aside class="card"><p>'+escape(manifest.release.brand)+' · '+escape(manifest.release.version)+'. Guide examples are illustrative. See <a href="distribution.html">this edition’s data and notices</a>.</p></aside><article>'));}
  const links=new Set();const collect=value=>{if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){if(['url','source_url'].includes(key)&&typeof child==='string'&&child.startsWith('./'))links.add(child);else collect(child);}};collect(envelope.bundle);
  for(const link of links){const [path,anchor]=link.slice(2).split('#');requireReference(['docs/examples.html','docs/relationships.html'].includes(path),'Unsupported local evidence path.');const page=await readFile(resolve(browser,path),'utf8');requireReference(!anchor||page.includes('id="'+anchor+'"'),'Missing local evidence anchor: '+link);}
  const files=[];async function list(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){const path=prefix+entry.name;if(entry.isDirectory())await list(resolve(dir,entry.name),path+'/');else files.push({path,sha256:hash(await readFile(resolve(dir,entry.name)))});}}await list(browser);
  await writeFile(resolve(output,'browser-files.json'),json({schema_version:1,release_id:manifest.release.id,release_version:manifest.release.version,source_revision:manifest.source.revision,app_build:hashValue,files}));
  return {output,browser,data_bundle:copied,release_id:manifest.release.id,version:manifest.release.version,revision:manifest.source.revision,app_build:hashValue};
}

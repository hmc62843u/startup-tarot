import {validatePublishingEnvelope,validatePublishingBundle,validatePublishingReview,rejectPublishingSecrets,publishingRequire} from '../js/publishing.js';

const encoder=new TextEncoder(),decoder=new TextDecoder();
const bytes=value=>typeof value==='string'?encoder.encode(value):value;
const asJSON=value=>JSON.stringify(value,null,2)+'\n';
const htmlEscape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export async function publisherHash(value){publishingRequire(globalThis.crypto?.subtle,'This browser needs Web Crypto. Open the downloaded Publisher locally, or use HTTPS hosting.');return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function publisherInput(value){
 if(value?.bundle)return validatePublishingEnvelope(value);
 validatePublishingBundle(value);rejectPublishingSecrets(value);
 return {schema_version:1,organization:'local_operator',revision:'local_file',bundle:value};
}
export function publisherCheck(envelope){
 validatePublishingEnvelope(envelope);const r=envelope.bundle.pack.components?.research||envelope.bundle.pack;
 const warnings=['Review actual source support, personal data and distribution rights before sharing.'];
 for(const p of r.profiles)for(const field of ['stage','sector','geography','check'])if(!p.fit_claims?.some(c=>c.field===field))warnings.push(p.name+': '+field+' evidence remains unknown.');
 for(const s of r.snapshots)if(s.sources.some(source=>source.published_date===null))warnings.push(s.company+': publication date unknown; excluded from historical-cutoff evidence.');
 if(!envelope.bundle.relationships.coverage.complete)warnings.push('Incomplete graph: missing edges do not prove missing relationships.');
 return {kind:envelope.bundle.relationships.dataset_kind,profiles:r.profiles.length,snapshots:r.snapshots.length,edges:envelope.bundle.relationships.edges.length,warnings};
}
export function decodePublisherTemplate(template){
 publishingRequire(template?.schema_version===1&&Array.isArray(template.files)&&template.files.length<=500,'Publisher template is unavailable. Rebuild or download a complete Publisher.');
 const files=new Map();let total=0;
 for(const file of template.files){publishingRequire(/^[a-zA-Z0-9_./-]+$/.test(file.path)&&!file.path.split('/').some(p=>!p||p==='.'||p==='..')&&!files.has(file.path),'Unsafe template path.');const raw=atob(file.base64),data=Uint8Array.from(raw,c=>c.charCodeAt(0));total+=data.length;publishingRequire(total<128*1024*1024,'Publisher template exceeds size limit.');files.set(file.path,data);}
 return files;
}
function configuredFiles(template,envelope){
 const files=decodePublisherTemplate(template),pack=envelope.bundle.pack,graph=envelope.bundle.relationships;
 files.set('packs/guide-pack.json',bytes(asJSON(pack)));files.set('data/relationships.json',bytes(asJSON(graph)));
 files.set('packs/active-pack.js',bytes('globalThis.STARTUP_GUIDE_PACK = '+JSON.stringify(pack)+';\n'));
 files.set('packs/relationships.js',bytes('globalThis.STARTUP_GUIDE_RELATIONSHIPS = '+JSON.stringify(graph.dataset_kind==='fictional'?{research:null,fictional:graph}:{research:graph,fictional:null})+';\n'));
 return files;
}
function scenarioSeed(envelope,scenario){
 const state={startup:{},taskProgress:{},suggestionChoices:{},selectedInvestorIds:[],libraryWorkspaces:{},researchLibrary:envelope.bundle.pack,activeLibrary:'research'},seed=[];
 if(scenario){
  publishingRequire(scenario.entity_kind==='fictional'&&scenario.title.includes('fictional'),'Only labelled fictional scenario inputs are allowed.');
  const research=envelope.bundle.pack.components?.research;
  publishingRequire(research?.snapshots.some(s=>s.id===scenario.context_snapshot_id)&&research.profiles.some(p=>p.id===scenario.investor_profile_id),'This scenario requires the OpenFor research sample.');
  for(const a of Object.values(scenario.assumptions))publishingRequire(a.status==='illustrative_unverified','Every scenario assumption must remain illustrative.');
  const a=scenario.assumptions;state.startup={business_model:a.sector.value==='hardware'?'hardware':'saas',current_stage:a.stage.value,validation_focus:'customer_problem',sectors:[a.sector.value],illustrative_scenario:scenario};state.selectedInvestorIds=[scenario.investor_profile_id];
  seed.push(['startup-guide-outreach:'+JSON.stringify([envelope.bundle.pack.provider?.id||'legacy',envelope.bundle.pack.id]),JSON.stringify({schema_version:1,query:{stage:a.stage.value,sector:a.sector.value,geography:a.geography.value,check:{amount:a.fundraising_target.value,currency:a.fundraising_target.unit}},founder:{company:scenario.title,summary:'ILLUSTRATIVE ONLY: '+JSON.stringify(a)},entries:[]})]);
 }
 seed.push(['founder_gap_data',JSON.stringify(state)]);return seed;
}
export async function publisherPreview(template,envelope,scenario=null){
 validatePublishingEnvelope(envelope);const files=configuredFiles(template,envelope),seed=scenarioSeed(envelope,scenario);
 const shim='const PREVIEW_SESSION=true;const previewMemory=new Map('+JSON.stringify(seed)+');const localStorage={getItem:k=>previewMemory.get(k)??null,setItem:(k,v)=>previewMemory.set(k,String(v)),removeItem:k=>previewMemory.delete(k)};const location={protocol:"file:",hostname:""};const confirm=()=>true;\n';
 let code=decoder.decode(files.get('js/app.bundle.js')).replace('"use strict";','"use strict";\n'+shim);
 const notice='FOUNDER PREVIEW - not approved for distribution. Temporary in-memory work; navigation may discard unsaved edits. Live helper and backend connections disabled.';
 const banner='<aside role="note" style="font-size:.8rem;padding:6px 0;border-bottom:1px solid #ddd"><details><summary>FOUNDER PREVIEW · Unapproved · '+(scenario?'Fictional scenario · ':'')+'Details</summary><p>'+notice+'</p><p>'+htmlEscape(envelope.organization+' / '+envelope.revision)+'</p>'+(scenario?'<p>ILLUSTRATIVE: '+htmlEscape(scenario.title)+'</p><pre style="white-space:pre-wrap">'+htmlEscape(asJSON(scenario.assumptions))+'</pre>':'')+'</details></aside>';
 let html=decoder.decode(files.get('index.html')).replace(/<link[^>]+rel="manifest"[^>]*>/g,'').replace(/<link[^>]+rel="icon"[^>]*>/g,'');
 const scriptSafe=s=>s.replace(/<\/script/gi,'<\\/script');
 html=html.replace(/<link[^>]+href="css\/style\.css[^>]*>/,'<style>'+decoder.decode(files.get('css/style.css')).replace(/<\/style/gi,'<\\/style')+'</style>');
 for(const path of ['packs/active-pack.js','packs/relationships.js','js/app.bundle.js']){const escaped=path.replaceAll('.','\\.').replaceAll('/','\\/');html=html.replace(new RegExp('<script[^>]+src="'+escaped+'[^\"]*"[^>]*><\\/script>'),()=>'<script>'+scriptSafe(path==='js/app.bundle.js'?code:decoder.decode(files.get(path)))+'</script>');}
 html=html.replace('Save your profile to keep it in this browser.','Save your profile for this temporary preview session only.');
 html=html.replace('<main id="screen-content">',banner+'<main id="screen-content">');
 html=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; connect-src \'none\'; frame-src \'none\'; base-uri \'none\'; form-action \'none\'">');
 return {html,source_hash:await publisherHash(asJSON(envelope)),scenario_id:scenario?.id||null};
}
function distributionNotes(envelope,review){return '# '+review.brand+' '+review.version+'\n\nAudience: '+review.audience+'\n\nReviewed by '+review.reviewed_by+' on '+review.reviewed_date+'\n\nSource: '+envelope.organization+' / '+envelope.revision+'\n\n'+review.distribution_statement+'\n\n'+review.attribution_notice+'\n\n'+review.update_instructions+'\n\nDownloaded copies do not automatically synchronize or revoke. Review declarations are not independent certification. Private owner graphs, credentials, preview work and hypothetical scenario inputs are excluded.\n\nData kind: '+envelope.bundle.relationships.dataset_kind+'\n\nOpen browser-package/index.html after extracting the whole ZIP. Local matching and graph queries need no backend. Optional live LLM reasoning requires a separately run local helper.\n\nOriginal pack license:\n\n'+asJSON(envelope.bundle.pack.license);}
export async function publisherRelease(template,envelope,review,preview){
 validatePublishingEnvelope(envelope);validatePublishingReview(review);
 publishingRequire(preview?.reviewed===true&&preview.source_hash===await publisherHash(asJSON(envelope)),'Preview and review this exact data before building a release.');
 const files=configuredFiles(template,envelope),notes=distributionNotes(envelope,review),banner='<aside class="card" role="note"><strong>'+htmlEscape(review.brand+' '+review.version)+'</strong><p>'+htmlEscape(review.audience)+'</p><a href="DISTRIBUTION.md">Release, attribution and update instructions</a></aside>';
 let html=decoder.decode(files.get('index.html')).replace('<title>Startup Tarot</title>','<title>'+htmlEscape(review.brand)+' - Founder Workspace</title>').replace('<main id="screen-content">',banner+'<main id="screen-content">');
 files.set('index.html',bytes(html));files.set('DISTRIBUTION.md',bytes(notes));files.set('README.md',bytes(notes));files.set('DATA_LICENSE.md',bytes(notes));
 for(const file of ['README.md','LICENSE.md','SOURCES.md','THIRD_PARTY_NOTICES.md','DATA_NOTICE.md'])files.set('packs/'+file,bytes(notes));
 const components=[];for(const [path,data] of [['guide-pack.json',asJSON(envelope.bundle.pack)],['relationships.json',asJSON(envelope.bundle.relationships)],['DISTRIBUTION.md',notes]])components.push({path,bytes:bytes(data).length,sha256:await publisherHash(data)});
 const manifest={schema_version:1,kind:'startup_tarot_browser_distribution',release:structuredClone(review),source:{organization:envelope.organization,revision:envelope.revision,sha256:preview.source_hash,method:'browser-local-files'},private_owner_graphs_selected:false,scenario_inputs_selected:false,components};
 files.set('release-manifest.json',bytes(asJSON(manifest)));
 for(const [path,data] of files)if(path.startsWith('docs/')&&path.endsWith('.html'))files.set(path,bytes(decoder.decode(data).replace('<body>','<body><aside class="card">'+htmlEscape(review.brand+' '+review.version)+'. Examples in this guide are illustrative. See <a href="../DISTRIBUTION.md">this release’s data and notices</a>.</aside>')));
 const pwa=JSON.parse(decoder.decode(files.get('manifest.json')));pwa.name=review.brand;pwa.short_name=review.brand.slice(0,30);files.set('manifest.json',bytes(asJSON(pwa)));
 const releaseHash=await publisherHash(asJSON(manifest));let worker=decoder.decode(files.get('sw.js')).replace(/const CACHE_NAME = '[^']+';/,"const CACHE_NAME = 'founder-release-"+releaseHash.slice(0,16)+"';");files.set('sw.js',bytes(worker));
 const output=new Map();for(const [path,data] of files)output.set('browser-package/'+path,data);
 for(const [path,data] of [['manifest.json',asJSON(manifest)],['guide-pack.json',asJSON(envelope.bundle.pack)],['relationships.json',asJSON(envelope.bundle.relationships)],['DISTRIBUTION.md',notes]])output.set('data-bundle/'+path,bytes(data));
 const hashes=[];for(const [path,data] of files)hashes.push({path,sha256:await publisherHash(data)});
 output.set('browser-files.json',bytes(asJSON({schema_version:1,release_id:review.id,release_version:review.version,source_revision:envelope.revision,files:hashes})));
 return {files:output,manifest,filename:review.id+'-'+review.version+'.zip'};
}
export function publisherZip(files){
 publishingRequire(files instanceof Map&&files.size<=500,'At most 500 ZIP files.');let total=0,offset=0;const parts=[],central=[];
 const crc32=data=>{let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
 for(const [name,value] of [...files].sort(([a],[b])=>a.localeCompare(b))){
  publishingRequire(/^[a-zA-Z0-9_./-]+$/.test(name)&&!name.split('/').some(p=>!p||p==='.'||p==='..'),'Unsafe ZIP path.');const data=bytes(value),filename=bytes(name);total+=data.length;publishingRequire(total<=128*1024*1024,'ZIP exceeds 128 MiB.');
  const local=new Uint8Array(30),l=new DataView(local.buffer),dir=new Uint8Array(46),d=new DataView(dir.buffer),crc=crc32(data);
  l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(10,0,true);l.setUint16(12,33,true);l.setUint32(14,crc,true);l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);l.setUint16(26,filename.length,true);
  d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,filename.length,true);d.setUint32(42,offset,true);
  parts.push(local,filename,data);central.push(dir,filename);offset+=local.length+filename.length+data.length;
 }
 const centralSize=central.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.size,true);e.setUint16(10,files.size,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
 const result=new Uint8Array(offset+centralSize+22);let at=0;for(const part of [...parts,...central,end]){result.set(part,at);at+=part.length;}return result;
}

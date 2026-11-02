import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {exportRelease} from '../tools/export-release.mjs';
import {buildFiles} from '../tools/build-demo.mjs';
import {validateExportEnvelope,writeDistribution,buildDistribution} from '../tools/incubator-distribution.mjs';
import {distributionZip} from '../tools/distribution-zip.mjs';
import {configuredWorkspace} from '../js/lean.js';
import {requireReference} from './domain.mjs';

const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const owner=p=>JSON.stringify([p.org,p.subject]);
export class PublisherBuilds{
 constructor(service,{parent=new URL('../.local/publisher/',import.meta.url),now=()=>Date.now()}={}){this.service=service;this.parent=parent;this.now=now;this.jobs=new Map();this.building=false;}
 prune(){for(const [id,job] of this.jobs)if(job.expires<=this.now())this.jobs.delete(id);}
 job(p,id){this.prune();const job=this.jobs.get(id);requireReference(job&&job.owner===owner(p),'Preview or build expired or unavailable.',404);return job;}
 async exclusive(fn){requireReference(!this.building,'Another publisher build is running.',429);this.building=true;try{return await fn();}finally{this.building=false;}}
 async handle(p,action,body){
  requireReference(p.role==='admin','Administrator permission required.',403);this.prune();
  if(action==='publisher/clear'){for(const [id,j] of this.jobs)if(j.owner===owner(p))this.jobs.delete(id);return {cleared:true};}
  if(action==='publisher/download'){const j=this.job(p,body.build_id);requireReference(j.zip,'Select a completed release build.');return {bytes:j.zip,filename:j.filename};}
  if(action==='publisher/preview')return this.exclusive(async()=>{
   requireReference(this.jobs.size<12,'Too many active previews. Clear a preview first.',429);
   const envelope=validateExportEnvelope(await this.service.handle(p,'distribution/export',{revision:body.revision}));
   let scenario=null;
   if(body.scenario_id){const set=JSON.parse(await readFile(new URL('fixtures/openfor-illustrative.json',import.meta.url),'utf8'));scenario=set.cases.find(c=>c.id===body.scenario_id);requireReference(scenario,'Unknown illustrative scenario.');const research=envelope.bundle.pack.components?.research;requireReference(research?.snapshots.some(s=>s.id===scenario.context_snapshot_id)&&research.profiles.some(i=>i.id===scenario.investor_profile_id),'Scenario context is absent from this revision.');}
   const base=this.parent instanceof URL?this.parent:pathToFileURL(resolve(this.parent)+sep);await mkdir(base,{recursive:true});
   const directory=await mkdtemp(new URL('preview-',base)),browser=resolve(directory,'browser');await exportRelease({directory:browser,rebuild:false,recipient:true});
   const write=(path,data)=>writeFile(resolve(browser,path),data);
   await write('packs/guide-pack.json',JSON.stringify(envelope.bundle.pack));await write('data/relationships.json',JSON.stringify(envelope.bundle.relationships));
   const notice='OPERATOR PREVIEW — not approved for distribution. Revision '+envelope.revision+'. Changes are temporary; no live LLM or backend connection. '+(scenario?'ILLUSTRATIVE founder scenario: '+scenario.title+'. All scenario numbers and dates are invented; confirm, replace or remove.':'No illustrative founder inputs selected.');
   let html=await readFile(resolve(browser,'index.html'),'utf8');html=html.replace('<main id="screen-content">','<aside role="note" class="card">'+escape(notice)+(scenario?'<pre>'+escape(JSON.stringify(scenario.assumptions,null,2))+'</pre>':'')+'</aside><main id="screen-content">');await write('index.html',html);
   await write('README.md',notice);await write('DATA_LICENSE.md',notice+'\n'+JSON.stringify(envelope.bundle.pack.license));
   for(const file of ['README.md','LICENSE.md','SOURCES.md','THIRD_PARTY_NOTICES.md','DATA_NOTICE.md'])await write('packs/'+file,notice+'\nSee guide-pack.json for exact data rights and provenance.');
   await buildFiles(pathToFileURL(browser+sep));
   const state=configuredWorkspace(null,envelope.bundle.pack),seed=[];
   if(scenario){const a=scenario.assumptions;state.startup={business_model:a.sector.value==='hardware'?'hardware':'saas',current_stage:a.stage.value,validation_focus:'customer_problem',sectors:[a.sector.value],illustrative_scenario:scenario};state.selectedInvestorIds=[scenario.investor_profile_id];seed.push(['startup-guide-outreach:'+JSON.stringify([envelope.bundle.pack.provider?.id||'legacy',envelope.bundle.pack.id]),JSON.stringify({schema_version:1,query:{stage:a.stage.value,sector:a.sector.value,geography:a.geography.value,check:{amount:a.fundraising_target.value,currency:'USD'}},founder:{company:scenario.title,summary:'ILLUSTRATIVE ONLY: '+JSON.stringify(a)},entries:[]})]);}
   seed.push(['founder_gap_data',JSON.stringify(state)]);
   const shim='const previewMemory=new Map('+JSON.stringify(seed)+'); const localStorage={getItem:k=>previewMemory.get(k)??null,setItem:(k,v)=>previewMemory.set(k,String(v)),removeItem:k=>previewMemory.delete(k)}; const location={protocol:"file:",hostname:""};\n';
   const code=await readFile(resolve(browser,'js/app.bundle.js'),'utf8');await write('js/app.bundle.js',code.replace('"use strict";','"use strict";\n'+shim));
   const id=randomBytes(32).toString('hex'),expires=this.now()+20*60*1000;this.jobs.set(id,{owner:owner(p),envelope,scenario,browser,directory,expires});return {preview_id:id,url:'/preview/'+id+'/index.html',revision:envelope.revision,expires_at:new Date(expires).toISOString(),notice};
  });
  if(action==='publisher/build')return this.exclusive(async()=>{
   const preview=this.job(p,body.preview_id);requireReference(body.preview_reviewed===true&&body.revision===preview.envelope.revision,'Review the selected preview and its explicit revision first.');
   await this.service.handle(p,'distribution/export',{revision:body.revision});
   requireReference(this.jobs.size<12,'Too many active builds.',429);
   const artifact=resolve(preview.directory,'approved-'+randomBytes(8).toString('hex'));await writeDistribution(artifact,preview.envelope,body.release_review,{method:'authenticated-reference-api'});
   const built=await buildDistribution(artifact,{parent:preview.directory}),zip=await distributionZip(built),id=randomBytes(32).toString('hex');
   this.jobs.set(id,{owner:owner(p),zip,filename:body.release_review.id+'-'+body.release_review.version+'.zip',expires:preview.expires});return {build_id:id,filename:this.jobs.get(id).filename,bytes:zip.length,revision:body.revision,scenario_included:false};
  });
  requireReference(false,'Unknown publisher build action.',404);
 }
 async asset(path){
  this.prune();const match=/^\/preview\/([a-f0-9]{64})\/(.+)$/.exec(path),job=match&&this.jobs.get(match[1]);requireReference(job?.browser,'Preview expired or unavailable.',404);
  const file=match[2];requireReference(/^(?:index\.html|js\/app\.bundle\.js|packs\/(?:active-pack|relationships)\.js|(?:css|icons|assets|docs)\/[a-zA-Z0-9_.-]+)$/.test(file),'Unknown preview asset.',404);
  return {bytes:await readFile(resolve(job.browser,file)),type:file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.mp4')?'video/mp4':'text/plain; charset=utf-8'};
 }
}

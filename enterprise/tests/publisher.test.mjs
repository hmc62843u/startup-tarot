import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPublisherBundle,publisherAction} from '../publisher.mjs';
import {prepareOrganizationPacket} from '../domain.mjs';
import {validateStartupSnapshot} from '../../js/validator.js';
import {createReferenceServer,tokenHash} from '../server.mjs';
const admin={org:'example_alpha',subject:'operator',role:'admin'};
test('publisher sample preserves unknowns and historical graph separation',async()=>{
 const {bundle}=await publisherAction(admin,'publisher/sample',{sample:'openfor'}),report=checkPublisherBundle(bundle);
 assert.equal(report.ready_for_import,true);assert.equal(report.summary.profiles,2);assert.equal(report.summary.snapshots,5);assert.equal(report.summary.edges,6);
 const [geek,mono]=bundle.pack.components.research.profiles;
 assert.equal(geek.fit_claims.some(c=>['sector','check'].includes(c.field)),false);
 assert.equal(mono.fit_claims.find(c=>c.field==='check').max,300000);
 assert.ok(bundle.relationships.edges.every(e=>!e.from.includes('geek')&&!e.from.includes('monozukuri')&&e.type!=='knows'));
 const current=bundle.pack.components.research.snapshots.filter(s=>s.snapshot_date==='2026-10-31');
 assert.deepEqual(current.map(s=>s.company),['ad-dice','Citadel AI','Asenion']);
 assert.ok(current.every(s=>s.stage===null&&s.metrics.length===0&&s.fields.funding.value===null&&s.sources[0].published_date===null));
 assert.ok(report.warnings.some(w=>w.includes('no typed sector')));
 const bad=structuredClone(bundle);bad.pack.credentials={access_token:'do not distribute'};
 assert.equal(checkPublisherBundle(bad).ready_for_import,false);
 await assert.rejects(()=>publisherAction({...admin,role:'researcher'},'publisher/sample',{sample:'openfor'}),e=>e.status===403);
 await assert.rejects(()=>publisherAction(admin,'publisher/sample',{sample:'../../private'}));
});
test('publisher HTTP uses authenticated administrator routes without database mutation',async()=>{
 const token='p'.repeat(40),app=createReferenceServer({store:{get(){throw new Error('must not query store');}},config:{credentials:[{...admin,token_sha256:tokenHash(token)}]}});
 const origin=await app.listen(0);
 try{
  const request=(body,auth=token)=>fetch(origin+'/v1/publisher/sample',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth},body:JSON.stringify(body)});
  assert.equal((await request({sample:'openfor'},'x'.repeat(40))).status,401);
  assert.equal((await request({sample:'openfor',org:'another_org'})).status,403);
  const response=await request({sample:'openfor'});assert.equal(response.status,200);assert.equal((await response.json()).bundle.pack.id,'openfor_research_preview');
 }finally{await app.close();}
});

test('undated current startup sources cannot become historical evidence',async()=>{
 const {bundle}=await publisherAction(admin,'publisher/sample',{sample:'openfor'}),snapshot=bundle.pack.components.research.snapshots.find(s=>s.company==='Citadel AI');
 const input={assessment_date:'2026-10-31',question:'What product evidence and gaps are known?',packet_id:'current-observation',investor_ids:[],snapshot_ids:[snapshot.id]};
 const current=prepareOrganizationPacket(bundle,input);assert.ok(current.evidence_items.some(e=>e.record_id===snapshot.id));
 const historical=prepareOrganizationPacket(bundle,{...input,historical_cutoff:'2026-10-31'});assert.equal(historical.evidence_items.length,0);
 for(const publication of ['2026-02-31','unknown',undefined]){const bad=structuredClone(snapshot);bad.sources[0].published_date=publication;assert.equal(validateStartupSnapshot(bad).isValid,false);}
 const fictional=structuredClone(snapshot);fictional.data_kind='fictional';assert.equal(validateStartupSnapshot(fictional).isValid,false);
});

test('OpenFor illustrative inputs retain per-value labels and do not fill canonical gaps',async()=>{
 const scenario=await publisherAction(admin,'publisher/scenario',{}),{bundle}=await publisherAction(admin,'publisher/sample',{sample:'openfor'});
 assert.equal(scenario.kind,'openfor_illustrative_scenario');assert.equal(scenario.cases.length,3);
 for(const item of scenario.cases){
  assert.equal(item.entity_kind,'fictional');assert.ok(item.title.includes('fictional'));
  assert.ok(bundle.pack.components.research.profiles.some(p=>p.id===item.investor_profile_id));
  const snapshot=bundle.pack.components.research.snapshots.find(s=>s.id===item.context_snapshot_id);assert.ok(snapshot);
  assert.equal(snapshot.fields.funding.value,null);assert.equal(snapshot.fields.customers.value,null);assert.equal(snapshot.metrics.length,0);
  for(const a of Object.values(item.assumptions)){assert.equal(a.status,'illustrative_unverified');assert.ok(a.guidance.includes('Confirm, replace or remove'));assert.ok(a.unit);}
  const packet=prepareOrganizationPacket(bundle,{assessment_date:'2026-10-31',question:'Inspect hypothetical assumptions separately from facts.',packet_id:'illustrative',investor_ids:[item.investor_profile_id],snapshot_ids:[item.context_snapshot_id],startup_context:{data_kind:'illustrative_scenario',notice:scenario.notice,illustrative_assumptions:item.assumptions}});
  assert.equal(packet.startup_context.illustrative_assumptions.fundraising_target.status,'illustrative_unverified');
  assert.ok(packet.evidence_items.every(e=>e.basis!=='fictional'));
 }
 await assert.rejects(()=>publisherAction({...admin,role:'researcher'},'publisher/scenario',{}),e=>e.status===403);
});

test('operator scenario journey applies labelled inputs and clears them on disconnect',async()=>{
 const vm=await import('node:vm'),{readFile}=await import('node:fs/promises'),ids={};
 const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8'),code=await readFile(new URL('../web/app.js',import.meta.url),'utf8');
 class Element{constructor(){this.value='';this.textContent='';this.children=[];this.handlers={};}addEventListener(k,f){this.handlers[k]=f;}append(o){this.children.push(o);}replaceChildren(){this.children=[];}get selectedOptions(){return this.children.filter(o=>o.selected);}async click(){await this.handlers.click?.();}}
 for(const match of html.matchAll(/id="([^"]+)"/g))ids[match[1]]=new Element();
 const {bundle}=await publisherAction(admin,'publisher/sample',{sample:'openfor'});let writes=0;
 const fetchImpl=async(url,options)=>{if(url==='/v1/publisher/clear')return Response.json({cleared:true});if(url==='/v1/dataset')return Response.json({revision:'sample-revision',bundle});if(url==='/v1/publisher/scenario')return Response.json(await publisherAction(admin,'publisher/scenario',{}));writes++;throw new Error('Unexpected mutation');};
 vm.runInNewContext(code,{document:{getElementById:id=>ids[id],createElement:()=>new Element(),querySelectorAll:()=>Object.values(ids)},fetch:fetchImpl,URL,Blob,setTimeout});
 ids.token.value='admin';await ids.connect.click();await ids['load-scenarios'].click();await ids['apply-scenario'].click();
 const context=JSON.parse(ids.context.value);assert.equal(context.data_kind,'illustrative_scenario');assert.equal(context.amount,150000);assert.equal(context.illustrative_assumptions.monthly_revenue.status,'illustrative_unverified');
 assert.ok(ids.question.value.includes('ILLUSTRATIVE SCENARIO'));assert.equal(ids.snapshots.selectedOptions[0].value,'ad_dice_2026_10_31');assert.equal(writes,0);
 await ids.disconnect.click();assert.equal(ids.context.value,'{}');assert.equal(ids['scenario-case'].children.length,0);assert.equal(ids['scenario-details'].textContent,'No illustrative scenario loaded.');
});

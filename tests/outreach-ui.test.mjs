import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const bundle=await readFile(new URL('js/app.bundle.js',root),'utf8');
const pack=JSON.parse(await readFile(new URL('packs/guide-pack.json',root)));

const relationships={research:JSON.parse(await readFile(new URL('data/relationships.json',root))),fictional:JSON.parse(await readFile(new URL('data/relationships-demo.json',root)))};

// Minimal DOM adapter for event wiring and persistence checks, not visual/browser QA.
class TestElement{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.handlers={};this.value='';this.textContent='';this.classList={toggle(){}};this.parentElement={};}
 setAttribute(k,v){this[k]=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
 addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
 emit(name){return Promise.all((this.handlers[name]||[]).map(fn=>fn({preventDefault(){},target:this})));}
 click(){if(!this.disabled)return this.emit('click');}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 querySelectorAll(selector){return walk(this).filter(el=>selector==='[data-entry-id]'&&el.dataset.entryId);}
 get options(){return this.children.filter(e=>e.tagName==='option');}
 get selectedOptions(){return this.options.filter(e=>e.selected);}
 focus(){} setSelectionRange(){} showModal(){this.open=true;} close(){this.open=false;} remove(){}
}
function walk(root){return root.children.flatMap(child=>[child,...walk(child)]);}
class FixedDate extends Date { constructor(...args){super(...(args.length?args:['2026-10-30T12:00:00Z']));} }
function startBrowserModel(data=new Map(),failWrites=false,options={}){
 const ids={},elements=[];
 for(const match of (options.html||html).matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
   const el=new TestElement(match[1]);for(const attr of match[2].matchAll(/([\w-]+)="([^"]*)"/g))el.setAttribute(attr[1],attr[2]);
   if(el.id)ids[el.id]=el;elements.push(el);
 }
 const document={readyState:'complete',currentScript:{src:'file:///test/js/app.bundle.js'},body:new TestElement('body'),
   getElementById:id=>{assert.ok(ids[id],'Unknown element '+id);return ids[id];},createElement:tag=>new TestElement(tag),
   querySelector:selector=>elements.find(e=>selector==='[data-screen="shortlist"]'&&e.dataset.screen==='shortlist'),
   querySelectorAll:selector=>elements.filter(e=>selector==='[data-screen]'?e.dataset.screen:selector==='[data-view]'?e.dataset.view:selector==='[data-step]'?e.dataset.step:selector==='#situation-form, #plan-form'?['situation-form','plan-form'].includes(e.id):false)};
 const downloads=[];class DownloadURL extends URL {static createObjectURL(blob){downloads.push(blob);return 'blob:test';}static revokeObjectURL(){}}
 const localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{if(failWrites)throw new Error('quota');data.set(key,value);}};
 const context={document,localStorage,STARTUP_GUIDE_PACK:structuredClone(options.pack||pack),STARTUP_GUIDE_RELATIONSHIPS:structuredClone(options.relationships||relationships),structuredClone,URL:DownloadURL,Date:FixedDate,console,navigator:{},fetch:options.fetchImpl,AbortController,location:options.fetchImpl?{protocol:'http:',hostname:'127.0.0.1'}:{protocol:'file:'},window:{scrollTo(){},addEventListener(){}},confirm:()=>true,setTimeout:fn=>fn(),Blob,TextEncoder,crypto:globalThis.crypto};
 vm.runInNewContext(options.bundle||bundle,context);
 return {ids,data,document,context,downloads,buttons:()=>walk(ids['shortlist-results']).filter(e=>e.tagName==='button')};
}
function compare(ui){
 Object.assign(ui.ids['fit-sector'],{value:'software as a service'});ui.ids['fit-stage'].value='pre-seed';ui.ids['fit-geography'].value='US';ui.ids['fit-amount'].value='150000';ui.ids['fit-currency'].value='USD';
 ui.ids['fit-form'].emit('submit');
}

test('simulated DOM: fictional collection explains every exclusion instead of an unexplained empty result',async()=>{
 const fixture=JSON.parse(await readFile(new URL('enterprise/fixtures/alpha.json',root)));
 const ui=startBrowserModel(new Map(),false,{pack:fixture.pack});compare(ui);
 assert.ok(ui.ids['fit-summary'].textContent.includes('0 equity profiles assessed; 4 excluded'));
 const text=walk(ui.ids['fit-results']).map(e=>e.textContent).join('\n');
 for(const profile of fixture.pack.components.research.profiles)assert.ok(text.includes(profile.name));
 assert.ok(text.includes('fictional, or non-equity'));assert.ok(text.includes('Use a research collection'));
 assert.ok(!walk(ui.ids['fit-results']).some(e=>e.textContent==='Save to shortlist'));
});
test('simulated DOM: compare, save, draft, reload and evidence review preserve founder work',()=>{
 const ui=startBrowserModel();compare(ui);
 assert.ok(ui.ids['fit-summary'].textContent.includes('Strong documented alignment: 1'));
 const save=walk(ui.ids['fit-results']).find(e=>e.tagName==='button'&&e.textContent==='Save to shortlist');assert.ok(save);save.click();
 ui.ids['open-shortlist'].click();assert.equal(ui.ids['founder-company'].value,'');
 ui.ids['founder-company'].value='Test Company';ui.ids['founder-name'].value='Founder';ui.ids['founder-summary'].value='Software for teams';ui.ids['founder-progress'].value='Three pilots';
 const notes=walk(ui.ids['shortlist-results']).find(e=>e.dataset.entryField==='notes');notes.value='Check full-time requirement';
 ui.buttons().find(e=>e.textContent==='Prepare outreach draft').click();
 const draft=walk(ui.ids['shortlist-results']).find(e=>e.dataset.entryField==='draft');assert.ok(draft.value.includes('Three pilots'));draft.value+='\nMy edit';
 ui.buttons().find(e=>e.textContent==='Save shortlist edits').click();
 const reloaded=startBrowserModel(ui.data);reloaded.ids['open-shortlist'].click();
 assert.equal(reloaded.ids['founder-company'].value,'Test Company');
 assert.equal(walk(reloaded.ids['shortlist-results']).find(e=>e.dataset.entryField==='notes').value,'Check full-time requirement');
 assert.ok(walk(reloaded.ids['shortlist-results']).find(e=>e.dataset.entryField==='draft').value.endsWith('My edit'));
 reloaded.ids['shortlist-back'].click();reloaded.ids['fit-stage'].value='seed';reloaded.ids['open-shortlist'].click();
 assert.ok(walk(reloaded.ids['shortlist-results']).some(e=>e.textContent.startsWith('Review required:')));
 assert.equal(reloaded.buttons().find(e=>e.textContent==='Prepare outreach draft').disabled,true);
});
test('simulated DOM: storage failures are visible and do not pretend a save succeeded',()=>{
 const ui=startBrowserModel(new Map(),true);compare(ui);
 const save=walk(ui.ids['fit-results']).find(e=>e.textContent==='Save to shortlist');save.click();
 assert.ok(ui.ids['app-status'].textContent.includes('Could not save shortlist'));assert.equal(ui.data.size,0);
});
test('simulated DOM: archive is reversible, export keeps notes, and stale tabs cannot overwrite',async()=>{
 const first=startBrowserModel(),older=startBrowserModel(first.data);compare(first);compare(older);
 walk(first.ids['fit-results']).find(e=>e.textContent==='Save to shortlist').click();
 walk(older.ids['fit-results']).find(e=>e.textContent==='Save to shortlist').click();
 assert.ok(older.ids['app-status'].textContent.includes('another tab'));
 first.ids['open-shortlist'].click();first.buttons().find(e=>e.textContent==='Archive investor').click();
 assert.equal(first.buttons().length,0);first.ids['toggle-archived'].click();
 first.buttons().find(e=>e.textContent==='Restore investor').click();first.ids['toggle-archived'].click();
 assert.ok(first.buttons().some(e=>e.textContent==='Prepare outreach draft'));
 walk(first.ids['shortlist-results']).find(e=>e.dataset.entryField==='notes').value='My verification note';
 first.ids['export-shortlist'].click();assert.equal(first.downloads.length,1);
 const text=await first.downloads[0].text();assert.ok(text.includes('My verification note'));assert.ok(text.includes('hustlefund.vc'));
});
test('simulated DOM: corrupt shortlist remains untouched and can be downloaded for recovery',async()=>{
 const first=startBrowserModel();compare(first);walk(first.ids['fit-results']).find(e=>e.textContent==='Save to shortlist').click();
 const key=[...first.data.keys()].find(k=>k.startsWith('startup-guide-outreach:'));first.data.set(key,'{broken');
 const ui=startBrowserModel(first.data);ui.ids['open-shortlist'].click();
 assert.equal(ui.ids['recovery-backup'].hidden,false);ui.ids['recovery-backup'].click();
 assert.equal(await ui.downloads[0].text(),'{broken');ui.ids['founder-form'].emit('submit');assert.equal(first.data.get(key),'{broken');
});
test('simulated DOM: research packet, rejected citations, saved feedback and revision survive reload',()=>{
 const ui=startBrowserModel();compare(ui);ui.ids['open-research'].click();
 ui.ids['research-question'].value='What demand evidence should we investigate?';
 ui.ids['research-investors'].options.find(o=>o.value==='hustle_fund_current_001').selected=true;
 ui.ids['research-snapshots'].options.find(o=>o.value==='doordash_2013_01_12').selected=true;
 ui.ids['research-form'].emit('submit');
 const packet=JSON.parse(ui.ids['research-packet'].textContent);assert.equal(packet.records.length,2);
 const response={packet_id:packet.packet_id,output_version:'1',summary:'Investigate demand and confirm eligibility.',findings:[{statement:'Source-backed criterion for reviewer inspection.',evidence_ids:['invented']}],interpretations:[],hypotheses:[],unknowns:['Founder demand evidence missing.'],contradictions:[],proposed_investigations:[],historical_comparisons:[],caveats:['No funding prediction.'],change_summary:'Initial analysis.'};
 ui.ids['research-manual-response'].value=JSON.stringify(response);ui.ids['research-review-manual'].click();assert.ok(ui.ids['research-status'].textContent.includes('nonexistent'));
 response.findings[0].evidence_ids=[packet.evidence_items[0].evidence_id];ui.ids['research-manual-response'].value=JSON.stringify(response);ui.ids['research-review-manual'].click();
 const key=[...ui.data.keys()].find(k=>k.startsWith('startup-guide-research:'));assert.ok(key);
 let history=JSON.parse(ui.data.get(key));assert.equal(history.runs.length,1);
 ui.ids['research-feedback'].value='Challenge: our demand evidence is stronger.';ui.ids['research-save-feedback'].click();
 const reloaded=startBrowserModel(ui.data);reloaded.ids['open-research'].click();history=JSON.parse(ui.data.get(key));
 assert.equal(history.runs[0].feedback.length,1);reloaded.ids['research-parent'].value=history.runs[0].id;reloaded.ids['research-parent'].emit('change');
 reloaded.ids['research-new-finding'].value='A founder-supplied new customer interview.';reloaded.ids['research-finding-url'].value='https://example.org/interview';reloaded.ids['research-form'].emit('submit');
 const revision=JSON.parse(reloaded.ids['research-packet'].textContent);assert.equal(revision.previous_revision.run_id,history.runs[0].id);
 assert.ok(revision.evidence_items.some(e=>e.basis==='unverified_working_finding'));
 reloaded.ids['research-manual-response'].value=JSON.stringify({...response,packet_id:revision.packet_id,change_summary:'Review the new working finding.'});reloaded.ids['research-review-manual'].click();
 history=JSON.parse(ui.data.get(key));assert.equal(history.runs.length,2);assert.equal(history.runs[1].parent_id,history.runs[0].id);assert.equal(history.runs[0].output.change_summary,'Initial analysis.');
});

test('simulated DOM: public multi-hop paths feed inspectable research and fictional paths cannot',()=>{
 const ui=startBrowserModel();ui.ids['open-relationships'].click();
 ui.ids['relationship-query'].click();
 const use=walk(ui.ids['relationship-results']).find(e=>e.tagName==='button'&&e.textContent==='Add this public path to research');assert.ok(use);use.click();
 ui.ids['research-question'].value='What does the historical Airbnb activity trail establish?';ui.ids['research-form'].emit('submit');
 const packet=JSON.parse(ui.ids['research-packet'].textContent);assert.equal(packet.linked_records.length,4);assert.equal(packet.evidence_items.filter(e=>e.record_id?.startsWith('relationship:')).length,3);
 ui.ids['open-relationships'].click();ui.ids['relationship-dataset'].value='fictional';ui.ids['relationship-dataset'].emit('change');ui.ids['relationship-query'].click();
 const demoUse=walk(ui.ids['relationship-results']).find(e=>e.tagName==='button');assert.ok(demoUse);assert.equal(demoUse.disabled,true);
 ui.ids['network-analyze'].click();assert.ok(walk(ui.ids['network-results']).some(e=>e.textContent==='1.000'));
});

test('simulated DOM: model-directed graph exploration requires consent, resets it and saves the exact expanded packet',async()=>{
 const requests=[];const ui=startBrowserModel(new Map(),false,{fetchImpl:async(url,options)=>{
  const body=JSON.parse(options.body);requests.push({url,body});
  if(url==='/api/graph-plan')return Response.json({model:'test-model',prompt_version:'graph-plan-1',output:{summary:'Inspect historical activity.',queries:[{kind:'path',from:'investor:yc_accelerator_001',to:'activity:airbnb_user_visits',max_hops:4,projection:null,reason:'Inspect the activity trail.'}]}});
  return Response.json({model:'test-model',output:{packet_id:body.packet.packet_id,output_version:'1',summary:'Review the historical activity evidence.',findings:[{statement:'A documented activity exists.',evidence_ids:[body.packet.evidence_items[0].evidence_id]}],interpretations:[],hypotheses:[],unknowns:[],contradictions:[],proposed_investigations:[],historical_comparisons:[],caveats:['Not causal proof.'],change_summary:'Initial.'}});
 }});
 ui.ids['open-research'].click();ui.ids['research-question'].value='Which historical activity is documented?';ui.ids['research-form'].emit('submit');ui.ids['research-model'].value='test-model';
 const original=JSON.parse(ui.ids['research-packet'].textContent);await ui.ids['research-explore'].click();assert.equal(requests.length,0);
 ui.ids['research-consent'].checked=true;await ui.ids['research-explore'].click();assert.equal(requests.length,1);assert.equal(ui.ids['research-consent'].checked,false);
 const expanded=JSON.parse(ui.ids['research-packet'].textContent);assert.notEqual(expanded.packet_id,original.packet_id);assert.equal(expanded.evidence_items.length,3);assert.equal(expanded.graph_exploration.results.length,1);assert.equal(ui.ids['research-explore'].disabled,true);
 await ui.ids['research-run'].click();assert.equal(requests.length,1);ui.ids['research-consent'].checked=true;await ui.ids['research-run'].click();assert.equal(requests.length,2);
 const key=[...ui.data.keys()].find(k=>k.startsWith('startup-guide-research:'));assert.deepEqual(JSON.parse(ui.data.get(key)).runs[0].packet,expanded);
});

test('simulated DOM: rejected graph plans and cancellation preserve the original evidence packet',async()=>{
 let abort=false;const ui=startBrowserModel(new Map(),false,{fetchImpl:async(url,options)=>{
   if(abort)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError'))));
   return Response.json({output:{summary:'Invalid request.',queries:[{kind:'path',from:'invented',to:'activity:airbnb_user_visits',max_hops:4,projection:null,reason:'Test rejection.'}]}});
 }});
 ui.ids['open-research'].click();ui.ids['research-question'].value='Inspect public evidence.';ui.ids['research-form'].emit('submit');ui.ids['research-model'].value='test-model';ui.ids['research-consent'].checked=true;
 const original=ui.ids['research-packet'].textContent;await ui.ids['research-explore'].click();assert.equal(ui.ids['research-packet'].textContent,original);assert.ok(ui.ids['research-status'].textContent.includes('Invalid bounded'));
 abort=true;ui.ids['research-consent'].checked=true;const pending=ui.ids['research-explore'].click();ui.ids['research-cancel'].click();await pending;
 assert.equal(ui.ids['research-packet'].textContent,original);assert.ok(ui.ids['research-status'].textContent.includes('cancelled'));assert.equal(ui.ids['research-consent'].checked,false);
});

test('operator browser package initializes and queries its own fictional graph with backend unavailable',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{resolve,sep,basename}=await import('node:path');
 const {writeDistribution,buildDistribution}=await import('../tools/incubator-distribution.mjs');
 const directory=await mkdtemp(resolve(tmpdir(),'startup-operator-ui-'));t.after(async()=>{assert.ok(directory.startsWith(resolve(tmpdir())+sep)&&basename(directory).startsWith('startup-operator-ui-'));await rm(directory,{recursive:true,force:true});});
 const custom=JSON.parse(await readFile(new URL('enterprise/fixtures/alpha.json',root),'utf8')),review=JSON.parse(await readFile(new URL('enterprise/fixtures/distribution-review.json',root),'utf8'));
 custom.pack.id='operator_guide';custom.pack.provider.id='operator_provider';custom.relationships.pack_id=custom.pack.id;custom.relationships.provider_id=custom.pack.provider.id;
 custom.relationships.nodes.find(n=>n.id==='demo:a').id='operator:origin';for(const edge of custom.relationships.edges){if(edge.from==='demo:a')edge.from='operator:origin';if(edge.to==='demo:a')edge.to='operator:origin';}
 await writeDistribution(resolve(directory,'data-bundle'),{schema_version:1,organization:'operator_alpha',revision:'chosen-revision',bundle:custom},review);
 const result=await buildDistribution(resolve(directory,'data-bundle'),{parent:directory});
 const ui=startBrowserModel(new Map(),false,{html:await readFile(resolve(result.browser,'index.html'),'utf8'),bundle:await readFile(resolve(result.browser,'js/app.bundle.js'),'utf8'),pack:custom.pack,relationships:{research:null,fictional:custom.relationships}});
 let requests=0;ui.context.fetch=()=>{requests++;throw new Error('Backend unavailable.');};ui.ids['open-relationships'].click();
 assert.equal(ui.ids['relationship-dataset'].value,'fictional');assert.equal(ui.ids['relationship-from'].value,'operator:origin');ui.ids['relationship-query'].click();
 assert.ok(walk(ui.ids['relationship-results']).some(e=>e.textContent.startsWith('1 paths')));assert.equal(requests,0);
 assert.equal(walk(ui.ids['relationship-results']).find(e=>e.tagName==='button').disabled,true);
});

function responseFor(packet){return {packet_id:packet.packet_id,output_version:'1',summary:'Investigate the proposed problem.',findings:[],interpretations:[],hypotheses:[],unknowns:['Demand is unverified.'],contradictions:[],proposed_investigations:[{question:'Interview five target users.',why:'Test whether the problem recurs.',evidence_ids:[],basis:'general_method',expected_observation:'Examples of current workarounds.',review_condition:'Change direction if the problem is not recurring.'}],historical_comparisons:[],caveats:['Not outcome evidence.'],change_summary:'Initial.'};}
function savedExperimentUi(){
 const startup={business_model:'saas',current_stage:'pre-seed',validation_focus:'demand'},key=JSON.stringify(['pre-seed',[],null,null,null,'saas','demand']);
 const original={experiment:{question:'Original question',action:'Original action',evidenceNeeded:'Original evidence',outcome:'continue'},status:'in_progress',notes:'Original learning',startupKey:key,taskKey:null,basisLensKey:'[]',planTitle:'User milestone'};
 const data=new Map([['founder_gap_data',JSON.stringify({startup,activeLibrary:'research',researchLibrary:pack,selectedInvestorIds:[],suggestionChoices:{},taskProgress:{'suggestion:next-milestone':original}})]]);
 const ui=startBrowserModel(data);ui.ids['research-move'].click();ui.ids['research-form'].emit('submit');const packet=JSON.parse(ui.ids['research-packet'].textContent);ui.ids['research-manual-response'].value=JSON.stringify(responseFor(packet));ui.ids['research-review-manual'].click();return ui;
}
test('contextual research is available from all four tabs with no automatic model calls',()=>{
 const ui=startBrowserModel();let calls=0;ui.context.fetch=()=>{calls++;throw new Error('No helper.');};
 ui.ids['business-model'].value='saas';ui.ids['current-stage'].value='pre-seed';ui.ids['validation-focus'].value='demand';ui.ids['situation-form'].emit('submit');
 for(const [view,id] of [['situation','research-situation'],['move','research-move'],['startup','research-startup'],['investor','research-investor']]){
  ui.document.querySelectorAll('[data-view]').find(tab=>tab.dataset.view===view).click();ui.ids[id].click();
  assert.ok(ui.ids['research-question'].value);const captured=JSON.parse(ui.ids['research-source-context'].textContent);assert.equal(captured.origin.view,view);assert.ok(ui.ids['research-mode'].textContent.includes('Browser-only'));
  ui.ids['research-form'].emit('submit');const packet=JSON.parse(ui.ids['research-packet'].textContent);assert.equal(packet.source_context.origin.view,view);assert.equal(packet.startup_context.stage,'pre-seed');assert.equal(ui.ids['research-consent'].checked,false);
  if(view==='startup')assert.equal(packet.selection_manifest.selected_snapshot_ids.length,1);if(view==='investor')assert.equal(packet.selection_manifest.selected_investor_ids.length,1);
 }
 assert.equal(calls,0);assert.equal(ui.document.querySelectorAll('[data-view]').find(tab=>tab.dataset.view==='research')['aria-pressed'],'true');
});
test('review, cancel, edited acceptance and reload preserve a linked experiment and its prior learning',()=>{
 const ui=savedExperimentUi(),before=ui.data.get('founder_gap_data');let review=walk(ui.ids['research-output']).find(e=>e.textContent==='Review as experiment');assert.ok(review);assert.equal(review.disabled,false);
 review.click();assert.equal(ui.ids['research-proposal-dialog'].open,true);assert.equal(ui.data.get('founder_gap_data'),before);ui.ids['research-proposal-cancel'].click();assert.equal(ui.data.get('founder_gap_data'),before);
 review.click();ui.ids['research-proposal-action'].value='Founder-edited test action';ui.ids['research-proposal-form'].emit('submit');
 const saved=JSON.parse(ui.data.get('founder_gap_data')).taskProgress['suggestion:next-milestone'];assert.equal(saved.experiment.action,'Founder-edited test action');assert.equal(saved.researchApplications.length,1);assert.equal(saved.researchApplications[0].previous.experiment.action,'Original action');assert.equal(saved.researchApplications[0].previous.notes,'Original learning');assert.equal(saved.status,'todo');assert.equal(ui.ids['research-proposal-dialog'].open,false);
 const reloaded=startBrowserModel(ui.data);assert.ok(reloaded.ids['move-kind'].textContent.includes('research linked'));reloaded.ids['move-action'].click();assert.ok(walk(reloaded.ids['plan-research-history']).some(e=>e.textContent==='Inspect linked research'));
 walk(reloaded.ids['plan-research-history']).find(e=>e.textContent==='Inspect linked research').click();assert.ok(walk(reloaded.ids['research-output']).some(e=>e.textContent.includes('Source: Next move')));
 const history=JSON.parse([...ui.data.entries()].find(([key])=>key.startsWith('startup-guide-research:'))[1]);assert.equal(history.runs[0].source_context.origin.view,'move');assert.equal(history.runs[0].source_context.origin.task_id,'suggestion:next-milestone');
});
test('another tab changing a plan blocks proposal acceptance without overwriting it',()=>{
 const ui=savedExperimentUi();walk(ui.ids['research-output']).find(e=>e.textContent==='Review as experiment').click();
 const changed=JSON.parse(ui.data.get('founder_gap_data'));changed.taskProgress['suggestion:next-milestone'].notes='Other tab learning';ui.data.set('founder_gap_data',JSON.stringify(changed));ui.ids['research-proposal-form'].emit('submit');
 assert.ok(ui.ids['research-proposal-status'].textContent.includes('Another tab'));assert.equal(JSON.parse(ui.data.get('founder_gap_data')).taskProgress['suggestion:next-milestone'].notes,'Other tab learning');assert.equal(ui.ids['research-proposal-dialog'].open,true);
});

test('a failed plan save retains both the old plan and the editable proposal',()=>{
 const ui=savedExperimentUi(),before=ui.data.get('founder_gap_data');walk(ui.ids['research-output']).find(e=>e.textContent==='Review as experiment').click();ui.ids['research-proposal-action'].value='My unsaved proposal';
 const setItem=ui.context.localStorage.setItem;ui.context.localStorage.setItem=(key,value)=>{if(key==='founder_gap_data')throw new Error('quota');setItem(key,value);};ui.ids['research-proposal-form'].emit('submit');
 assert.equal(ui.data.get('founder_gap_data'),before);assert.equal(ui.ids['research-proposal-action'].value,'My unsaved proposal');assert.equal(ui.ids['research-proposal-dialog'].open,true);assert.ok(ui.ids['research-proposal-status'].textContent.includes('Could not save'));
});


test('network summary explains included evidence and retains machine-readable export',async()=>{
 const ui=startBrowserModel();ui.ids['open-relationships'].click();ui.ids['network-analyze'].click();
 const text=walk(ui.ids['network-results']).map(e=>e.textContent).join('\n');
 assert.ok(text.includes('Documented same-round co-investment: 1 investor connection'));
 assert.ok(text.includes('Coverage is incomplete.'));assert.ok(!text.includes('Coverage: {'));assert.ok(!text.includes('same_round |'));
 const exportButton=walk(ui.ids['network-results']).find(e=>e.textContent==='Export this public/demonstration analysis');exportButton.click();
 const result=JSON.parse(await ui.downloads.at(-1).text());assert.equal(result.projection,'same_round');assert.equal(result.links.length,1);assert.equal(result.coverage.complete,false);
 const sample=JSON.parse(await readFile(new URL('enterprise/fixtures/openfor-research.json',root),'utf8'));
 const empty=startBrowserModel(new Map(),false,{pack:sample.pack,relationships:{research:sample.relationships,fictional:null}});empty.ids['open-relationships'].click();empty.ids['network-analyze'].click();
 assert.ok(walk(empty.ids['network-results']).some(e=>e.textContent.startsWith('No investor pairs share a documented round')));
});

test('preview storage wording stays temporary on load and save while normal app stays persistent',async()=>{
 const {buildPublisher}=await import('../tools/build-publisher.mjs'),{publisherInput,publisherPreview}=await import('../publisher/core.js');
 const built=await buildPublisher({local:false}),context={};vm.runInNewContext(await readFile((await import('node:path')).resolve(built.output,'template.js'),'utf8'),context);
 const template=context.STARTUP_PUBLISHER_TEMPLATE,preview=await publisherPreview(template,publisherInput(template.samples.fictional));
 const scripts=[...preview.html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 const ui=startBrowserModel(new Map(),false,{html:preview.html,bundle:scripts.at(-1)[1],pack:template.samples.fictional.pack});
 assert.ok(ui.ids['app-status'].textContent.includes('Temporary preview'));
 ui.ids['save-fit-profile'].click();assert.ok(ui.ids['app-status'].textContent.includes('Temporary preview'));
 assert.ok(preview.html.includes('Save your profile for this temporary preview session only.'));
 assert.equal(startBrowserModel().ids['app-status'].textContent,'Saved in this browser.');
});

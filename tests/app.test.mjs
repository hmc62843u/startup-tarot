import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {buildEntry} from '../tools/build-demo.mjs';
import {configuredWorkspace, workspaceForSave, leanModel, saveLeanPlan} from '../js/lean.js';
import {researchRecords, researchWorkspaceKey} from '../js/research-library.js';
const root=new URL('../',import.meta.url);
const real=JSON.parse(await readFile(new URL('packs/guide-pack.json',root)));
const demo=JSON.parse(await readFile(new URL('packs/demo-guide-pack.json',root)));
const context={business_model:'marketplace',current_stage:'idea',validation_focus:'demand',sectors:['marketplace']};
test('browser entry and configured pack are reproducible, separate local scripts',async()=>{
 const {bundle,hash}=await buildEntry();assert.equal(bundle,await readFile(new URL('js/app.bundle.js',root),'utf8'));
 const sandbox={};vm.runInNewContext(await readFile(new URL('packs/active-pack.js',root),'utf8'),sandbox);
 assert.equal(JSON.stringify(sandbox.STARTUP_GUIDE_PACK),JSON.stringify(real));
 const html=await readFile(new URL('index.html',root),'utf8');assert.ok(html.includes('v='+hash));assert.ok(!bundle.includes('__DEFAULT_RESEARCH__'));
 assert.ok(html.indexOf('packs/active-pack.js')<html.indexOf('js/app.bundle.js'));
 assert.ok(!html.includes('workspace-settings'));assert.ok(!html.includes('type="file"'));
});
test('fresh configured pack starts empty and old demo work is archived without leaking into research',()=>{
 const old={activeLibrary:'demo',startup:context,taskProgress:{legacy:{notes:'KEEP'}},selectedInvestorIds:['demo_discovery']};
 const s=configuredWorkspace(old,real);assert.deepEqual(s.taskProgress,{});assert.deepEqual(s.selectedInvestorIds,[]);
 const saved=workspaceForSave(s,old);assert.equal(saved.libraryWorkspaces.demo.taskProgress.legacy.notes,'KEEP');
});
test('existing research plans and notes survive migration to one configured pack',()=>{
 const old={activeLibrary:'research',researchLibrary:real,startup:context,taskProgress:{keep:{notes:'PERSIST'}},selectedInvestorIds:['firstminute_vc_seed_001']};
 const s=configuredWorkspace(old,real);assert.equal(s.taskProgress.keep.notes,'PERSIST');assert.equal(s.startup.business_model,'marketplace');
});
test('switching configured pack identities isolates work and restores it on return',()=>{
 let s=configuredWorkspace(null,real);s.taskProgress.keep={notes:'REAL'};s=workspaceForSave(s,null);
 let next=configuredWorkspace(s,demo);assert.deepEqual(next.taskProgress,{});next.taskProgress.keep={notes:'DEMO'};next=workspaceForSave(next,s);
 const back=configuredWorkspace(next,real);assert.equal(back.taskProgress.keep.notes,'REAL');
 assert.equal(back.libraryWorkspaces[researchWorkspaceKey(demo)].taskProgress.keep.notes,'DEMO');
});
test('startup-only researched move retains its source and does not fabricate investor alignment',()=>{
 const s=configuredWorkspace(null,real);s.startup=context;const r=researchRecords(real),m=leanModel(s,r.profiles,r.snapshots);
 assert.equal(m.nextAction.heading,'A startup example to explore');assert.ok(m.connectedSnapshots.some(s=>s.company.includes('DoorDash')));
 assert.ok(m.sourceList.every(s=>s.kind!=='investor'));
});
test('fictional complete, investor-only, snapshot-only and neither remain distinct',()=>{
 const r=researchRecords(demo),s=configuredWorkspace(null,demo);s.startup=context;s.selectedInvestorIds=['demo_discovery'];
 assert.equal(leanModel(s,r.profiles,r.snapshots).support.kind,'connected');
 s.startup={...context,business_model:'hardware'};assert.equal(leanModel(s,r.profiles,r.snapshots).support.kind,'investor_only');
 s.startup=context;s.selectedInvestorIds=['demo_formation'];assert.equal(leanModel(s,r.profiles,r.snapshots).support.kind,'snapshot_only');
 s.startup={...context,business_model:'hardware'};assert.equal(leanModel(s,r.profiles,r.snapshots).support.kind,'neither');
});
test('saving a compact plan retains optional legacy fields and ownership metadata',()=>{
 const s=configuredWorkspace(null,real);s.startup=context;const r=researchRecords(real),m=leanModel(s,r.profiles,r.snapshots),task=m.task;
 const plan={question:'keep question',action:'Try one test',reviewDate:'2026-11-03',continueWhen:'keep condition'};
 const record=saveLeanPlan(s,task,{experiment:plan,notes:'TEST-LEAN-01',status:'in_progress'});
 assert.equal(record.experiment.reviewDate,'2026-11-03');assert.equal(record.notes,'TEST-LEAN-01');assert.ok(record.startupKey);assert.ok(record.basisLensKey);assert.ok(record.updatedAt);
});

test('active workspace wins over an older archived copy; saved experiments remain reachable after context changes',()=>{
 const r=researchRecords(real),key=researchWorkspaceKey(real);
 const old={activeLibrary:'research',researchLibrary:real,startup:context,taskProgress:{keep:{notes:'LATEST'}},libraryWorkspaces:{[key]:{taskProgress:{keep:{notes:'OLD'}}}}};
 assert.equal(configuredWorkspace(old,real).taskProgress.keep.notes,'LATEST');
 const state=configuredWorkspace(null,real);state.startup=context;
 let m=leanModel(state,r.profiles,r.snapshots);const task=m.task;
 state.taskProgress[task.id]=saveLeanPlan(state,task,{experiment:{action:'KEEP MY PLAN',outcome:'continue'},notes:'KEPT',status:'evidence_recorded'});
 state.startup={...context,current_stage:'growth',business_model:'hardware'};
 m=leanModel(state,r.profiles,r.snapshots);assert.equal(m.nextAction.taskId,task.id);assert.equal(m.nextAction.savedExperiment,true);
});

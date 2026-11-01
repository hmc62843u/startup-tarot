import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createResearchContext,reviewResearchInvestigation,applyResearchInvestigation} from '../js/research-context.js';
import {buildResearchPacket} from '../js/research.js';
import {leanModel} from '../js/lean.js';
import {researchRecords} from '../js/research-library.js';
import {startupEvidenceKey} from '../js/context.js';
const pack=JSON.parse(await readFile(new URL('../packs/guide-pack.json',import.meta.url),'utf8')),records=researchRecords(pack);
const startup={business_model:'saas',current_stage:'pre-seed',validation_focus:'demand'};
const state={startup,selectedInvestorIds:[],taskProgress:{},suggestionChoices:{}},tasks=leanModel(state,records.profiles,records.snapshots).tasks,task=tasks.find(t=>t.id==='suggestion:next-milestone');
const seed=createResearchContext({view:'move',startup,pack,task,experiment:{action:'Original question',notes:'Undated working note'}});
function run(current=state){const context=createResearchContext({view:'move',startup:current.startup,pack,task,experiment:{...(current.taskProgress[task.id]?.experiment||task.experimentPlan||{}),notes:current.taskProgress[task.id]?.notes||''}}).context;const packet=buildResearchPacket(pack,{packet_id:'context-test',question:seed.question,assessment_date:'2026-10-31',source_context:context});return {id:'saved-run',packet,source_context:context,output:{packet_id:packet.packet_id,output_version:'1',summary:'Investigate demand.',findings:[],interpretations:[],hypotheses:[],unknowns:['Demand is not established.'],contradictions:[],proposed_investigations:[{question:'Interview five target users.',why:'Test the proposed problem.',evidence_ids:[],basis:'general_method',expected_observation:'Specific examples of current workarounds.',review_condition:'Reconsider if the problem is not recurring.'}],historical_comparisons:[],caveats:['Proposed method, not evidence of demand.'],change_summary:'Initial.'}};}

test('four contextual entry types retain record selections and source identity without changing state',()=>{
 for(const view of ['situation','move','startup','investor']){const before=JSON.stringify(startup),result=createResearchContext({view,startup,pack,task,investor:view==='investor'?records.profiles[0]:null,snapshot:view==='startup'?records.snapshots[0]:null});assert.equal(result.context.origin.view,view);assert.equal(result.context.origin.startup_key,startupEvidenceKey(startup));assert.ok(result.question);assert.equal(result.investor_ids.length,view==='investor'?1:0);assert.equal(result.snapshot_ids.length,view==='startup'?1:0);assert.equal(JSON.stringify(startup),before);}
});
test('historical packets omit undated journey context including experiment notes',()=>{
 const packet=buildResearchPacket(pack,{packet_id:'historical-context',question:seed.question,assessment_date:'2026-10-31',historical_cutoff:'2009-01-23',source_context:seed.context});assert.equal(packet.source_context,undefined);assert.ok(!JSON.stringify(packet).includes('Undated working note'));assert.ok(packet.selection_manifest.omitted.some(item=>item.record_id==='source_context'));
});
test('explicit proposal application preserves previous plan and learning with a research link',()=>{
 const current={...state,taskProgress:{[task.id]:{experiment:{action:'Old action',evidenceNeeded:'Old evidence',outcome:'continue'},notes:'Previous learning',status:'in_progress'}}},before=JSON.stringify(current),research=run(current);
 const draft=reviewResearchInvestigation(current,pack,tasks,research,0);assert.equal(draft.action,'Interview five target users.');assert.equal(JSON.stringify(current),before);
 const next=applyResearchInvestigation(current,pack,tasks,research,0,{action:'Founder-edited action',evidenceNeeded:'Record observations and stop condition.'},'2026-10-31T10:00:00Z'),saved=next.taskProgress[task.id];
 assert.equal(saved.experiment.action,'Founder-edited action');assert.equal(saved.status,'todo');assert.equal(saved.experiment.outcome,'unreviewed');assert.equal(saved.notes,'');assert.equal(saved.researchApplications[0].previous.notes,'Previous learning');assert.equal(saved.researchApplications[0].previous.experiment.action,'Old action');assert.equal(saved.researchApplications[0].run_id,research.id);assert.equal(JSON.stringify(current),before);
 assert.throws(()=>reviewResearchInvestigation(next,pack,tasks,research,0),/already accepted/);
});
test('stale situation, pack, lens, historical runs and invalid citations cannot change plans',()=>{
 const research=run();
 assert.throws(()=>reviewResearchInvestigation({...state,startup:{...startup,current_stage:'seed'}},pack,tasks,research,0),/situation changed/);
 assert.throws(()=>reviewResearchInvestigation(state,{...pack,name:'Changed data edition'},tasks,research,0),/pack changed/);
 assert.throws(()=>reviewResearchInvestigation({...state,selectedInvestorIds:['different']},pack,tasks,research,0),/perspective changed/);
 assert.throws(()=>reviewResearchInvestigation({...state,taskProgress:{[task.id]:{experiment:{action:'A new plan'}}}},pack,tasks,research,0),/experiment or learning changed/);
 assert.throws(()=>reviewResearchInvestigation(state,pack,[],research,0),/no longer available/);
 assert.throws(()=>reviewResearchInvestigation(state,pack,tasks,{...research,packet:{...research.packet,historical_cutoff:'2009-01-23'}},0),/Historical/);
 const invalid=structuredClone(research);invalid.output.proposed_investigations[0].evidence_ids=['invented'];assert.throws(()=>reviewResearchInvestigation(state,pack,tasks,invalid,0),/not valid/);
});

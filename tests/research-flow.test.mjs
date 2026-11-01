import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildResearchPacket,validateResearchOutput,emptyResearchHistory,saveResearchRun,addResearchFeedback,researchPrompt} from '../js/research.js';
const pack=JSON.parse(await readFile(new URL('../packs/guide-pack.json',import.meta.url)));
const options={packet_id:'packet-test',question:'What demand evidence should we investigate?',startup_context:{sector:'SaaS',stage:'pre-seed',geography:'US',check:{amount:150000,currency:'USD'}},
  investor_ids:['hustle_fund_current_001'],snapshot_ids:['doordash_2013_01_12'],assessment_date:'2026-10-30'};
export function fixtureOutput(packet){return {packet_id:packet.packet_id,output_version:'1',summary:'Evidence is limited; verify demand and investor conditions.',
 findings:[{statement:'The investor describes initial pre-seed investments.',evidence_ids:[packet.evidence_items[0].evidence_id]}],interpretations:[],hypotheses:[],unknowns:['Current founder demand evidence is missing.'],contradictions:[],
 proposed_investigations:[{question:'Which customer problem recurs?',why:'A general way to test the founder assumption.',evidence_ids:[],basis:'general_method',expected_observation:'Repeated descriptions from target customers.',review_condition:'Review after a bounded interview batch; stop if the target group is wrong.'}],historical_comparisons:[],caveats:['No funding prediction or causal conclusion is supported.'],change_summary:'Initial analysis.'};}
test('packet preserves typed criteria, snapshot sources, dates and limitations without mutating the pack',()=>{
 const before=JSON.stringify(pack),p=buildResearchPacket(pack,options);
 assert.equal(p.records.length,2);assert.ok(p.evidence_items.some(e=>e.record_id==='doordash_2013_01_12'));
 assert.ok(p.source_metadata.some(s=>s.published_date==='2020-11-30'&&s.event_date==='2013-01-12'));
 assert.ok(p.deterministic_assessments[0].cautions.some(s=>s.includes('Full-time')));assert.equal(p.selection_manifest.truncated,false);
 assert.equal(JSON.stringify(pack),before);assert.ok(researchPrompt(p).includes('untrusted data'));
});
test('historical mode excludes retrospective sources, undated mandates and prior model conclusions',()=>{
 const p=buildResearchPacket(pack,{...options,historical_cutoff:'2013-01-12',previous_revision:{output:'Later success proves the method.'},startup_context:{...options.startup_context,progress:'Later IPO'}});
 assert.equal(p.evidence_items.length,0);assert.equal(p.deterministic_assessments.length,0);assert.equal(p.previous_revision,null);assert.equal(p.startup_context.progress,undefined);
 assert.ok(p.selection_manifest.omitted.some(e=>e.record_id==='previous_revision'));
 assert.ok(p.missing_and_conflicting_evidence.some(s=>s.includes('abstention')));
});
test('unknown records, excessive input and invalid working sources are rejected rather than truncated',()=>{
 assert.throws(()=>buildResearchPacket(pack,{...options,investor_ids:['missing']}),/Unknown investor/);
 assert.throws(()=>buildResearchPacket(pack,{...options,question:'x'.repeat(2001)}),/2000/);
 assert.throws(()=>buildResearchPacket(pack,{...options,snapshot_ids:Array(6).fill('x')}),/five/);
 assert.throws(()=>buildResearchPacket(pack,{...options,startup_context:{notes:'x'.repeat(65000)}}),/size/);
 assert.throws(()=>buildResearchPacket(pack,{...options,working_findings:[{statement:'Claim',url:'javascript:alert(1)',checked_date:'2026-10-30'}]}),/public source/);
});
test('working findings stay labelled and dated, while reference validation catches fabricated citations',()=>{
 const p=buildResearchPacket(pack,{...options,working_findings:[{statement:'Three founder-reported pilots.',url:'https://example.org/pilots',checked_date:'2026-10-30',published_date:null}]});
 assert.ok(p.evidence_items.some(e=>e.basis==='unverified_working_finding'));
 const output=fixtureOutput(p);assert.equal(validateResearchOutput(output,p).isValid,true);
 output.findings[0].evidence_ids=['invented'];assert.equal(validateResearchOutput(output,p).isValid,false);
 output.findings[0].evidence_ids=[];assert.equal(validateResearchOutput(output,p).isValid,false);
 output.findings=[];output.packet_id='wrong';assert.equal(validateResearchOutput(output,p).isValid,false);
});
test('historical comparisons need evidence from the actual named snapshot',()=>{
 const p=buildResearchPacket(pack,options),output=fixtureOutput(p);
 output.historical_comparisons=[{snapshot_id:'doordash_2013_01_12',evidence_ids:[p.evidence_items[0].evidence_id],similarities:'Early evidence gathering.',differences:'Different market.',temporal_limit:'Retrospective source.'}];
 assert.equal(validateResearchOutput(output,p).isValid,false);
 output.historical_comparisons[0].evidence_ids=[p.evidence_items.find(e=>e.record_id==='doordash_2013_01_12').evidence_id];assert.equal(validateResearchOutput(output,p).isValid,true);
});
test('feedback and revisions append without altering source packs or earlier outputs',()=>{
 const p=buildResearchPacket(pack,options),output=fixtureOutput(p);
 let history=saveResearchRun(emptyResearchHistory(),{id:'run-1',parent_id:null,packet:p,output,model:'test-only'});
 history=addResearchFeedback(history,'run-1','I disagree; our demand evidence is stronger.','2026-10-30');
 const previous=JSON.stringify(history.runs[0]);
 const revised=buildResearchPacket(pack,{...options,packet_id:'packet-2',previous_revision:{run_id:'run-1',output,feedback:history.runs[0].feedback}});
 history=saveResearchRun(history,{id:'run-2',parent_id:'run-1',packet:revised,output:fixtureOutput(revised),model:'test-only'});
 assert.equal(JSON.stringify(history.runs[0]),previous);assert.equal(history.runs.length,2);
 assert.throws(()=>saveResearchRun(history,{id:'run-3',parent_id:'missing',packet:p,output}),/missing/);
});

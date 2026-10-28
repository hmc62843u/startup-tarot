import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const validator=moduleUrl(read('js/validator.js'));
const {validateResearchPackage,parseResearchPackage,researchRecords,researchWorkspaceKey}=await import(moduleUrl(read('js/research-library.js').replace("'./validator.js'",JSON.stringify(validator))));
const {buildHistoricalSuggestions,evaluateMatchingCases}=await import(new URL('../js/analyzer.js',import.meta.url));
const demo=()=>JSON.parse(read('packs/demo-guide-pack.json'));
const startup={current_stage:'idea',business_model:'marketplace',validation_focus:'demand',sectors:['marketplace']};

test('v2 fictional provider components produce a supported match without mutating package facts',()=>{
 const pkg=demo(),before=JSON.stringify(pkg);assert.deepEqual(validateResearchPackage(pkg).errors,[]);
 const {profiles,snapshots}=researchRecords(pkg);
 assert.equal(buildHistoricalSuggestions(startup,profiles,snapshots).length,1);
 assert.equal(JSON.stringify(pkg),before);
 assert.equal(pkg.components.research.profiles[0].preparation_topics,undefined);
 assert.equal(pkg.components.research.snapshots[0].preparation_lessons,undefined);
});

test('v2 matching rejects nonmatching context, unavailable investor topic and unknown startup context',()=>{
 const pkg=demo();const {profiles,snapshots}=researchRecords(pkg);
 for(const change of [{business_model:'hardware'},{validation_focus:'technical_feasibility'},{current_stage:'growth'},{current_stage:null},{business_model:null}])assert.equal(buildHistoricalSuggestions({...startup,...change},profiles,snapshots).length,0);
 const without=structuredClone(pkg);without.components.matching.investor_topics=[];
 assert.equal(validateResearchPackage(without).isValid,true);
 const absent=researchRecords(without);assert.equal(buildHistoricalSuggestions(startup,absent.profiles,absent.snapshots).length,0);
 const reference=structuredClone(profiles);reference[0].comparison_enabled=false;
 assert.equal(buildHistoricalSuggestions(startup,reference,snapshots).length,0);
});

test('v2 contract rejects executable or unknown operators, invalid references and malformed components',()=>{
 for(const change of [
  p=>{p.components.matching.rules[0].type='javascript';},
  p=>{p.components.matching.rules[0].code='alert(1)';},
  p=>{p.components.matching.rules[0].business_models=['anything'];},
  p=>{p.components.matching.rules[0].business_models=['marketplace','marketplace'];},
  p=>{p.components.matching.rules[0].source_ids=['missing'];},
  p=>{p.components.matching.rules[0].snapshot_id='missing';},
  p=>{p.components.matching.rules[0].suggestion_id='missing';},
  p=>{p.components.matching.rules.push(structuredClone(p.components.matching.rules[0]));},
  p=>{p.components.suggestions.push(structuredClone(p.components.suggestions[0]));},
  p=>{p.components.suggestions[0].target_task_id='execute';},
  p=>{p.components.research.profiles[0].preparation_topics=[];},
  p=>{p.components.matching.investor_topics[0].profile_id='missing';},
  p=>{p.components.matching.investor_topics[0].source_url='javascript:alert(1)';},
  p=>{p.provider.url='file:///C:/private';},p=>{p.provider=null;},p=>{p.quality.research={status:'verified',statement:'Trust me'};},
  p=>{p.quality.matching.reviewed_date=null;},
  p=>{p.components.matching.rules=null;},p=>{p.components.suggestions=[null];},p=>{p.components.research.snapshots=[null];},
  p=>{p.dataset_kind='research';},p=>{p.components.matching.rules[0].evidence_fields=['funding'];}
 ]){
  const pkg=demo();change(pkg);assert.equal(validateResearchPackage(pkg).isValid,false,change.toString());
 }
});

test('provider identity namespaces workspaces, while metadata is not a quality certification',()=>{
 const one=demo(),two=demo();two.provider.id='different_provider';
 assert.notEqual(researchWorkspaceKey(one),researchWorkspaceKey(two));
 one.quality.matching={status:'independent_review',reviewed_date:'2026-10-26',statement:'Provider-declared review only.'};
 assert.equal(parseResearchPackage(JSON.stringify(one)).quality.matching.status,'independent_review');
});

test('v2 real package retains limited comparisons and cannot invent investor-connected moves',()=>{
 const pkg=parseResearchPackage(read('packs/guide-pack.json'));
 assert.equal(pkg.dataset_kind,'research');assert.equal(pkg.components.matching.investor_topics.length,0);
 const {profiles,snapshots}=researchRecords(pkg);
 assert.equal(profiles.length,9);assert.equal(snapshots.length,3);
 assert.equal(buildHistoricalSuggestions(startup,profiles,snapshots).length,0);
});

test('provider cases exercise positive, negative, unknown and no-lens behavior through the app matcher',()=>{
 const pkg=demo(),before=JSON.stringify(pkg),records=researchRecords(pkg);
 const report=evaluateMatchingCases(pkg.components.matching.evaluation_cases,records.profiles,records.snapshots);
 assert.equal(report.total,7);assert.equal(report.passed,7);assert.equal(report.failed,0);
 assert.equal(report.positive,3);assert.equal(report.negative,4);
 assert.equal(JSON.stringify(pkg),before);
 const cases=structuredClone(pkg.components.matching.evaluation_cases);cases[0].expected_suggestion_ids=[];
 const failed=evaluateMatchingCases(cases,records.profiles,records.snapshots);
 assert.equal(failed.failed,1);assert.deepEqual(failed.results[0].expected,[]);
 assert.deepEqual(failed.results[0].actual,['bounded-reservation-test']);
});

test('evaluation cases are optional but malformed cases, references and executable fields are rejected',()=>{
 const absent=demo();delete absent.components.matching.evaluation_cases;
 assert.equal(validateResearchPackage(absent).isValid,true);
 for(const change of [
  p=>{p.components.matching.evaluation_cases=null;},
  p=>{p.components.matching.evaluation_cases=[null];},
  p=>{p.components.matching.evaluation_cases[0].startup.current_stage='invented';},
  p=>{delete p.components.matching.evaluation_cases[0].startup.business_model;},
  p=>{p.components.matching.evaluation_cases[0].startup.sectors=null;},
  p=>{p.components.matching.evaluation_cases[0].startup.code='alert(1)';},
  p=>{p.components.matching.evaluation_cases[0].investor_ids=['unknown'];},
  p=>{p.components.matching.evaluation_cases[0].expected_suggestion_ids=['unknown'];},
  p=>{p.components.matching.evaluation_cases[0].expected_suggestion_ids=['bounded-reservation-test','bounded-reservation-test'];},
  p=>{p.components.matching.evaluation_cases.push(structuredClone(p.components.matching.evaluation_cases[0]));},
  p=>{p.components.matching.evaluation_cases=Array.from({length:51},(_,i)=>({...p.components.matching.evaluation_cases[0],id:'case_'+i}));}
 ]){const pkg=demo();change(pkg);assert.equal(validateResearchPackage(pkg).isValid,false,change.toString());}
});

test('real package cases honestly test missing connections without implying positive coverage',()=>{
 const pkg=parseResearchPackage(read('packs/guide-pack.json')),records=researchRecords(pkg);
 const report=evaluateMatchingCases(pkg.components.matching.evaluation_cases,records.profiles,records.snapshots);
 assert.equal(report.total,4);assert.equal(report.passed,4);assert.equal(report.positive,0);
});

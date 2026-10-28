import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {researchRecords} from '../js/research-library.js';
import {matchHistoricalCandidates,buildHistoricalSuggestions,connectionGapReason,describeLibrarySupport} from '../js/matching.js';
import {evaluateMatchingCases} from '../js/evaluation.js';
import {startupEvidenceKey} from '../js/context.js';
import {preparationProgress,investorLensKey} from '../js/tasks.js';
import {selectNextMove} from '../js/recommendation.js';
import {describeNextAction} from '../js/explanations.js';

const pkg=JSON.parse(readFileSync(new URL('../packs/demo-guide-pack.json',import.meta.url),'utf8'));
const startup={business_model:'marketplace',current_stage:'idea',validation_focus:'demand',sectors:['marketplace']};
const task=(id,basis,status,sources=[])=>({id,basis,progress:{status},sources});

test('candidate eligibility is independent of saved choices and keeps inputs immutable',()=>{
    const {profiles,snapshots}=researchRecords(pkg);
    const before=JSON.stringify({startup,profiles,snapshots});
    const candidates=matchHistoricalCandidates(startup,profiles,snapshots);
    assert.ok(candidates.length);
    assert.ok(candidates.every(candidate=>!('decision' in candidate)));
    const first=candidates[0];
    const choices={[first.id]:{decision:'dismissed',startupKey:startupEvidenceKey(startup),evidenceKey:first.evidenceKey}};
    assert.equal(buildHistoricalSuggestions(startup,profiles,snapshots,choices)[0].decision,'dismissed');
    assert.deepEqual(matchHistoricalCandidates(startup,profiles,snapshots),candidates);
    assert.equal(JSON.stringify({startup,profiles,snapshots}),before);
    choices[first.id].evidenceKey='outdated';
    assert.equal(buildHistoricalSuggestions(startup,profiles,snapshots,choices)[0].decision,'pending');
});

test('an ongoing sourced action takes priority over a new candidate; completed work is skipped',()=>{
    const done=task('done','combined_suggestion','evidence_recorded',[{url:'source'}]);
    const generic=task('suggestion:next-milestone','optional_suggestion','in_progress');
    const ongoing=task('ongoing','combined_suggestion','in_progress',[{url:'source'}]);
    const candidate={id:'new',decision:'pending'};
    const inputs=[done,generic,ongoing],before=JSON.stringify(inputs);
    assert.deepEqual(selectNextMove(inputs,[candidate],[],'demand'),{next:ongoing,candidate,pending:false});
    assert.equal(JSON.stringify(inputs),before);
    assert.equal(selectNextMove([generic],[candidate],[],'demand').pending,true);
});

test('ranking keeps accepted sourced work ahead of generic focus and omits dismissed candidates',()=>{
    const focus=task('suggestion:customer-evidence','optional_suggestion','todo');
    const accepted=task('accepted','combined_suggestion','todo',[{url:'source'}]);
    const dismissed={id:'dismissed',decision:'dismissed'};
    const result=selectNextMove([focus,accepted],[dismissed],[],'customer_problem');
    assert.equal(result.next,accepted);
    assert.equal(result.candidate,undefined);
    assert.equal(result.pending,false);
    assert.equal(selectNextMove([focus],[],[],'customer_problem').next,focus);
});

test('presentation preserves fictional provenance and unsourced fallback explanations',()=>{
    const candidate={title:'Practice',sources:[{data_kind:'fictional'}]};
    const nextAction=describeNextAction({started:true,pending:true,candidate,lensCount:0,libraryDiscovery:[candidate]});
    assert.equal(nextAction.basisLabel,'Based on fictional examples');
    assert.equal(nextAction.heading,'An example to explore');
    assert.equal(nextAction.connectionNote,'Preview from the library. No investor selected.');
    const connected=describeNextAction({started:true,pending:true,candidate,lensCount:1,libraryDiscovery:[candidate]});
    assert.equal(connected.heading,'Your next move');
    assert.equal(connected.connectionNote,'Connected through your selected investor.');
    assert.match(nextAction.basis,/no investor lens has been selected/);
    const next={...task('suggestion:next-milestone','optional_suggestion','todo'),title:'Test',reason:'Learn'};
    const fallback=describeNextAction({started:true,pending:false,next,lensCount:0,libraryDiscovery:[]});
    assert.equal(fallback.basisLabel,'General exercise');
    assert.match(fallback.basis,/No library sources/);
    assert.equal(fallback.connectionGap.title,'No connected example for this situation yet');
});

test('evaluation exercises the candidate contract separately from Home priority and workspace choices',()=>{
    const {profiles,snapshots}=researchRecords(pkg);
    const report=evaluateMatchingCases(pkg.components.matching.evaluation_cases,profiles,snapshots);
    assert.equal(report.total,7);
    assert.equal(report.failed,0);
    assert.equal(report.positive,3);
    assert.equal(report.negative,4);
});

test('missing-connection diagnostics distinguish topics, rules, unknowns and unconfirmed sectors',()=>{
    const {profiles,snapshots}=researchRecords(pkg);
    const formation=profiles.filter(profile=>profile.id==='demo_formation');
    const discovery=profiles.filter(profile=>profile.id==='demo_discovery');
    assert.equal(connectionGapReason(startup,formation,snapshots),'missing_investor_topic');
    assert.equal(connectionGapReason(startup,discovery,snapshots),null);
    assert.equal(connectionGapReason({...startup,current_stage:'seed'},discovery,snapshots),'missing_rule');
    assert.equal(connectionGapReason({...startup,current_stage:null},formation,snapshots),'incomplete_context');
    const specialist=formation.map(profile=>({...profile,sector_focus:['hardware']}));
    assert.equal(connectionGapReason({...startup,sectors:[]},specialist,snapshots),'missing_topic_unconfirmed_sector');
    assert.equal(connectionGapReason(startup,specialist,snapshots),'incompatible_profile');
});

test('general demand exercise explains the gap without claiming unknown fit or replacing sourced work',()=>{
    const next={...task('suggestion:next-milestone','optional_suggestion','todo'),title:'Milestone',reason:'Learn'};
    const input={started:true,next,pending:false,lensCount:1,libraryDiscovery:[],validationFocus:'demand'};
    const fallback=describeNextAction({...input,connectionReason:'missing_investor_topic'});
    assert.equal(fallback.title,'Plan your own demand test.');
    assert.equal(fallback.label,'Plan this test');
    assert.equal(fallback.generalExercise,true);
    assert.match(fallback.connectionGap.message,/Stage and sector checks pass/);
    assert.equal(fallback.taskId,'suggestion:next-milestone');
    const unknown=describeNextAction({...input,connectionReason:'missing_topic_unconfirmed_sector'});
    assert.match(unknown.connectionGap.message,/unconfirmed/);
    assert.doesNotMatch(unknown.connectionGap.message,/checks pass/);
    const sourced=describeNextAction({...input,next:{...next,basis:'modeled_difference',sources:[{data_kind:'fictional'}]},connectionReason:'incompatible_profile'});
    assert.equal(sourced.connectionGap,undefined);
    assert.equal(sourced.generalExercise,undefined);
    assert.equal(sourced.basisLabel,'Based on fictional examples');
});

test('saved experiments survive connection changes independently of review flags and work status',()=>{
    const experiment={question:'Will people reserve?',action:'Offer a bounded trial',evidenceNeeded:'Requests and obstacles',continueWhen:'Repeat interest',changeWhen:'Different need',stopWhen:'Unsafe to deliver',reviewDate:'2026-11-20',outcome:'continue'};
    const record={status:'in_progress',notes:'Keep these notes',startupKey:startupEvidenceKey(startup),taskKey:'old-basis',basisLensKey:investorLensKey(['demo_discovery']),experiment};
    const ownTask={basis:'optional_suggestion'};
    const switched=preparationProgress(record,startup,ownTask,['demo_formation']);
    assert.equal(switched.status,'in_progress');
    assert.deepEqual(switched.reviewReasons,['investor_lens_changed']);
    assert.deepEqual(switched.experiment,experiment);
    assert.equal(switched.notes,record.notes);
    const completed=preparationProgress({...record,status:'evidence_recorded'},startup,ownTask,['demo_formation']);
    assert.equal(completed.status,'evidence_recorded');
    const legacy={...record};delete legacy.basisLensKey;
    assert.deepEqual(preparationProgress(legacy,startup,ownTask,['demo_formation']).reviewReasons,['connection_changed']);
    const changed=preparationProgress(record,{...startup,current_stage:'seed'},ownTask,['demo_formation']);
    assert.equal(changed.status,'todo');
    assert.ok(changed.reviewReasons.includes('startup_changed'));
    assert.deepEqual(changed.experiment,experiment);
    assert.equal(investorLensKey(['b','a','a']),investorLensKey(['a','b']));
});

test('partial support preserves snapshot provenance and never manufactures an investor connection',()=>{
    const {profiles,snapshots}=researchRecords(pkg);
    const discovery=profiles.filter(p=>p.id==='demo_discovery');const formation=profiles.filter(p=>p.id==='demo_formation');
    assert.equal(describeLibrarySupport(startup,discovery,snapshots).kind,'connected');
    assert.equal(describeLibrarySupport({...startup,business_model:'hardware'},discovery,snapshots).kind,'investor_only');
    assert.equal(describeLibrarySupport(startup,formation,snapshots).kind,'snapshot_only');
    assert.equal(describeLibrarySupport({...startup,business_model:'hardware'},formation,snapshots).kind,'neither');
    const partial=matchHistoricalCandidates(startup,[],snapshots,{snapshotOnly:true});
    assert.ok(partial.length);assert.ok(partial.every(p=>p.sources.every(s=>s.kind==='snapshot')));
    assert.equal(matchHistoricalCandidates(startup,formation,snapshots).length,0);
    assert.equal(describeLibrarySupport({...startup,validation_focus:'operations'},discovery,[]).interests.length,0);
});

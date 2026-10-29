import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const json = path => JSON.parse(readFileSync(new URL(path, root), 'utf8').replace(/^\uFEFF/, ''));
const moduleFrom = async path => import(new URL(path, root));
const { validateInvestorProfile, normalizeProfile } = await moduleFrom('js/validator.js');
const { analyzeGap, filterProfiles, buildComparison, buildPreparationTasks, preparationProgress, startupEvidenceKey, buildHistoricalSuggestions, mergeHistoricalTasks, buildWorkspaceModel } = await moduleFrom('js/analyzer.js');
const manifest = json('data/library.json');
const profiles = manifest.profiles.map(path => json('data/' + path));
const byName = name => profiles.find(p => p.name === name);
const startup = { current_stage:'idea', sectors:['AI'], founders_have_domain_expertise:false, prototype_status:'idea_only', paid_pilots:0 };

test('all six fictional library files validate, with unique IDs and declared estimate provenance', () => {
  assert.equal(profiles.length,6);
  assert.equal(new Set(profiles.map(p => p.id)).size,6);
  for (const profile of profiles) {
    assert.deepEqual(validateInvestorProfile(profile).errors, [], profile.name);
    assert.equal(profile.weights_basis,'editor_estimate');
    assert.ok(!JSON.stringify(profile).includes('[citation:'));
  }
  assert.equal(profiles.filter(p => p.comparison_enabled !== false).length,5);
});

test('category metadata and unnormalized weights are rejected', () => {
  assert.equal(validateInvestorProfile([{ Category: 'Generalist seed' }]).isValid,false);
  const profile = structuredClone(profiles[0]);
  profile.criteria_weights.team_credibility = 0;
  assert.equal(validateInvestorProfile(profile).isValid,false);
});

test('idea-stage fictional applicants are not penalized for lacking prototype or experience', () => {
  for (const name of ['Fictional Discovery Fund','Fictional Formation Studio']) {
    assert.deepEqual(analyzeGap(startup,byName(name)),[]);
  }
});

test('estimated weight changes do not manufacture eligibility requirements', () => {
  const profile = structuredClone(byName('Fictional Discovery Fund'));
  for (const key of Object.keys(profile.criteria_weights)) profile.criteria_weights[key]=0;
  profile.criteria_weights.technical_feasibility=1;
  assert.deepEqual(analyzeGap(startup,profile),[]);
});

test('real focus mismatches are retained, and sector aliases match', () => {
  const profile=structuredClone(byName('Fictional Workshop Fund'));
  profile.stage_focus=['seed'];
  profile.sector_focus=['deep tech'];
  assert.deepEqual(analyzeGap({...startup,current_stage:'seed',sectors:['Deep-Tech']},profile),[]);
  const gaps=analyzeGap({...startup,sectors:['food delivery']},profile);
  assert.deepEqual(gaps.map(g=>g.category),['Stage Fit','Sector Fit']);
});

test('unconfirmed program is reference-only; broad grants avoid false sector exclusions', () => {
  const smart=byName('Fictional Reference Award');
  assert.equal(smart.comparison_enabled,false);
  assert.deepEqual(analyzeGap(startup,smart),[]);
  assert.deepEqual(analyzeGap({...startup,sectors:['optical sensing']},byName('Fictional Research Award')),[]);
});


test('new profile dimensions are valid and separate from stage', () => {
  for (const p of profiles) {
    assert.ok(p.funding_type);
    assert.ok(p.organization_type);
    assert.equal(p.type, undefined);
  }
  const invalid = {...profiles[0], organization_type: undefined};
  assert.equal(validateInvestorProfile(invalid).isValid, false);
  assert.equal(byName('Fictional Formation Studio').organization_type, 'talent_investor');
  assert.ok(byName('Fictional Formation Studio').stage_focus.includes('pre-company'));
});

test('funding, stage and sector filters intersect; clearing restores every profile', () => {
  const matches = filterProfiles(profiles, {funding:'equity', stage:'idea', sector:'biotech'});
  assert.deepEqual(matches.map(p => p.name).sort(), ['Fictional Formation Studio', 'Fictional Discovery Fund'].sort());
  assert.equal(filterProfiles(profiles, {funding:'grant', stage:'growth'}).length,0);
  assert.equal(filterProfiles(profiles, {}).length,6);
  assert.equal(profiles.filter(p => p.comparison_enabled !== false).length,5);
});

test('reference-only grants stay browsable and grant filter excludes equity', () => {
  const grants=filterProfiles(profiles,{funding:'grant'});
  assert.equal(grants.length,2);
  assert.ok(grants.some(p=>p.comparison_enabled===false));
});

test('legacy types normalize without inventing accelerator funding or changing stage', () => {
  const legacy={...profiles[0],type:'vc_series_a'};
  delete legacy.funding_type;
  delete legacy.organization_type;
  assert.equal(validateInvestorProfile(legacy).isValid,true);
  const normalized=normalizeProfile(legacy);
  assert.equal(normalized.organization_type,'vc');
  assert.deepEqual(normalized.stage_focus,legacy.stage_focus);
  assert.equal(normalizeProfile({...legacy,type:'accelerator'}).funding_type,'unknown');
});

test('unknown sectors remain unknown, and specific sectors include generalists', () => {
  const unknown={...profiles[0],sector_focus:undefined};
  const generalist={...profiles[0],sector_focus:[]};
  assert.deepEqual(filterProfiles([unknown,generalist],{sector:'unknown'}),[unknown]);
  assert.deepEqual(filterProfiles([unknown,generalist],{sector:'AI'}),[generalist]);
});


test('report defaults include all comparable profiles in one ungrouped view', () => {
  const report=buildComparison(startup,profiles);
  assert.equal(report.total,5);
  assert.equal(report.results.length,5);
  assert.equal(report.groups.length,1);
  assert.equal(report.groups[0].key,'');
  assert.ok(report.results.every(result=>result.profile.comparison_enabled!==false));
});

test('report focus filters select actual differences or no automated gaps', () => {
  for (const [focus,category] of [['stage','Stage Fit'],['sector','Sector Fit']]) {
    const report=buildComparison({...startup,sectors:['food delivery']},profiles,{focus});
    assert.ok(report.results.length>0);
    assert.ok(report.results.every(result=>result.gaps.some(gap=>gap.category===category)));
  }
  const noGaps=buildComparison(startup,profiles,{focus:'none'});
  assert.ok(noGaps.results.length>0);
  assert.ok(noGaps.results.every(result=>result.gaps.length===0));
});

test('report combines dimensions, investor selection and gap focus without changing source profiles', () => {
  const before=JSON.stringify(profiles);
  const report=buildComparison(startup,profiles,{funding:'equity',stage:'idea',sector:'AI',focus:'none'});
  assert.equal(report.total,5);
  assert.ok(report.results.length>0);
  assert.ok(report.results.every(result=>result.profile.funding_type==='equity' && result.profile.stage_focus.includes('idea') && result.gaps.length===0));
  const yc=buildComparison(startup,profiles,{profileId:byName('Fictional Discovery Fund').id});
  assert.equal(yc.results.length,1);
  assert.equal(yc.results[0].profile.name,'Fictional Discovery Fund');
  assert.equal(JSON.stringify(profiles),before);
  assert.equal(buildComparison(startup,profiles).results.length,5);
});

test('funding grouping preserves all results once, including unknown funding', () => {
  const source=[...profiles,{...byName('Fictional Discovery Fund'),id:'unknown-funding',funding_type:'unknown'}];
  const report=buildComparison(startup,source,{},'funding');
  assert.deepEqual(report.groups.map(group=>group.key),['equity','grant','unknown']);
  const grouped=report.groups.flatMap(group=>group.results.map(result=>result.profile.id));
  assert.equal(new Set(grouped).size,6);
  assert.deepEqual([...grouped].sort(),report.results.map(result=>result.profile.id).sort());
});

test('conflicting report filters return empty results with a useful total', () => {
  const report=buildComparison(startup,profiles,{funding:'grant',profileId:byName('Fictional Discovery Fund').id},'funding');
  assert.equal(report.total,5);
  assert.equal(report.results.length,0);
  assert.deepEqual(report.groups,[]);
});

test('preparation tasks distinguish fit questions, source checks and optional suggestions',()=>{
  assert.deepEqual(buildPreparationTasks({},profiles),[]);
  const tasks=buildPreparationTasks(startup,profiles);
  assert.ok(tasks.some(task=>task.basis==='modeled_difference'));
  assert.ok(tasks.some(task=>task.basis==='published_requirement'));
  assert.equal(tasks.filter(task=>task.basis==='optional_suggestion').length,4);
  assert.equal(new Set(tasks.map(task=>task.id)).size,tasks.length);
  for(const task of tasks) {
    assert.ok(task.reason && task.evidence);
    if(task.basis==='optional_suggestion')assert.deepEqual(task.sources,[]);
    else assert.equal(task.sources.length,1);
    assert.ok(!task.sources.some(source=>source.name==='Fictional Reference Award'));
  }
  for(const profile of profiles.filter(profile=>profile.comparison_enabled!==false)) {
    for(const requirement of profile.eligibility_requirements||[]) {
      assert.ok(tasks.some(task=>task.reason===requirement && task.sources[0].url===profile.source_url));
    }
  }
  const reweighted=profiles.map(profile=>({...profile,criteria_weights:{technical_feasibility:1}}));
  assert.deepEqual(buildPreparationTasks(startup,reweighted),tasks);
});

test('progress needs evidence and reopens after changed startup facts without discarding notes',()=>{
  const record={status:'evidence_recorded',notes:'Dated interview notes',startupKey:startupEvidenceKey(startup)};
  assert.equal(preparationProgress(record,startup).status,'evidence_recorded');
  assert.equal(preparationProgress({...record,notes:' '},startup).status,'todo');
  const changed=preparationProgress(record,{...startup,current_stage:'seed'});
  assert.equal(changed.status,'todo');
  assert.equal(changed.notes,record.notes);
  assert.equal(changed.needsReview,true);
  assert.equal(preparationProgress({status:'funding_ready'},startup).status,'todo');
});


const historical= json('data/startup-library.json').snapshots.map(path=>json('data/'+path));
const contextualStartup={...startup,sectors:['marketplace'],business_model:'marketplace',validation_focus:'demand'};

test('historical suggestions require model, learning focus, stage and investor context',()=>{
    assert.deepEqual(buildHistoricalSuggestions(startup,profiles,historical),[]);
    assert.equal(buildHistoricalSuggestions(contextualStartup,profiles,historical).length,1);
    for(const patch of [{business_model:'saas'},{validation_focus:'technical_feasibility'},{current_stage:'growth'}]){
        assert.deepEqual(buildHistoricalSuggestions({...contextualStartup,...patch},profiles,historical),[]);
    }
    assert.deepEqual(buildHistoricalSuggestions(contextualStartup,[],historical),[]);
    const noComparableTopic=profiles.map(profile=>({...profile,comparison_enabled:profile.preparation_topics?false:profile.comparison_enabled}));
    assert.deepEqual(buildHistoricalSuggestions(contextualStartup,noComparableTopic,historical),[]);
});

test('overlapping historical lessons merge with dated sources and no numeric targets',()=>{
    const [idea]=buildHistoricalSuggestions(contextualStartup,profiles,historical);
    assert.equal(idea.decision,'pending');
    assert.equal(idea.sources.filter(source=>source.kind==='snapshot').length,2);
    assert.equal(idea.sources.filter(source=>source.kind==='investor').length,1);
    assert.ok(idea.sources.filter(source=>source.kind==='snapshot').every(source=>source.snapshot_date&&source.published_date&&source.evidence_type));
    assert.ok(idea.interpretations.length);
    const differentMetrics=structuredClone(historical);
    differentMetrics[0].metrics[0].value=10000;
    assert.equal(buildHistoricalSuggestions(contextualStartup,profiles,differentMetrics)[0].evidenceKey,idea.evidenceKey);
    const learning=buildHistoricalSuggestions({...contextualStartup,validation_focus:'customer_problem'},profiles,historical);
    assert.equal(learning.length,1);
    assert.equal(learning[0].targetTaskId,'suggestion:customer-evidence');
    assert.equal(learning[0].sources.filter(source=>source.kind==='snapshot').length,2);
});

test('acceptance enriches one existing task and dismissal adds no obligation',()=>{
    const tasks=buildPreparationTasks(contextualStartup,profiles);
    const ideas=buildHistoricalSuggestions(contextualStartup,profiles,historical);
    assert.deepEqual(mergeHistoricalTasks(tasks,ideas),tasks);
    assert.deepEqual(mergeHistoricalTasks(tasks,ideas.map(idea=>({...idea,decision:'dismissed'}))),tasks);
    const accepted=mergeHistoricalTasks(tasks,ideas.map(idea=>({...idea,decision:'accepted'})));
    assert.equal(accepted.length,tasks.length);
    assert.equal(accepted.filter(task=>task.basis==='combined_suggestion').length,1);
    assert.equal(accepted.find(task=>task.basis==='combined_suggestion').id,'suggestion:next-milestone');
    assert.ok(accepted.find(task=>task.basis==='combined_suggestion').sources.some(source=>source.kind==='investor'));
});

test('decisions reopen when context or source evidence changes',()=>{
    const [idea]=buildHistoricalSuggestions(contextualStartup,profiles,historical);
    const choices={[idea.id]:{decision:'accepted',startupKey:startupEvidenceKey(contextualStartup),evidenceKey:idea.evidenceKey}};
    assert.equal(buildHistoricalSuggestions(contextualStartup,profiles,historical,choices)[0].decision,'accepted');
    assert.equal(buildHistoricalSuggestions({...contextualStartup,paid_pilots:1},profiles,historical,choices)[0].decision,'pending');
    const changed=structuredClone(historical);
    changed[0].sources[0].published_date='2026-10-24';
    assert.equal(buildHistoricalSuggestions(contextualStartup,profiles,changed,choices)[0].decision,'pending');
});

test('accepting a new evidence basis reopens prior generic completion while retaining notes',()=>{
    const task=buildPreparationTasks(contextualStartup,profiles).find(task=>task.id==='suggestion:next-milestone');
    const [idea]=buildHistoricalSuggestions(contextualStartup,profiles,historical);
    const updated=mergeHistoricalTasks([task],[{...idea,decision:'accepted'}])[0];
    const record={status:'evidence_recorded',notes:'Prior milestone evidence',startupKey:startupEvidenceKey(contextualStartup),taskKey:null};
    const progress=preparationProgress(record,contextualStartup,updated);
    assert.equal(progress.status,'todo');
    assert.equal(progress.needsReview,true);
    assert.equal(progress.notes,record.notes);
    assert.equal(preparationProgress({...record,taskKey:updated.evidenceKey,experiment:{outcome:'continue'}},contextualStartup,updated).status,'evidence_recorded');
});


test('unknown startup stage and sectors do not create invented focus differences',()=>{
  assert.deepEqual(analyzeGap({current_stage:'unknown',sectors:[]},byName('Fictional Workshop Fund')),[]);
  const model=buildWorkspaceModel({current_stage:'unknown',sectors:[]},profiles,historical);
  assert.equal(model.domains.find(domain=>domain.id==='investor').status,'unknown');
  assert.equal(model.domains.find(domain=>domain.id==='customer').status,'unknown');
  assert.equal(model.domains.find(domain=>domain.id==='product').status,'unknown');
  assert.equal(model.domains.find(domain=>domain.id==='team').status,'unknown');
});

test('overview exposes evidence statuses and task counts rather than a readiness score',()=>{
  const empty=buildWorkspaceModel({},profiles,historical);
  assert.equal(empty.started,false);
  assert.equal(empty.domains.length,5);
  assert.ok(empty.domains.every(domain=>domain.status==='unknown'));
  assert.equal(empty.nextAction.route,'setup');
  const context={...startup,business_model:'saas',validation_focus:'technical_feasibility'};
  const model=buildWorkspaceModel(context,profiles,historical);
  assert.equal(model.nextAction.taskId,'suggestion:product-evidence');
  const record={'suggestion:product-evidence':{status:'evidence_recorded',notes:'Sketches with dated test notes',startupKey:startupEvidenceKey(context)}};
  const updated=buildWorkspaceModel(context,profiles,historical,record);
  assert.equal(updated.domains.find(domain=>domain.id==='product').status,'recorded');
  assert.equal(updated.counts.recorded,1);
  assert.equal(updated.readinessScore,undefined);
  const changed=buildWorkspaceModel({...context,prototype_status:'prototype'},profiles,historical,record);
  assert.equal(changed.domains.find(domain=>domain.id==='product').status,'review');
  assert.equal(changed.counts.recorded,0);
});


test('workspace uses only explicitly selected investors and leaves unselected interests out',()=>{
    const noLens=buildWorkspaceModel(contextualStartup,profiles,historical);
    assert.equal(noLens.lensCount,0);
    assert.equal(noLens.suggestions.length,0);
    assert.equal(noLens.tasks.length,4);
    const selected=buildWorkspaceModel(contextualStartup,profiles,historical,{}, {}, ['demo_discovery','demo_reference_award']);
    assert.equal(selected.lensCount,1);
    assert.equal(selected.suggestions.length,1);
    assert.ok(selected.suggestions[0].sources.filter(source=>source.kind==='investor').every(source=>source.name==='Fictional Discovery Fund'));
    assert.ok(selected.tasks.every(task=>!task.sources.some(source=>source.name==='Fictional Reference Award')));
});

test('accepted historical move supplies an adaptable experiment without historical metric targets',()=>{
    const [idea]=buildHistoricalSuggestions(contextualStartup,profiles,historical);
    const task=mergeHistoricalTasks(buildPreparationTasks(contextualStartup,profiles),[{...idea,decision:'accepted'}]).find(task=>task.experimentPlan);
    assert.ok(task.experimentPlan.question);
    assert.equal(task.experimentPlan.action,idea.reason);
    assert.equal(task.experimentPlan.reviewDate,'');
    assert.equal(task.experimentPlan.outcome,'unreviewed');
    assert.ok(!task.experimentPlan.action.includes('8 reservations'));
    const record={status:'evidence_recorded',notes:'A test note',startupKey:startupEvidenceKey(contextualStartup),taskKey:task.evidenceKey};
    assert.equal(preparationProgress(record,contextualStartup,task).status,'todo');
    assert.equal(preparationProgress({...record,experiment:{outcome:'stop'}},contextualStartup,task).status,'evidence_recorded');
});

test('plain-language overview reflects unknown context and distinguishes general prompts from library interpretations',()=>{
    const unknown=buildWorkspaceModel({current_stage:'unknown',business_model:'unknown',validation_focus:'unknown'},profiles,historical);
    assert.ok(unknown.situation.includes('not recorded'));
    assert.ok(unknown.situation.includes('not yet clear'));
    assert.equal(unknown.currentQuestion,'Your next question is still open.');
    assert.equal(unknown.situationShort,'Business model open · Stage open · Question open');
    assert.ok(unknown.nextAction.basis.includes('not a finding from startup research'));
    const connected=buildWorkspaceModel(contextualStartup,profiles,historical,{}, {}, ['demo_discovery']);
    assert.equal(connected.nextAction.title,connected.suggestions[0].title);
    assert.ok(connected.nextAction.basis.includes('not proof of an outcome'));
    assert.equal(connected.nextAction.label,'Review this move');
});

test('library-first overview previews matching examples without silently activating a lens or inventing a match',()=>{
    const discovery=buildWorkspaceModel(contextualStartup,profiles,historical);
    assert.equal(discovery.lensCount,0);
    assert.equal(discovery.tasks.length,4);
    assert.equal(discovery.suggestions.length,0);
    assert.equal(discovery.libraryPreview.length,1);
    assert.equal(discovery.nextAction.title,discovery.libraryPreview[0].title);
    assert.equal(discovery.nextAction.basisLabel,'Based on fictional examples');
    assert.ok(discovery.nextAction.sources.some(source=>source.kind==='snapshot'));
    assert.ok(discovery.nextAction.sources.some(source=>source.profile_id==='demo_discovery'));
    const unsupported=buildWorkspaceModel({...contextualStartup,business_model:'hardware'},profiles,historical);
    assert.equal(unsupported.libraryPreview.length,0);
    assert.equal(unsupported.nextAction.connectionGap.title,'No connected example for this situation yet');
    assert.equal(unsupported.nextAction.basisLabel,'General exercise');
    const excluded=buildWorkspaceModel(contextualStartup,profiles,historical,{}, {}, ['demo_formation']);
    assert.equal(excluded.libraryPreview.length,0);
    assert.equal(excluded.nextAction.heading,'A startup example to explore');
    assert.ok(excluded.nextAction.sources.every(source=>source.kind==='snapshot'));
    const example=discovery.libraryPreview[0];
    const dismissed={[example.id]:{decision:'dismissed',startupKey:startupEvidenceKey(contextualStartup),evidenceKey:example.evidenceKey}};
    const handled=buildWorkspaceModel(contextualStartup,profiles,historical,{},dismissed);
    assert.equal(handled.libraryPreview.length,0);
    assert.equal(handled.nextAction.connectionGap.title,'No further connected moves to review');
});

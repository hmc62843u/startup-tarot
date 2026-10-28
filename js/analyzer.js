import { normalizeSector, buildComparison } from './context.js';
import { buildPreparationTasks, preparationProgress, mergeHistoricalTasks } from './tasks.js';
import { buildHistoricalSuggestions, connectionGapReason, describeLibrarySupport } from './matching.js';
import { selectNextMove } from './recommendation.js';
import { describeSituation, describeNextAction } from './explanations.js';

// Compatibility facade: existing consumers retain the original analyzer API.
export { normalizeSector, analyzeGap, profileSectors, filterProfiles, buildComparison, startupEvidenceKey } from './context.js';
export { buildPreparationTasks, preparationProgress, mergeHistoricalTasks, investorLensKey } from './tasks.js';
export { buildHistoricalSuggestions } from './matching.js';
export { evaluateMatchingCases } from './evaluation.js';

/** A qualitative evidence map. Completion is task progress, never funding readiness. */
export function buildWorkspaceModel(startup, profiles, snapshots, records = {}, decisions = {}, selectedInvestorIds = []) {
  const started=!!startup.current_stage;
  const selected=new Set(selectedInvestorIds);
  const lensProfiles=profiles.filter(profile=>profile.comparison_enabled!==false && selected.has(profile.id));
  const support=describeLibrarySupport(startup,lensProfiles,snapshots);
  const connected=buildHistoricalSuggestions(startup,lensProfiles,snapshots,decisions);
  const snapshotSuggestions=buildHistoricalSuggestions(startup,[],snapshots,decisions,{snapshotOnly:true});
  const suggestions=connected.length?connected:snapshotSuggestions;
  // Discover examples without silently selecting investors or creating tasks.
  const libraryDiscovery=lensProfiles.length?connected:buildHistoricalSuggestions(startup,profiles,snapshots,decisions);
  const libraryPreview=lensProfiles.length?[]:libraryDiscovery.filter(idea=>idea.decision==='pending');
  const previewOnly=!lensProfiles.length&&libraryDiscovery.length>0;
  const actionableSuggestions=previewOnly?[]:suggestions;
  const tasks=mergeHistoricalTasks(buildPreparationTasks(startup,lensProfiles),actionableSuggestions).map(task=>{
    const record=records[task.id];
    const progress=preparationProgress(record,startup,task,selectedInvestorIds);
    const title=progress.experiment&&!task.experimentPlan&&typeof record?.planTitle==='string'?record.planTitle:task.title;
    return {...task,title,progress};
  });
  const counts={
    total:tasks.length,
    recorded:tasks.filter(task=>task.progress.status==='evidence_recorded').length,
    inProgress:tasks.filter(task=>task.progress.status==='in_progress').length
  };
  const comparison=started?buildComparison(startup,lensProfiles):{total:lensProfiles.length,results:[]};
  const domains=[
    {id:'customer',number:'01',label:'Customer evidence',ids:['suggestion:customer-evidence'],
      signal:startup.paid_pilots!=null,description:'What customers have shown you.'},
    {id:'product',number:'02',label:'Product evidence',ids:['suggestion:product-evidence'],
      signal:!!startup.prototype_status,description:'What exists and what you have learned.'},
    {id:'team',number:'03',label:'Team capabilities',ids:['suggestion:team-evidence'],
      signal:typeof startup.founders_have_domain_expertise==='boolean',description:'Evidence of your ability to execute.'},
    {id:'investor',number:'04',label:'Investor lens',basis:'modeled_difference',
      signal:lensProfiles.length>0 && started && startup.current_stage!=='unknown' && !!startup.sectors?.some(s=>String(s).trim()&&normalizeSector(s)!=='unknown'),
      description:'Questions from the profiles you chose.'},
    {id:'eligibility',number:'05',label:'Constraints to check',basis:'published_requirement',
      signal:false,description:'Source-linked rules to verify.'}
  ].map(domain=>{
    const relevant=tasks.filter(task=>domain.ids?domain.ids.includes(task.id):task.basis===domain.basis);
    const recorded=relevant.filter(task=>task.progress.status==='evidence_recorded').length;
    const status=!started?'unknown':relevant.length && recorded===relevant.length?'recorded':
      domain.signal || relevant.some(task=>task.progress.needsReview||task.progress.notes||task.progress.status==='in_progress')
        || domain.basis==='published_requirement'&&relevant.length?'review':'unknown';
    return {...domain,status,recorded,total:relevant.length,taskId:relevant.find(task=>task.progress.status!=='evidence_recorded')?.id||relevant[0]?.id||null};
  });
  const {next,candidate,pending}=selectNextMove(tasks,actionableSuggestions,libraryPreview,startup.validation_focus);
  const {situation,situationShort,currentQuestion}=describeSituation(startup,started);
  const nextAction=describeNextAction({started,next,candidate,pending,lensCount:lensProfiles.length,libraryDiscovery,validationFocus:startup.validation_focus,support,connectionReason:lensProfiles.length?connectionGapReason(startup,lensProfiles,snapshots):null});
  return {started,situation,situationShort,currentQuestion,counts,tasks,suggestions:actionableSuggestions,support,libraryPreview,domains,comparison,nextAction,lensCount:lensProfiles.length,libraryTotal:profiles.filter(profile=>profile.comparison_enabled!==false).length,
    companies:new Set(snapshots.map(snapshot=>snapshot.company)).size,snapshotCount:snapshots.length};
}

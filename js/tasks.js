import { analyzeGap, startupEvidenceKey } from './context.js';

/** Task completion records work; it is not a readiness score. */
export function buildPreparationTasks(startup, profiles) {
  if (!startup.current_stage) return [];
  const tasks = [];
  for (const profile of profiles.filter(profile => profile.comparison_enabled !== false)) {
    const source = [{ name: profile.name, url: profile.source_url, data_kind:profile.data_kind }];
    for (const gap of analyzeGap(startup,profile)) {
      const stage = gap.category === 'Stage Fit';
      tasks.push({
        id: profile.id + (stage ? ':stage-check' : ':sector-check'),
        basis:'modeled_difference',
        title: 'Confirm ' + (stage ? 'stage mandate' : 'sector scope') + ' · ' + profile.name,
        reason:gap.message,
        evidence:profile.data_kind==='fictional'?'Practice comparing your context with the invented focus in the scenario specification. No real investor mandate or outreach opportunity is represented.':'Record the current mandate, a source link or a dated clarification from the fund. Decide whether further outreach is appropriate.',
        sources:source
      });
    }
    for (const requirement of profile.eligibility_requirements || []) {
      tasks.push({
        id:profile.id + ':eligibility:' + requirement,
        basis:'published_requirement',
        title:'Verify eligibility · ' + profile.name,
        reason:requirement,
        evidence:profile.data_kind==='fictional'?'Inspect the illustrative rule and record what information would be needed to assess it. This is not a real program requirement.':'Check the linked source for current rules. Record the applicable requirement and evidence of whether your startup meets it.',
        sources:source
      });
    }
  }
  tasks.push(
    {id:'suggestion:customer-evidence',basis:'optional_suggestion',title:'Document customer learning',
      reason:'The startup form records pilot/LOI counts but not what customers learned or validated.',
      evidence:'Add dated interview notes, pilot outcomes or other demand evidence. Describe the limitations; no revenue threshold is implied.',sources:[]},
    {id:'suggestion:product-evidence',basis:'optional_suggestion',title:'Record your current product approach',
      reason:'Product progress alone does not show what has been learned.',
      evidence:'Describe the idea, sketches, tests or product evidence you currently have and its limits. A prototype is not automatically required.',sources:[]},
    {id:'suggestion:team-evidence',basis:'optional_suggestion',title:'Describe the team’s ability to execute',
      reason:'Domain experience alone does not describe the team’s capabilities.',
      evidence:'Record relevant work, demonstrated skills, capability gaps and how the team plans to address them.',sources:[]},
    {id:'suggestion:next-milestone',basis:'optional_suggestion',title:startup.validation_focus==='demand'?'Plan your own demand test':startup.validation_focus==='operations'?'Plan a small delivery test':'Choose a testable next milestone',
      reason:'A small test can turn your next uncertainty into something you can learn from.',
      evidence:'Name the uncertainty, planned test, expected evidence and target date. A prototype is not automatically required.',sources:[]}
  );
  return tasks;
}

/** Stable identity of the selected lens; unrelated to provider/package identity. */
export function investorLensKey(ids=[]) {
  return JSON.stringify([...new Set((Array.isArray(ids)?ids:[]).filter(id=>typeof id==='string'))].sort());
}

export function preparationProgress(record, startup, task = null, selectedInvestorIds = null) {
  const valid = record && typeof record === 'object' && !Array.isArray(record);
  const notes = valid && typeof record.notes === 'string' ? record.notes : '';
  const plan=valid && record.experiment && typeof record.experiment==='object' && !Array.isArray(record.experiment) ? record.experiment : null;
  const experiment=plan ? Object.fromEntries(['question','action','evidenceNeeded','continueWhen','changeWhen','stopWhen','reviewDate','outcome']
    .map(key=>[key,typeof plan[key]==='string'?plan[key]:''])) : null;
  const reviewReasons=[];
  if(valid){
    if(record.startupKey!==startupEvidenceKey(startup))reviewReasons.push('startup_changed');
    if(task!==null&&(record.taskKey??null)!==(task.evidenceKey??null)){
      const lensChanged=typeof record.basisLensKey==='string'&&Array.isArray(selectedInvestorIds)
        &&record.basisLensKey!==investorLensKey(selectedInvestorIds);
      reviewReasons.push(lensChanged?'investor_lens_changed':'connection_changed');
    }
    if((task?.experimentPlan||experiment)&&record.status==='evidence_recorded'&&!['continue','change','stop'].includes(experiment?.outcome))reviewReasons.push('checkpoint_needed');
  }
  const reopen=reviewReasons.some(reason=>reason==='startup_changed'||reason==='checkpoint_needed'||!experiment);
  const status=valid&&!reopen&&['todo','in_progress','evidence_recorded'].includes(record.status)
    &&(record.status!=='evidence_recorded'||notes.trim())?record.status:'todo';
  return {status,notes,needsReview:reviewReasons.length>0,reviewReasons,experiment};
}

/** Accepted lessons enrich an existing optional task instead of creating a duplicate. */
export function mergeHistoricalTasks(tasks, suggestions) {
  return tasks.map(task=>{
    const accepted=suggestions.filter(suggestion=>suggestion.targetTaskId===task.id && suggestion.decision==='accepted');
    if (!accepted.length) return task;
    return {...task,basis:'combined_suggestion',supportKind:accepted.every(item=>item.supportKind==='snapshot_only')?'snapshot_only':'connected',
      experimentPlan:{question:accepted[0].learningQuestion,action:accepted.map(suggestion=>suggestion.reason).join(' '),
        evidenceNeeded:task.evidence,continueWhen:'',changeWhen:'',stopWhen:'',reviewDate:'',outcome:'unreviewed'},
      title:accepted[0].title,
      reason:accepted.map(suggestion=>suggestion.reason).join(' '),
      relevance:accepted.map(suggestion=>suggestion.relevance).join(' '),
      caution:accepted.map(suggestion=>suggestion.caution).join(' '),
      interpretations:[...new Set(accepted.flatMap(suggestion=>suggestion.interpretations))],
      sources:[...new Map([...task.sources,...accepted.flatMap(suggestion=>suggestion.sources)]
        .map(source=>[source.kind+':'+source.url+':'+(source.snapshot_date||''),source])).values()],
      evidenceKey:JSON.stringify(accepted.map(suggestion=>suggestion.evidenceKey))
    };
  });
}

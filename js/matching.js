import { analyzeGap, filterProfiles, startupEvidenceKey, normalizeSector, profileSectors } from './context.js';

function lessonMatchesContext(startup,lesson) {
  return lesson.business_models.includes(startup.business_model)
    && lesson.validation_focus.includes(startup.validation_focus)
    && lesson.startup_stages.includes(startup.current_stage);
}

function matchingInvestors(startup,profiles) {
  return filterProfiles(profiles.filter(profile=>profile.comparison_enabled!==false),{
    stage:startup.current_stage
  }).filter(profile=>!analyzeGap(startup,profile).some(gap=>gap.category==='Sector Fit'));
}

/** Diagnose missing connections in validated records; never create a candidate. */
export function connectionGapReason(startup,profiles,snapshots) {
  if([startup.business_model,startup.current_stage,startup.validation_focus].some(value=>!value||value==='unknown'))return 'incomplete_context';
  const investors=matchingInvestors(startup,profiles);
  if(!investors.length)return 'incompatible_profile';
  const lessons=snapshots.flatMap(snapshot=>snapshot.preparation_lessons||[]).filter(lesson=>lessonMatchesContext(startup,lesson));
  if(!lessons.length)return 'missing_rule';
  if(investors.some(profile=>(profile.preparation_topics||[]).some(topic=>lessons.some(lesson=>lesson.topic===topic.topic))))return null;
  const sectors=(startup.sectors||[]).map(normalizeSector).filter(sector=>sector&&sector!=='unknown');
  const confirmedFit=investors.some(profile=>{
    const focus=profileSectors(profile);
    return focus.includes('generalist')||sectors.some(sector=>focus.includes(sector));
  });
  return confirmedFit?'missing_investor_topic':'missing_topic_unconfirmed_sector';
}

/** Editorial lessons require explicit context plus a source-backed investor interest. */
export function matchHistoricalCandidates(startup, profiles, snapshots, {snapshotOnly=false}={}) {
  if (!startup.business_model || !startup.validation_focus || !startup.current_stage) return [];
  const groups=new Map();
  for (const snapshot of snapshots) for (const lesson of snapshot.preparation_lessons || []) {
    if (!lessonMatchesContext(startup,lesson)) continue;
    const investors=matchingInvestors(startup,profiles);
    const contexts=investors.flatMap(profile=>(profile.preparation_topics||[]).filter(topic=>topic.topic===lesson.topic)
      .map(topic=>({kind:'investor',profile_id:profile.id,name:profile.name,url:topic.source_url,data_kind:profile.data_kind,
        statement:topic.statement,published_date:topic.published_date,retrieved_date:topic.retrieved_date})));
    if (!contexts.length&&!snapshotOnly) continue;
    const id=(snapshotOnly?'snapshot:':'historical:')+lesson.id;
    if (!groups.has(id)) groups.set(id,{
      id,title:lesson.title,targetTaskId:lesson.target_task_id,
      basis:'combined_suggestion',supportKind:snapshotOnly?'snapshot_only':'connected',reason:lesson.approach,
      learningQuestion:startup.validation_focus==='customer_problem'?'What customer problem do we need to understand better?':
        startup.validation_focus==='operations'?'Can we deliver this service within our constraints?':'What would show genuine demand for this service?',
      relevance:(snapshotOnly?'Startup example only; no investor alignment is established. ':'')+'Your selected model ('+startup.business_model+'), question ('+startup.validation_focus+
        ') and entry stage ('+startup.current_stage+') match the editorial lesson. '+(snapshotOnly?'No matching investor interest is documented.':'Investor focus is modeled; eligibility remains unverified.'),
      caution:lesson.caution,sources:[],interpretations:[]
    });
    const group=groups.get(id);
    if(!snapshotOnly)group.sources.push(...contexts);
    for (const sourceId of lesson.source_ids) {
      const source=snapshot.sources.find(source=>source.id===sourceId);
      if(source) group.sources.push({
        kind:'snapshot',name:snapshot.company+' · '+snapshot.snapshot_date,url:source.url,data_kind:snapshot.data_kind,
        snapshot_date:snapshot.snapshot_date,published_date:source.published_date,
        retrieved_date:source.retrieved_date,evidence_type:source.evidence_type,
        statement:lesson.evidence_fields.map(key=>snapshot.fields[key].value).join(' '),
        limitations:snapshot.limitations
      });
    }
    group.interpretations.push(lesson.interpretation);
  }
  return [...groups.values()].map(group=>{
    group.sources=[...new Map(group.sources.map(source=>[source.kind+':'+source.url+':'+(source.snapshot_date||''),source])).values()];
    group.interpretations=[...new Set(group.interpretations)];
    group.evidenceKey=JSON.stringify([group.reason,group.relevance,group.sources,group.interpretations]);
    return group;
  });
}

/** Apply workspace choices after matching; stale evidence resets a choice. */
export function buildHistoricalSuggestions(startup, profiles, snapshots, decisions = {}, options = {}) {
  const currentKey=startupEvidenceKey(startup);
  return matchHistoricalCandidates(startup,profiles,snapshots,options).map(group=>{
    const previous=decisions[group.id];
    const decision=previous?.startupKey===currentKey && previous?.evidenceKey===group.evidenceKey
      && ['accepted','dismissed'].includes(previous.decision) ? previous.decision : 'pending';
    return {...group,decision};
  });
}

/** Partial support is explicit and never turns an investor interest into a startup example. */
export function describeLibrarySupport(startup,profiles,snapshots) {
  const focusTopics={demand:['customer_learning'],customer_problem:['customer_learning'],operations:['operations'],technical_feasibility:['technical_feasibility']};
  const topics=focusTopics[startup.validation_focus]||[];
  const interests=matchingInvestors(startup,profiles).flatMap(profile=>(profile.preparation_topics||[])
    .filter(topic=>topics.includes(topic.topic)).map(topic=>({kind:'investor',profile_id:profile.id,name:profile.name,url:topic.source_url,data_kind:profile.data_kind,statement:topic.statement,published_date:topic.published_date,retrieved_date:topic.retrieved_date})));
  const examples=matchHistoricalCandidates(startup,[],snapshots,{snapshotOnly:true});
  const connected=matchHistoricalCandidates(startup,profiles,snapshots);
  return {kind:connected.length?'connected':interests.length&&examples.length?'unlinked':interests.length?'investor_only':examples.length?'snapshot_only':'neither',interests,examples};
}

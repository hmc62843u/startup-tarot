import {validateResearchOutput} from './research.js';
import {investorLensKey} from './tasks.js';
import {startupEvidenceKey} from './context.js';
import {saveLeanPlan} from './lean.js';

export const RESEARCH_VIEWS={situation:'Situation',move:'Next move',startup:'Startup',investor:'Investor'};
// Local change detector, not an authenticity or security signature.
export function researchContextKey(value){let hash=2166136261;const text=JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item);for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(16);}
export const researchPlanKey=plan=>researchContextKey({action:plan?.action||'',evidenceNeeded:plan?.evidenceNeeded||'',notes:plan?.notes||'',outcome:plan?.outcome||''});
export function validateSourceContext(context){
  if(!context||context.schema_version!==1||!context.origin||!Object.hasOwn(RESEARCH_VIEWS,context.origin.view)||typeof context.origin.startup_key!=='string'||typeof context.origin.pack_key!=='string'||typeof context.origin.pack_id!=='string'||typeof context.origin.provider_id!=='string'||typeof context.origin.label!=='string'||!context.situation||typeof context.situation!=='object'||Array.isArray(context.situation))throw new Error('Invalid contextual research source.');
  if(Object.keys(context).some(k=>!['schema_version','origin','situation','experiment','basis'].includes(k))||Object.keys(context.origin).some(k=>!['view','startup_key','pack_key','pack_id','provider_id','label','task_id','investor_id','snapshot_id','lens_key','fit_key','task_key','plan_key'].includes(k))||JSON.stringify(context).length>12000)throw new Error('Research context is unsupported or too large.');
  return context;
}
export function createResearchContext({view,startup,pack,task,investor,snapshot,experiment,selectedInvestorIds=[],fit={}}){
  const origin={view,startup_key:startupEvidenceKey(startup),pack_key:researchContextKey(pack),pack_id:pack.id,provider_id:pack.provider?.id||'legacy',label:RESEARCH_VIEWS[view],lens_key:investorLensKey(selectedInvestorIds),fit_key:researchContextKey(fit),task_id:task?.id||null,task_key:task?.evidenceKey??null,plan_key:researchPlanKey(experiment),investor_id:investor?.id||null,snapshot_id:snapshot?.id||null};
  if(view==='move'&&task)origin.label+=' · '+task.title;if(view==='investor'&&investor)origin.label+=' · '+investor.name;if(view==='startup'&&snapshot)origin.label+=' · '+snapshot.company+' ('+snapshot.snapshot_date+')';
  const context=validateSourceContext({schema_version:1,basis:'Founder-provided working context; not independently verified evidence.',origin,situation:structuredClone(startup),experiment:experiment?structuredClone(experiment):null});
  const questions={situation:'Which assumptions in my situation need evidence, and what should I investigate next?',move:'How can I improve this experiment? Propose expected observations, alternatives and review or stop conditions.',startup:'How does this dated startup example compare with my situation? Explain similarities, material differences and limits before proposing an investigation.',investor:'What investor-fit and evidence gaps should I investigate before approaching this investor? Preserve documented mismatches and unknowns.'};
  return {context,question:questions[view],investor_ids:investor?[investor.id]:[],snapshot_ids:snapshot?[snapshot.id]:[]};
}
export function reviewResearchInvestigation(state,pack,tasks,run,index){
  const validation=validateResearchOutput(run.output,run.packet);if(!validation.isValid)throw new Error('Research output is not valid: '+validation.errors.join(' '));
  const context=validateSourceContext(run.source_context||run.packet?.source_context);
  if(run.packet?.historical_cutoff)throw new Error('Historical simulations cannot directly change your current plan. Start a current-context question.');
  if(context.origin.pack_id!==pack.id||context.origin.provider_id!==(pack.provider?.id||'legacy')||context.origin.pack_key!==researchContextKey(pack))throw new Error('The research pack changed. Rebuild research before applying this proposal.');
  if(context.origin.startup_key!==startupEvidenceKey(state.startup))throw new Error('Your situation changed or was not saved. Save it and research the current context before applying a proposal.');
  if(context.origin.lens_key!==investorLensKey(state.selectedInvestorIds))throw new Error('Your investor perspective changed. Research the current context before applying this proposal.');
  if(!state.startup.current_stage)throw new Error('Save your situation before accepting an experiment.');
  const task=tasks.find(t=>t.id===context.origin.task_id)||(!context.origin.task_id?tasks.find(t=>t.id==='suggestion:next-milestone'):null);
  if(!task)throw new Error('The originating task is no longer available. Research your current next move.');
  const row=run.output?.proposed_investigations?.[index];if(!run.id||!row)throw new Error('Select an investigation from a saved research run.');
  if((state.taskProgress[task.id]?.researchApplications||[]).some(a=>a.run_id===run.id&&a.investigation_index===index))throw new Error('This investigation is already accepted. Edit the saved experiment in Next move.');
  if((context.origin.task_key??null)!==(task.evidenceKey??null))throw new Error('The supporting task evidence changed. Research your current next move.');
  const current=state.taskProgress[task.id]||{};if(context.origin.plan_key!==researchPlanKey({...current.experiment||task.experimentPlan||{},notes:current.notes||''}))throw new Error('Your experiment or learning changed. Research the current plan before applying a proposal.');
  return {task_id:task.id,action:row.question,evidenceNeeded:'Expected observation: '+row.expected_observation+'\nReview / stop condition: '+row.review_condition,why:row.why,basis:row.basis,evidence_ids:[...row.evidence_ids],previous:structuredClone(state.taskProgress[task.id]||null)};
}
export function applyResearchInvestigation(state,pack,tasks,run,index,edited,acceptedAt){
  const draft=reviewResearchInvestigation(state,pack,tasks,run,index),task=tasks.find(t=>t.id===draft.task_id);
  for(const field of ['action','evidenceNeeded'])if(typeof edited[field]!=='string'||!edited[field].trim()||edited[field].length>12000)throw new Error('Supply an action and expected evidence (up to 12000 characters each).');
  const old=state.taskProgress[task.id]||{},application={run_id:run.id,packet_id:run.packet.packet_id,investigation_index:index,accepted_at:acceptedAt,origin:structuredClone((run.source_context||run.packet.source_context).origin),basis:draft.basis,evidence_ids:[...draft.evidence_ids],previous:{experiment:old.experiment||null,status:old.status||null,notes:old.notes||'',planTitle:old.planTitle||null},accepted:{action:edited.action.trim(),evidenceNeeded:edited.evidenceNeeded.trim()}};
  const record=saveLeanPlan(state,task,{experiment:{...(old.experiment||task.experimentPlan||{}),question:run.packet.question,action:edited.action.trim(),evidenceNeeded:edited.evidenceNeeded.trim(),outcome:'unreviewed'},status:'todo',notes:'',researchApplications:[...(old.researchApplications||[]),application]});
  return {...state,taskProgress:{...state.taskProgress,[task.id]:record}};
}

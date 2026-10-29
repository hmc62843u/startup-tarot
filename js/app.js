import {normalizeProfile} from './validator.js';
import {startupEvidenceKey, investorLensKey} from './analyzer.js';
import {validateResearchPackage, researchRecords} from './research-library.js';
import {loadState, saveState} from './storage.js';
import {configuredWorkspace, workspaceForSave, leanModel, saveLeanPlan} from './lean.js';

const byId=id=>document.getElementById(id);
const previous=loadState(),pack=globalThis.STARTUP_GUIDE_PACK;
const validation=validateResearchPackage(pack);
let state,profiles=[],snapshots=[],view='situation',step='move',investorIndex=0,snapshotIndex=0,activeTaskId=null,unsaved=false,planJustSaved=false;
const short=(value,n=145)=>String(value||'').length>n?String(value).slice(0,n).replace(/\s+\S*$/,'')+'…':String(value||'');
const model=()=>leanModel(state,profiles,snapshots);
const node=(tag,text,attrs={})=>{const el=document.createElement(tag);el.textContent=text;for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;};
function status(text,error=false){byId('app-status').textContent=text;byId('app-status').classList.toggle('error',error);}
function persist(message='Saved in this browser.'){
    try{const saved=workspaceForSave(state,previous);saveState(saved);state.libraryWorkspaces=saved.libraryWorkspaces;unsaved=false;status(message);return true;}
    catch{status('Could not save. Keep this tab open and try again.',true);return false;}
}
function go(next){
    if(unsaved&&!confirm('Leave without saving these edits?'))return;
    unsaved=false;view=next;if(next==='move')step='move';
    render();byId('screen-title').focus({preventScroll:true});window.scrollTo(0,0);
}
function title(text){byId('screen-title').textContent=text;}
function button(id,handler){byId(id).addEventListener('click',handler);}
function showDetails(heading,paragraphs,sources=[]){
    const body=byId('detail-body');body.replaceChildren();byId('detail-title').textContent=heading;
    for(const text of paragraphs.filter(Boolean))body.append(node('p',text));
    for(const source of sources){
        const entry=node('section','',{'class':'source-entry'});entry.append(node('h3',source.name||source.title||'Source'));
        if(source.statement)entry.append(node('p',source.statement));
        entry.append(node('p',[source.snapshot_date&&'Snapshot '+source.snapshot_date,source.published_date&&'Published '+source.published_date,source.retrieved_date&&'Retrieved '+source.retrieved_date].filter(Boolean).join(' · '),{'class':'muted'}));
        const url=source.url||source.source_url;
        if(url&&(/^(https?:\/\/|\.\/docs\/)/.test(url)))entry.append(node('a','Open source ↗',{href:url,target:'_blank',rel:'noopener noreferrer'}));
        for(const limit of source.limitations||[])entry.append(node('p',limit));body.append(entry);
    }
    byId('evidence-dialog').showModal();byId('close-details').focus();
}
function render(){
    for(const panel of document.querySelectorAll('[data-screen]'))panel.hidden=panel.dataset.screen!==view;
    for(const tab of document.querySelectorAll('[data-view]'))tab.setAttribute('aria-pressed',String(tab.dataset.view===view));
    byId('pack-label').textContent=pack.dataset_kind==='fictional'?'Fictional demo':'Research examples';
    if(view==='situation')renderSituation();if(view==='move')renderMove();if(view==='investor')renderInvestor();if(view==='startup')renderSnapshot();
}
function renderSituation(){title('Your situation');for(const [id,key] of [['business-model','business_model'],['current-stage','current_stage'],['validation-focus','validation_focus']])byId(id).value=state.startup[key]||'';}
function planTask(m){return m.tasks.find(task=>task.id===activeTaskId)||m.task;}
function renderMove(){
    title(step==='move'?'Your next move':step==='plan'?'Plan a small test':planJustSaved?'Plan saved':'Record your learning');
    for(const part of document.querySelectorAll('[data-step]'))part.hidden=part.dataset.step!==step;
    const m=model();
    if(!m.started){byId('move-title').textContent='Start with your situation.';byId('move-support').textContent='Three choices help find a useful example.';byId('move-reason').textContent='';byId('move-action').textContent='Set my situation';byId('move-links').hidden=true;return;}
    if(step!=='move'){renderPlan(m);return;}
    const next=m.nextAction;
    byId('move-title').textContent=next.savedExperiment?state.taskProgress[next.taskId]?.planTitle||next.title:next.title;
    byId('move-kind').textContent=next.savedExperiment?'Your current experiment':next.generalExercise?'General exercise':next.heading||'An example to explore';
    byId('move-support').textContent=next.generalExercise?(m.support.kind==='investor_only'?'Investor interest only; no startup example.':'No supporting library connection.'):m.lensCount?next.connectionNote||'Review the evidence before adapting.':next.sources?.some(s=>s.kind==='investor')?'Preview only. No investor selected.':next.connectionNote||'';
    byId('move-reason').textContent=short(next.savedExperiment?next.reason:next.generalExercise?next.reason:next.sources?.some(s=>s.kind==='investor')?'The startup lesson and investor topic fit your situation.':'This startup lesson fits your model, stage and question.',100);
    byId('move-action').textContent=next.savedExperiment?'Continue plan':!m.lensCount&&m.libraryPreview.length?'Choose an investor':'Make a plan';
    byId('move-links').hidden=false;byId('move-evidence').textContent=next.sources?.length?'Why this fits & sources':'Why this suggestion';
    byId('support-note').textContent=pack.dataset_kind==='fictional'?'Fictional example; no outcome evidence.':'Interpretation, not endorsement.';
}
function beginPlan(){
    let m=model();if(!m.started){go('situation');return;}
    if(!m.lensCount&&m.libraryPreview.length&&!m.nextAction.savedExperiment){go('investor');return;}
    if(m.pending&&!m.nextAction.savedExperiment){state.suggestionChoices[m.pending.id]={decision:'accepted',startupKey:startupEvidenceKey(state.startup),evidenceKey:m.pending.evidenceKey};activeTaskId=m.pending.targetTaskId;m=model();}
    else activeTaskId=m.nextAction.taskId||m.task?.id;
    if(!activeTaskId){status('No plan available. Change your situation.',true);return;}
    planJustSaved=false;step='plan';renderMove();byId('plan-action').focus();byId('plan-action').setSelectionRange(0,0);byId('plan-action').scrollTop=0;
}
function renderPlan(m){
    const task=planTask(m);if(!task){step='move';renderMove();return;}
    const record=state.taskProgress[task.id]||{},plan=record.experiment||task.experimentPlan||{};
    byId('plan-action').value=plan.action||'';byId('plan-evidence').value=plan.evidenceNeeded||'';
    byId('plan-status').value=record.status||'todo';byId('plan-notes').value=record.notes||'';byId('plan-outcome').value=plan.outcome||'unreviewed';
    byId('plan-review').textContent=task.progress.needsReview?'Situation or supporting connection changed. Your plan is kept; review it.':'';
}
function savePlan(then){
    const m=model(),task=planTask(m);if(!task){status('This plan is unavailable. Return to Next move and try again.',true);return;}
    const old=state.taskProgress[task.id]||{},template=old.experiment||task.experimentPlan||{};
    const experiment={...template,action:byId('plan-action').value.trim(),evidenceNeeded:byId('plan-evidence').value.trim(),outcome:byId('plan-outcome').value};
    const notes=byId('plan-notes').value.trim(),progress=byId('plan-status').value;
    if(progress==='evidence_recorded'&&(!notes||experiment.outcome==='unreviewed')){step='learn';for(const part of document.querySelectorAll('[data-step]'))part.hidden=part.dataset.step!==step;title('Record your learning');status('Record your learning and choose continue, change or stop.',true);return;}
    state.taskProgress[task.id]=saveLeanPlan(state,task,{experiment,status:progress,notes});
    if(persist(then==='learn'?'Plan saved in this browser.':'Progress saved.')){planJustSaved=then==='learn';if(then)step=then;renderMove();if(then==='learn')byId('screen-title').focus({preventScroll:true});}
}
function investorList(){const m=model(),ids=new Set(m.sourceList.filter(s=>s.kind==='investor').map(s=>s.profile_id));return [...profiles].sort((a,b)=>Number(ids.has(b.id))-Number(ids.has(a.id))||Number(b.id===state.selectedInvestorIds[0])-Number(a.id===state.selectedInvestorIds[0])||Number(a.comparison_enabled===false)-Number(b.comparison_enabled===false));}
function renderInvestor(){
    title('Investor perspective');const items=investorList();investorIndex=Math.min(investorIndex,Math.max(0,items.length-1));const profile=items[investorIndex];
    byId('investor-count').parentElement.hidden=items.length<=1;byId('investor-count').textContent=items.length?(investorIndex+1)+' / '+items.length:'No profiles';byId('investor-name').textContent=profile?.name||'No investor profile available.';
    const m=model(),connected=profile&&m.sourceList.some(s=>s.kind==='investor'&&s.profile_id===profile.id),selected=profile?.id===state.selectedInvestorIds[0];
    byId('investor-kind').textContent=connected?(selected?'Connected through your choice':'Library preview · not selected'):profile?.comparison_enabled===false?'Reference only':'No connection documented';
    byId('investor-focus').textContent=profile?'Entry stage: '+(profile.stage_focus||[]).join(' · '):'This pack has no investor records.';
    byId('investor-reason').textContent=connected?'Its documented topic connects with the startup lesson.':m.support.interests.some(s=>s.profile_id===profile?.id)?'Relevant interest found; no connected startup lesson.':'No matching interest is encoded for this situation.';
    byId('choose-investor').hidden=!profile||profile.comparison_enabled===false;byId('choose-investor').disabled=!profile||profile.comparison_enabled===false;byId('choose-investor').textContent=selected?'Clear my choice':'Use this perspective';
    byId('investor-prev').disabled=investorIndex===0;byId('investor-next').disabled=investorIndex>=items.length-1;byId('investor-details').disabled=!profile;
}
function snapshotList(){
    const related=new Set(model().connectedSnapshots.map(snapshot=>snapshot.id));
    return [...snapshots.filter(snapshot=>related.has(snapshot.id)),...snapshots.filter(snapshot=>!related.has(snapshot.id))];
}
function renderSnapshot(){
    title('Startup example');const items=snapshotList();snapshotIndex=Math.min(snapshotIndex,Math.max(0,items.length-1));const s=items[snapshotIndex],relevant=model().connectedSnapshots.some(snap=>snap.id===s?.id);
    byId('startup-count').parentElement.hidden=items.length<=1;byId('startup-count').textContent=items.length?(snapshotIndex+1)+' / '+items.length:'No snapshots';byId('startup-name').textContent=s?.company||'No startup example available.';
    byId('startup-kind').textContent=relevant?'Related to this move':'Browsing only · no matching lesson';byId('startup-date').textContent=s?'Snapshot · '+s.snapshot_date:'';
    byId('startup-action').textContent=short(s?.fields?.product?.value||'The pack does not document what it built.',160);
    byId('startup-limit').textContent=pack.dataset_kind==='fictional'?'Invented scenario; no real outcome evidence.':'Dated evidence; later success does not prove this approach worked.';
    byId('startup-details').disabled=!s;byId('startup-prev').disabled=snapshotIndex===0;byId('startup-next').disabled=snapshotIndex>=items.length-1;
}
function init(){
    if(!validation.isValid){byId('fatal-error').hidden=false;byId('fatal-error').textContent='The configured Guide Pack could not load. Restore packs/active-pack.js; see GUIDE.md. '+validation.errors.join(' ');byId('screen-content').hidden=true;return;}
    state=configuredWorkspace(previous,pack);const records=researchRecords(pack);profiles=records.profiles.map(normalizeProfile);snapshots=records.snapshots;view=state.startup.current_stage?'move':'situation';
    for(const tab of document.querySelectorAll('[data-view]'))tab.addEventListener('click',()=>go(tab.dataset.view));
    byId('situation-form').addEventListener('submit',event=>{event.preventDefault();state.startup={...state.startup,business_model:byId('business-model').value,current_stage:byId('current-stage').value,validation_focus:byId('validation-focus').value};if(persist()){snapshotIndex=0;activeTaskId=null;go('move');}});
    for(const form of document.querySelectorAll('form'))form.addEventListener('input',()=>{unsaved=true;status('Unsaved edits');});
    button('move-action',beginPlan);
    button('move-evidence',()=>{const m=model();showDetails('Why this move?',[m.nextAction.reason,m.nextAction.basis,m.pending?.caution||m.task?.caution,...(m.pending?.interpretations||m.task?.interpretations||[]),pack.dataset_kind==='fictional'?'Entirely invented for demonstration.':'Sources support limited facts, not predicted outcomes.'],m.sourceList);});
    button('investor-details',()=>{const p=investorList()[investorIndex];if(p)showDetails(p.name,[p.profile_basis,p.comparison_enabled===false?'Reference only; excluded from matching.':'Stage and sector focus do not establish eligibility.',...(p.explicit_criteria||[]),...(p.preparation_topics||[]).map(t=>t.statement),p.notes],[{name:p.name,url:p.source_url,retrieved_date:p.retrieved_date},...(p.preparation_topics||[]).map(t=>({...t,url:t.source_url,name:t.topic}))]);});
    button('startup-details',()=>{const s=snapshotList()[snapshotIndex];if(s)showDetails(s.company,[...Object.entries(s.fields||{}).filter(([,f])=>f.value!=null).map(([key,f])=>key+': '+f.value),...(s.limitations||[])],s.sources);});
    button('choose-investor',()=>{
        const p=investorList()[investorIndex];if(!p||p.comparison_enabled===false)return;
        const oldModel=model(),oldLens=investorLensKey(state.selectedInvestorIds);
        for(const task of oldModel.tasks){const r=state.taskProgress[task.id];if(r&&r.startupKey===startupEvidenceKey(state.startup)&&(r.taskKey??null)===(task.evidenceKey??null)&&!r.basisLensKey)r.basisLensKey=oldLens;}
        state.selectedInvestorIds=state.selectedInvestorIds[0]===p.id?[]:[p.id];activeTaskId=null;snapshotIndex=0;if(persist('Investor choice saved.'))go('move');
    });
    for(const [id,change] of [['investor-prev',-1],['investor-next',1]])button(id,()=>{investorIndex+=change;renderInvestor();});
    for(const [id,change] of [['startup-prev',-1],['startup-next',1]])button(id,()=>{snapshotIndex+=change;renderSnapshot();});
    byId('plan-form').addEventListener('submit',event=>{event.preventDefault();savePlan('learn');});
    button('plan-back',()=>{if(!unsaved||confirm('Leave without saving these edits?')){unsaved=false;step='move';renderMove();}});
    button('learning-back',()=>{if(!unsaved||confirm('Leave without saving these edits?')){unsaved=false;step='plan';renderMove();}});button('save-learning',()=>savePlan());
    button('close-details',()=>byId('evidence-dialog').close());
    byId('evidence-dialog').addEventListener('click',event=>{if(event.target===byId('evidence-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
    window.addEventListener('beforeunload',event=>{if(unsaved){event.preventDefault();event.returnValue='';}});
    render();status(state.configuredPackChanged?'Pack content changed. Review saved evidence.':'Saved in this browser.');
    if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register(new URL('../sw.js',import.meta.url),{updateViaCache:'none'}).catch(()=>status('Offline support unavailable.'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();

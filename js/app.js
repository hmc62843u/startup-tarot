import {createResearchContext,reviewResearchInvestigation,applyResearchInvestigation,researchContextKey,RESEARCH_VIEWS} from './research-context.js';
import {initRelationshipUi} from './relationship-ui.js';
import {initResearchUi} from './research-ui.js';
import {outreachStorageKey, emptyOutreachWorkspace, readOutreachWorkspace, writeOutreachWorkspace, saveInvestorEntry, reviewInvestorEntry, verificationQuestions, createOutreachDraft, exportOutreachMarkdown} from './outreach.js';
import {shortlistInvestors} from './investor-fit.js';
import {normalizeProfile} from './validator.js';
import {startupEvidenceKey, investorLensKey} from './analyzer.js';
import {validateResearchPackage, researchRecords} from './research-library.js';
import {loadState, saveState} from './storage.js';
import {configuredWorkspace, workspaceForSave, leanModel, saveLeanPlan} from './lean.js';

const byId=id=>document.getElementById(id);
const previous=loadState(),pack=globalThis.STARTUP_GUIDE_PACK;
const validation=validateResearchPackage(pack);
let outreach=emptyOutreachWorkspace(),outreachBlocked=false,outreachRaw=null,showArchivedOutreach=false;
let renderResearch=()=>{},renderRelationships=()=>{},relationshipSelection=null,pendingResearchProposal=null,proposalDirty=false;
let state,profiles=[],snapshots=[],view='situation',step='move',situationReturnStep='move',investorIndex=0,snapshotIndex=0,activeTaskId=null,unsaved=false,planJustSaved=false;
const short=(value,n=145)=>String(value||'').length>n?String(value).slice(0,n).replace(/\s+\S*$/,'')+'…':String(value||'');
const model=()=>leanModel(state,profiles,snapshots);
const node=(tag,text,attrs={})=>{const el=document.createElement(tag);el.textContent=text;for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;};
function status(text,error=false){const preview=typeof PREVIEW_SESSION!=='undefined'&&PREVIEW_SESSION;byId('app-status').textContent=preview&&!error?(text==='Saved in this browser.'?'Temporary preview — changes are not saved between sessions.':text+' · Temporary preview only.'):text;byId('app-status').classList.toggle('error',error);}
function persist(message='Saved in this browser.'){
    try{const saved=workspaceForSave(state,previous);saveState(saved);state.libraryWorkspaces=saved.libraryWorkspaces;unsaved=false;status(message);return true;}
    catch{status('Could not save. Keep this tab open and try again.',true);return false;}
}
function go(next,discardMessage='Leave without saving these edits?'){
    if(renderResearch.isBusy?.()&&next!=='research'){status('Finish or cancel research before leaving the workspace.',true);return false;}
    if(unsaved&&!confirm(discardMessage))return false;
    unsaved=false;view=next;if(next==='move')step='move';
    render();byId('screen-title').focus({preventScroll:true});window.scrollTo(0,0);return true;
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
    for(const tab of document.querySelectorAll('[data-view]'))tab.setAttribute('aria-pressed',String(tab.dataset.view===view||(view==='situation'&&tab.dataset.view==='move')));
    byId('pack-label').textContent=pack.dataset_kind==='fictional'?'Fictional demo':'Research examples';
    if(view==='fit')title('Explore investor fit');
    if(view==='research'){title('Research a question');renderResearch();}
    if(view==='relationships'){title('Relationship research');renderRelationships();}
    if(view==='shortlist'){title('Saved investor shortlist');renderShortlist();}
    if(view==='situation')renderSituation();if(view==='move')renderMove();if(view==='investor')renderInvestor();if(view==='startup')renderSnapshot();
}
function renderSituation(){title('Your situation');byId('situation-back').hidden=!state.startup.current_stage;for(const [id,key] of [['business-model','business_model'],['current-stage','current_stage'],['validation-focus','validation_focus']])byId(id).value=state.startup[key]||'';}
function planTask(m){return m.tasks.find(task=>task.id===activeTaskId)||m.task;}
function renderMove(){
    title(step==='move'?'Your next move':step==='plan'?'Plan a small test':planJustSaved?'Plan saved':'Record your learning');
    for(const part of document.querySelectorAll('[data-step]'))part.hidden=part.dataset.step!==step;
    const m=model();
    const situationLabels={saas:'Software / SaaS',hardware:'Hardware',marketplace:'Marketplace',service:'Service business',consumer_product:'Consumer product',customer_problem:'Customer problems',technical_feasibility:'Technical feasibility',investor_outreach:'Investor conversations',unknown:'Not sure yet'};
    byId('situation-summary').textContent=[state.startup.business_model,state.startup.current_stage,state.startup.validation_focus].filter(Boolean).map(value=>situationLabels[value]||value.replaceAll('_',' ')).join(' · ')||'Set your situation to find a next move.';
    if(!m.started){byId('move-title').textContent='Start with your situation.';byId('move-support').textContent='Three choices help find a useful example.';byId('move-reason').textContent='';byId('move-action').textContent='Set my situation';byId('move-links').hidden=true;return;}
    if(step!=='move'){renderPlan(m);return;}
    const next=m.nextAction;
    byId('move-title').textContent=next.savedExperiment?state.taskProgress[next.taskId]?.planTitle||next.title:next.title;
    byId('move-kind').textContent=next.savedExperiment?'Your current experiment':next.generalExercise?'General exercise':next.heading||'An example to explore';
    byId('move-support').textContent=next.generalExercise?(m.support.kind==='investor_only'?'Investor interest only; no startup example.':'No supporting library connection.'):m.lensCount?next.connectionNote||'Review the evidence before adapting.':next.sources?.some(s=>s.kind==='investor')?'Preview only. No investor selected.':next.connectionNote||'';
    byId('move-reason').textContent=short(next.savedExperiment?next.reason:next.generalExercise?next.reason:next.sources?.some(s=>s.kind==='investor')?'The startup lesson and investor topic fit your situation.':'This startup lesson fits your model, stage and question.',100);
    byId('move-action').textContent=next.savedExperiment?'Continue plan':!m.lensCount&&m.libraryPreview.length?'Choose an investor':'Make a plan';
    byId('move-links').hidden=false;byId('move-evidence').textContent=next.sources?.length?'Why this fits & sources':'Why this suggestion';
    const linked=state.taskProgress[next.taskId]?.researchApplications?.at(-1);if(next.savedExperiment&&linked){byId('move-kind').textContent='Your current experiment · research linked';byId('move-support').textContent='A research proposal you accepted; review its source support and your later edits.';byId('move-evidence').textContent='Inspect linked research';}
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
    const history=byId('plan-research-history');history.replaceChildren();for(const application of record.researchApplications||[]){const card=node('article','',{class:'card'});card.append(node('p','Accepted '+application.accepted_at+' from '+application.origin.label),node('p',application.accepted.action));const open=node('button','Inspect linked research',{type:'button'});open.addEventListener('click',()=>{if(go('research'))renderResearch.openRun(application.run_id);});const previous=node('details','');previous.append(node('summary','Previous plan and learning'),node('pre',priorPlanText(application.previous)));card.append(open,previous);history.append(card);}if(!history.children.length)history.append(node('p','No research proposals accepted into this plan.'));
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
function fitInput(){const amount=byId('fit-amount').value;return {sector:byId('fit-sector').value.trim(),stage:byId('fit-stage').value,geography:byId('fit-geography').value,check:amount&&Number.isFinite(Number(amount))&&Number(amount)>0?{amount:Number(amount),currency:byId('fit-currency').value}:null};}
function renderInvestorFit(){
    const input=fitInput();
    const today=new Date().toISOString().slice(0,10),results=shortlistInvestors(input,profiles,today),eligible=results.filter(r=>r.fit!=='excluded');
    const fitLabels={strong:'Strong documented alignment',investigate:'Worth investigating',insufficient:'Insufficient evidence',mismatch:'Documented mismatch'};
    byId('fit-summary').textContent=eligible.length+' equity profiles assessed; '+(results.length-eligible.length)+' excluded. '+Object.entries(fitLabels).map(([key,label])=>label+': '+eligible.filter(r=>r.fit===key).length).join(' / ')+'. Coverage describes the four comparisons, not funding likelihood.';
    const container=byId('fit-results');container.replaceChildren();
    const excluded=results.filter(r=>r.fit==='excluded');
    if(excluded.length){
        const notice=node('article','',{class:'card'});notice.append(node('h2','Excluded profiles'));
        for(const r of excluded)notice.append(node('p',r.name+': '+r.unknowns.join(' ')));
        if(!eligible.length)notice.append(node('p','No comparable investor profiles are available in this collection. Use a research collection for investor fit; fictional profiles remain available for library and relationship demonstrations.'));
        container.append(notice);
    }
    for(const r of eligible){
        const card=node('article','',{class:'card'});
        card.append(node('h2',r.name),node('p',fitLabels[r.fit]+' | Evidence coverage: '+r.evidenceCoverage));
        card.append(node('p',r.fit==='strong'?'All four fields align; additional eligibility still needs checking.':r.fit==='investigate'?'Stage and sector align; geography or check size needs confirmation.':r.fit==='insufficient'?'Stage and sector alignment is not established. Review missing information before treating this as a lead.':'An explicit requirement does not align. Review the mismatch below.'));
        for(const [label,items] of [['Matches',r.reasons],['Mismatches',r.conflicts],['Unknowns',r.unknowns],['Additional conditions to check',r.cautions]]){
            if(items.length){card.append(node('h3',label));const list=node('ul','');for(const text of items)list.append(node('li',text));card.append(list);}
        }
        if(r.timing)card.append(node('h3','Timing (for now or for later)'),node('p',r.timing.text));
        card.append(node('p','Confirm current availability, full eligibility and portfolio conflicts before outreach.'));
        const sources=node('button','Evidence & dates',{type:'button',class:'text-button'});
        sources.addEventListener('click',()=>showDetails(r.name+' — mandate evidence',['Assessed '+today+'. Claims older than 180 days need review; this is a product policy, not an investor rule.','Timing is a hint from the latest dated fund announcement. It does not change the alignment label or ranking.'],[...r.evidence.map(c=>({name:c.field+' · '+c.basis,statement:c.statement,url:c.source_url,retrieved_date:c.checked_date})),...(r.timing?.evidence||[]).map(c=>({name:'timing · '+c.basis,statement:c.statement,url:c.source_url,retrieved_date:c.checked_date}))]));
        const save=node('button',outreach.entries.find(e=>e.id===r.id)?.archived?'Restore to shortlist':outreach.entries.some(e=>e.id===r.id)?'Update saved assessment':'Save to shortlist',{type:'button',class:'primary'});
        save.addEventListener('click',()=>{const next=saveInvestorEntry({...outreach,query:input},input,r,pack.version,new Date().toISOString().slice(0,10));next.entries.find(e=>e.id===r.id).archived=false;if(commitOutreach(next))save.textContent='Saved to shortlist';});
        const supporting=node('div','',{class:'secondary-actions',role:'group','aria-label':'Investor evidence'});supporting.append(sources);card.append(save,supporting);container.append(card);
    }
}

function commitOutreach(next){
    if(outreachBlocked){status('Saved shortlist could not be read. Existing data is preserved; export or recover it before saving.',true);return false;}
    try{
        const key=outreachStorageKey(pack);
        if(localStorage.getItem(key)!==outreachRaw)throw new Error('Shortlist changed in another tab. Reload before saving.');
        writeOutreachWorkspace(localStorage,key,next);outreach=next;outreachRaw=JSON.stringify(next);unsaved=false;status('Shortlist saved in this browser.');return true;
    }catch(error){status('Could not save shortlist: '+error.message,true);return false;}
}
function captureOutreach(){
    const next=structuredClone(outreach);next.query=fitInput();
    if(view==='shortlist'){
        next.founder=Object.fromEntries(['name','company','summary','progress'].map(key=>[key,byId('founder-'+key).value.trim()]));
        for(const el of byId('shortlist-results').querySelectorAll('[data-entry-id]')){
            const entry=next.entries.find(e=>e.id===el.dataset.entryId);
            if(entry)entry[el.dataset.entryField]=el.value;
        }
    }
    return next;
}
function renderShortlist(){
    for(const key of ['name','company','summary','progress'])byId('founder-'+key).value=outreach.founder[key]||'';
    byId('outreach-status').textContent=outreachBlocked?'Saved shortlist is unreadable; existing data has been preserved.':outreach.entries.filter(e=>!e.archived).length+' active saved investors. Changes to the current startup profile or sources require review.';
    byId('recovery-backup').hidden=!outreachBlocked;
    const container=byId('shortlist-results');container.replaceChildren();
    const date=new Date().toISOString().slice(0,10),input=fitInput();
    for(const e of outreach.entries.filter(e=>showArchivedOutreach?e.archived:!e.archived)){
        const review=reviewInvestorEntry(e,profiles,input,date,outreach.founder),card=node('article','',{class:'card'});
        card.append(node('h2',e.result.name),node('p','Saved '+e.savedAt+' | '+e.result.fit+' | '+e.result.evidenceCoverage+' coverage'),
            node('p',review.changed?'Review required: the startup profile or evidence changed. Notes and older draft are preserved.':'Saved assessment is unchanged.'),
            node('p','Saved startup: '+e.input.sector+' / '+e.input.stage+' / '+e.input.geography+(e.input.check?' / '+e.input.check.amount+' '+e.input.check.currency:'')));
        card.append(node('h3','Questions to verify'));const questions=node('ul','');
        for(const q of verificationQuestions(review.current||e.result))questions.append(node('li',q));card.append(questions);
        const notesId='notes-'+e.id,draftId='draft-'+e.id;
        card.append(node('label','Your notes and verification answers',{for:notesId}));
        const notes=node('textarea','',{id:notesId,rows:'3',maxlength:'12000','data-entry-id':e.id,'data-entry-field':'notes'});notes.value=e.notes;card.append(notes);
        const update=node('button','Review & update assessment',{type:'button'});
        update.disabled=!review.current||review.current.fit==='excluded';
        update.addEventListener('click',()=>{const next=captureOutreach();const now=new Date().toISOString().slice(0,10),current=profiles.find(p=>p.id===e.id);
            if(current&&commitOutreach(saveInvestorEntry(next,next.query,shortlistInvestors(next.query,[current],now)[0],pack.version,now)))renderShortlist();});
        const draft=node('button','Prepare outreach draft',{type:'button'});draft.disabled=!review.canDraft;
        draft.addEventListener('click',()=>{
            const next=captureOutreach(),entry=next.entries.find(x=>x.id===e.id),fresh=reviewInvestorEntry(entry,profiles,next.query,new Date().toISOString().slice(0,10),next.founder);
            if(entry.draft&&!confirm('Replace this editable draft? Your other notes are kept.'))return;
            try{entry.draft=createOutreachDraft(entry,next.founder,fresh);entry.draftKey=entry.assessmentKey;entry.draftFounderKey=JSON.stringify(next.founder);if(commitOutreach(next))renderShortlist();}catch(error){status(error.message,true);}
        });
        card.append(update,draft,node('p',review.canDraft?'Drafts use published focus and your own details. Review all statements before use.':'Outreach preparation requires current stage and sector alignment. Save or review the assessment first.'));
        if(review.draftNeedsReview)card.append(node('p','Draft needs review: its supporting assessment or founder details changed.',{class:'review'}));
        card.append(node('label','Editable outreach draft',{for:draftId}));const text=node('textarea','',{id:draftId,rows:'8',maxlength:'20000','data-entry-id':e.id,'data-entry-field':'draft'});text.value=e.draft;card.append(text);
        const archive=node('button',e.archived?'Restore investor':'Archive investor',{type:'button'});archive.addEventListener('click',()=>{const next=captureOutreach();next.entries.find(x=>x.id===e.id).archived=!e.archived;if(commitOutreach(next))renderShortlist();});card.append(archive);
        const approve=node('button','Mark draft reviewed',{type:'button'});approve.disabled=!review.canDraft||!e.draft;
        approve.addEventListener('click',()=>{const next=captureOutreach(),entry=next.entries.find(x=>x.id===e.id);const fresh=reviewInvestorEntry(entry,profiles,next.query,new Date().toISOString().slice(0,10),next.founder);if(!fresh.canDraft){status('Update this assessment before reviewing its draft.',true);return;}entry.draftKey=entry.assessmentKey;entry.draftFounderKey=JSON.stringify(next.founder);if(commitOutreach(next))renderShortlist();});card.append(approve);
        const save=node('button','Save shortlist edits',{type:'button'});save.addEventListener('click',()=>{if(commitOutreach(captureOutreach()))renderShortlist();});card.append(save);container.append(card);
    }
}
function downloadOutreach(text,type,filename){const url=URL.createObjectURL(new Blob([text],{type}));const link=node('a','',{href:url,download:filename});document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function initOutreach(){
    try{outreach=readOutreachWorkspace(localStorage,outreachStorageKey(pack));outreachRaw=localStorage.getItem(outreachStorageKey(pack));}
    catch(error){outreachBlocked=true;status('Saved shortlist could not be read: '+error.message,true);}
    const q=outreach.query;
    byId('fit-sector').value=q.sector||'';byId('fit-stage').value=q.stage||'unknown';byId('fit-geography').value=q.geography||'unknown';byId('fit-amount').value=q.check?.amount||'';byId('fit-currency').value=q.check?.currency||'GBP';
    button('toggle-archived',()=>{if(unsaved&&!confirm('Leave without saving these edits?'))return;unsaved=false;showArchivedOutreach=!showArchivedOutreach;byId('toggle-archived').textContent=showArchivedOutreach?'Show active investors':'Show archived investors';renderShortlist();});
    button('recovery-backup',()=>{try{const raw=localStorage.getItem(outreachStorageKey(pack));if(raw===null)throw new Error('No saved data is available.');downloadOutreach(raw,'application/json','shortlist-recovery.json');}catch(error){status(error.message,true);}});
    button('open-shortlist',()=>go('shortlist'));button('shortlist-back',()=>go('fit'));
    button('save-fit-profile',()=>commitOutreach({...outreach,query:fitInput()}));
    byId('founder-form').addEventListener('submit',event=>{event.preventDefault();if(commitOutreach(captureOutreach()))renderShortlist();});
    document.querySelector('[data-screen="shortlist"]').addEventListener('input',()=>{unsaved=true;status('Unsaved shortlist edits');});
    button('export-shortlist',()=>{
        const next=captureOutreach();if(!commitOutreach(next))return;
        const date=new Date().toISOString().slice(0,10);downloadOutreach(exportOutreachMarkdown(next,profiles,date,pack),'text/markdown;charset=utf-8','investor-shortlist-'+date+'.md');status('Shortlist saved and exported. Nothing has been sent.');
    });
}


function launchContextResearch(sourceView){
    if(renderResearch.isBusy?.())return status('Finish or cancel research before changing its source.',true);
    const m=model(),task=(sourceView==='move'?planTask(m):m.task)||m.tasks.find(t=>t.id==='suggestion:next-milestone');
    const startup=sourceView==='situation'?{...state.startup,business_model:byId('business-model').value||null,current_stage:byId('current-stage').value||null,validation_focus:byId('validation-focus').value||null}:structuredClone(state.startup);
    const fit=fitInput();startup.fit_profile=fit;
    const investor=sourceView==='investor'?investorList()[investorIndex]:profiles.find(p=>p.id===state.selectedInvestorIds[0]);
    const snapshot=sourceView==='startup'?snapshotList()[snapshotIndex]:sourceView==='move'?m.connectedSnapshots[0]:null;
    let experiment=task?{...structuredClone(state.taskProgress[task.id]?.experiment||task.experimentPlan||{}),notes:state.taskProgress[task.id]?.notes||''}:null;
    if(sourceView==='move'&&step!=='move')experiment={...(experiment||{}),action:byId('plan-action').value,evidenceNeeded:byId('plan-evidence').value,notes:byId('plan-notes').value};
    try{const seed=createResearchContext({view:sourceView,startup,pack,task,investor,snapshot,experiment,selectedInvestorIds:state.selectedInvestorIds,fit});if(go('research','Research a copy of these current inputs? Your saved situation and plan stay unchanged.'))renderResearch.launch(seed);}catch(error){status(error.message,true);}
}
function returnResearchOrigin(origin){
    if(!origin||!Object.hasOwn(RESEARCH_VIEWS,origin.view)||origin.pack_id!==pack.id||origin.provider_id!==(pack.provider?.id||'legacy'))return status('The source belongs to another or unavailable workspace.',true);
    let available=true;
    if(origin.view==='startup'&&origin.snapshot_id){const index=snapshotList().findIndex(s=>s.id===origin.snapshot_id);if(index>=0)snapshotIndex=index;else available=false;}
    if(origin.view==='investor'&&origin.investor_id){const index=investorList().findIndex(p=>p.id===origin.investor_id);if(index>=0)investorIndex=index;else available=false;}
    if(origin.view==='move')activeTaskId=origin.task_id;
    if(go(origin.view))status(available?'Returned to the current source. The saved research retains its captured context.':'Original record is unavailable; inspect its saved research packet.');
}
function priorPlanText(previous){return previous?'Action: '+(previous.experiment?.action||'Not set')+'\nExpected evidence: '+(previous.experiment?.evidenceNeeded||'Not set')+'\nLearning: '+(previous.notes||'None recorded')+'\nStatus: '+(previous.status||'Not started'):'No saved experiment will be replaced.';}
function reviewInvestigation(run,index){
    if(renderResearch.isBusy?.())throw new Error('Finish or cancel research before reviewing an experiment.');
    const source=run.source_context||run.packet.source_context;
    if(source?.origin.fit_key!==researchContextKey(fitInput()))throw new Error('Your investor-fit inputs changed. Research the current context before accepting this proposal.');
    const draft=reviewResearchInvestigation(state,pack,model().tasks,run,index);
    pendingResearchProposal={run,index,draft};proposalDirty=false;
    byId('research-proposal-origin').textContent=source.origin.label+' | Updates: '+(state.taskProgress[draft.task_id]?.planTitle||model().tasks.find(t=>t.id===draft.task_id)?.title||'Your next milestone');
    byId('research-proposal-reason').textContent=draft.why+' '+(draft.basis==='general_method'?'General research method, not a sourced factual claim.':'Review the cited evidence before accepting.');
    byId('research-proposal-before').textContent=priorPlanText(draft.previous);
    const sources=byId('research-proposal-sources');sources.replaceChildren();for(const id of draft.evidence_ids){const evidence=run.packet.evidence_items.find(e=>e.evidence_id===id);if(!evidence)continue;sources.append(node('p',typeof evidence.value==='string'?evidence.value:evidence.value?.statement||JSON.stringify(evidence.value)));for(const sid of evidence.source_ids){const source=run.packet.source_metadata.find(s=>s.source_id===sid);if(source&&/^(https?:\/\/|\.\/docs\/)/.test(source.url))sources.append(node('a',source.title||'Open supporting source',{href:source.url,target:'_blank',rel:'noopener noreferrer'}));}}if(!draft.evidence_ids.length)sources.append(node('p','No source citations: review this as a general method or hypothesis to test.'));
    byId('research-proposal-action').value=draft.action;byId('research-proposal-evidence').value=draft.evidenceNeeded;byId('research-proposal-status').textContent='';
    byId('research-proposal-dialog').showModal();byId('research-proposal-action').focus();
}
function closeResearchProposal(){pendingResearchProposal=null;proposalDirty=false;byId('research-proposal-dialog').close();byId('research-question').focus();}
function acceptResearchProposal(){
    if(!pendingResearchProposal)return;
    try{
        const latest=configuredWorkspace(loadState(),pack);
        if(startupEvidenceKey(latest.startup)!==startupEvidenceKey(state.startup)||investorLensKey(latest.selectedInvestorIds)!==investorLensKey(state.selectedInvestorIds)||JSON.stringify(latest.taskProgress)!==JSON.stringify(state.taskProgress))throw new Error('Another tab changed your saved situation or plans. Reload before accepting.');
        const {run,index}=pendingResearchProposal,source=run.source_context||run.packet.source_context;
        if(source.origin.fit_key!==researchContextKey(fitInput()))throw new Error('Investor-fit inputs changed. Rebuild the research.');
        const next=applyResearchInvestigation(state,pack,model().tasks,run,index,{action:byId('research-proposal-action').value,evidenceNeeded:byId('research-proposal-evidence').value},new Date().toISOString());
        const before=state,wasUnsaved=unsaved;state=next;
        if(!persist('Experiment accepted. The previous plan and learning are retained.')){state=before;byId('research-proposal-status').textContent='Could not save. Your existing plan is unchanged; keep this review open and try again.';return;}
        activeTaskId=next.taskProgress&&Object.keys(next.taskProgress).find(id=>(next.taskProgress[id].researchApplications||[]).some(a=>a.run_id===run.id&&a.investigation_index===index));
        unsaved=wasUnsaved;closeResearchProposal();go('move');
    }catch(error){byId('research-proposal-status').textContent=error.message;status(error.message,true);}
}

function init(){
    if(!validation.isValid){byId('fatal-error').hidden=false;byId('fatal-error').textContent='The configured Guide Pack could not load. Restore packs/active-pack.js; see GUIDE.md. '+validation.errors.join(' ');byId('screen-content').hidden=true;return;}
    state=configuredWorkspace(previous,pack);const records=researchRecords(pack);profiles=records.profiles.map(normalizeProfile);snapshots=records.snapshots;view=state.startup.current_stage?'move':'situation';
    for(const tab of document.querySelectorAll('[data-view]'))tab.addEventListener('click',()=>go(tab.dataset.view));
    byId('situation-form').addEventListener('submit',event=>{event.preventDefault();state.startup={...state.startup,business_model:byId('business-model').value,current_stage:byId('current-stage').value,validation_focus:byId('validation-focus').value};if(persist()){snapshotIndex=0;activeTaskId=null;go('move');}});
    for(const form of document.querySelectorAll('#situation-form, #plan-form'))form.addEventListener('input',()=>{unsaved=true;status('Unsaved edits');});
    for(const value of [...new Set(profiles.flatMap(p=>(p.fit_claims||[]).filter(c=>c.field==='sector').flatMap(c=>c.values||[])))].filter(v=>v!=='*').sort())byId('fit-sectors').append(node('option','',{value}));
    initOutreach();
    renderResearch=initResearchUi({byId,node,status,go,pack,fitInput,getFounder:()=>outreach.founder,getRelationships:()=>relationshipSelection,clearRelationships:()=>{relationshipSelection=null;},onReturnOrigin:returnResearchOrigin,onReviewInvestigation:reviewInvestigation,markDirty:()=>{unsaved=true;},markSaved:()=>{unsaved=false;}});
    renderRelationships=initRelationshipUi({byId,node,status,go,pack,profiles,fitInput,markDirty:()=>{unsaved=true;},markSaved:()=>{unsaved=false;},onEvidence:(dataset,ids)=>{const edge_ids=[...new Set([...(relationshipSelection?.dataset.id===dataset.id?relationshipSelection.edge_ids:[]),...ids])];if(edge_ids.length>20)throw new Error('At most twenty relationship edges can enter one packet. Clear the selection or narrow the query.');relationshipSelection={dataset,edge_ids};renderResearch.invalidate(false);}});
    for(const [id,source] of [['research-situation','situation'],['research-move','move'],['research-startup','startup'],['research-investor','investor']])button(id,()=>launchContextResearch(source));
    byId('research-proposal-form').addEventListener('input',()=>{proposalDirty=true;});
    byId('research-proposal-form').addEventListener('submit',event=>{event.preventDefault();acceptResearchProposal();});
    button('research-proposal-cancel',closeResearchProposal);byId('research-proposal-dialog').addEventListener('cancel',event=>{event.preventDefault();closeResearchProposal();});
    button('explore-fit',()=>go('fit'));
    byId('fit-form').addEventListener('submit',event=>{event.preventDefault();renderInvestorFit();});
    byId('fit-form').addEventListener('input',()=>{byId('fit-results').replaceChildren();byId('fit-summary').textContent='Inputs changed. Compare again to update results.';});
    button('edit-situation',()=>{situationReturnStep=step;go('situation');});
    button('situation-back',()=>{if(go('move')){step=situationReturnStep;render();}});
    button('move-action',beginPlan);
    button('move-evidence',()=>{const m=model(),linked=state.taskProgress[m.nextAction.taskId]?.researchApplications?.at(-1);if(m.nextAction.savedExperiment&&linked){if(go('research'))renderResearch.openRun(linked.run_id);return;}showDetails('Why this move?',[m.nextAction.reason,m.nextAction.basis,m.pending?.caution||m.task?.caution,...(m.pending?.interpretations||m.task?.interpretations||[]),pack.dataset_kind==='fictional'?'Entirely invented for demonstration.':'Sources support limited facts, not predicted outcomes.'],m.sourceList);});
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
    window.addEventListener('beforeunload',event=>{if(unsaved||proposalDirty){event.preventDefault();event.returnValue='';}});
    render();if(!outreachBlocked)status(state.configuredPackChanged?'Pack content changed. Review saved evidence.':'Saved in this browser.');
    if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register(new URL('../sw.js',import.meta.url),{updateViaCache:'none'}).catch(()=>status('Offline support unavailable.'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();

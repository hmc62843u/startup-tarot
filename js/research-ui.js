import {validateSourceContext,RESEARCH_VIEWS} from './research-context.js';
import {graphResearchCatalog,executeGraphPlan} from './graph-research.js';
import {researchRecords} from './research-library.js';
import {buildResearchPacket,researchPrompt,validateResearchOutput,emptyResearchHistory,saveResearchRun,addResearchFeedback} from './research.js';

export function initResearchUi({byId,node,status,go,pack,fitInput,getFounder,getRelationships,clearRelationships,markDirty,markSaved,onReturnOrigin,onReviewInvestigation}){
  const storageKey='startup-guide-research:'+JSON.stringify([pack.provider?.id||'legacy',pack.id]);
  let history=emptyResearchHistory(),raw=null,blocked=false,packet=null,lastRun=null,controller=null,packetOptions=null,sourceContext=null;
  const data=researchRecords(pack),today=()=>new Date().toISOString().slice(0,10),uid=()=>crypto.randomUUID();
  const localHelper=()=>location.protocol==='http:'&&location.hostname==='127.0.0.1';
  const message=(text,error=false)=>{byId('research-status').textContent=text;status(text,error);};
  try{raw=localStorage.getItem(storageKey);if(raw){history=JSON.parse(raw);if(history.schema_version!==1||!Array.isArray(history.runs)||history.runs.some(r=>!r.id||!r.packet||!r.output||!Array.isArray(r.feedback)||!validateResearchOutput(r.output,r.packet).isValid))throw new Error('Invalid saved research history.');}}
  catch{blocked=true;history=emptyResearchHistory();message('Saved research history could not be read. Existing bytes are preserved; use Export research history for recovery.',true);}
  const commit=next=>{
    try{if(blocked)throw new Error('Existing research history needs recovery before saving.');
      if(localStorage.getItem(storageKey)!==raw)throw new Error('Research history changed in another tab. Reload before saving.');
      const text=JSON.stringify(next);if(text.length>1500000)throw new Error('Research storage limit reached. Export history; no older runs were deleted.');
      localStorage.setItem(storageKey,text);history=next;raw=text;return true;
    }catch(error){message('Research is not saved: '+error.message,true);return false;}
  };
  const download=(content,name,type='application/json')=>{
    const url=URL.createObjectURL(new Blob([content],{type})),a=node('a','',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const call=async(path,body,signal)=>{
    if(!localHelper())throw new Error('Open the app through the local OAuth helper for a live connection. Direct-file use still supports packet export and manual response review.');
    const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal,cache:'no-store'});
    const result=await response.json();if(!response.ok)throw new Error([result.error,result.code,result.request_id&&'Request '+result.request_id].filter(Boolean).join(' | '));return result;
  };
  function populateHistory(){
    const select=byId('research-parent'),current=select.value;select.replaceChildren(node('option','New research',{value:''}));
    for(const run of history.runs)select.append(node('option',run.created_at+' | '+run.packet.question.slice(0,75),{value:run.id}));select.value=current;
    const container=byId('research-history');container.replaceChildren();
    for(const run of [...history.runs].reverse()){
      const card=node('article','',{class:'card'});card.append(node('h3',run.packet.question),node('p',run.created_at+' | '+run.model+' | '+(run.parent_id?'Revision of '+run.parent_id:'Initial run')),
        node('p',run.output.summary),node('p',run.feedback.length+' saved feedback notes.'),node('p','Source: '+(run.source_context?.origin?.label||'General research')));
      const view=node('button','Inspect this run',{type:'button'});view.addEventListener('click',()=>{lastRun=run;showOutput(run);});
      const revise=node('button','Use as previous revision',{type:'button'});revise.addEventListener('click',()=>{if(controller)return message('Finish or cancel the request before switching revision.',true);byId('research-parent').value=run.id;loadParent();message('Previous revision selected. Add feedback or a new finding, then build a new packet.');});
      card.append(view,revise);container.append(card);
    }
  }
  function showOutput(run){
    const container=byId('research-output');container.replaceChildren(node('h3','Research output'),node('p','Model: '+run.model+' | Packet: '+run.packet.packet_id),node('p','References validated; factual support and usefulness still require review.'));
    container.append(node('h4','Saved feedback ('+run.feedback.length+')'));
    if(!run.feedback.length)container.append(node('p','No feedback recorded for this run.'));
    for(const note of run.feedback){const entry=node('article','',{class:'saved-feedback'});entry.append(node('p',note.text,{class:'feedback-note'}),node('p','Recorded '+note.date,{class:'muted'}));container.append(entry);}
    const linked=run.source_context||run.packet.source_context;container.append(node('p','Source: '+(linked?.origin?.label||'General research')));
    if(linked){const back=node('button','Return to this run’s source',{type:'button'});back.addEventListener('click',()=>onReturnOrigin?.(linked.origin));container.append(back);const captured=node('details','');captured.append(node('summary','Captured context for this run'),node('pre',JSON.stringify(linked,null,2)));container.append(captured);}
    for(const key of ['summary','findings','interpretations','hypotheses','unknowns','contradictions','proposed_investigations','historical_comparisons','caveats','change_summary']){
      container.append(node('h4',key.replaceAll('_',' ')),node('pre',typeof run.output[key]==='string'?run.output[key]:JSON.stringify(run.output[key],null,2)));
    }
    for(const [index,row] of run.output.proposed_investigations.entries()){const card=node('article','',{class:'card'}),review=node('button','Review as experiment',{type:'button'});card.append(node('h4',row.question),node('p',row.why),node('p','Basis: '+row.basis+' | '+row.evidence_ids.length+' evidence references.'));review.disabled=!history.runs.some(r=>r.id===run.id)||!linked||!!run.packet.historical_cutoff;review.addEventListener('click',()=>{try{onReviewInvestigation?.(run,index);}catch(error){message(error.message,true);}});card.append(review);if(review.disabled)card.append(node('p',run.packet.historical_cutoff?'Historical simulations cannot directly change a current plan.':'Save contextual research before reviewing it as an experiment.'));container.append(card);}
  }
  function invalidate(mark=true){packet=null;packetOptions=null;byId('research-explore').disabled=true;byId('research-graph-audit').textContent='No exploration run.';byId('research-graph-catalog').textContent='Build a packet first.';byId('research-consent').checked=false;byId('research-run').disabled=true;byId('research-review-manual').disabled=true;byId('research-export-packet').disabled=true;byId('research-packet').textContent='Inputs changed. Build a new evidence packet.';if(mark)markDirty();}
  function loadParent(){
    if(controller)return message('Finish or cancel the request before switching revision.',true);
    const parent=history.runs.find(r=>r.id===byId('research-parent').value);
    if(parent){sourceContext=structuredClone(parent.source_context||parent.packet.source_context||null);renderContext();byId('research-question').value=parent.packet.question;
      for(const [id,values] of [['research-investors',parent.packet.selection_manifest.selected_investor_ids],['research-snapshots',parent.packet.selection_manifest.selected_snapshot_ids]])for(const option of byId(id).options)option.selected=values.includes(option.value);}
    invalidate();
  }
  function acceptOutput(output,metadata){
    if(!packet)throw new Error('Build and inspect an evidence packet first.');
    const validation=validateResearchOutput(output,packet);if(!validation.isValid)throw new Error(validation.errors.join(' '));
    const parent=history.runs.find(r=>r.id===byId('research-parent').value);
    const run={id:uid(),parent_id:parent?.id||null,created_at:new Date().toISOString(),packet:structuredClone(packet),output,model:metadata.model,prompt_version:metadata.prompt_version||'research-1',
      usage:metadata.usage||null,duration_ms:metadata.duration_ms??null,response_id:metadata.response_id||null,working_findings:packet.working_findings||[],source_context:sourceContext?structuredClone(sourceContext):null};
    const next=saveResearchRun(history,run);lastRun=next.runs.at(-1);showOutput(lastRun);
    if(commit(next)){populateHistory();showOutput(lastRun);if(byId('research-feedback').value.trim())markDirty();else markSaved();message('Research saved. Review sources and hypotheses before acting.');}
  }
  for(const [id,items,label] of [['research-investors',data.profiles,p=>p.name],['research-snapshots',data.snapshots,p=>p.company+' | '+p.snapshot_date]])for(const item of items)byId(id).append(node('option',label(item),{value:item.id}));
  byId('research-assessment-date').value=today();populateHistory();
  byId('open-research').addEventListener('click',()=>go('research'));
  byId('research-clear-relationships').addEventListener('click',()=>{if(controller)return message('Finish or cancel the request before changing evidence.',true);clearRelationships?.();invalidate(false);byId('research-linked-selection').textContent='No public relationship edges selected.';});
  byId('research-back').addEventListener('click',()=>sourceContext?onReturnOrigin?.(sourceContext.origin):go('investor'));
  byId('research-general').addEventListener('click',()=>{if(controller)return message('Finish or cancel the request before changing context.',true);if((sourceContext||['research-question','research-feedback','research-manual-response','research-new-finding'].some(id=>byId(id).value.trim()))&&!confirm('Start a general question? Current unsaved research inputs will be cleared; saved runs stay available.'))return;launch(null);});
  byId('research-form').addEventListener('input',invalidate);
  byId('research-parent').addEventListener('change',loadParent);
  byId('research-form').addEventListener('submit',event=>{
    event.preventDefault();try{
      const parent=history.runs.find(r=>r.id===byId('research-parent').value),findings=structuredClone(parent?.working_findings||[]),statement=byId('research-new-finding').value.trim();
      if(statement)findings.push({statement,url:byId('research-finding-url').value.trim(),published_date:byId('research-finding-published').value||null,checked_date:byId('research-assessment-date').value});
      const founder=getFounder();
      packetOptions={packet_id:uid(),question:byId('research-question').value,assessment_date:byId('research-assessment-date').value,historical_cutoff:byId('research-cutoff').value||null,
        source_context:sourceContext,relationship_selection:getRelationships?.()||null,startup_context:{...(sourceContext?.situation.fit_profile||fitInput()),...(sourceContext?{stage:sourceContext.situation.current_stage||null,business_model:sourceContext.situation.business_model||null,validation_focus:sourceContext.situation.validation_focus||null}:{}),company:founder.company||null,summary:founder.summary||null,progress:founder.progress||null},
        investor_ids:Array.from(byId('research-investors').selectedOptions).map(o=>o.value),snapshot_ids:Array.from(byId('research-snapshots').selectedOptions).map(o=>o.value),working_findings:findings,
        previous_revision:parent?{run_id:parent.id,packet_id:parent.packet.packet_id,output:parent.output,feedback:parent.feedback}:null};
      packet=buildResearchPacket(pack,packetOptions);
      byId('research-graph-audit').textContent='No exploration run.';
      try{const catalog=graphResearchCatalog(globalThis.STARTUP_GUIDE_RELATIONSHIPS?.research,packet);byId('research-graph-catalog').textContent=JSON.stringify(catalog,null,2);byId('research-explore').disabled=false;}catch{byId('research-graph-catalog').textContent='No eligible public graph is configured.';byId('research-explore').disabled=true;}
      byId('research-consent').checked=false;
      byId('research-packet').textContent=JSON.stringify(packet,null,2);byId('research-run').disabled=false;byId('research-review-manual').disabled=false;byId('research-export-packet').disabled=false;
      message('Packet prepared: '+packet.evidence_items.length+' evidence items, '+packet.selection_manifest.omitted.length+' disclosed omissions. Inspect it before sending.');
    }catch(error){invalidate();message(error.message,true);}
  });
  byId('research-export-packet').addEventListener('click',()=>{if(packet)download(researchPrompt(packet),'research-prompt.txt','text/plain');});
  byId('research-review-manual').addEventListener('click',()=>{try{acceptOutput(JSON.parse(byId('research-manual-response').value),{model:byId('research-manual-model').value.trim()||'manual model response (unverified metadata)'});}catch(error){message('Response was not saved: '+error.message,true);}});
  byId('research-save-feedback').addEventListener('click',()=>{
    try{if(!lastRun||!history.runs.some(r=>r.id===lastRun.id))throw new Error('Inspect a saved run before recording feedback.');
      const next=addResearchFeedback(history,lastRun.id,byId('research-feedback').value,new Date().toISOString());if(commit(next)){lastRun=history.runs.find(run=>run.id===lastRun.id);populateHistory();showOutput(lastRun);byId('research-feedback').value='';if(packet)markSaved();else markDirty();message('Feedback appended. Earlier research is unchanged.');}}
    catch(error){message(error.message,true);}
  });
  byId('research-export-history').addEventListener('click',()=>{
    if(blocked){try{download(lastRun?JSON.stringify({saved_bytes:localStorage.getItem(storageKey),unsaved_run:lastRun},null,2):localStorage.getItem(storageKey)||'','research-recovery.json');}catch(error){message(error.message,true);}return;}
    const exportData={...history,unsaved_run:lastRun&&!history.runs.some(r=>r.id===lastRun.id)?lastRun:null};download(JSON.stringify(exportData,null,2),'research-history.json');message('Research history exported. Check private founder information before sharing.');
  });
  async function refreshAccount(){
    try{const account=await call('/api/account');byId('research-connection').textContent=account.connected?(account.account.email+' | '+(account.plan_enabled?'ChatGPT plan usage enabled.':'Plan usage not granted.')):'Not connected. Choose a connection and continue with ChatGPT.';
      const accounts=byId('research-account');accounts.replaceChildren(node('option','Add a ChatGPT account',{value:''}));for(const r of account.registrations)accounts.append(node('option',r.email+(r.verified?'':' (registration incomplete)'),{value:r.client_id}));
      byId('research-model').replaceChildren();if(account.plan_enabled){const list=await call('/api/models');for(const model of list.models)byId('research-model').append(node('option',model.display_name,{value:model.slug}));if(!list.models.length)message('No eligible models were returned by this account.',true);}
    }catch(error){byId('research-connection').textContent=error.message;}
  }
  for(const id of ['research-feedback','research-manual-response','research-manual-model'])byId(id).addEventListener('input',markDirty);
  byId('research-model').addEventListener('change',()=>{byId('research-consent').checked=false;});
  byId('research-refresh-account').addEventListener('click',refreshAccount);
  byId('research-signin').addEventListener('click',async()=>{
    try{const result=await call('/api/auth/start',{client_id:byId('research-account').value||null});const link=byId('research-authorize');link.href=result.authorization_url;link.hidden=false;message('Continue with ChatGPT in the sign-in tab, then choose Refresh connection.');}catch(error){message(error.message,true);}
  });
  byId('research-disconnect').addEventListener('click',async()=>{controller?.abort();byId('research-consent').checked=false;try{await call('/api/auth/disconnect',{});byId('research-authorize').hidden=true;await refreshAccount();}catch(error){message(error.message,true);}});
  byId('research-explore').addEventListener('click',async()=>{
    if(controller)return;
    if(!packet||!packetOptions)return message('Build an evidence packet first.',true);
    if(packet.graph_exploration)return message('One graph planning pass is allowed per prepared packet. Rebuild for a new question.',true);
    if(!byId('research-consent').checked)return message('Inspect the packet and public graph catalog, then confirm they may be sent to OpenAI.',true);
    const model=byId('research-model').value;if(!model)return message('Connect ChatGPT and choose a model.',true);
    const base=packet,options=structuredClone(packetOptions),dataset=structuredClone(globalThis.STARTUP_GUIDE_RELATIONSHIPS?.research);
    controller=new AbortController();byId('research-inputs').disabled=true;byId('research-review-manual').disabled=true;byId('research-run').disabled=true;byId('research-explore').disabled=true;byId('research-cancel').disabled=false;
    message('Planning public graph queries. The prepared packet and displayed public catalog are sent to OpenAI.');
    try{
      const planned=await call('/api/graph-plan',{packet:base,model},controller.signal);
      if(packet!==base)throw new Error('Inputs changed during planning. Build a fresh packet.');
      const exploration=executeGraphPlan(dataset,base,planned.output);
      const edge_ids=[...new Set([...(options.relationship_selection?.edge_ids||[]),...exploration.edge_ids])];
      const expanded=buildResearchPacket(pack,{...options,packet_id:uid(),relationship_selection:{dataset,edge_ids}});
      expanded.graph_exploration={...exploration.audit,planner:{model:planned.model,prompt_version:planned.prompt_version,response_id:planned.response_id,usage:planned.usage,duration_ms:planned.duration_ms}};
      if(new TextEncoder().encode(JSON.stringify(expanded)).length>60000)throw new Error('Expanded graph packet exceeds the byte limit. Narrow the question; the original packet is unchanged.');
      packet=expanded;byId('research-packet').textContent=JSON.stringify(packet,null,2);byId('research-graph-audit').textContent=JSON.stringify(packet.graph_exploration,null,2);
      message('Public graph exploration complete. Inspect queries, results, omissions and the expanded packet; confirm again before final research.');
    }catch(error){message(error.name==='AbortError'?'Graph planning cancelled. No partial exploration was applied.':error.message,true);}
    finally{controller=null;byId('research-consent').checked=false;byId('research-inputs').disabled=false;byId('research-review-manual').disabled=!packet;byId('research-run').disabled=!packet;byId('research-explore').disabled=!packet||!!packet.graph_exploration;byId('research-cancel').disabled=true;}
  });
  byId('research-run').addEventListener('click',async()=>{
    if(controller)return;
    if(!packet)return message('Build an evidence packet first.',true);
    if(!byId('research-consent').checked)return message('Inspect the packet and confirm it may be sent to OpenAI using your ChatGPT plan.',true);
    const model=byId('research-model').value;if(!model)return message('Connect ChatGPT, refresh models and choose a model.',true);
    controller=new AbortController();byId('research-inputs').disabled=true;byId('research-review-manual').disabled=true;byId('research-run').disabled=true;byId('research-explore').disabled=true;byId('research-cancel').disabled=false;
    message('Research is running. Selected packet data is sent to OpenAI; no web search or local tools are enabled.');
    try{const result=await call('/api/research',{packet,model},controller.signal);acceptOutput(result.output,result);}catch(error){message(error.name==='AbortError'?'Request cancelled. No partial output was saved.':error.message,true);}
    finally{controller=null;byId('research-inputs').disabled=false;byId('research-review-manual').disabled=!packet;byId('research-run').disabled=!packet;byId('research-explore').disabled=!packet||!!packet.graph_exploration;byId('research-cancel').disabled=true;}
  });
  byId('research-cancel').addEventListener('click',()=>controller?.abort());
  byId('research-connection').textContent=localHelper()?'Start or refresh your ChatGPT connection.':'Live OAuth requires the local helper. Packet export, manual response review and saved history work from this file.';
  function renderContext(){byId('research-origin-label').textContent=sourceContext?'Research from '+sourceContext.origin.label:'General research';byId('research-source-context').textContent=sourceContext?JSON.stringify(sourceContext,null,2):'No contextual entry selected.';byId('research-back').textContent=sourceContext?'Back to '+RESEARCH_VIEWS[sourceContext.origin.view]:'Back to investors';}
  function launch(seed){if(controller)throw new Error('Finish or cancel the research request before changing context.');sourceContext=seed?structuredClone(validateSourceContext(seed.context)):null;byId('research-parent').value='';byId('research-question').value=seed?.question||'';for(const [id,values] of [['research-investors',seed?.investor_ids||[]],['research-snapshots',seed?.snapshot_ids||[]]])for(const option of byId(id).options)option.selected=values.includes(option.value);clearRelationships?.();byId('research-cutoff').value='';byId('research-new-finding').value='';byId('research-finding-url').value='';byId('research-finding-published').value='';byId('research-manual-response').value='';byId('research-feedback').value='';byId('research-output').replaceChildren();lastRun=null;invalidate(false);renderContext();message('Context prepared locally. Choose evidence, build the packet and inspect it before any model request.');byId('research-question').focus();}
  byId('research-mode').textContent=localHelper()?'Local HTTP mode: refresh your ChatGPT connection to check live support. Nothing is sent automatically.':'Browser-only mode: prepare/export packets and review manual responses. Live reasoning requires your own local helper.';
  const render=()=>{renderContext();const selected=getRelationships?.();byId('research-linked-selection').textContent=selected?selected.edge_ids.length+' public relationship edges selected from '+selected.dataset.id+' '+selected.dataset.version+'. Rebuild and inspect the packet.':'No public relationship edges selected.';if(blocked)message('Saved research needs recovery; export the existing data before attempting changes.',true);};render.invalidate=invalidate;render.launch=launch;render.isBusy=()=>!!controller;render.openRun=id=>{const run=history.runs.find(r=>r.id===id);if(!run)return message('This linked run is unavailable. Check your research-history backup.',true);lastRun=run;showOutput(run);};return render;
}

import {validateRelationshipDataset,findRelationshipPaths,analyzeInvestorNetwork,findIntroductionPaths} from './relationships.js';
import {privateRelationshipKey,emptyPrivateRelationships,addPrivateContact,recordPrivateConnection,revokePrivateConnection} from './private-relationships.js';
import {assessInvestorFit} from './investor-fit.js';

export function initRelationshipUi({byId,node,status,go,pack,profiles,fitInput,markDirty,markSaved,onEvidence}){
  const supplied=globalThis.STARTUP_GUIDE_RELATIONSHIPS||{},publicData=supplied.research?.pack_id===pack.id&&supplied.research?.provider_id===(pack.provider?.id||'legacy')?supplied.research:null,demo=supplied.fictional||null;
  const today=()=>new Date().toISOString().slice(0,10),id=()=>crypto.randomUUID(),key=privateRelationshipKey(pack);
  let privateData=emptyPrivateRelationships((publicData?.nodes||[]).filter(n=>n.type==='investor')),raw=null,blocked=false;
  const msg=(text,error=false)=>{byId('relationship-status').textContent=text;status(text,error);};
  const current=()=>byId('relationship-dataset').value==='fictional'?demo:publicData;
  const options=()=>({as_of:byId('relationship-asof').value,max_hops:Number(byId('relationship-hops').value),historical_cutoff:byId('relationship-cutoff').value||null,include_editorial:byId('relationship-editorial').checked,from_date:byId('network-from-date').value||null,to_date:byId('network-to-date').value||null});
  try{raw=localStorage.getItem(key);if(raw){const parsed=JSON.parse(raw),check=validateRelationshipDataset(parsed);if(!check.isValid||parsed.dataset_kind!=='private')throw new Error('Invalid saved contacts.');privateData=parsed;}}
  catch{blocked=true;msg('Private data could not be read; existing bytes are preserved and can be exported for recovery.',true);}
  const saved=()=>{if(byId('private-contact-name').value.trim()||byId('private-note').value.trim())markDirty();else markSaved();};
  const commit=next=>{
    try{if(blocked)throw new Error('Recover the saved private data before changing it.');if(localStorage.getItem(key)!==raw)throw new Error('Private contacts changed in another tab. Reload before saving.');
      const text=JSON.stringify(next);if(text.length>1000000)throw new Error('Private relationship storage limit reached. Export a backup; no older evidence was discarded.');
      localStorage.setItem(key,text);privateData=next;raw=text;saved();return true;
    }catch(error){msg(error.message,true);return false;}
  };
  function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=node('a','',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function replaceOptions(element,items,filter=()=>true){const previous=element.value;element.replaceChildren();for(const n of items.filter(filter))element.append(node('option',n.name,{value:n.id}));if(items.some(n=>n.id===previous&&filter(n)))element.value=previous;}
  function renderPrivate(){
    replaceOptions(byId('private-from'),privateData.nodes,n=>n.type==='person');replaceOptions(byId('private-to'),privateData.nodes);
    replaceOptions(byId('intro-target'),privateData.nodes,n=>n.type==='investor');
    const area=byId('private-edge-list');area.replaceChildren();
    for(const edge of privateData.edges){
      const names=new Map(privateData.nodes.map(n=>[n.id,n.name])),card=node('article','',{class:'card'});
      card.append(node('h3',names.get(edge.from)+' -> '+names.get(edge.to)),node('p',edge.verification+' | willingness: '+edge.willingness+' | permission: '+edge.permission_use+' | checked '+edge.checked_date));
      for(const sid of edge.source_ids)card.append(node('p',privateData.sources.find(s=>s.id===sid)?.note||'Missing source note.'));
      const edit=node('button','Edit confirmation / willingness',{type:'button'});edit.addEventListener('click',()=>{byId('private-from').value=edge.from;byId('private-to').value=edge.to;byId('private-checked').value=edge.checked_date;byId('private-confirmed').checked=edge.verification==='founder_confirmed';byId('private-edge-permission').checked=edge.permission_use;byId('private-willingness').value=edge.willingness;byId('private-note').value=privateData.sources.find(s=>s.id===edge.source_ids[0])?.note||'';msg('Edit the note and review date before saving a new confirmation revision.');});
      const revoke=node('button','Revoke use permission',{type:'button'});revoke.disabled=!edge.permission_use;revoke.addEventListener('click',()=>{if(commit(revokePrivateConnection(privateData,edge.id,today()))){renderPrivate();byId('intro-results').replaceChildren();msg('Use permission revoked. Prior confirmation history is retained privately.');}});
      card.append(edit,revoke);area.append(card);
    }
    byId('private-summary').textContent=blocked?'Saved data needs recovery.':privateData.nodes.filter(n=>n.type==='person'&&n.id!=='private:self').length+' private contacts; '+privateData.edges.length+' recorded directional relationships. No private data is sent to models.';
  }
  function resetPublic(){
    const data=current();byId('relationship-results').replaceChildren();byId('network-results').replaceChildren();
    if(!data){replaceOptions(byId('relationship-from'),[]);replaceOptions(byId('relationship-to'),[]);msg('No relationship artifact matches the configured research pack.');return;}
    const check=validateRelationshipDataset(data);if(!check.isValid){msg(check.errors.join(' '),true);return;}
    replaceOptions(byId('relationship-from'),data.nodes);replaceOptions(byId('relationship-to'),data.nodes);
    const preferred=data.dataset_kind==='research'?['investor:yc_accelerator_001','activity:airbnb_user_visits']:['demo:a','demo:experiment'];
    byId('relationship-from').value=data.nodes.some(n=>n.id===preferred[0])?preferred[0]:data.nodes[0]?.id||'';
    byId('relationship-to').value=data.nodes.some(n=>n.id===preferred[1])?preferred[1]:data.nodes.at(-1)?.id||'';
    byId('relationship-kind').textContent=data.dataset_kind==='fictional'?'FICTIONAL demonstration: all entities and links are invented.':'Public documented examples: '+data.nodes.length+' nodes and '+data.edges.length+' sourced edges. Incomplete coverage; not independent verification.';
  }
  function evidenceCard(data,edgeIds,container){
    const details=node('details','');details.append(node('summary','Edge provenance and limitations'));
    for(const eid of edgeIds){const e=data.edges.find(e=>e.id===eid);details.append(node('p',e.id+' | '+e.basis+' | '+e.statement));
      for(const limit of e.limitations||[])details.append(node('p',limit));
      for(const sid of e.source_ids){const source=data.sources.find(s=>s.id===sid);details.append(node('p','Checked '+source.checked_date+' | Published '+(source.published_date||'unknown')),
        node('a',source.title,{href:source.url,target:'_blank',rel:'noopener noreferrer'}));}}
    container.append(details);
  }
  byId('open-relationships').addEventListener('click',()=>go('relationships'));byId('relationship-back').addEventListener('click',()=>go('investor'));
  byId('relationship-asof').value=today();byId('relationship-hops').value='4';byId('network-projection').value='same_round';byId('relationship-dataset').value=!publicData&&demo?'fictional':'research';byId('private-checked').value=today();byId('private-willingness').value='unknown';
  byId('relationship-dataset').addEventListener('change',resetPublic);
  byId('relationship-query').addEventListener('click',()=>{
    const area=byId('relationship-results');area.replaceChildren();
    try{const data=current();if(!data)throw new Error('No selected relationship dataset.');const o=options(),result=findRelationshipPaths(data,{...o,from:byId('relationship-from').value,to:byId('relationship-to').value,directed:byId('relationship-directed').checked});
      area.append(node('p',result.paths.length+' paths | limit reached: '+result.truncated+' | omitted edges: '+JSON.stringify(result.omitted)));
      for(const warning of result.warnings)area.append(node('p',warning));
      const names=new Map(data.nodes.map(n=>[n.id,n.name]));
      for(const path of result.paths){const card=node('article','',{class:'card'});card.append(node('h3',path.nodes.map(n=>names.get(n)).join(' -> ')));
        for(let i=0;i<path.edges.length;i++){const e=data.edges.find(e=>e.id===path.edges[i]);card.append(node('p',names.get(e.from)+' -- '+e.type+' --> '+names.get(e.to)+' | traversed '+path.directions[i]));}
        evidenceCard(data,path.edges,card);const use=node('button','Add this public path to research',{type:'button'});use.disabled=data.dataset_kind!=='research';
        use.addEventListener('click',()=>{try{onEvidence(data,path.edges);msg('Public path selected. Build a fresh research packet to inspect its sources.');go('research');}catch(error){msg(error.message,true);}});card.append(use);area.append(card);}
      msg('Relationship query complete. Paths are evidence links, not funding predictions or introduction promises.');
    }catch(error){msg(error.message,true);}
  });
  byId('network-analyze').addEventListener('click',()=>{
    const area=byId('network-results');area.replaceChildren();
    try{const data=current();if(!data)throw new Error('No selected relationship dataset.');const result=analyzeInvestorNetwork(data,{...options(),projection:byId('network-projection').value});
      area.append(node('p',(data.dataset_kind==='fictional'?'FICTIONAL topology. ':'')+result.projection+' | '+result.links.length+' projected links | '+result.components.length+' components'),node('p','Coverage: '+JSON.stringify(result.coverage)),node('p','Omitted edges: '+JSON.stringify(result.omitted)));
      for(const warning of result.warnings)area.append(node('p',warning));
      const table=node('table',''),head=node('tr','');for(const title of ['Investor','Degree','Normalized betweenness'])head.append(node('th',title));table.append(head);
      for(const metric of result.metrics){const row=node('tr','');for(const value of [metric.name,String(metric.degree),metric.betweenness.toFixed(3)])row.append(node('td',value));table.append(row);}area.append(table);
      const names=new Map(data.nodes.map(n=>[n.id,n.name]));
      for(const link of result.links){const card=node('article','',{class:'card'});card.append(node('h3',names.get(link.from)+' / '+names.get(link.to)),node('p',link.shared_rounds.length+' documented shared rounds; '+link.shared_companies.length+' shared companies.'));evidenceCard(data,link.evidence_edge_ids,card);area.append(card);}
      const exportButton=node('button','Export this public/demonstration analysis',{type:'button'});exportButton.addEventListener('click',()=>download(result,'investor-network-analysis.json'));area.append(exportButton);msg('Network analysis complete. Metrics apply only to included records.');
    }catch(error){msg(error.message,true);}
  });
  byId('private-contact-form').addEventListener('submit',event=>{event.preventDefault();try{const next=addPrivateContact(privateData,{id:'private:'+id(),name:byId('private-contact-name').value,permission:byId('private-storage-permission').checked});if(commit(next)){byId('private-contact-name').value='';renderPrivate();saved();msg('Contact saved privately. No relationship or willingness was inferred.');}}catch(error){msg(error.message,true);}});
  byId('private-connection-form').addEventListener('submit',event=>{event.preventDefault();try{
    const checked=byId('private-checked').value;if(checked>today())throw new Error('Confirmation date cannot be in the future.');
    const next=recordPrivateConnection(privateData,{id:'private-edge:'+id(),source_id:'private-source:'+id(),from:byId('private-from').value,to:byId('private-to').value,note:byId('private-note').value,checked_date:checked,
      verification:byId('private-confirmed').checked?'founder_confirmed':'unconfirmed',permission_use:byId('private-edge-permission').checked,willingness:byId('private-willingness').value,storage_permission:byId('private-storage-permission').checked});
    if(commit(next)){byId('private-note').value='';renderPrivate();byId('intro-results').replaceChildren();saved();msg('Directional connection saved privately. Confirmation is founder-reported, not independent verification.');}
  }catch(error){msg(error.message,true);}});
  byId('intro-query').addEventListener('click',()=>{
    const area=byId('intro-results');area.replaceChildren();
    try{const target=byId('intro-target').value,result=findIntroductionPaths(privateData,{as_of:byId('relationship-asof').value,from:'private:self',to:target,max_hops:4,include_possible:byId('intro-possible').checked});
      const targetNode=privateData.nodes.find(n=>n.id===target),profile=profiles.find(p=>p.id===targetNode?.profile_id);
      const fit=profile?assessInvestorFit(fitInput(),profile,byId('relationship-asof').value):null;
      area.append(node('p','Current investor-fit context: '+(fit?.fit||'unknown; no current criteria profile')+'. Relationship paths do not establish eligibility.'),node('p',result.paths.length+' private paths. Omitted edges: '+JSON.stringify(result.omitted)));
      for(const warning of result.warnings)area.append(node('p',warning));const names=new Map(privateData.nodes.map(n=>[n.id,n.name]));
      for(const path of result.paths){const card=node('article','',{class:'card'});card.append(node('h3',path.nodes.map(n=>names.get(n)).join(' -> ')),node('p',path.status==='founder_confirmed_willing'?'Founder-confirmed path; introducers reported willing. Not a guaranteed introduction.':'Possible path; confirmation or willingness is missing.'));
        for(const eid of path.edges){const edge=privateData.edges.find(e=>e.id===eid);card.append(node('p','Checked '+edge.checked_date+' | '+edge.verification+' | willingness '+edge.willingness));for(const sid of edge.source_ids)card.append(node('p',privateData.sources.find(s=>s.id===sid).note));}area.append(card);}
      msg('Private introduction-path research complete. Nothing was sent or shared.');
    }catch(error){msg(error.message,true);}
  });
  byId('private-export').addEventListener('click',()=>{try{download(blocked?{unreadable_saved_bytes:localStorage.getItem(key)}:privateData,'private-relationship-backup.json');msg('Private backup downloaded. It includes names and notes; review it before sharing.');}catch(error){msg(error.message,true);}});
  for(const form of ['private-contact-form','private-connection-form'])byId(form).addEventListener('input',markDirty);
  resetPublic();renderPrivate();
  return ()=>{if(blocked)msg('Private data needs recovery; saved bytes have not been overwritten.',true);};
}

/** Bounded relationship queries over plain records. No database or inferred social ties. */
export const RELATIONSHIP_LIMITS={nodes:300,edges:1000,hops:6,paths:30,expansions:5000,private_review_days:90};
function relDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
function relObject(value){return value&&typeof value==='object'&&!Array.isArray(value);}
function relUrl(value,fictional=false){if(fictional&&/^\.\/docs\/relationships\.html#[a-z0-9_-]+$/.test(value||''))return true;try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}}
function relPublicationAvailable(value,cutoff){
  if(!cutoff)return true;if(relDate(value))return value<=cutoff;
  if(/^\d{4}-\d{2}$/.test(value||'')){const [y,m]=value.split('-').map(Number);return m>=1&&m<=12&&new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)<=cutoff;}
  if(/^\d{4}$/.test(value||''))return value+'-12-31'<=cutoff;return false;
}
export function validateRelationshipDataset(data){
  const errors=[];
  if(!relObject(data)||data.schema_version!==1||!['research','fictional','private'].includes(data.dataset_kind)||typeof data.id!=='string'||!data.id||typeof data.version!=='string'
    ||!Array.isArray(data.nodes)||!Array.isArray(data.edges)||!Array.isArray(data.sources))return {isValid:false,errors:['Invalid relationship dataset header.']};
  if(data.nodes.length>300||data.edges.length>1000||data.sources.length>1000)errors.push('Relationship dataset exceeds local limits.');
  const ids=new Set(),sources=new Set(),edges=new Set(),nodes=new Map();
  for(const n of data.nodes){
    if(!relObject(n)||typeof n.id!=='string'||!n.id||ids.has(n.id)||typeof n.name!=='string'||!n.name.trim()||!['investor','startup','round','snapshot','experiment','topic','person'].includes(n.type)){errors.push('Invalid or duplicate relationship node.');continue;}
    ids.add(n.id);nodes.set(n.id,n);if(n.event_date!=null&&!relDate(n.event_date))errors.push('Invalid node event date.');if(data.dataset_kind!=='private'&&n.type==='person')errors.push('Personal contacts cannot be distributed in a public relationship dataset.');
  }
  for(const s of data.sources){
    if(!relObject(s)||typeof s.id!=='string'||!s.id||sources.has(s.id)||!relDate(s.checked_date)){errors.push('Invalid or duplicate relationship source.');continue;}
    sources.add(s.id);
    if(data.dataset_kind==='private'){
      if(s.kind!=='founder_note'||typeof s.note!=='string'||!s.note.trim())errors.push('Private relationship sources require a founder note.');
    }else if(!relUrl(s.url,data.dataset_kind==='fictional')||typeof s.title!=='string')errors.push('Public relationships need a public source URL and title.');
  }
  const endpoints={invested_in:['investor','startup'],participated_in:['investor','round'],round_for:['round','startup'],snapshot_of:['snapshot','startup'],documents_action:['snapshot','experiment']};
  for(const e of data.edges){
    if(!relObject(e)||typeof e.id!=='string'||!e.id||edges.has(e.id)||!nodes.has(e.from)||!nodes.has(e.to)||e.from===e.to||typeof e.statement!=='string'||!e.statement.trim()
      ||!['invested_in','participated_in','round_for','snapshot_of','documents_action','related_topic','knows'].includes(e.type)
      ||!['documented','editorial','inferred','founder_reported','fictional'].includes(e.basis)||!Array.isArray(e.source_ids)||!e.source_ids.length||e.source_ids.some(id=>!sources.has(id))){errors.push('Invalid relationship edge or provenance.');continue;}
    edges.add(e.id);
    for(const field of ['event_date','valid_from','valid_to'])if(e[field]!=null&&!relDate(e[field]))errors.push('Invalid relationship '+field+'.');
    if(e.valid_from&&e.valid_to&&e.valid_from>e.valid_to)errors.push('Relationship validity interval is reversed.');
    const types=endpoints[e.type];if(types&&(nodes.get(e.from).type!==types[0]||nodes.get(e.to).type!==types[1]))errors.push('Relationship endpoints do not match '+e.type+'.');
    if(e.type==='related_topic'&&nodes.get(e.to).type!=='topic')errors.push('Topic edges must target a topic.');
    if(data.dataset_kind==='fictional'&&e.basis!=='fictional')errors.push('Fictional relationship edges must stay labelled fictional.');
    if(data.dataset_kind==='research'&&['knows'].includes(e.type)||data.dataset_kind==='research'&&['founder_reported','fictional'].includes(e.basis))errors.push('Private or fictional relationships cannot enter public research.');
    if(data.dataset_kind==='private'){
      if(e.type!=='knows'||e.basis!=='founder_reported'||nodes.get(e.from).type!=='person'||!['person','investor'].includes(nodes.get(e.to).type)
        ||!['unconfirmed','founder_confirmed'].includes(e.verification)||typeof e.permission_use!=='boolean'||!['unknown','yes','no'].includes(e.willingness)||!relDate(e.checked_date))errors.push('Invalid private connection or permission fields.');
    }
  }
  return {isValid:errors.length===0,errors};
}
function relContext(data,options){
  const validation=validateRelationshipDataset(data);if(!validation.isValid)throw new Error(validation.errors.join(' '));
  if(!relDate(options.as_of)||options.historical_cutoff&&(!relDate(options.historical_cutoff)||options.historical_cutoff>options.as_of))throw new Error('Use valid relationship assessment/cutoff dates.');
  if(options.from_date&&!relDate(options.from_date)||options.to_date&&!relDate(options.to_date)||options.from_date&&options.to_date&&options.from_date>options.to_date)throw new Error('Use a valid event-date window.');
  return {nodes:new Map(data.nodes.map(n=>[n.id,n])),sources:new Map(data.sources.map(s=>[s.id,s])),omitted:{}};
}
function relEdgeReason(data,e,options,context){
  if(e.valid_from&&e.valid_from>options.as_of||e.valid_to&&e.valid_to<options.as_of)return 'outside_validity';
  const eventDate=e.event_date||(e.type==='participated_in'?context.nodes.get(e.to)?.event_date:e.type==='round_for'?context.nodes.get(e.from)?.event_date:null);
  if(eventDate&&eventDate>options.as_of)return 'future_event';
  if(options.from_date||options.to_date){if(!eventDate)return 'unknown_event_date';if(options.from_date&&eventDate<options.from_date||options.to_date&&eventDate>options.to_date)return 'outside_event_window';}
  if(options.historical_cutoff&&(eventDate&&eventDate>options.historical_cutoff||e.source_ids.some(id=>!relPublicationAvailable(context.sources.get(id).published_date,options.historical_cutoff))))return 'source_unavailable_at_cutoff';
  if(e.source_ids.some(id=>context.sources.get(id).checked_date>options.as_of))return 'source_check_after_assessment';
  if(data.dataset_kind==='private'){
    if(!options.private_allowed)return 'private_excluded';
    if(!e.permission_use)return 'permission_not_granted';
    if(e.checked_date>options.as_of||Date.parse(options.as_of)-Date.parse(e.checked_date)>90*86400000)return 'private_relationship_needs_review';
    if(e.willingness==='no')return 'introduction_declined';
    const confirmed=e.verification==='founder_confirmed'&&e.willingness==='yes';
    if(!confirmed&&!options.include_possible)return 'confirmation_or_willingness_missing';
  }else if(e.basis!=='documented'&&!(data.dataset_kind==='fictional'&&e.basis==='fictional')&&!(options.include_editorial&&e.basis==='editorial'))return 'basis_not_documented';
  return null;
}
function relEdges(data,options,context){
  return data.edges.filter(e=>{const reason=relEdgeReason(data,e,options,context);if(reason){context.omitted[reason]=(context.omitted[reason]||0)+1;return false;}return true;}).sort((a,b)=>a.id.localeCompare(b.id));
}
export function findRelationshipPaths(data,options){
  const context=relContext(data,options),hops=options.max_hops??4,pathLimit=options.max_paths??30;
  if(!Number.isInteger(pathLimit)||pathLimit<1||pathLimit>30)throw new Error('Choose one to thirty returned paths.');
  if(!Number.isInteger(hops)||hops<1||hops>6)throw new Error('Choose one to six hops.');
  if(!context.nodes.has(options.from)||!context.nodes.has(options.to)||options.from===options.to)throw new Error('Choose two different existing entities.');
  const eligible=relEdges(data,options,context),adjacency=new Map(data.nodes.map(n=>[n.id,[]]));
  for(const e of eligible){adjacency.get(e.from).push({edge:e,next:e.to,direction:'forward'});if(!options.directed)adjacency.get(e.to).push({edge:e,next:e.from,direction:'reverse'});}
  const queue=[{nodes:[options.from],edges:[],directions:[]}],paths=[];let index=0,expansions=0,truncated=false;
  while(index<queue.length){
    const path=queue[index++];if(path.edges.length>=hops)continue;
    for(const step of adjacency.get(path.nodes.at(-1))||[]){
      if(path.nodes.includes(step.next))continue;
      if(++expansions>5000){truncated=true;break;}
      const next={nodes:[...path.nodes,step.next],edges:[...path.edges,step.edge.id],directions:[...path.directions,step.direction]};
      if(step.next===options.to){paths.push(next);if(paths.length>=pathLimit){truncated=true;break;}}else queue.push(next);
    }
    if(truncated)break;
  }
  return {dataset_id:data.id,dataset_kind:data.dataset_kind,paths,omitted:context.omitted,expansions,truncated,
    warnings:[data.dataset_kind==='fictional'?'FICTIONAL demonstration; no real relationship is established.':'Source-documented paths are limited to the included records; missing paths do not prove absence.',
      'A reverse traversal describes the recorded edge in reverse; it does not create a new investment, causal or social relationship.']};
}
export function findIntroductionPaths(data,options){
  if(data.dataset_kind!=='private')throw new Error('Introduction paths require a private founder-controlled dataset.');
  const result=findRelationshipPaths(data,{...options,directed:true,private_allowed:true});
  const byId=new Map(data.edges.map(e=>[e.id,e]));
  return {...result,paths:result.paths.map(path=>({...path,status:path.edges.every(id=>byId.get(id).verification==='founder_confirmed'&&byId.get(id).willingness==='yes')?'founder_confirmed_willing':'possible_needs_confirmation'})),
    warnings:['Private relationships and willingness are founder-reported, not independently verified.','A path is not a promised introduction or meeting; obtain current consent before acting.','No messages are sent and private paths are not included in model packets.']};
}
export function analyzeInvestorNetwork(data,options){
  if(data.dataset_kind==='private')throw new Error('Private contacts are excluded from public investor network analysis.');
  const context=relContext(data,options),edges=relEdges(data,options,context),nodes=data.nodes.filter(n=>n.type==='investor');
  if(nodes.length>100)throw new Error('Local centrality analysis is limited to 100 investors.');
  const roundCompanies=new Map(edges.filter(e=>e.type==='round_for').map(e=>[e.from,e.to])),rounds=new Map(),companies=new Map();
  const put=(map,key,investor,ids)=>{if(!map.has(key))map.set(key,new Map());const group=map.get(key);group.set(investor,[...new Set([...(group.get(investor)||[]),...ids])]);};
  for(const e of edges){
    if(e.type==='invested_in')put(companies,e.to,e.from,[e.id]);
    if(e.type==='participated_in'&&roundCompanies.has(e.to)){
      put(rounds,e.to,e.from,[e.id]);const link=edges.find(r=>r.type==='round_for'&&r.from===e.to);put(companies,roundCompanies.get(e.to),e.from,[e.id,link.id]);
    }
  }
  const pairs=new Map();
  const project=(groups,key)=>{for(const [entity,investors] of groups){const ids=[...investors.keys()].sort();for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
    const pairId=JSON.stringify([ids[i],ids[j]]);if(!pairs.has(pairId))pairs.set(pairId,{from:ids[i],to:ids[j],shared_rounds:[],shared_companies:[],evidence_edge_ids:[]});
    const pair=pairs.get(pairId);pair[key].push(entity);pair.evidence_edge_ids=[...new Set([...pair.evidence_edge_ids,...investors.get(ids[i]),...investors.get(ids[j])])];
  }}};
  project(rounds,'shared_rounds');project(companies,'shared_companies');
  const projection=options.projection||'same_round';if(!['same_round','shared_company'].includes(projection))throw new Error('Unknown investor network projection.');
  const links=[...pairs.values()].filter(p=>projection==='same_round'?p.shared_rounds.length:p.shared_companies.length).sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
  const adjacency=new Map(nodes.map(n=>[n.id,new Set()]));for(const link of links){adjacency.get(link.from).add(link.to);adjacency.get(link.to).add(link.from);}
  const centrality=new Map(nodes.map(n=>[n.id,0]));
  // Brandes' unweighted betweenness, normalized for an undirected projection.
  for(const start of nodes){
    const stack=[],queue=[start.id],parents=new Map(nodes.map(n=>[n.id,[]])),sigma=new Map(nodes.map(n=>[n.id,0])),distance=new Map(nodes.map(n=>[n.id,-1]));sigma.set(start.id,1);distance.set(start.id,0);
    for(let i=0;i<queue.length;i++){const v=queue[i];stack.push(v);for(const w of adjacency.get(v)){if(distance.get(w)<0){queue.push(w);distance.set(w,distance.get(v)+1);}if(distance.get(w)===distance.get(v)+1){sigma.set(w,sigma.get(w)+sigma.get(v));parents.get(w).push(v);}}}
    const delta=new Map(nodes.map(n=>[n.id,0]));while(stack.length){const w=stack.pop();for(const v of parents.get(w))delta.set(v,delta.get(v)+sigma.get(v)/sigma.get(w)*(1+delta.get(w)));if(w!==start.id)centrality.set(w,centrality.get(w)+delta.get(w));}
  }
  const denominator=(nodes.length-1)*(nodes.length-2),metrics=nodes.map(n=>({id:n.id,name:n.name,degree:adjacency.get(n.id).size,betweenness:denominator>0?centrality.get(n.id)/denominator:0}));
  const seen=new Set(),components=[];for(const n of nodes)if(!seen.has(n.id)){const group=[n.id];seen.add(n.id);for(let i=0;i<group.length;i++)for(const next of adjacency.get(group[i]))if(!seen.has(next)){seen.add(next);group.push(next);}components.push(group);}
  return {dataset_id:data.id,dataset_kind:data.dataset_kind,projection,links,metrics:metrics.sort((a,b)=>b.betweenness-a.betweenness||b.degree-a.degree||a.id.localeCompare(b.id)),components,omitted:context.omitted,
    coverage:{complete:false,scope:data.coverage?.scope||'Selected records only',investors:nodes.length,known_rounds:rounds.size,known_companies:companies.size},
    warnings:['Centrality describes only this incomplete included network, not investor quality, suitability or real-world influence.',projection==='same_round'?'Only shared documented rounds establish co-investment.':'Shared-company overlap can span different rounds and is not evidence of co-investment.','Undated events are omitted when an event-date window is selected. Missing links and isolated nodes do not prove lack of investment activity.']};
}
export function relationshipEvidence(data,edgeIds,options){
  if(data.dataset_kind!=='research')throw new Error('Only public research relationships can enter a live evidence packet.');
  if(!Array.isArray(edgeIds)||edgeIds.length>20||new Set(edgeIds).size!==edgeIds.length)throw new Error('Choose at most twenty distinct relationship edges.');
  const context=relContext(data,options),result=[];
  for(const id of edgeIds){const edge=data.edges.find(e=>e.id===id);if(!edge)throw new Error('Unknown selected relationship edge.');const reason=relEdgeReason(data,edge,options,context);if(reason)throw new Error('Selected relationship needs review: '+reason);
    result.push({edge:structuredClone(edge),from:structuredClone(context.nodes.get(edge.from)),to:structuredClone(context.nodes.get(edge.to)),sources:edge.source_ids.map(id=>structuredClone(context.sources.get(id)))});
  }
  return result;
}

import {validatePublishingBundle} from '../js/publishing.js';
import {validateResearchPackage,researchRecords} from '../js/research-library.js';
import {validateRelationshipDataset,findRelationshipPaths,analyzeInvestorNetwork,findIntroductionPaths} from '../js/relationships.js';
import {graphResearchCatalog,validateGraphPlan,executeGraphPlan} from '../js/graph-research.js';
import {buildResearchPacket,RESEARCH_LIMITS} from '../js/research.js';

export const organizationPackKind=pack=>pack.schema_version===2?pack.dataset_kind:'research';

export function requireReference(condition,message,status=400){if(!condition){const error=new Error(message);error.status=status;throw error;}}
export const validateBundle=validatePublishingBundle;
export function checkedOptions(input={}){
  const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
  requireReference(date(input.assessment_date),'A real assessment_date is required.');
  requireReference(input.historical_cutoff==null||date(input.historical_cutoff)&&input.historical_cutoff<=input.assessment_date,'Invalid historical_cutoff.');
  return {as_of:input.assessment_date,historical_cutoff:input.historical_cutoff||null};
}
export function organizationCatalog(bundle,input){
  const options=checkedOptions(input);
  if(bundle.relationships.dataset_kind==='research')return graphResearchCatalog(bundle.relationships,{pack:{id:bundle.pack.id,provider_id:(bundle.pack.provider?.id||'legacy')},assessment_date:options.as_of,historical_cutoff:options.historical_cutoff});
  const graph=bundle.relationships,ids=new Set();let omitted=0;
  for(const e of graph.edges){const found=findRelationshipPaths(graph,{...options,from:e.from,to:e.to,max_hops:1,directed:true});if(found.paths.some(p=>p.edges.includes(e.id))){ids.add(e.from);ids.add(e.to);}else omitted++;}
  return {dataset_id:graph.id,version:graph.version,nodes:graph.nodes.filter(n=>ids.has(n.id)).map(n=>({id:n.id,name:n.name,type:n.type})),omitted_edges:omitted,simulation:true,coverage:'FICTIONAL simulation only; not research evidence.',limits:{queries:3,hops:4,paths_per_query:5,relationship_edges:20}};
}
export function executeOrganizationPlan(bundle,input,plan){
  const catalog=organizationCatalog(bundle,input);validateGraphPlan(plan,catalog);
  if(bundle.relationships.dataset_kind==='research')return executeGraphPlan(bundle.relationships,{pack:{id:bundle.pack.id,provider_id:(bundle.pack.provider?.id||'legacy')},assessment_date:input.assessment_date,historical_cutoff:input.historical_cutoff},plan);
  const graph=bundle.relationships,ids=new Set(catalog.nodes.map(n=>n.id)),eligible={...graph,nodes:graph.nodes.filter(n=>ids.has(n.id)),edges:graph.edges.filter(e=>ids.has(e.from)&&ids.has(e.to))},options=checkedOptions(input),edgeIds=new Set();
  const results=plan.queries.map(query=>{const result=query.kind==='path'?findRelationshipPaths(eligible,{...options,from:query.from,to:query.to,max_hops:query.max_hops,max_paths:5,directed:false}):analyzeInvestorNetwork(eligible,{...options,projection:query.projection});
    for(const id of query.kind==='path'?result.paths.flatMap(p=>p.edges):result.links.flatMap(l=>l.evidence_edge_ids))edgeIds.add(id);return {query,result};});
  requireReference(edgeIds.size<=20,'Plan exceeds twenty relationship evidence edges.');
  return {edge_ids:[...edgeIds],audit:{version:'graph-research-1',simulation:true,dataset_id:graph.id,dataset_version:graph.version,catalog_omitted_edges:catalog.omitted_edges,plan:structuredClone(plan),results,interpretation:'FICTIONAL algorithm demonstration; not source-backed research or evidence about real organizations.'}};
}
export function prepareOrganizationPacket(bundle,input,exploration=null){
  checkedOptions(input);
  const options={packet_id:input.packet_id,question:input.question,assessment_date:input.assessment_date,historical_cutoff:input.historical_cutoff||null,startup_context:input.startup_context||{},investor_ids:input.investor_ids||[],snapshot_ids:input.snapshot_ids||[]};
  const simulation=organizationPackKind(bundle.pack)==='fictional';
  if(exploration&&!simulation)options.relationship_selection={dataset:bundle.relationships,edge_ids:exploration.edge_ids};
  const packet=buildResearchPacket(bundle.pack,options);
  if(simulation){for(const evidence of packet.evidence_items){evidence.basis='fictional';evidence.limitations.push('FICTIONAL simulation, not research evidence.');}packet.simulation=true;packet.missing_and_conflicting_evidence.push('FICTIONAL simulation. Not real investor or startup evidence.');
    const nodes=new Map();
    for(const id of exploration?.edge_ids||[]){const edge=bundle.relationships.edges.find(e=>e.id===id),from=bundle.relationships.nodes.find(n=>n.id===edge.from),to=bundle.relationships.nodes.find(n=>n.id===edge.to);nodes.set(from.id,from);nodes.set(to.id,to);
      const sourceIds=edge.source_ids.map(id=>{const source_id='source-'+(packet.source_metadata.length+1);packet.source_metadata.push({...bundle.relationships.sources.find(s=>s.id===id),source_id});return source_id;});
      packet.evidence_items.push({evidence_id:'evidence-'+(packet.evidence_items.length+1),record_id:'relationship:'+id,field:'relationship',value:{edge_id:id,type:edge.type,from,to,statement:edge.statement},basis:'fictional',source_ids:sourceIds,limitations:['FICTIONAL simulation, not research evidence.']});
    }packet.linked_records=[...nodes.values()];
  }
  if(exploration)packet.graph_exploration=exploration.audit;
  requireReference(packet.evidence_items.length<=RESEARCH_LIMITS.evidence&&Buffer.byteLength(JSON.stringify(packet))<=RESEARCH_LIMITS.bytes,'Expanded packet exceeds evidence/byte limits.');return packet;
}
export function validatePrivateImport(data,consent){
  requireReference(consent===true,'Explicit permission to store private connections is required.');const check=validateRelationshipDataset(data);
  requireReference(check.isValid&&data.dataset_kind==='private','Invalid private graph: '+check.errors.join(' '));
  requireReference(Buffer.byteLength(JSON.stringify(data))<=1000000,'Private import exceeds 1 MB.');return data;
}
export function privatePaths(data,input){const options=checkedOptions(input);return findIntroductionPaths(data,{...options,from:input.from,to:input.to,max_hops:input.max_hops??4,include_possible:input.include_possible===true});}

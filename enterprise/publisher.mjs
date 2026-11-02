import {readFile} from 'node:fs/promises';
import {validateBundle,requireReference} from './domain.mjs';

const reserved=new Set(['__proto__','prototype','constructor','private_contacts','private_connections','private_relationships','owner_notes','research_history','research_runs','runs','feedback','access_token','refresh_token','id_token','client_secret','password','credentials','token_sha256','authorization']);
function checkReserved(value){if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){requireReference(!reserved.has(key.toLowerCase()),'Remove private or credential field: '+key);checkReserved(child);}}
export function checkPublisherBundle(bundle){
  try{validateBundle(bundle);checkReserved(bundle);}catch(error){return {ready_for_import:false,errors:[error.message],warnings:[]};}
  const research=bundle.pack.schema_version===2?bundle.pack.components.research:bundle.pack;
  const warnings=['Schema checks do not verify factual accuracy, investment suitability or redistribution rights.','No introduction path or OpenFor affiliation is inferred from directory listings.'];
  for(const snapshot of research.snapshots)if(snapshot.sources.some(source=>source.published_date===null))warnings.push(snapshot.company+': publication date unknown; omitted from historical-cutoff evidence.');
  for(const profile of research.profiles){
    for(const field of ['stage','sector','geography','check'])if(!profile.fit_claims?.some(claim=>claim.field===field))warnings.push(profile.name+': no typed '+field+' evidence; comparisons must preserve unknowns.');
  }
  if(!bundle.relationships.coverage.complete)warnings.push('Relationship coverage is incomplete; absent edges do not prove absent relationships.');
  return {ready_for_import:true,errors:[],warnings,summary:{kind:bundle.relationships.dataset_kind,profiles:research.profiles.length,snapshots:research.snapshots.length,nodes:bundle.relationships.nodes.length,edges:bundle.relationships.edges.length},profiles:research.profiles.map(p=>({id:p.id,name:p.name,source_url:p.source_url,checked_date:p.reviewed_date||p.retrieved_date})),snapshots:research.snapshots.map(s=>({id:s.id,company:s.company}))};
}
export async function publisherAction(principal,action,body){
  requireReference(principal.role==='admin','Administrator permission required.',403);
  if(action==='publisher/scenario')return JSON.parse(await readFile(new URL('fixtures/openfor-illustrative.json',import.meta.url),'utf8'));
  if(action==='publisher/check')return checkPublisherBundle(body.bundle);
  if(action==='publisher/sample'){
    const files={openfor:'openfor-research.json',template:'alpha.json'};
    requireReference(Object.hasOwn(files,body.sample),'Choose openfor or template.');
    return {bundle:JSON.parse(await readFile(new URL('fixtures/'+files[body.sample],import.meta.url),'utf8'))};
  }
  requireReference(false,'Unknown publisher action.',404);
}

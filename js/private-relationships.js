import {validateRelationshipDataset} from './relationships.js';

export function privateRelationshipKey(pack){return 'startup-guide-private-relationships:'+JSON.stringify([pack.provider?.id||'legacy',pack.id]);}
export function emptyPrivateRelationships(investors=[]){return {schema_version:1,id:'private_founder_connections',version:'1',dataset_kind:'private',nodes:[{id:'private:self',type:'person',name:'You (private)'},...investors.map(n=>({...n}))],edges:[],sources:[],changes:[]};}
export function addPrivateContact(data,{id,name,permission}){
  if(!permission)throw new Error('Confirm you have permission to store and use this contact privately.');
  if(typeof name!=='string'||!name.trim()||name.length>160||!id||data.nodes.some(n=>n.id===id))throw new Error('Supply a contact name and a new identity.');
  const next={...data,nodes:[...data.nodes,{id,type:'person',name:name.trim()}]};
  const check=validateRelationshipDataset(next);if(!check.isValid)throw new Error(check.errors.join(' '));return next;
}
export function recordPrivateConnection(data,fields){
  if(!fields.storage_permission)throw new Error('Confirm permission to store and use these relationship notes.');
  if(typeof fields.note!=='string'||fields.note.trim().length<10||fields.note.length>2000)throw new Error('Record a specific confirmation/source note (10-2000 characters).');
  const old=data.edges.find(e=>e.from===fields.from&&e.to===fields.to),id=old?.id||fields.id;
  if(!id||data.sources.some(s=>s.id===fields.source_id))throw new Error('New source/relationship identities are required.');
  const source={id:fields.source_id,kind:'founder_note',note:fields.note.trim(),checked_date:fields.checked_date};
  const edge={id,from:fields.from,to:fields.to,type:'knows',basis:'founder_reported',statement:'Founder-reported connection; independent verification is not established.',source_ids:[source.id],
    event_date:null,valid_from:null,valid_to:null,verification:fields.verification,permission_use:fields.permission_use,willingness:fields.willingness,checked_date:fields.checked_date};
  const next={...data,sources:[...data.sources,source],edges:[...data.edges.filter(e=>e.id!==id),edge],changes:[...(data.changes||[]),{date:fields.checked_date,edge_id:id,previous:old?structuredClone(old):null,current:structuredClone(edge)}]};
  const check=validateRelationshipDataset(next);if(!check.isValid)throw new Error(check.errors.join(' '));return next;
}
export function revokePrivateConnection(data,id,date){
  const old=data.edges.find(e=>e.id===id);if(!old)throw new Error('Unknown private relationship.');
  const current={...old,permission_use:false};return {...data,edges:data.edges.map(e=>e.id===id?current:e),changes:[...(data.changes||[]),{date,edge_id:id,previous:structuredClone(old),current:structuredClone(current)}]};
}

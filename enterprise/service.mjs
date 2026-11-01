import {randomUUID} from 'node:crypto';
import {organizationPackKind,validateBundle,validatePrivateImport,checkedOptions,organizationCatalog,executeOrganizationPlan,prepareOrganizationPacket,privatePaths,requireReference} from './domain.mjs';
import {findRelationshipPaths,findIntroductionPaths} from '../js/relationships.js';
import {validateGraphPlan} from '../js/graph-research.js';
import {validateResearchOutput,researchPrompt} from '../js/research.js';

function eligibleEdges(graph,input,privateQuery=false){
  const options=checkedOptions(input);return graph.edges.filter(edge=>{
    const query={...options,from:edge.from,to:edge.to,max_hops:1,directed:true,include_possible:input.include_possible===true};
    const result=privateQuery?findIntroductionPaths(graph,query):findRelationshipPaths(graph,query);
    return result.paths.some(p=>p.edges.includes(edge.id));
  }).map(e=>e.id);
}
const pathKeys=paths=>paths.map(p=>JSON.stringify([p.nodes,p.edges])).sort();
export class ReferenceService{
  constructor(store,{modelAdapters=new Map()}={}){this.store=store;this.modelAdapters=modelAdapters;}
  async handle(principal,action,body={},signal){
    const {org,subject,role}=principal;
    const owner=subject;requireReference(['admin','researcher'].includes(role),'Unsupported role.',403);
    if(action==='import'){requireReference(role==='admin','Administrator permission required.',403);validateBundle(body.bundle);requireReference(body.expected_revision===null||typeof body.expected_revision==='string','Supply expected_revision (null for first import).');return this.store.put(org,body.bundle,{expected_revision:body.expected_revision});}
    if(action==='private/import'){validatePrivateImport(body.dataset,body.consent);requireReference(body.expected_revision===null||typeof body.expected_revision==='string','Supply expected_revision.');return this.store.put(org,body.dataset,{owner,expected_revision:body.expected_revision});}
    if(action==='private/dataset')return this.store.get(org,{owner});
    if(action==='private/paths'){
      const saved=await this.store.get(org,{owner});
      requireReference(!body.revision||body.revision===saved.revision,'Private permissions changed. Reload the current revision.',409);
      const result=privatePaths(saved.value,body);
      const native=await this.store.nativePaths(org,saved.revision,{from:body.from,to:body.to,max_hops:body.max_hops??4},eligibleEdges(saved.value,body,true),{owner,directed:true});
      requireReference(JSON.stringify(pathKeys(native))===JSON.stringify(pathKeys(result.paths)),'Native/private path parity failed.',503);
      return {revision:saved.revision,result,execution:'neo4j-native-paths-with-shared-permission-validation'};
    }
    const saved=await this.store.get(org,{revision:body.revision}),bundle=validateBundle(saved.value);
    if(action==='distribution/export'){requireReference(role==='admin','Administrator permission required for distribution export.',403);requireReference(typeof body.revision==='string'&&body.revision===saved.revision,'Select an explicit organization revision.');return {schema_version:1,organization:org,revision:saved.revision,bundle};}
    if(action==='dataset')return {revision:saved.revision,bundle};
    const catalog=organizationCatalog(bundle,body);
    if(action==='catalog')return {revision:saved.revision,catalog};
    const input={...body,packet_id:randomUUID()};
    if(action==='research/prepare')return {revision:saved.revision,catalog,packet:prepareOrganizationPacket(bundle,input)};
    if(action==='demo/plan'){
      requireReference(organizationPackKind(bundle.pack)==='fictional','Mock planner is restricted to explicitly fictional data.');
      const ids=new Set(catalog.nodes.map(n=>n.id)),queries=[];
      if(ids.has('demo:a')&&ids.has('demo:experiment'))queries.push({kind:'path',from:'demo:a',to:'demo:experiment',max_hops:4,projection:null,reason:'FICTIONAL scripted demonstration of the snapshot/activity trail.'});
      queries.push({kind:'network',from:null,to:null,max_hops:1,projection:'same_round',reason:'FICTIONAL scripted demonstration of shared rounds.'});
      return {revision:saved.revision,simulation:true,model:'scripted-demo-not-an-LLM',plan:{summary:'FICTIONAL scripted planner. No model call occurred.',queries}};
    }
    const adapter=this.modelAdapters.get(JSON.stringify([org,subject]));
    if(action==='research/plan'){
      requireReference(body.consent===true,'Explicit model transmission consent is required.');requireReference(organizationPackKind(bundle.pack)==='research','Live model adapters reject fictional fixtures.');
      requireReference(adapter?.plan,'No model connection provisioned for this organization and user.',503);
      const packet=prepareOrganizationPacket(bundle,input),planned=await adapter.plan({packet,catalog,dataset:bundle.relationships,model:body.model,signal});validateGraphPlan(planned.plan,catalog);
      return {revision:saved.revision,...planned};
    }
    requireReference(['query','research/execute','research/reason','research/review'].includes(action),'Unknown action.',404);
    requireReference(typeof body.revision==='string'&&body.revision===saved.revision,'An explicit inspected dataset revision is required.');
    const exploration=executeOrganizationPlan(bundle,input,body.plan),eligible=eligibleEdges(bundle.relationships,input);
    for(const {query,result} of exploration.audit.results){
      if(query.kind==='path'){
        const native=(await this.store.nativePaths(org,saved.revision,query,eligible)).slice(0,5);
        requireReference(JSON.stringify(pathKeys(native))===JSON.stringify(pathKeys(result.paths)),'Native/public path parity failed.',503);
        result.paths=native.map(p=>({...p,directions:p.edges.map((id,index)=>bundle.relationships.edges.find(e=>e.id===id).from===p.nodes[index]?'forward':'reverse')}));
      }else{
        const native=await this.store.nativeNetwork(org,saved.revision,query.projection,eligible);
        const pairs=links=>links.map(l=>JSON.stringify([l.from,l.to])).sort();
        requireReference(JSON.stringify(pairs(native))===JSON.stringify(pairs(result.links)),'Native/network projection parity failed.',503);
      }
    }
    exploration.audit.storage={adapter:'neo4j-query-api',revision:saved.revision,scope:'authorized-organization',metrics:'Shared JavaScript centrality implementation over native-verified projections.'};
    if(action==='query')return {revision:saved.revision,exploration};
    const packet=prepareOrganizationPacket(bundle,input,exploration);
    if(action==='research/execute')return {revision:saved.revision,packet,prompt:researchPrompt(packet),catalog};
    if(action==='research/review'){
      // The review packet is rebuilt from this revision; only its client-generated identity is restored.
      requireReference(typeof body.packet_id==='string'&&body.packet_id.length<=100,'Supply the inspected packet_id.');packet.packet_id=body.packet_id;
      const validation=validateResearchOutput(body.output,packet);requireReference(validation.isValid,validation.errors.join(' '));return {revision:saved.revision,packet,output:body.output,validation};
    }
    requireReference(body.consent===true,'Explicit model transmission consent is required.');requireReference(organizationPackKind(bundle.pack)==='research','Live model adapters reject fictional fixtures.');requireReference(adapter?.reason,'No model connection provisioned for this organization and user.',503);
    const generated=await adapter.reason({packet,model:body.model,signal}),validation=validateResearchOutput(generated.output,packet);requireReference(validation.isValid,validation.errors.join(' '));return {revision:saved.revision,packet,...generated,validation};
  }
}

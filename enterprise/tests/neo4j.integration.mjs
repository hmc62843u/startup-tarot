import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Neo4jStore} from '../neo4j.mjs';
import {ReferenceService} from '../service.mjs';
import {validateBundle,executeOrganizationPlan} from '../domain.mjs';
import {emptyPrivateRelationships,addPrivateContact,recordPrivateConnection,revokePrivateConnection} from '../../js/private-relationships.js';
import {createReferenceServer,tokenHash} from '../server.mjs';

test('real Neo4j reference acceptance',{skip:!process.env.REFERENCE_INTEGRATION_CONFIG&&!process.env.NEO4J_PASSWORD},async t=>{
 const local=process.env.REFERENCE_INTEGRATION_CONFIG?JSON.parse(await readFile(process.env.REFERENCE_INTEGRATION_CONFIG,'utf8')):{};
 const store=new Neo4jStore({url:process.env.NEO4J_URL||local.url||'http://127.0.0.1:7474',password:process.env.NEO4J_PASSWORD||local.password});await store.init();
 const load=async name=>JSON.parse(await readFile(new URL('../fixtures/'+name+'.json',import.meta.url),'utf8'));
 const alpha=validateBundle(await load('alpha')),beta=validateBundle(await load('beta')),namespace='test_'+randomUUID().replaceAll('-','').slice(0,16),orgA=namespace+'_alpha',orgB=namespace+'_beta';
 const service=new ReferenceService(store),admin={org:orgA,subject:'admin',role:'admin'},founder={org:orgA,subject:'founder',role:'researcher'},other={org:orgB,subject:'founder',role:'researcher'},input={assessment_date:'2026-10-30',question:'Inspect the fictional investment/activity trail.',investor_ids:[alpha.pack.components.research.profiles[0].id],snapshot_ids:[alpha.pack.components.research.snapshots[0].id]};
 let a,b,plan;
 await t.test('atomic import retains IDs, source dates, profile criteria and startup snapshots',async()=>{
   a=await service.handle(admin,'import',{bundle:alpha,expected_revision:null});b=await store.put(orgB,beta);
   assert.deepEqual((await store.get(orgA)).value,alpha);assert.deepEqual((await store.get(orgB)).value,beta);
   assert.equal((await store.get(orgA)).value.pack.components.research.snapshots.length,alpha.pack.components.research.snapshots.length);
   await assert.rejects(()=>store.get(orgA,{revision:b.revision}),e=>e.status===404);
 });
 await t.test('native bounded traversal and projections match browser results with tenant-overlapping IDs',async()=>{
   plan=(await service.handle(founder,'demo/plan',input)).plan;
   const executed=await service.handle(founder,'query',{...input,revision:a.revision,plan}),baseline=executeOrganizationPlan(alpha,input,plan);
   assert.deepEqual(executed.exploration.edge_ids,baseline.edge_ids);assert.deepEqual(executed.exploration.audit.results,baseline.audit.results);
   const metric=executed.exploration.audit.results[1].result.metrics.find(n=>n.id==='demo:a');assert.equal(metric.degree,3);assert.equal(metric.betweenness,1);
   assert.ok(!JSON.stringify(executed).includes('Beta Demo'));
   const shared={...plan,queries:[{kind:'network',from:null,to:null,max_hops:1,projection:'shared_company',reason:'Inspect overlap.'}]};
   const overlap=await service.handle(founder,'query',{...input,revision:a.revision,plan:shared});assert.equal(overlap.exploration.audit.results[0].result.links.length,3);
 });
 await t.test('native shared-company overlap does not become same-round co-investment',async()=>{
   const overlap=structuredClone(alpha),org=orgA+'_overlap';
   overlap.relationships.edges.push({id:'demo:other_round_unknown',from:'demo:b',to:'demo:startup1',type:'invested_in',basis:'fictional',statement:'Invented portfolio membership without same-round evidence.',source_ids:[overlap.relationships.sources[0].id],event_date:'2026-01-10',valid_from:null,valid_to:null,limitations:['Fictional; round unknown.']});
   const saved=await store.put(org,validateBundle(overlap)),principal={...founder,org};
   const query=projection=>({summary:'Projection distinction.',queries:[{kind:'network',from:null,to:null,max_hops:1,projection,reason:'Check distinct semantics.'}]});
   const rounds=await service.handle(principal,'query',{...input,revision:saved.revision,plan:query('same_round')}),companies=await service.handle(principal,'query',{...input,revision:saved.revision,plan:query('shared_company')});
   assert.equal(rounds.exploration.audit.results[0].result.links.length,3);assert.equal(companies.exploration.audit.results[0].result.links.length,4);
 });
 await t.test('historical availability and no-path behavior remain explicit',async()=>{
   const catalog=await service.handle(founder,'catalog',{...input,historical_cutoff:'2009-01-01'});assert.equal(catalog.catalog.nodes.length,0);
   await assert.rejects(()=>service.handle(founder,'query',{...input,historical_cutoff:'2009-01-01',revision:a.revision,plan}),/path query/);
   const noPath={summary:'No short path expected.',queries:[{...plan.queries[0],max_hops:1}]};const result=await service.handle(founder,'query',{...input,revision:a.revision,plan:noPath});assert.equal(result.exploration.audit.results[0].result.paths.length,0);
 });
 await t.test('invalid import cannot change active data; concurrent writes use revision compare-and-swap',async()=>{
   const broken=structuredClone(alpha);broken.relationships.edges[0].from='missing';await assert.rejects(()=>service.handle(admin,'import',{bundle:broken,expected_revision:a.revision}),/Invalid graph/);
   assert.equal((await store.get(orgA)).revision,a.revision);
   const attempts=await Promise.allSettled([store.put(orgA,alpha,{expected_revision:a.revision}),store.put(orgA,alpha,{expected_revision:a.revision})]);
   assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal(attempts.filter(r=>r.status==='rejected'&&r.reason.status===409).length,1);
   assert.deepEqual((await store.get(orgA,{revision:a.revision})).value,alpha);a={revision:(await store.get(orgA)).revision};
 });
 let firstPrivate,currentPrivate;
 await t.test('private connections enforce owner/org scope and confirmation/willingness',async()=>{
   let graph=emptyPrivateRelationships([{id:'demo:a',type:'investor',name:'Invented target'}]);graph=addPrivateContact(graph,{id:'person:alias',name:'Synthetic contact alias',permission:true});
   const connection=(from,to,id)=>({from,to,id,source_id:'source:'+id,note:'Synthetic test confirmation, not a real contact.',storage_permission:true,checked_date:'2026-10-30',verification:'founder_confirmed',permission_use:true,willingness:'yes'});
   graph=recordPrivateConnection(graph,connection('private:self','person:alias','edge1'));graph=recordPrivateConnection(graph,connection('person:alias','demo:a','edge2'));
   firstPrivate=await service.handle(founder,'private/import',{dataset:graph,consent:true,expected_revision:null});
   const result=await service.handle(founder,'private/paths',{...input,from:'private:self',to:'demo:a'});assert.equal(result.result.paths.length,1);assert.equal(result.result.paths[0].status,'founder_confirmed_willing');
   await assert.rejects(()=>service.handle(admin,'private/dataset'),e=>e.status===404);await assert.rejects(()=>service.handle(other,'private/dataset'),e=>e.status===404);
   const revoked=revokePrivateConnection(graph,'edge2','2026-10-30');currentPrivate=await service.handle(founder,'private/import',{dataset:revoked,consent:true,expected_revision:firstPrivate.revision});
   assert.equal((await service.handle(founder,'private/paths',{...input,from:'private:self',to:'demo:a'})).result.paths.length,0);
   await assert.rejects(()=>service.handle(founder,'private/paths',{...input,from:'private:self',to:'demo:a',revision:firstPrivate.revision}),e=>e.status===409);
   assert.notEqual(currentPrivate.revision,firstPrivate.revision);
 });
 await t.test('authenticated HTTP round trip prepares and reviews a fictional research packet without private notes',async()=>{
   const token=randomUUID().replaceAll('-','')+randomUUID().replaceAll('-',''),app=createReferenceServer({store,config:{credentials:[{token_sha256:tokenHash(token),...founder}]}}),origin=await app.listen(0);
   try{
     const post=async(action,body)=>{const response=await fetch(origin+'/v1/'+action,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;};
     const prepared=await post('research/execute',{...input,revision:a.revision,plan});assert.equal(prepared.packet.simulation,true);assert.ok(!JSON.stringify(prepared).includes('Synthetic contact alias'));assert.ok(!prepared.prompt.includes('Synthetic test confirmation'));
     const output={packet_id:prepared.packet.packet_id,output_version:'1',summary:'FICTIONAL response fixture.',findings:[{statement:'Invented activity exists in the simulation.',evidence_ids:[prepared.packet.evidence_items[0].evidence_id]}],interpretations:[],hypotheses:[],unknowns:[],contradictions:[],proposed_investigations:[],historical_comparisons:[],caveats:['FICTIONAL, not real evidence.'],change_summary:'Initial synthetic review.'};
     const reviewed=await post('research/review',{...input,revision:a.revision,plan,packet_id:prepared.packet.packet_id,output});assert.equal(reviewed.validation.isValid,true);assert.deepEqual(reviewed.packet,prepared.packet);
   }finally{await app.close();}
 });
 await t.test('persistence survives a fresh adapter and returned data remains scoped',async()=>{
   const second=new Neo4jStore({url:process.env.NEO4J_URL||local.url||'http://127.0.0.1:7474',password:process.env.NEO4J_PASSWORD||local.password});
   assert.equal((await second.get(orgA)).revision,a.revision);assert.equal((await second.get(orgA,{owner:'founder'})).revision,currentPrivate.revision);assert.deepEqual((await second.get(orgB)).value,beta);
 });
 console.log('Neo4j reference acceptance used isolated fictional namespaces: '+namespace+' (retained for audit; no production data touched).');
});

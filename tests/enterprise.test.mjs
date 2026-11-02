import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateBundle,validatePrivateImport,organizationCatalog,executeOrganizationPlan,prepareOrganizationPacket} from '../enterprise/domain.mjs';
import {Neo4jStore,scopeKey} from '../enterprise/neo4j.mjs';
import {createReferenceServer,tokenHash} from '../enterprise/server.mjs';
import {emptyPrivateRelationships} from '../js/private-relationships.js';
import {findRelationshipPaths,analyzeInvestorNetwork} from '../js/relationships.js';
const load=async name=>JSON.parse(await readFile(new URL('../enterprise/fixtures/'+name+'.json',import.meta.url),'utf8'));
const alpha=await load('alpha'),beta=await load('beta'),input={assessment_date:'2026-10-30',question:'Inspect the fictional activity and round evidence.'};
const plan={summary:'FICTIONAL query fixture.',queries:[{kind:'path',from:'demo:a',to:'demo:experiment',max_hops:4,projection:null,reason:'Inspect the fictional activity path.'},{kind:'network',from:null,to:null,max_hops:1,projection:'same_round',reason:'Inspect shared rounds.'}]};
const credential=(token,org,subject,role)=>({token_sha256:tokenHash(token),org,subject,role});

test('enterprise bundles validate research records and graph binding without relabelling fictional fixtures',()=>{
 assert.equal(validateBundle(alpha),alpha);assert.equal(validateBundle(beta),beta);
 for(const mutate of [b=>b.relationships.pack_id='other',b=>b.relationships.dataset_kind='research',b=>b.relationships.nodes[0].profile_id='unknown',b=>b.relationships.edges[0].source_ids=['missing'],b=>b.private_contacts=[]]){const b=structuredClone(alpha);mutate(b);assert.throws(()=>validateBundle(b));}
 const catalog=organizationCatalog(alpha,input);assert.equal(catalog.simulation,true);
 assert.equal(organizationCatalog(alpha,{...input,historical_cutoff:'2009-01-01'}).nodes.length,0);
 const result=executeOrganizationPlan(alpha,input,plan),packet=prepareOrganizationPacket(alpha,{...input,packet_id:'p1'},result);
 assert.equal(packet.simulation,true);assert.equal(packet.graph_exploration.results[0].result.paths.length,1);assert.ok(packet.evidence_items.length>0);assert.ok(packet.evidence_items.every(e=>e.basis==='fictional'));
 assert.throws(()=>validatePrivateImport(emptyPrivateRelationships(),false),/permission/);
 assert.throws(()=>executeOrganizationPlan(alpha,input,{...plan,queries:[{...plan.queries[0],kind:'cypher'}]}),/Unsupported/);
});

test('Neo4j transport detects errors inside HTTP 202 and passes IDs as parameters',async()=>{
 const failed=new Neo4jStore({password:'test-secret',fetchImpl:async()=>Response.json({errors:[{code:'Neo.ClientError.Statement.SyntaxError',message:'sensitive database details'}]},{status:202})});
 await assert.rejects(()=>failed.get('example_alpha'),e=>e.status===503&&!e.message.includes('sensitive'));
 let request;const store=new Neo4jStore({password:'test-secret',fetchImpl:async(url,options)=>{request=JSON.parse(options.body);return Response.json({data:{fields:['revision','payload'],values:[['v1','{}']]}});}});
 await store.get("org' MATCH(n) DETACH DELETE n //");assert.ok(!request.statement.includes('DELETE'));assert.equal(request.parameters.org,"org' MATCH(n) DETACH DELETE n //");
 assert.notEqual(scopeKey('one','founder'),scopeKey('two','founder'));assert.notEqual(scopeKey('one','founder'),scopeKey('one'));
 assert.throws(()=>new Neo4jStore({url:'http://external.example',password:'test'}),/HTTPS/);
});

class MemoryStore{
 constructor(){this.rows=new Map();this.serial=0;}
 async put(org,value,{owner=null,expected_revision=null}={}){const key=scopeKey(org,owner),old=this.rows.get(key);if((old?.revision||null)!==expected_revision)throw Object.assign(new Error('Revision conflict.'),{status:409});const saved={revision:'revision-'+(++this.serial),value:structuredClone(value)};this.rows.set(key,saved);return {revision:saved.revision};}
 async get(org,{owner=null,revision=null}={}){const saved=this.rows.get(scopeKey(org,owner));if(!saved||revision&&revision!==saved.revision)throw Object.assign(new Error('Not found.'),{status:404});return structuredClone(saved);}
 async nativePaths(org,revision,query,eligible,{owner=null,directed=false}={}){const {value}=await this.get(org,{revision,owner}),graph=owner?value:value.relationships;return findRelationshipPaths({...graph,edges:graph.edges.filter(e=>eligible.includes(e.id))},{as_of:input.assessment_date,...query,directed}).paths;}
 async nativeNetwork(org,revision,projection,eligible){const {value}=await this.get(org,{revision});return analyzeInvestorNetwork({...value.relationships,edges:value.relationships.edges.filter(e=>eligible.includes(e.id))},{as_of:input.assessment_date,projection}).links.map(({from,to})=>({from,to}));}
}
test('reference HTTP boundary derives organization/owner from credentials and enforces roles',async t=>{
 const admin='a'.repeat(43),researcher='r'.repeat(43),other='b'.repeat(43),second='s'.repeat(43),store=new MemoryStore();
 const app=createReferenceServer({store,config:{credentials:[credential(admin,'example_alpha','admin','admin'),credential(researcher,'example_alpha','founder','researcher'),credential(other,'example_beta','founder','admin'),credential(second,'example_alpha','other','researcher')]}}),origin=await app.listen(0);t.after(()=>app.close());
 const post=async(action,body,token=admin,extra={})=>fetch(origin+'/v1/'+action,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
 assert.equal((await post('import',{expected_revision:null,bundle:alpha})).status,200);assert.equal((await post('import',{expected_revision:null,bundle:beta},other)).status,200);
 assert.equal((await post('import',{expected_revision:null,bundle:alpha},researcher)).status,403);
 assert.equal((await post('dataset',{org:'example_beta'})).status,403);assert.equal((await post('dataset',{},'invalid')).status,401);
 assert.equal((await post('dataset',{},admin,{Origin:'https://evil.example'})).status,403);
 for(const path of ['/.local/enterprise/access.json','/enterprise/fixtures/alpha.json','/neo4j.mjs','/.git/config'])assert.equal((await fetch(origin+path)).status,404);
 const a=await (await post('dataset',{},researcher)).json(),b=await (await post('dataset',{},other)).json();assert.notEqual(a.revision,b.revision);assert.ok(!JSON.stringify(a).includes('Beta Demo'));
 assert.equal((await post('dataset',{revision:b.revision},researcher)).status,404);
 assert.equal((await post('query',{...input,revision:a.revision,plan},researcher)).status,200);
 assert.equal((await post('distribution/export',{revision:a.revision},researcher)).status,403);
 const exported=await (await post('distribution/export',{revision:a.revision},admin)).json();assert.equal(exported.organization,'example_alpha');assert.equal(exported.revision,a.revision);assert.deepEqual(exported.bundle,alpha);
 assert.equal((await post('distribution/export',{revision:b.revision},admin)).status,404);
 assert.equal((await post('distribution/export',{},admin)).status,400);
 const packet=(await(await post('research/execute',{...input,revision:a.revision,plan},researcher)).json()).packet;assert.equal(packet.simulation,true);
 assert.equal((await post('research/plan',{...input,consent:true},researcher)).status,400);
 const privateGraph=emptyPrivateRelationships();await post('private/import',{expected_revision:null,consent:true,dataset:privateGraph},researcher);
 assert.equal((await post('private/dataset',{},second)).status,404);assert.equal((await post('private/dataset',{},other)).status,404);assert.equal((await post('private/dataset',{},admin)).status,404);
 assert.equal((await post('private/dataset',{owner:'founder'},second)).status,403);
 assert.ok(!JSON.stringify(await(await post('dataset',{},researcher)).json()).includes('private_founder_connections'));
 const adminPrivate=emptyPrivateRelationships();adminPrivate.nodes.push({id:'private:alias',type:'person',name:'DO_NOT_DISTRIBUTE_OWNER_ALIAS'});assert.equal((await post('private/import',{expected_revision:null,consent:true,dataset:adminPrivate},admin)).status,200);
 assert.ok(!JSON.stringify(await(await post('distribution/export',{revision:a.revision},admin)).json()).includes('DO_NOT_DISTRIBUTE_OWNER_ALIAS'));
});

test('enterprise reference assets contain no credential persistence or arbitrary graph input API',async()=>{
 const app=await readFile(new URL('../enterprise/web/app.js',import.meta.url),'utf8');assert.ok(!app.includes('localStorage'));assert.ok(!app.includes('innerHTML'));
 const compose=await readFile(new URL('../enterprise/compose.yaml',import.meta.url),'utf8');assert.ok(compose.includes('127.0.0.1:7474'));assert.ok(compose.includes('2026.10.1-community'));assert.ok(compose.includes('NEO4J_PASSWORD:?'));
});

test('live model adapters are consented and scoped to exactly one organization/user',async()=>{
 const {ReferenceService}=await import('../enterprise/service.mjs'),store=new MemoryStore(),principal={org:'example_alpha',subject:'founder',role:'researcher'};
 const pack=JSON.parse(await readFile(new URL('../packs/guide-pack.json',import.meta.url),'utf8')),relationships=JSON.parse(await readFile(new URL('../data/relationships.json',import.meta.url),'utf8'));
 const saved=await store.put(principal.org,{schema_version:1,pack,relationships});let calls=0;
 const service=new ReferenceService(store,{modelAdapters:new Map([[JSON.stringify([principal.org,principal.subject]),{plan:async args=>{calls++;assert.equal(args.dataset.dataset_kind,'research');assert.equal(args.catalog.simulation,undefined);assert.ok(!JSON.stringify(args).includes('private_founder_connections'));return {plan:{summary:'No relevant query.',queries:[]},model:'injected-test-planner'};}}]])});
 await assert.rejects(()=>service.handle(principal,'research/plan',{...input,revision:saved.revision}),/consent/);assert.equal(calls,0);
 const result=await service.handle(principal,'research/plan',{...input,revision:saved.revision,consent:true});assert.equal(result.model,'injected-test-planner');assert.equal(calls,1);
 await assert.rejects(()=>service.handle({...principal,subject:'other'},'research/plan',{...input,consent:true}),e=>e.status===503);assert.equal(calls,1);
});

test('reference web workspace switches clear founder context, old responses and credentials',async()=>{
 const vm=await import('node:vm'),html=await readFile(new URL('../enterprise/web/index.html',import.meta.url),'utf8'),code=await readFile(new URL('../enterprise/web/app.js',import.meta.url),'utf8'),ids={};
 class Element{constructor(){this.value='';this.textContent='';this.children=[];this.handlers={};}addEventListener(name,fn){this.handlers[name]=fn;}append(child){this.children.push(child);}replaceChildren(){this.children=[];}get selectedOptions(){return this.children.filter(c=>c.selected);}async click(){if(!this.disabled)await this.handlers.click?.();}}
 for(const match of html.matchAll(/id="([^"]+)"/g))ids[match[1]]=new Element();let requests=0;
 const fetchImpl=async(url,options)=>{if(url==='/v1/publisher/clear')return Response.json({cleared:true});requests++;const betaScope=options.headers.Authorization==='Bearer beta',fixture=betaScope?beta:alpha;assert.equal(url,'/v1/dataset');return Response.json({revision:betaScope?'beta-revision':'alpha-revision',bundle:fixture});};
 vm.runInNewContext(code,{document:{getElementById:id=>ids[id],createElement:()=>new Element(),querySelectorAll:()=>Object.values(ids)},fetch:fetchImpl,URL,Blob,setTimeout});
 ids.token.value='alpha';await ids.connect.click();assert.ok(ids.dataset.textContent.includes('alpha-revision'));assert.equal(ids.token.value,'');
 ids.question.value='Private founder question';ids.context.value='{"company":"Private founder company"}';ids.output.value='Old private response';ids.expanded.textContent='Old packet';
 ids.token.value='beta';await ids.connect.click();assert.ok(ids.dataset.textContent.includes('beta-revision'));assert.ok(!ids.question.value.includes('Private'));assert.equal(ids.context.value,'{}');assert.equal(ids.output.value,'');assert.equal(ids.expanded.textContent,'');
 assert.ok(ids.investors.children.every(c=>c.textContent.startsWith('Beta ')));
 await ids.disconnect.click();assert.equal(ids.dataset.textContent,'');assert.equal(ids.investors.children.length,0);assert.equal(ids.snapshots.children.length,0);
 await ids.prepare.click();assert.equal(requests,2);assert.ok(ids.status.textContent.includes('credential'));
});

test('legacy research Guide Pack v1 imports use the legacy provider binding',async()=>{
 const {researchRecords}=await import('../js/research-library.js'),pack=JSON.parse(await readFile(new URL('../packs/guide-pack.json',import.meta.url),'utf8')),relationships=JSON.parse(await readFile(new URL('../data/relationships.json',import.meta.url),'utf8'));
 const records=researchRecords(pack),legacy={...pack,schema_version:1,...records};delete legacy.provider;delete legacy.components;delete legacy.dataset_kind;
 const bundle={schema_version:1,pack:legacy,relationships:{...relationships,provider_id:'legacy'}};validateBundle(bundle);
 const catalog=organizationCatalog(bundle,input);assert.ok(catalog.nodes.length>0);
 const packet=prepareOrganizationPacket(bundle,{...input,packet_id:'legacy-packet'});assert.equal(packet.pack.provider_id,'legacy');
});

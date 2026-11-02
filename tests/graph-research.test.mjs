import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {graphResearchCatalog,validateGraphPlan,executeGraphPlan} from '../js/graph-research.js';
import {buildResearchPacket} from '../js/research.js';
import {runOAuthGraphPlan} from '../tools/research-model.mjs';
const load=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const graph=await load('data/relationships.json'),pack=await load('packs/guide-pack.json'),demo=await load('data/relationships-demo.json');
const packet=buildResearchPacket(pack,{packet_id:'graph-test',question:'What historical activity can we research?',assessment_date:'2026-10-30'});
const path={kind:'path',from:'investor:yc_accelerator_001',to:'activity:airbnb_user_visits',max_hops:4,projection:null,reason:'Inspect the historical activity trail.'};
const network={kind:'network',from:null,to:null,max_hops:1,projection:'same_round',reason:'Inspect documented shared rounds.'};
const plan=queries=>({summary:'Bounded public research.',queries});

test('LLM plans execute source-backed paths and distinct network projections without modifying records',()=>{
 const before=JSON.stringify(graph),result=executeGraphPlan(graph,packet,plan([path,network]));
 assert.equal(result.audit.results[0].result.paths.length,1);assert.equal(result.audit.results[0].result.paths[0].edges.length,3);
 assert.equal(result.audit.results[1].result.links.length,1);assert.equal(JSON.stringify(graph),before);
 const expanded=buildResearchPacket(pack,{packet_id:'expanded',question:packet.question,assessment_date:packet.assessment_date,relationship_selection:{dataset:graph,edge_ids:result.edge_ids}});
 assert.equal(expanded.evidence_items.length,result.edge_ids.length);
 assert.equal(executeGraphPlan(graph,packet,plan([])).edge_ids.length,0);
 const missing=executeGraphPlan(graph,packet,plan([{...path,from:'investor:connect_ventures_current_001'}]));
 assert.equal(missing.audit.results[0].result.paths.length,0);
});

test('planner contract rejects invented IDs, code, excessive depth, extra fields and private or fictional graphs',()=>{
 const catalog=graphResearchCatalog(graph,packet);
 for(const changed of [{from:'invented'},{kind:'eval'},{max_hops:5},{max_hops:1.5},{projection:'same_round'},{to:path.from},{code:'alert(1)'}])assert.throws(()=>validateGraphPlan(plan([{...path,...changed}]),catalog));
 assert.throws(()=>validateGraphPlan(plan([path,path,path,path]),catalog));
 assert.throws(()=>graphResearchCatalog(demo,packet),/valid public/);
 assert.throws(()=>graphResearchCatalog({...graph,dataset_kind:'private'},packet),/valid public/);
 assert.throws(()=>graphResearchCatalog({...graph,pack_id:'other'},packet),/valid public/);
});

test('historical planning excludes retrospective and unknown availability from catalog and network results',()=>{
 const historical={...packet,historical_cutoff:'2009-01-23'},catalog=graphResearchCatalog(graph,historical);
 assert.equal(catalog.nodes.length,0);assert.equal(catalog.omitted_edges,graph.edges.length);
 assert.throws(()=>executeGraphPlan(graph,historical,plan([path])),/path query/);
 const result=executeGraphPlan(graph,historical,plan([network]));assert.deepEqual(result.audit.results[0].result.metrics,[]);assert.equal(result.edge_ids.length,0);
});

test('OAuth planner uses strict schema, validates its response and sends no full graph or private storage',async()=>{
 const oauth={models:async()=>[{slug:'available'}],access:async()=>'secret'};let request;
 const fetchImpl=async(url,options)=>{request=JSON.parse(options.body);return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(plan([path]))}]}]}})+'\n\n');};
 const result=await runOAuthGraphPlan({oauth,packet,model:'available',dataset:graph,fetchImpl});
 assert.equal(result.prompt_version,'graph-plan-1');assert.equal(request.text.format.name,'public_graph_plan');assert.equal(request.text.format.strict,true);
 const sent=JSON.parse(request.input[0].content);assert.ok(sent.catalog.nodes.length);assert.equal(sent.catalog.edges,undefined);assert.equal(request.tools,undefined);
 await assert.rejects(()=>runOAuthGraphPlan({oauth,packet,model:'available',dataset:graph,fetchImpl:async()=>new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify(plan([{...path,from:'invented'}]))}]}]}})+'\n\n')}),/path query/);
});

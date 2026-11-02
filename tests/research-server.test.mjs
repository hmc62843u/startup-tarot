import test from 'node:test';
import assert from 'node:assert/strict';
import {createResearchServer} from '../tools/research-server.mjs';
import {collectResearchStream,runOAuthResearch} from '../tools/research-model.mjs';
const packet={contract_version:'1',packet_id:'p1',question:'What should we investigate?',records:[],evidence_items:[],source_metadata:[]};
const output={packet_id:'p1',output_version:'1',summary:'Insufficient evidence.',findings:[],interpretations:[],hypotheses:[],unknowns:['No records supplied.'],contradictions:[],proposed_investigations:[],historical_comparisons:[],caveats:['Do not infer investor interest.'],change_summary:'Initial analysis.'};
function stream(events){return new Response(events.map(e=>'data: '+JSON.stringify(e)+'\r\n\r\n').join(''),{headers:{'Content-Type':'text/event-stream'}});}
test('model adapter requires terminal completion and respects OAuth request limitations',async()=>{
 const oauth={models:async()=>[{slug:'test-model'}],access:async()=>'private-token'};let request;
 const result=await runOAuthResearch({oauth,packet,model:'test-model',fetchImpl:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');request=JSON.parse(options.body);return stream([{type:'response.output_text.delta',delta:JSON.stringify(output)},{type:'response.completed',response:{id:'response-test',status:'completed',usage:{input_tokens:50,output_tokens:50},output:[]}}]);}});
 assert.equal(result.output.packet_id,'p1');assert.equal(request.store,false);assert.equal(request.stream,true);assert.equal(request.text.format.strict,true);
 for(const key of ['max_output_tokens','temperature','previous_response_id','tools'])assert.equal(request[key],undefined);
 assert.equal(request.input[0].role,'user');assert.ok(!JSON.stringify(result).includes('private-token'));
 await assert.rejects(()=>runOAuthResearch({oauth,packet,model:'unavailable',fetchImpl:()=>{throw new Error('Should not call');}}),/available/);
});
test('incomplete, refused and failed streams never become saved research',async()=>{
 await assert.rejects(()=>collectResearchStream(stream([{type:'response.output_text.delta',delta:'{}'}])),/without completed/);
 await assert.rejects(()=>collectResearchStream(stream([{type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded',message:'Usage limit reached.'}}}])),/Usage limit/);
 await assert.rejects(()=>collectResearchStream(stream([{type:'response.completed',response:{status:'completed',output:[{content:[{type:'refusal',refusal:'Declined'}]}]}}])),/declined/);
});
test('loopback helper serves only public assets and rejects cross-origin model requests',async t=>{
 let runs=0;const oauth={status:()=>({connected:false,registrations:[]}),begin:()=> 'https://auth.openai.com/test',models:async()=>[],disconnect:async()=>{},callback:async()=>{}};
 const app=await createResearchServer({oauth,runImpl:async()=>{runs++;return {output,model:'test-model'};}});const origin=await app.listen(0);t.after(()=>app.close());
 assert.equal((await fetch(origin+'/')).status,200);
 for(const path of ['/.git/config','/.env','/.local/research-oauth/oauth-registration.json','/tools/research-oauth.mjs','/js/outreach.js'])assert.equal((await fetch(origin+path)).status,404,path);
 const body=JSON.stringify({packet,model:'test-model'});
 assert.equal((await fetch(origin+'/api/research',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body})).status,403);assert.equal(runs,0);
 assert.equal((await fetch(origin+'/api/research',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body})).status,200);assert.equal(runs,1);
 assert.equal((await fetch(origin+'/api/account')).headers.get('cache-control'),'no-store');
 const metadata=await(await fetch(origin+'/api/account')).json();assert.equal(metadata.connected,false);
});

test('graph planning route uses the server public artifact and rejects cross-origin planning',async t=>{
 const calls=[],oauth={status:()=>({connected:false,registrations:[]})};
 const app=await createResearchServer({oauth,planImpl:async options=>{calls.push(options);return {output:{summary:'No relevant queries.',queries:[]},model:'test-model'};}});
 const origin=await app.listen(0);t.after(()=>app.close());const body=JSON.stringify({packet,model:'test-model',dataset:{dataset_kind:'private'}});
 assert.equal((await fetch(origin+'/api/graph-plan',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body})).status,403);assert.equal(calls.length,0);
 assert.equal((await fetch(origin+'/api/graph-plan',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body})).status,200);
 assert.equal(calls.length,1);assert.equal(calls[0].dataset.dataset_kind,'research');assert.equal(calls[0].dataset.id,'startup_library_relationships');
});

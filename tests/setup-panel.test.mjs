import test from 'node:test';
import assert from 'node:assert/strict';
import {setupSnapshot,createSetupPanel} from '../enterprise/setup-panel.mjs';
test('setup snapshot distinguishes missing configuration, external database and ready services without secrets',async()=>{
 const missing=await setupSnapshot({load:async()=>{throw Error('password=secret');}});assert.equal(missing.configuration,false);assert.equal(missing.database,false);assert.ok(!JSON.stringify(missing).includes('secret'));
 const config={mode:'external',origin:'http://127.0.0.1:8790',password:'secret'};
 const cold=await setupSnapshot({load:async()=>config,databaseReady:async()=>false,health:async()=>false});assert.match(cold.next,/external Neo4j/);
 const ready=await setupSnapshot({load:async()=>config,databaseReady:async()=>true,health:async()=>true});assert.equal(ready.database,true);assert.equal(ready.workspace,true);assert.ok(!JSON.stringify(ready).includes('secret'));
});
test('setup panel enforces capability path, origin, bounded typed actions and launcher-only execution',async()=>{
 const calls=[],panel=createSetupPanel({snapshot:async()=>({node:true,next:'Ready'}),run:async a=>calls.push(a)}),url=await panel.listen(),origin=new URL(url).origin;
 const post=(body,headers={})=>fetch(url+'action',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Setup-Action':'1',...headers},body:JSON.stringify(body)});
 try{
  assert.equal((await fetch(origin+'/')).status,404);assert.equal((await fetch(url+'action')).status,404);
  assert.equal((await post({action:'start'},{Origin:'https://example.invalid'})).status,403);
  assert.equal((await post({action:'start',command:'arbitrary'})).status,400);
  assert.equal((await post({action:'import'})).status,400);assert.equal((await post({action:'check',padding:'x'.repeat(1500)})).status,413);
  assert.equal((await post({action:'check'})).status,200);assert.deepEqual(calls,[]);
  assert.equal((await post({action:'start'})).status,200);assert.equal((await post({action:'stop'})).status,200);assert.deepEqual(calls,['start','stop']);
  const html=await (await fetch(url)).text();assert.ok(html.includes('Setup only'));assert.ok(!html.includes('secret'));
 }finally{await panel.close();}
});
test('setup action errors redact internals and concurrent starts cannot overlap',async()=>{
 let release,entered;const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const panel=createSetupPanel({snapshot:async()=>({}),run:async()=>{entered();await gate;throw Error('private password secret');}}),url=await panel.listen(),origin=new URL(url).origin;
 const request=()=>fetch(url+'action',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Setup-Action':'1'},body:JSON.stringify({action:'start'})});
 try{const first=request();await started;assert.equal((await request()).status,409);release();const failed=await first;assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('secret'));}finally{release();await panel.close();}
});

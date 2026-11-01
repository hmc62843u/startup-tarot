import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {WorkspaceLifecycle,waitReady,dockerDriver,createControlServer,launcherControl,loadLauncherConfig,acquireState,removeOwnedState,readLauncherState} from '../enterprise/launcher/core.mjs';
import {tokenHash} from '../enterprise/server.mjs';
const config={mode:'docker',origin:'http://127.0.0.1:8790',timeout:5};
function harness({db=true,workspace=true,occupied=false,mode='docker',workspaceFailure=false}={}){
 const calls=[];let database=db,running=workspace;
 const lifecycle=new WorkspaceLifecycle({config:{...config,mode},databaseReady:async()=>database,existingWorkspace:async()=>running,occupied:async()=>occupied,startDatabase:async()=>{calls.push('start-db');database=true;return {id:'owned-db'};},stopDatabase:async handle=>{assert.equal(handle.id,'owned-db');calls.push('stop-db');database=false;},startWorkspace:async()=>{calls.push('start-workspace');if(workspaceFailure)throw Error('failed');running=true;return {close:async()=>{calls.push('stop-workspace');running=false;}};},waiter:async check=>assert.equal(await check(),true)});
 return {lifecycle,calls};
}
test('launcher reuses external services and never stops them',async()=>{const {lifecycle,calls}=harness();const status=await lifecycle.start();assert.deepEqual(status.owned,{workspace:false,neo4j:false});await lifecycle.start();await lifecycle.stop();assert.deepEqual(calls,[]);});
test('launcher starts missing services in order and stops only its own handles',async()=>{const {lifecycle,calls}=harness({db:false,workspace:false});assert.equal((await lifecycle.start()).ready,true);await lifecycle.start();await lifecycle.stop();await lifecycle.stop();assert.deepEqual(calls,['start-db','start-workspace','stop-workspace','stop-db']);});
test('workspace startup failure rolls back only the newly started database',async()=>{const {lifecycle,calls}=harness({db:false,workspace:false,workspaceFailure:true});await assert.rejects(()=>lifecycle.start());assert.deepEqual(calls,['start-db','start-workspace','stop-db']);});
test('port conflicts and external database failures do not kill existing processes',async()=>{const a=harness({workspace:false,occupied:true});await assert.rejects(()=>a.lifecycle.start(),/occupied/);assert.deepEqual(a.calls,[]);const b=harness({db:false,mode:'external'});await assert.rejects(()=>b.lifecycle.start(),/External Neo4j/);assert.deepEqual(b.calls,[]);});
test('readiness polling succeeds and times out with a bounded clear error',async()=>{let now=0,tries=0;await waitReady(async()=>++tries===3,{timeout:30,poll:10,now:()=>now,sleep:async ms=>{now+=ms;}});assert.equal(tries,3);await assert.rejects(()=>waitReady(async()=>false,{timeout:20,poll:10,now:()=>now,sleep:async ms=>{now+=ms;}}),/Timed out/);});
test('Docker ownership compares exact container and start time; no image pull or volume deletion',async()=>{
 let started=false,restarted=false;const commands=[],id='a'.repeat(64),driver=dockerDriver({password:'synthetic-test-password'},{run:async(exe,args)=>{assert.equal(exe,'docker');commands.push(args);if(args.includes('inspect'))return JSON.stringify({Running:started,StartedAt:restarted?'different':'original'});if(args.includes('up'))started=true;if(args.includes('ps'))return id;return '';}});
 const handle=await driver.start();restarted=true;await driver.stop(handle);assert.ok(!commands.some(c=>c[0]==='stop'));restarted=false;await driver.stop(handle);assert.ok(commands.some(c=>c[0]==='stop'&&c.includes(id)));assert.ok(commands.find(c=>c.includes('up')).includes('never'));assert.ok(commands.every(c=>!c.includes('down')&&!c.includes('rm')&&!c.some(v=>v.includes('synthetic-test-password'))));
});
test('private launcher control is loopback, token scoped and rejects browser origins',async()=>{
 const token='a'.repeat(64),lifecycle=harness().lifecycle;await lifecycle.start();const server=createControlServer(lifecycle,token);await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port,state={token,control_port:port};
 try{assert.equal((await launcherControl(state,'status')).ready,true);assert.equal((await fetch('http://127.0.0.1:'+port+'/stop',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:'http://evil.invalid'}})).status,403);assert.equal((await fetch('http://127.0.0.1:'+port+'/stop',{method:'POST',headers:{Authorization:'Bearer '+'b'.repeat(64)}})).status,403);assert.equal((await launcherControl(state,'stop')).ready,false);}finally{server.close();}
});
test('launcher config reads protected credentials without granting arbitrary commands',async()=>{
 const root=await mkdtemp(resolve(tmpdir(),'tarot-launcher-'));await mkdir(resolve(root,'.local/enterprise'),{recursive:true});const privateDir=resolve(root,'.local/enterprise');
 await writeFile(resolve(privateDir,'access.json'),JSON.stringify({credentials:[{org:'test_org',subject:'operator',role:'admin',token_sha256:tokenHash('t'.repeat(40))}]}));await writeFile(resolve(privateDir,'password.json'),JSON.stringify({password:'synthetic-secret'}));
 const settings={database_mode:'external',neo4j_url:'http://127.0.0.1:17474',password_file:'.local/enterprise/password.json'};await writeFile(resolve(privateDir,'launcher.json'),'\uFEFF'+JSON.stringify(settings));
 const loaded=await loadLauncherConfig({root,env:{}});assert.equal(loaded.mode,'external');assert.equal(loaded.password,'synthetic-secret');
 await writeFile(resolve(privateDir,'launcher.json'),JSON.stringify({...settings,command:'arbitrary command'}));await assert.rejects(()=>loadLauncherConfig({root,env:{}}),/Unsupported/);
 const path=resolve(privateDir,'state.json'),owned=await acquireState(path);await assert.rejects(()=>acquireState(path),/Another launcher/);await removeOwnedState('other-token',path);assert.equal((await readLauncherState(path)).token,owned.token);await removeOwnedState(owned.token,path);assert.equal(await readLauncherState(path),null);
});

test('launcher CLI starts a real supervisor, reuses it on repeat and stops its Workspace only',async t=>{
 const {createServer}=await import('node:http'),{execFile}=await import('node:child_process'),{promisify}=await import('node:util');
 const {launcherState,launcherRoot}=await import('../enterprise/launcher/core.mjs');
 if(await readLauncherState()){t.skip('A user launcher already owns this checkout; leave it untouched.');return;}
 await mkdir(resolve(launcherRoot,'.local/enterprise'),{recursive:true});
 const dir=await mkdtemp(resolve(launcherRoot,'.local/enterprise/launcher-cli-test-')),db=createServer(async(req,res)=>{let body='';for await(const part of req)body+=part;const request=JSON.parse(body);assert.ok(request.statement==='RETURN 1 AS ready'||request.statement.startsWith('CREATE CONSTRAINT'));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:{fields:['ready'],values:[[1]]}}));});
 await new Promise(r=>db.listen(0,'127.0.0.1',r));
 const portProbe=createServer();await new Promise(r=>portProbe.listen(0,'127.0.0.1',r));const port=portProbe.address().port;await new Promise(r=>portProbe.close(r));
 const token='x'.repeat(40);await writeFile(resolve(dir,'access.json'),JSON.stringify({credentials:[{org:'cli_test',subject:'operator',role:'admin',token_sha256:tokenHash(token)}]}));
 const file=resolve(dir,'launcher.json');await writeFile(file,JSON.stringify({database_mode:'external',neo4j_url:'http://127.0.0.1:'+db.address().port,access_file:resolve(dir,'access.json'),port,startup_timeout_seconds:5}));
 const env={...process.env,WORKSPACE_LAUNCHER_CONFIG:file,NEO4J_URL:'http://127.0.0.1:'+db.address().port,NEO4J_PASSWORD:'synthetic-cli-password',REFERENCE_PORT:String(port)},run=async action=>{const result=await promisify(execFile)(process.execPath,['enterprise/launch.mjs',action,'--no-open'],{cwd:launcherRoot,env,timeout:20000,windowsHide:true});assert.ok(!result.stdout.includes('synthetic-cli-password'));return result.stdout;};
 try{
  const first=JSON.parse(await run('start'));assert.equal(first.ready,true);assert.deepEqual(first.owned,{workspace:true,neo4j:false});const state=await readLauncherState();
  const second=JSON.parse(await run('start'));assert.equal(second.ready,true);assert.equal((await readLauncherState()).pid,state.pid);
  assert.equal(JSON.parse(await run('status')).database_ready,true);
  await run('stop');await new Promise(r=>setTimeout(r,100));assert.equal(await readLauncherState(),null);
  await assert.rejects(()=>fetch(first.url+'/health',{signal:AbortSignal.timeout(500)}));
  assert.equal(db.listening,true);assert.ok((await run('stop')).includes('Nothing was stopped'));
 }finally{try{await run('stop');}catch{}await new Promise(r=>db.close(r));}
});

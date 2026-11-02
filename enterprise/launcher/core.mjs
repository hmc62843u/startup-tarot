import {readFile,mkdir,writeFile,open,rename,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import {createConnection} from 'node:net';
import {Neo4jStore} from '../neo4j.mjs';
import {createReferenceServer,validateAccessConfig} from '../server.mjs';

export const launcherRoot=fileURLToPath(new URL('../../',import.meta.url));
export const launcherState=resolve(launcherRoot,'.local/enterprise/launcher-state.json');
export const parseLauncherJSON=text=>JSON.parse(text.replace(/^\uFEFF/,''));
export const launcherError=message=>Object.assign(new Error(message),{launcher:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
export async function readLauncherState(path=launcherState){try{return parseLauncherJSON(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw launcherError('Cannot read launcher state. Check the ignored .local/enterprise folder; do not delete a live launcher state.');}}
export function processAlive(pid){if(!Number.isInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true;}catch(e){return e.code==='EPERM';}}
export async function loadLauncherConfig({root=launcherRoot,env=process.env}={}){
 const file=resolve(root,env.WORKSPACE_LAUNCHER_CONFIG||'.local/enterprise/launcher.json');let input={};
 try{input=parseLauncherJSON(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw launcherError('Invalid launcher configuration JSON. See enterprise/LAUNCHER.md.');}
 const allowed=['database_mode','neo4j_url','password_file','access_file','port','startup_timeout_seconds'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k)))throw launcherError('Unsupported launcher settings. Keep passwords in an ignored password_file or NEO4J_PASSWORD.');
 const mode=input.database_mode||'docker',port=Number(env.REFERENCE_PORT||input.port||8790),timeout=Number(input.startup_timeout_seconds||90);
 if(!['docker','external'].includes(mode)||!Number.isInteger(port)||port<1024||port>65535||!Number.isInteger(timeout)||timeout<5||timeout>300)throw launcherError('Invalid database mode, port or startup timeout.');
 const neo4jURL=env.NEO4J_URL||input.neo4j_url||'http://127.0.0.1:7474';let endpoint;try{endpoint=new URL(neo4jURL);}catch{throw launcherError('Invalid Neo4j URL.');}
 if(endpoint.protocol!=='http:'||!['127.0.0.1','localhost'].includes(endpoint.hostname)||endpoint.pathname!=='/'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw launcherError('Local launcher accepts only a plain HTTP loopback Neo4j URL. Remote deployments use separate infrastructure.');
 if(mode==='docker'&&endpoint.port!=='7474')throw launcherError('Docker mode uses the supplied loopback port 7474. Use external mode for another port.');
 let password=env.NEO4J_PASSWORD;
 if(!password&&input.password_file){try{const saved=parseLauncherJSON(await readFile(resolve(root,input.password_file),'utf8'));password=saved.password;}catch{throw launcherError('Cannot read password_file. It must be an ignored local JSON file containing password.');}}
 if(typeof password!=='string'||!password||password.length>1000)throw launcherError('Neo4j password is not configured. Set NEO4J_PASSWORD or password_file once; never paste credentials into chat.');
 let access;try{access=validateAccessConfig(parseLauncherJSON(await readFile(resolve(root,env.REFERENCE_ACCESS_FILE||input.access_file||'.local/enterprise/access.json'),'utf8')));}catch{throw launcherError('Workspace access configuration is missing or invalid. Complete the one-time credential setup in enterprise/LAUNCHER.md.');}
 return {mode,port,timeout,neo4jURL: endpoint.origin,password,access,database:env.NEO4J_DATABASE||'neo4j',origin:'http://127.0.0.1:'+port};
}
export async function workspaceHealth(origin,fetchImpl=fetch){try{const response=await fetchImpl(origin+'/health',{signal:AbortSignal.timeout(1500),redirect:'error'});const value=await response.json();return response.ok&&value.service==='startup-tarot-enterprise-reference';}catch{return false;}}
export async function portOccupied(port){return new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port});socket.setTimeout(1000);const finish=result=>{socket.destroy();resolve(result);};socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));socket.once('timeout',()=>finish(false));});}
export async function waitReady(check,{timeout=90000,poll=500,now=()=>Date.now(),sleep=wait}={}){const end=now()+timeout;while(true){if(await check())return;if(now()>=end)throw launcherError('Timed out waiting for service readiness. Check the existing database configuration and local ports; no data was reset.');await sleep(poll);}}
export async function runFixed(executable,args,{env=process.env,timeout=30000,cwd=launcherRoot}={}){
 return new Promise((accept,reject)=>{const child=spawn(executable,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe'],shell:false});let output='',size=0;const timer=setTimeout(()=>{child.kill();reject(launcherError('A service command timed out. Inspect Docker status and retry; no data was reset.'));},timeout);
 child.stdout.on('data',b=>{size+=b.length;if(size<=65536)output+=b.toString();});child.stderr.on('data',()=>{});child.once('error',()=>{clearTimeout(timer);reject(launcherError('Required service tool is unavailable. Install/start Docker Compose for docker mode, or use an existing database in external mode.'));});child.once('exit',code=>{clearTimeout(timer);if(code!==0||size>65536)reject(launcherError('Service command failed. Check Docker Compose availability, the existing image and port 7474. Command output is suppressed to protect credentials.'));else accept(output.trim());});});
}
export function dockerDriver(config,{run=runFixed}={}){
 const compose=['compose','-f',resolve(launcherRoot,'enterprise/compose.yaml')],env={...process.env,NEO4J_PASSWORD:config.password};
 const command=args=>run('docker',args,{env});
 async function inspect(id){if(!/^[a-f0-9]{12,64}$/.test(id||''))return null;try{return JSON.parse(await command(['inspect','--format','{{json .State}}',id]));}catch{return null;}}
 return {async start(){
  const previous=await command([...compose,'ps','-a','-q','neo4j']);if(previous.includes('\n'))throw launcherError('Multiple Neo4j containers found; inspect the Compose project manually.');
  const before=await inspect(previous);if(before?.Running)throw launcherError('The existing Neo4j container is already running but not ready. Its process will not be restarted automatically.');
  await command([...compose,'up','-d','--no-build','--pull','never','neo4j']);
  const id=await command([...compose,'ps','-q','neo4j']),state=await inspect(id);if(!state?.Running)throw launcherError('Docker did not report a running Neo4j container.');return {id,started_at:state.StartedAt};
 },async stop(handle){const state=await inspect(handle.id);if(state?.Running&&state.StartedAt===handle.started_at)await command(['stop','--time','30',handle.id]);}};
}
export class WorkspaceLifecycle{
 constructor({config,databaseReady,startDatabase,stopDatabase,startWorkspace,existingWorkspace=()=>workspaceHealth(config.origin),occupied=()=>portOccupied(config.port),waiter=waitReady}){Object.assign(this,{config,databaseReady,startDatabase,stopDatabase,startWorkspace,existingWorkspace,occupied,waiter});this.ownedDatabase=null;this.ownedWorkspace=null;this.ready=false;}
 async start(){try{
  if(!await this.databaseReady()){if(this.config.mode==='external')throw launcherError('External Neo4j is not ready. Start the configured instance, check its password, then retry. External mode never starts or stops that database.');this.ownedDatabase=await this.startDatabase();await this.waiter(this.databaseReady,{timeout:this.config.timeout*1000});}
  if(!await this.existingWorkspace()){if(await this.occupied())throw launcherError('Workspace port is occupied by another service. Choose a free REFERENCE_PORT; nothing was stopped.');this.ownedWorkspace=await this.startWorkspace();}
  await this.waiter(()=>this.existingWorkspace(),{timeout:this.config.timeout*1000});this.ready=true;return this.status();
 }catch(error){await this.stop().catch(()=>{});throw error;}}
 async health(){const database_ready=await this.databaseReady(),workspace_ready=await this.existingWorkspace();return {...this.status(),ready:this.ready&&database_ready&&workspace_ready,database_ready,workspace_ready};}
 status(){return {ready:this.ready,url:this.config.origin,owned:{workspace:!!this.ownedWorkspace,neo4j:!!this.ownedDatabase}};}
 async stop(){this.ready=false;if(this.ownedWorkspace){await this.ownedWorkspace.close();this.ownedWorkspace=null;}if(this.ownedDatabase){await this.stopDatabase(this.ownedDatabase);this.ownedDatabase=null;}return this.status();}
}
export function createLifecycle(config){
 const store=new Neo4jStore({url:config.neo4jURL,password:config.password,database:config.database}),driver=dockerDriver(config);
 const databaseReady=async()=>{try{await store.query('RETURN 1 AS ready',{},AbortSignal.timeout(2000));return true;}catch{return false;}};
 return new WorkspaceLifecycle({config,databaseReady,startDatabase:()=>driver.start(),stopDatabase:h=>driver.stop(h),startWorkspace:async()=>{await store.init();const app=createReferenceServer({store,config:config.access});try{await app.listen(config.port);return app;}catch(error){await app.close().catch(()=>{});throw error;}}});
}
export async function launcherControl(state,action,fetchImpl=fetch){
 if(!state||!Number.isInteger(state.control_port)||state.control_port<1024||state.control_port>65535||!/^[a-f0-9]{64}$/.test(state.token||''))throw launcherError('Launcher is starting or its state is unavailable. Retry status shortly.');
 try{const response=await fetchImpl('http://127.0.0.1:'+state.control_port+'/'+action,{method:'POST',headers:{Authorization:'Bearer '+state.token},signal:AbortSignal.timeout(action==='stop'?60000:3000)});if(!response.ok)throw Error();return await response.json();}catch{throw launcherError('Launcher control is unavailable. It may be starting or stopped. Retry status; do not stop processes by a saved PID.');}
}
export function createControlServer(lifecycle,token,{onStopped=()=>{}}={}){
 const server=createServer(async(req,res)=>{const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const expected='127.0.0.1:'+server.address().port,provided=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization||'')?.[1];
 if(req.headers.host!==expected||req.headers.origin||!provided||!timingSafeEqual(Buffer.from(provided),Buffer.from(token)))return json(403,{error:'Launcher control rejected.'});
 if(req.method!=='POST'||!['/status','/stop'].includes(req.url))return json(404,{error:'Unknown launcher action.'});
 try{if(req.url==='/status')return json(200,lifecycle.health?await lifecycle.health():lifecycle.status());const status=await lifecycle.stop();json(200,status);server.close();onStopped();}catch{json(503,{error:'Could not stop all owned services. Retry stop; no unowned process was targeted.'});}
 });return server;
}
export async function openLocalTarget(target,{platform=process.platform,spawnImpl=spawn}={}){return new Promise((accept,reject)=>{const exe=platform==='win32'?'rundll32.exe':platform==='darwin'?'open':'xdg-open',args=platform==='win32'?['url.dll,FileProtocolHandler',target]:[target],child=spawnImpl(exe,args,{windowsHide:true,detached:true,stdio:'ignore',shell:false});child.once('error',()=>reject(launcherError('Services are ready, but the browser could not be opened. Open the displayed URL manually.')));child.once('spawn',()=>{child.unref();accept();});});}
export async function writeOwnedState(state,path=launcherState){const temp=path+'.'+state.token+'.tmp';await writeFile(temp,JSON.stringify(state),{mode:0o600});await rename(temp,path);}
export async function removeOwnedState(token,path=launcherState){const current=await readLauncherState(path);if(current?.token===token)await unlink(path);}
export async function acquireState(path=launcherState){await mkdir(resolve(path,'..'),{recursive:true});const token=randomBytes(32).toString('hex'),record={schema_version:1,pid:process.pid,token,control_port:null};try{const handle=await open(path,'wx',0o600);try{await handle.writeFile(JSON.stringify(record));}finally{await handle.close();}return record;}catch(e){if(e.code==='EEXIST')throw launcherError('Another launcher owns this checkout. Use status or retry start.');throw e;}}

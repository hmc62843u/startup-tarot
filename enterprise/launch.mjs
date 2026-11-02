import {spawn} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {launcherRoot,launcherState,parseLauncherJSON,launcherError,readLauncherState,processAlive,launcherControl,loadLauncherConfig,removeOwnedState,openLocalTarget,workspaceHealth} from './launcher/core.mjs';

export async function launchCommand(args=process.argv.slice(2),{print=console.log,openBrowser=openLocalTarget}={}){
 if(Number(process.versions.node.split('.')[0])<24)throw launcherError('Node 24 or later is required.');
 const action=args[0]||'start',noOpen=args.includes('--no-open');if(!['start','status','stop','publisher'].includes(action)||args.some((arg,i)=>i>0&&arg!=='--no-open'))throw launcherError('Usage: node enterprise/launch.mjs [start|status|stop|publisher] [--no-open]');
 if(action==='publisher'){
  const path=resolve(launcherRoot,'publisher/index.html');try{await stat(resolve(launcherRoot,'publisher/template.js'));await stat(resolve(launcherRoot,'publisher/app.bundle.js'));}catch{throw launcherError('Prepared Publisher files are missing. Use a prepared Publisher download or run node tools/build-publisher.mjs once in the source checkout.');}
  const url=pathToFileURL(path).href;print('Research Publisher: '+url+' (no backend services needed)');if(!noOpen)await openBrowser(url);return {publisher:true,url};
 }
 let state=await readLauncherState();
 if(state){
  try{
   const status=await launcherControl(state,action==='stop'?'stop':'status');
   if(action==='stop'){for(let i=0;i<20;i++){if((await readLauncherState())?.token!==state.token)break;await new Promise(r=>setTimeout(r,100));}print('Stopped launcher-owned services. Reused/external services and database volumes were left intact.');return status;}
   if(action==='start'&&!status.ready)throw launcherError('The existing launcher is not ready. Use status; if a service failed, use stop and retry start.');
   print(JSON.stringify(status,null,2));if(action==='start'&&!noOpen)await openBrowser(status.url);return status;
  }catch(error){
   if(processAlive(state.pid))throw error;
   // Never kill a saved PID. Remove only this dead launcher's matching private state.
   await removeOwnedState(state.token);state=null;
  }
 }
 if(action==='stop'){print('No live launcher owns services in this checkout. Nothing was stopped.');return {ready:false,owned:{workspace:false,neo4j:false}};}
 if(action==='status'){
  let port=Number(process.env.REFERENCE_PORT||8790);try{const config=parseLauncherJSON(await readFile(resolve(launcherRoot,process.env.WORKSPACE_LAUNCHER_CONFIG||'.local/enterprise/launcher.json'),'utf8'));if(!process.env.REFERENCE_PORT&&config.port)port=config.port;}catch{}
  if(!Number.isInteger(port)||port<1024||port>65535)throw launcherError('Invalid Workspace port.');const url='http://127.0.0.1:'+port,responding=await workspaceHealth(url);
  const result={ready:false,workspace_responding:responding,managed_by_launcher:false,url,note:'No live launcher. Database readiness was not checked; any responding Workspace is external.'};print(JSON.stringify(result,null,2));return result;
 }
 const config=await loadLauncherConfig();
 const result=await new Promise((accept,reject)=>{
  let settled=false;const worker=spawn(process.execPath,[fileURLToPath(new URL('./launcher/worker.mjs',import.meta.url))],{cwd:launcherRoot,env:process.env,detached:true,windowsHide:true,stdio:['ignore','ignore','ignore','ipc'],shell:false});
  const timeout=setTimeout(()=>{worker.disconnect?.();worker.unref();reject(launcherError('Launcher is still starting or unresponsive. Run status; do not start a second copy or stop processes by PID.'));},(config.timeout+45)*1000);
  worker.once('error',()=>{clearTimeout(timeout);reject(launcherError('Could not start the local launcher process.'));});
  worker.once('exit',code=>{clearTimeout(timeout);if(!settled)reject(launcherError('Launcher exited before readiness. Check local service configuration.'));});
  worker.once('message',message=>{settled=true;clearTimeout(timeout);if(worker.connected)worker.disconnect();worker.unref();if(message.ok)accept(message.status);else reject(launcherError(message.error));});
 });
 print(JSON.stringify(result,null,2));if(!noOpen)await openBrowser(result.url);return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))launchCommand().catch(error=>{console.error(error.launcher?error.message:'Launcher failed. Check local configuration; credentials and command output are intentionally not printed.');process.exitCode=1;});

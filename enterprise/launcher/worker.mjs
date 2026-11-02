import {loadLauncherConfig,createLifecycle,acquireState,writeOwnedState,removeOwnedState,createControlServer} from './core.mjs';
let record=null,lifecycle=null,control=null,exiting=false;
async function cleanup(){if(exiting)return;exiting=true;await lifecycle?.stop();await removeOwnedState(record?.token);control?.close();}
async function main(){
 record=await acquireState();const config=await loadLauncherConfig();lifecycle=createLifecycle(config);
 control=createControlServer(lifecycle,record.token,{onStopped:()=>{removeOwnedState(record.token).finally(()=>process.exit(0));}});
 await new Promise((accept,reject)=>{control.once('error',reject);control.listen(0,'127.0.0.1',accept);});
 record.control_port=control.address().port;await writeOwnedState(record);
 const status=await lifecycle.start();if(process.connected)process.send({ok:true,status});
}
process.once('SIGTERM',()=>cleanup().then(()=>process.exit(0)).catch(()=>process.exit(1)));
process.once('SIGINT',()=>cleanup().then(()=>process.exit(0)).catch(()=>process.exit(1)));
main().catch(async error=>{try{await cleanup();}catch{}if(process.connected)process.send({ok:false,error:error.launcher?error.message:'Workspace startup failed. Check the database/access configuration and ports. No data was reset.'});process.exitCode=1;});

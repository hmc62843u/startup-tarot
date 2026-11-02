import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {loadLauncherConfig,workspaceHealth} from './launcher/core.mjs';
import {Neo4jStore} from './neo4j.mjs';
import {launchCommand} from './launch.mjs';

export async function setupSnapshot({load=loadLauncherConfig,health=workspaceHealth,databaseReady=async c=>{try{await new Neo4jStore({url:c.neo4jURL,password:c.password,database:c.database}).query('RETURN 1 AS ready',{},AbortSignal.timeout(2000));return true;}catch{return false;}}}={}){
 const result={checked_at:new Date().toISOString(),node:Number(process.versions.node.split('.')[0])>=24,configuration:false,database:false,workspace:false,next:'Ask Codex to configure the selected local database and Workspace access using enterprise/LAUNCHER.md.'};
 let config;try{config=await load();result.configuration=true;}catch{return result;}
 result.database=await databaseReady(config);result.workspace=await health(config.origin);result.mode=config.mode;
 result.next=!result.node?'Install Node 24 or later before starting services.':!result.database?(config.mode==='external'?'Start the selected external Neo4j instance through Codex, then check again.':'Start services. If Docker or the prepared image is missing, ask Codex to complete prerequisites.'):!result.workspace?'Start Workspace; the ready database will be reused.':'Setup ready. Continue research maintenance in Codex.';
 return result;
}
export function createSetupPanel({snapshot=setupSnapshot,run=async action=>launchCommand([action,'--no-open'],{print:()=>{}})}={}){
 const capability=randomBytes(24).toString('hex'),base='/'+capability;let busy=false;
 const server=createServer(async(req,res)=>{
  const origin='http://127.0.0.1:'+server.address().port;
  const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  if(req.headers.host!==new URL(origin).host)return reply(403,{error:'Unexpected host.'});
  if(req.method==='GET'&&[base+'/',base+'/panel.js',base+'/panel.css'].includes(req.url)){
   const file=req.url.endsWith('panel.js')?'panel.js':req.url.endsWith('panel.css')?'panel.css':'index.html';
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');return res.end(await readFile(new URL('setup/'+file,import.meta.url)));
  }
  if(req.method!=='POST'||req.url!==base+'/action')return reply(404,{error:'Unknown setup route.'});
  if(req.headers.origin!==origin||req.headers['x-setup-action']!=='1'||req.headers['content-type']!=='application/json')return reply(403,{error:'Setup request rejected.'});
  if(busy)return reply(409,{error:'A setup action is already running.'});busy=true;
  try{
   const parts=[];let bytes=0;for await(const part of req){bytes+=part.length;if(bytes>1024)return reply(413,{error:'Setup request too large.'});parts.push(part);}
   let input;try{input=JSON.parse(Buffer.concat(parts));}catch{return reply(400,{error:'Invalid setup request.'});}
   if(!input||Object.keys(input).length!==1||!['check','start','stop'].includes(input.action))return reply(400,{error:'Unsupported setup action.'});
   if(input.action!=='check')await run(input.action);
   return reply(200,await snapshot());
  }catch{return reply(503,{error:'Setup action failed. Ask Codex to inspect launcher status and local configuration; no credential details are displayed.'});}
  finally{busy=false;}
 });
 server.requestTimeout=20000;server.headersTimeout=15000;
 return {server,listen(){return new Promise((accept,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>accept('http://127.0.0.1:'+server.address().port+base+'/'));});},close(){return new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});}};
}

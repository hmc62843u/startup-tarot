import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ResearchOAuth} from './research-oauth.mjs';
import {runOAuthResearch,runOAuthGraphPlan} from './research-model.mjs';
import {DOCUMENTS} from './build-docs.mjs';

const rootDefault=fileURLToPath(new URL('../',import.meta.url));
const publicFiles=new Set(['DISTRIBUTION.md','docs/distribution.html','release-manifest.json','index.html','css/style.css','js/app.bundle.js','js/sectors.js','packs/active-pack.js','packs/relationships.js','manifest.json','sw.js','README.md','data/fit-benchmark.json','data/relationships.json','data/relationships-demo.json',
  'icons/icon-192.png','icons/icon-512.png','icons/mark.svg','assets/how-it-works.svg','assets/startup-tarot-intro.mp4','assets/startup-tarot-intro.jpg','assets/startup-tarot-intro.vtt',
  'data/schema.json','data/guide-pack.schema.json','data/guide-pack-v1.schema.json','data/guide-pack-v2.schema.json','data/library.json','data/startup-library.json',
  'packs/README.md','packs/LICENSE.md','packs/SOURCES.md','packs/THIRD_PARTY_NOTICES.md','packs/DATA_NOTICE.md',...DOCUMENTS.flatMap(d=>[d.path,d.source])]);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.vtt':'text/vtt'};
export async function createResearchServer({root=rootDefault,oauth:providedOAuth,fetchImpl=fetch,runImpl=runOAuthResearch,planImpl=runOAuthGraphPlan}={}){
  root=await realpath(root);const oauth=providedOAuth||new ResearchOAuth({directory:resolve(root,'.local','research-oauth'),fetchImpl});if(!providedOAuth)await oauth.init();
  const manifest=JSON.parse(await readFile(resolve(root,'data/library.json'),'utf8')),snapshots=JSON.parse(await readFile(resolve(root,'data/startup-library.json'),'utf8'));
  const allowed=new Set(publicFiles);for(const [file,paths] of [['data/library.json',manifest.profiles],['data/startup-library.json',snapshots.snapshots]])for(const p of paths){const path=relative(root,resolve(root,'data',p)).replaceAll('\\','/');if(!/^(profiles|startups)\/[a-zA-Z0-9_-]+\.json$/.test(path))throw new Error('Invalid public fixture manifest path.');allowed.add(path);}
  const publicGraph=JSON.parse(await readFile(resolve(root,'data/relationships.json'),'utf8'));
  let running=null;
  const server=createServer(async(req,res)=>{
    const origin='http://127.0.0.1:'+server.address().port;
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
    try{
      if(req.headers.host!==new URL(origin).host)return json(403,{error:'Unexpected host.'});
      const url=new URL(req.url,origin),api=url.pathname.startsWith('/api/');
      if((api||url.pathname.startsWith('/auth/'))&&req.headers.origin&&req.headers.origin!==origin)return json(403,{error:'Cross-origin request rejected.'});
      if(req.method==='POST'){
        if(req.headers.origin!==origin)return json(403,{error:'Same-origin requests are required.'});
        if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(415,{error:'JSON required.'});
        const body=await new Promise((accept,reject)=>{let raw='',size=0,failed=false;req.on('data',chunk=>{size+=chunk.length;if(size>120000){if(!failed){failed=true;const e=new Error('Request too large.');e.status=413;reject(e);}}else raw+=chunk;});req.on('end',()=>{if(!failed)try{accept(JSON.parse(raw));}catch{reject(new Error('Invalid JSON.'));}});req.on('error',reject);});
        if(url.pathname==='/api/auth/start')return json(200,{authorization_url:oauth.begin(origin,body.client_id||null)});
        if(url.pathname==='/api/auth/disconnect'){running?.abort();await oauth.disconnect();return json(200,{connected:false});}
        if(['/api/research','/api/graph-plan'].includes(url.pathname)){
          if(running)return json(429,{error:'One research request is already running. Wait or cancel it.'});
          const controller=new AbortController();running=controller;
          const timeout=setTimeout(()=>controller.abort(),120000);res.on('close',()=>{if(!res.writableEnded)controller.abort();});
          try{const result=await (url.pathname==='/api/graph-plan'?planImpl:runImpl)({oauth,packet:body.packet,model:body.model,signal:controller.signal,fetchImpl,dataset:publicGraph});return json(200,result);}
          finally{clearTimeout(timeout);running=null;}
        }
        return json(404,{error:'Unknown action.'});
      }
      if(req.method!=='GET')return json(405,{error:'Method not allowed.'});
      if(url.pathname==='/api/account')return json(200,oauth.status());
      if(url.pathname==='/api/models')return json(200,{models:await oauth.models()});
      if(url.pathname==='/auth/callback'){
        await oauth.callback(url.searchParams);res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><title>Connected</title><p>ChatGPT connection completed. Return to the research tab and choose Refresh connection.</p><a href="/">Open Startup Tarot</a>');
      }
      if(api)return json(404,{error:'Unknown endpoint.'});
      const path=decodeURIComponent(url.pathname).slice(1)||'index.html';
      if(!allowed.has(path))return json(404,{error:'File is not part of the public app.'});
      const absolute=await realpath(resolve(root,path)),rel=relative(root,absolute);if(rel.startsWith('..')||resolve(root,rel)!==absolute)return json(403,{error:'Invalid public path.'});
      const content=await readFile(absolute);res.setHeader('Content-Type',types[extname(path)]||'text/plain; charset=utf-8');res.end(content);
    }catch(error){if(!res.destroyed)json(error.status||400,{error:error.name==='AbortError'?'Research cancelled or timed out.':error.message,code:typeof error.code==='string'?error.code:null,request_id:error.request_id||null});}
  });
  server.requestTimeout=20000;server.headersTimeout=15000;
  return {server,oauth,listen(port=8787){return new Promise((accept,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>accept('http://127.0.0.1:'+server.address().port));});},close(){running?.abort();return new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const app=await createResearchServer();console.log('Open '+await app.listen(Number(process.env.RESEARCH_PORT||8787))+' then choose Research a question. OAuth credentials stay in helper memory.');
}

import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {PublisherBuilds} from './publisher-build.mjs';
import {publisherAction} from './publisher.mjs';
import {Neo4jStore} from './neo4j.mjs';
import {ReferenceService} from './service.mjs';
import {requireReference} from './domain.mjs';

export function tokenHash(token){return createHash('sha256').update(token).digest('hex');}
export function validateAccessConfig(config){
  requireReference(Array.isArray(config?.credentials)&&config.credentials.length>0,'Provision at least one access credential.');
  const hashes=new Set();for(const row of config.credentials){requireReference(/^[a-f0-9]{64}$/.test(row.token_sha256)&&!hashes.has(row.token_sha256)&&/^[a-z][a-z0-9_-]{2,63}$/.test(row.org)&&/^[a-z][a-z0-9_-]{2,63}$/.test(row.subject)&&['admin','researcher'].includes(row.role),'Invalid or duplicate credential.');hashes.add(row.token_sha256);}return config;
}
export function createReferenceServer({store,config,modelAdapters=new Map(),publisherOptions={}}){
  validateAccessConfig(config);const service=new ReferenceService(store,{modelAdapters});
  const busy=new Set(),publisher=new PublisherBuilds(service,publisherOptions);
  const server=createServer(async(req,res)=>{
    const origin='http://127.0.0.1:'+server.address().port;
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
    try{
      requireReference(req.headers.host===new URL(origin).host,'Unexpected host.',403);
      const url=new URL(req.url,origin);
      if(req.method==='GET'&&url.pathname.startsWith('/preview/')){const asset=await publisher.asset(url.pathname);res.setHeader('Content-Security-Policy',"default-src 'none'; script-src "+origin+"; style-src "+origin+"; img-src "+origin+" data:; media-src "+origin+"; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; sandbox allow-scripts allow-downloads allow-forms");res.setHeader('Content-Type',asset.type);return res.end(asset.bytes);}
      requireReference(!req.headers.origin||req.headers.origin===origin,'Cross-origin request rejected.',403);
      if(req.method==='GET'&&['/publisher/','/publisher/index.html','/publisher/style.css','/publisher/template.js','/publisher/app.bundle.js','/publisher/README.md'].includes(url.pathname)){
        const file=url.pathname==='/publisher/'?'index.html':url.pathname.slice('/publisher/'.length);
        res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; frame-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
        res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/plain; charset=utf-8');return res.end(await readFile(new URL('../publisher/'+file,import.meta.url)));
      }
      if(req.method==='GET'&&url.pathname==='/health')return json(200,{service:'startup-tarot-enterprise-reference',production_ready:false});
      if(req.method==='GET'&&url.pathname==='/'){
        res.setHeader('Content-Type','text/plain; charset=utf-8');return res.end('Research Workspace API — maintain authorized research data through Codex. Follow enterprise/OPERATOR.md and node enterprise/operator.mjs help. Research Publisher is separate at /publisher/.');
      }
      requireReference(req.method==='POST'&&url.pathname.startsWith('/v1/'),'Unknown route.',404);
      requireReference(String(req.headers['content-type']||'').startsWith('application/json'),'JSON required.',415);
      const token=/^Bearer ([A-Za-z0-9_-]{32,200})$/.exec(req.headers.authorization||'')?.[1];requireReference(token,'Valid bearer credential required.',401);
      const hash=Buffer.from(tokenHash(token),'hex'),principal=config.credentials.find(c=>timingSafeEqual(hash,Buffer.from(c.token_sha256,'hex')));requireReference(principal,'Unknown credential.',401);
      const body=await new Promise((accept,reject)=>{let bytes=0,parts=[];req.on('data',chunk=>{bytes+=chunk.length;if(bytes>6*1024*1024){parts=[];reject(Object.assign(new Error('Request exceeds 6 MiB.'),{status:413}));}else parts.push(chunk);});req.on('end',()=>{try{accept(JSON.parse(Buffer.concat(parts)));}catch{reject(Object.assign(new Error('Invalid JSON.'),{status:400}));}});req.on('error',reject);});
      requireReference(body&&typeof body==='object'&&!Array.isArray(body),'JSON object required.');
      requireReference(!Object.keys(body).some(k=>['org','organization','tenant','owner','subject','role','cypher','statement'].includes(k)),'Organization, owner and role are derived from credentials; arbitrary queries are not accepted.',403);
      const key=principal.org+':'+principal.subject;requireReference(!busy.has(key),'A request is already running for this principal.',429);busy.add(key);
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);res.on('close',()=>{if(!res.writableEnded)controller.abort();});
      try{if(['preview','build','download','clear'].some(action=>url.pathname==='/v1/publisher/'+action)){const result=await publisher.handle(principal,url.pathname.slice(4),body);if(result.bytes instanceof Buffer){res.setHeader('Content-Type','application/zip');res.setHeader('Content-Disposition','attachment; filename="'+result.filename+'"');return res.end(result.bytes);}return json(200,result);}if(url.pathname.startsWith('/v1/publisher/'))return json(200,await publisherAction(principal,url.pathname.slice(4),body));return json(200,await service.handle(principal,url.pathname.slice(4),body,controller.signal));}finally{clearTimeout(timeout);busy.delete(key);}
    }catch(error){if(!res.destroyed)json(error.status||500,{error:error.status?error.message:'Reference service failed; check database availability and local configuration.'});}
  });
  server.requestTimeout=20000;server.headersTimeout=15000;
  return {server,service,publisher,listen(port=8790){return new Promise((accept,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>accept('http://127.0.0.1:'+server.address().port));});},close(){return new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const config=JSON.parse(await readFile(process.env.REFERENCE_ACCESS_FILE||'.local/enterprise/access.json','utf8'));
  const store=new Neo4jStore({url:process.env.NEO4J_URL,password:process.env.NEO4J_PASSWORD,database:process.env.NEO4J_DATABASE||'neo4j'});await store.init();
  const app=createReferenceServer({store,config});console.log('Enterprise reference: '+await app.listen(Number(process.env.REFERENCE_PORT||8790))+' (local only; not production ready)');
}

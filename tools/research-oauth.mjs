import {randomBytes,randomUUID,createHash,createPublicKey,verify} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';

const ISSUER='https://auth.openai.com',RESOURCE='https://api.openai.com/v1';
const scopes='openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const opaque=()=>randomBytes(32).toString('base64url');
export class ResearchOAuth {
  constructor({directory,fetchImpl=fetch,now=()=>Date.now()}){this.directory=directory;this.fetch=fetchImpl;this.now=now;this.active=null;this.pending=null;this.refreshing=null;this.epoch=0;}
  async init(){
    await mkdir(this.directory,{recursive:true});
    try{this.registry=JSON.parse(await readFile(join(this.directory,'oauth-registration.json'),'utf8'));}
    catch(e){if(e.code!=='ENOENT')throw new Error('OAuth registration metadata could not be read; preserved for recovery.');this.registry={host_id:'urn:uuid:'+randomUUID(),registrations:[]};await this.persist();}
    if(!/^urn:uuid:/.test(this.registry.host_id)||!Array.isArray(this.registry.registrations))throw new Error('Invalid OAuth registration metadata.');
  }
  async persist(){
    // No access, refresh or ID token is written to disk. Only opaque installation/client metadata.
    const path=join(this.directory,'oauth-registration.json'),temp=path+'.tmp';
    await writeFile(temp,JSON.stringify(this.registry,null,2),{mode:0o600});await rename(temp,path);
  }
  status(){return {connected:!!this.active,plan_enabled:!!this.active?.scopes.includes('chatgpt.tokens.use.direct'),
    account:this.active?{email:this.active.email,subject:this.active.subject,client_id:this.active.client_id}:null,
    registrations:this.registry.registrations.map(r=>({client_id:r.client_id,email:r.email||'Previous connection',verified:!!r.subject}))};}
  begin(origin,selected){
    if(this.active)throw new Error('Disconnect the active account before changing connections.');
    const registration=selected?this.registry.registrations.find(r=>r.client_id===selected):null;
    if(selected&&!registration)throw new Error('Unknown saved connection.');
    const verifier=opaque(),state=opaque(),nonce=opaque(),redirect_uri=origin+'/auth/callback';
    this.pending={verifier,state,nonce,redirect_uri,registration,expires:this.now()+10*60*1000,epoch:this.epoch};
    const params=new URLSearchParams({client_id:registration?.client_id||'dynamic_agent_client',ext_agent_host_id:this.registry.host_id,
      response_type:'code',redirect_uri,scope:scopes,resource:RESOURCE,state,nonce,code_challenge_method:'S256',code_challenge:createHash('sha256').update(verifier).digest('base64url')});
    if(!registration)params.set('agent_name_hint','Startup Tarot Research');
    if(registration?.email)params.set('login_hint',registration.email);
    return ISSUER+'/api/accounts/authorize?'+params;
  }
  async json(url,options={}){
    const response=await this.fetch(url,{...options,signal:options.signal||AbortSignal.timeout(30000),redirect:'error'});
    const body=await response.json();
    if(!response.ok){const error=new Error(body.error_description||body.error?.message||body.detail||(typeof body.error==='string'?body.error:'OpenAI request failed.'));error.status=response.status;error.code=body.error?.code||body.error;error.request_id=response.headers.get('x-request-id');throw error;}
    return body;
  }
  async discovery(){
    if(!this.metadata){const metadata=await this.json(ISSUER+'/.well-known/openid-configuration');
      const jwks=new URL(metadata.jwks_uri);if(metadata.issuer!==ISSUER||jwks.origin!==ISSUER)throw new Error('Unexpected OpenAI identity metadata.');this.metadata=metadata;}
    return this.metadata;
  }
  async identity(token,client_id,nonce){
    const parts=String(token).split('.');if(parts.length!==3)throw new Error('Invalid identity token.');
    const header=JSON.parse(Buffer.from(parts[0],'base64url')),claims=JSON.parse(Buffer.from(parts[1],'base64url'));
    if(!['RS256','ES256'].includes(header.alg)||header.jku||header.x5u)throw new Error('Unsupported identity signing configuration.');
    const metadata=await this.discovery(),jwks=await this.json(metadata.jwks_uri);
    const key=jwks.keys.find(k=>k.kid===header.kid&&(!k.alg||k.alg===header.alg)&&(!k.use||k.use==='sig'));
    if(!key)throw new Error('OpenAI identity signing key not found.');
    const publicKey=createPublicKey({key,format:'jwk'}),signature=Buffer.from(parts[2],'base64url');
    const valid=verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),header.alg==='ES256'?{key:publicKey,dsaEncoding:'ieee-p1363'}:publicKey,signature);
    if(!valid||claims.iss!==ISSUER||!(Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes(client_id)
      ||claims.azp&&claims.azp!==client_id||Array.isArray(claims.aud)&&claims.aud.length>1&&!claims.azp
      ||!Number.isFinite(claims.exp)||claims.exp*1000<=this.now()||claims.nbf&&claims.nbf*1000>this.now()+30000
      ||nonce&&claims.nonce!==nonce||typeof claims.sub!=='string'||!claims.sub)throw new Error('Identity signature, audience, expiry or nonce check failed.');
    return claims;
  }
  async callback(params){
    const p=this.pending;
    if(!p||p.expires<this.now()||params.get('state')!==p.state)throw new Error('Sign-in expired or state did not match. Start sign-in again.');
    this.pending=null;
    if(params.has('error'))throw new Error('ChatGPT sign-in was declined or interrupted: '+params.get('error'));
    const client_id=params.get('client_id')||p.registration?.client_id;
    if(!client_id||client_id==='dynamic_agent_client'||client_id.length>200||p.registration&&client_id!==p.registration.client_id||!params.get('code'))throw new Error('Incomplete or mismatched OAuth registration.');
    // Retain issued registration before token exchange so a later retry can reuse it.
    if(!this.registry.registrations.some(r=>r.client_id===client_id)){this.registry.registrations.push({client_id});await this.persist();}
    const tokens=await this.json(ISSUER+'/api/accounts/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id,code:params.get('code'),code_verifier:p.verifier,redirect_uri:p.redirect_uri,resource:RESOURCE})});
    const identity=await this.identity(tokens.id_token,client_id,p.nonce);
    if(p.registration?.subject&&identity.sub!==p.registration.subject)throw new Error('This connection belongs to a different account. Add a new connection instead.');
    if(p.epoch!==this.epoch)throw new Error('Sign-in was cancelled.');
    if(!tokens.access_token||!Number.isFinite(tokens.expires_in)||tokens.token_type?.toLowerCase()!=='bearer')throw new Error('Incomplete OAuth token response.');
    const entry=this.registry.registrations.find(r=>r.client_id===client_id);Object.assign(entry,{subject:identity.sub,email:identity.email||'Connected account'});await this.persist();
    this.active={...entry,access_token:tokens.access_token,refresh_token:tokens.refresh_token||null,expires:this.now()+tokens.expires_in*1000,scopes:String(tokens.scope||'').split(' ')};
    return this.status();
  }
  async access(){
    if(!this.active?.scopes.includes('chatgpt.tokens.use.direct'))throw new Error('Sign in and enable ChatGPT plan usage before requesting research.');
    if(this.active.expires>this.now()+5000)return this.active.access_token;
    if(this.refreshing)return this.refreshing;
    const account=this.active,epoch=this.epoch;
    if(!account.refresh_token)throw new Error('Sign-in expired. Disconnect and sign in again.');
    this.refreshing=(async()=>{
      try{
        const tokens=await this.json(ISSUER+'/api/accounts/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:account.client_id,refresh_token:account.refresh_token,resource:RESOURCE})});
        if(tokens.id_token){const identity=await this.identity(tokens.id_token,account.client_id,null);if(identity.sub!==account.subject)throw new Error('Account changed during token renewal.');}
        if(epoch!==this.epoch)throw new Error('Connection changed during renewal.');
        if(!tokens.access_token||!tokens.refresh_token||!Number.isFinite(tokens.expires_in))throw new Error('Incomplete renewal response.');
        this.active={...account,access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires:this.now()+tokens.expires_in*1000,scopes:tokens.scope?tokens.scope.split(' '):account.scopes};
        if(!this.active.scopes.includes('chatgpt.tokens.use.direct'))throw new Error('ChatGPT plan usage permission is no longer granted.');
        return this.active.access_token;
      }catch(error){if(['invalid_grant','invalid_refresh_token','token_expired','refresh_token_expired','refresh_token_invalid','refresh_token_invalidated','refresh_token_reused'].includes(error.code))this.active=null;throw error;}
      finally{this.refreshing=null;}
    })();return this.refreshing;
  }
  async models(){const token=await this.access();const body=await this.json(RESOURCE+'/models',{headers:{Authorization:'Bearer '+token}});
    return (body.models||[]).filter(m=>m.visibility==='list'&&typeof m.slug==='string').map(m=>({slug:m.slug,display_name:m.display_name||m.slug}));}
  async disconnect(){
    const account=this.active;this.epoch++;this.active=null;this.pending=null;
    if(account?.refresh_token){const metadata=await this.discovery();if(new URL(metadata.revocation_endpoint).origin!==ISSUER)throw new Error('Unexpected revocation endpoint.');
      const response=await this.fetch(metadata.revocation_endpoint,{method:'POST',signal:AbortSignal.timeout(30000),redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:account.refresh_token,token_type_hint:'refresh_token',client_id:account.client_id})});
      if(!response.ok)throw new Error('Disconnected locally, but remote revocation could not be confirmed. Review app access in ChatGPT settings.');}
  }
}

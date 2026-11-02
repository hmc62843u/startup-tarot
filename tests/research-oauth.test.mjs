import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';
import {ResearchOAuth} from '../tools/research-oauth.mjs';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...publicKey.export({format:'jwk'}),kid:'test-key',alg:'RS256',use:'sig'};
const now=Date.parse('2026-10-30T12:00:00Z');
function signed(claims){const first=Buffer.from(JSON.stringify({alg:'RS256',kid:'test-key'})).toString('base64url'),second=Buffer.from(JSON.stringify(claims)).toString('base64url');return first+'.'+second+'.'+sign('sha256',Buffer.from(first+'.'+second),privateKey).toString('base64url');}
async function fixture(t,granted=true){
 const directory=await mkdtemp(join(tmpdir(),'startup-oauth-test-'));t.after(async()=>{assert.ok(directory.startsWith(resolve(tmpdir())+sep));await rm(directory,{recursive:true,force:true});});
 let oauth,refreshes=0;
 const fetchImpl=async(url,options={})=>{
   if(url.endsWith('openid-configuration'))return Response.json({issuer:'https://auth.openai.com',jwks_uri:'https://auth.openai.com/test-jwks',revocation_endpoint:'https://auth.openai.com/test-revoke'});
   if(url.endsWith('test-jwks'))return Response.json({keys:[jwk]});
   if(url.endsWith('test-revoke'))return new Response('',{status:200});
   if(url.endsWith('/oauth/token')){
     const form=new URLSearchParams(options.body);
     if(form.get('grant_type')==='refresh_token'){refreshes++;return Response.json({access_token:'rotated-access',refresh_token:'rotated-refresh',expires_in:3600,scope:'chatgpt.tokens.use.direct'});}
     return Response.json({access_token:'private-access',refresh_token:'private-refresh',id_token:signed({iss:'https://auth.openai.com',aud:form.get('client_id'),sub:'test-subject',email:'founder@example.org',exp:now/1000+3600,nonce:oauth.lastNonce}),token_type:'Bearer',expires_in:3600,scope:granted?'openid chatgpt.tokens.use.direct':'openid'});
   }
   if(url.endsWith('/models'))return Response.json({models:[{slug:'visible-model',display_name:'Available model',visibility:'list'},{slug:'hidden',visibility:'hide'}]});
   throw new Error('Unexpected test URL: '+url);
 };
 oauth=new ResearchOAuth({directory,fetchImpl,now:()=>now});await oauth.init();
 const begin=()=>{const url=new URL(oauth.begin('http://127.0.0.1:8787',null));oauth.lastNonce=url.searchParams.get('nonce');return url;};
 const connect=async()=>{const url=begin();return oauth.callback(new URLSearchParams({state:url.searchParams.get('state'),code:'test-code',client_id:'oaiapp_test'}));};
 return {oauth,begin,connect,directory,get refreshes(){return refreshes;}};
}
test('OAuth uses fresh PKCE/state, verifies signed identity and keeps tokens off disk and browser status',async t=>{
 const f=await fixture(t),first=f.begin(),second=f.begin();
 assert.notEqual(first.searchParams.get('state'),second.searchParams.get('state'));assert.equal(second.searchParams.get('code_challenge_method'),'S256');
 await assert.rejects(()=>f.oauth.callback(new URLSearchParams({state:'forged',code:'x',client_id:'oaiapp_test'})),/state/);
 await f.connect();const status=f.oauth.status();assert.equal(status.connected,true);assert.equal(status.plan_enabled,true);
 assert.ok(!JSON.stringify(status).includes('private-access'));
 const stored=await readFile(join(f.directory,'oauth-registration.json'),'utf8');assert.ok(!stored.includes('private-refresh'));assert.ok(!stored.includes('id_token'));assert.ok(stored.includes('oaiapp_test'));
 assert.deepEqual(await f.oauth.models(),[{slug:'visible-model',display_name:'Available model'}]);
});
test('identity tokens reject invalid signatures, nonce, issuer, audience and expiry',async t=>{
 const {oauth}=await fixture(t);const claims={iss:'https://auth.openai.com',aud:'client',sub:'subject',exp:now/1000+100,nonce:'nonce'};
 await oauth.identity(signed(claims),'client','nonce');
 for(const changed of [{iss:'https://evil.example'},{aud:'other'},{exp:now/1000-1},{nonce:'wrong'}])await assert.rejects(()=>oauth.identity(signed({...claims,...changed}),'client','nonce'),/check failed/);
 const token=signed(claims),parts=token.split('.');parts[1]=Buffer.from(JSON.stringify({...claims,sub:'tampered'})).toString('base64url');await assert.rejects(()=>oauth.identity(parts.join('.'),'client','nonce'),/check failed/);
});
test('declined plan permission cannot run inference; refresh rotates in memory only',async t=>{
 const denied=await fixture(t,false);await denied.connect();assert.equal(denied.oauth.status().plan_enabled,false);await assert.rejects(()=>denied.oauth.access(),/enable ChatGPT plan/);
 const f=await fixture(t);await f.connect();f.oauth.active.expires=now;
 const [a,b]=await Promise.all([f.oauth.access(),f.oauth.access()]);assert.equal(a,'rotated-access');assert.equal(b,a);assert.equal(f.refreshes,1);
 await f.oauth.disconnect();assert.equal(f.oauth.status().connected,false);
 const returning=new URL(f.oauth.begin('http://127.0.0.1:1234','oaiapp_test'));assert.equal(returning.searchParams.get('client_id'),'oaiapp_test');assert.equal(returning.searchParams.get('agent_name_hint'),null);
});

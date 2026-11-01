import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,readdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,sep,basename} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {validateExportEnvelope,validateReleaseReview,writeDistribution,verifyDistribution,buildDistribution} from '../tools/incubator-distribution.mjs';
import {fetchOrganizationExport} from '../tools/distribute-incubator.mjs';
import {findRelationshipPaths,analyzeInvestorNetwork} from '../js/relationships.js';
const root=new URL('../',import.meta.url),load=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const bundle=await load('enterprise/fixtures/alpha.json'),review=await load('enterprise/fixtures/distribution-review.json');
const envelope={schema_version:1,organization:'example_alpha',revision:'explicit-source-revision',bundle};
async function temporary(t){const dir=await mkdtemp(resolve(tmpdir(),'startup-distribution-test-'));t.after(async()=>{assert.ok(dir.startsWith(resolve(tmpdir())+sep)&&basename(dir).startsWith('startup-distribution-test-'));await rm(dir,{recursive:true,force:true});});return dir;}

test('operator distribution requires source binding, affirmative review and no reserved private fields',()=>{
 validateExportEnvelope(envelope);validateReleaseReview(review);
 for(const flag of ['approved','private_data_reviewed','rights_reviewed'])assert.throws(()=>validateReleaseReview({...review,[flag]:false}),/required/);
 const mismatched=structuredClone(envelope);mismatched.bundle.relationships.pack_id='different';assert.throws(()=>validateExportEnvelope(mismatched),/mismatch/);
 const privateData=structuredClone(envelope);privateData.bundle.pack.components.research.profiles[0].credentials={password:'never-distribute'};assert.throws(()=>validateExportEnvelope(privateData),/reserved private/);
 assert.throws(()=>validateExportEnvelope({...envelope,private_connections:[]}),/envelope/);
 assert.throws(()=>validateReleaseReview({...review,token:'secret'}),/fields only/);
});

test('modular distribution detects tampering, wrong paths, extra files and mismatched source notes',async t=>{
 const dir=resolve(await temporary(t),'data-bundle');const manifest=await writeDistribution(dir,envelope,review);
 assert.equal(manifest.source.revision,envelope.revision);assert.equal((await verifyDistribution(dir)).envelope.bundle.pack.id,bundle.pack.id);
 const original=await readFile(resolve(dir,'relationships.json'));await writeFile(resolve(dir,'relationships.json'),original+' ');await assert.rejects(()=>verifyDistribution(dir),/integrity/);await writeFile(resolve(dir,'relationships.json'),original);
 const forged=structuredClone(manifest);forged.components[0].path='../credentials.json';await writeFile(resolve(dir,'manifest.json'),JSON.stringify(forged));await assert.rejects(()=>verifyDistribution(dir),/path\/role/);await writeFile(resolve(dir,'manifest.json'),JSON.stringify(manifest));
 const wrongIdentity=structuredClone(manifest);wrongIdentity.components[0].identity.id='different';await writeFile(resolve(dir,'manifest.json'),JSON.stringify(wrongIdentity));await assert.rejects(()=>verifyDistribution(dir),/identity\/version/);await writeFile(resolve(dir,'manifest.json'),JSON.stringify(manifest));
 await writeFile(resolve(dir,'unexpected-private.json'),'{}');await assert.rejects(()=>verifyDistribution(dir),/unexpected/);
});

test('authenticated export pins a revision, refuses remote HTTP and never returns server error secrets',async()=>{
 const connection={origin:'http://127.0.0.1:8790',token:'x'.repeat(43)};let request;
 const got=await fetchOrganizationExport(connection,envelope.revision,{fetchImpl:async(url,options)=>{request={url,...options};return Response.json(envelope);}});
 assert.equal(got.revision,envelope.revision);assert.equal(request.redirect,'error');assert.deepEqual(JSON.parse(request.body),{revision:envelope.revision});assert.ok(!request.body.includes(connection.token));
 await assert.rejects(()=>fetchOrganizationExport({...connection,origin:'http://external.example'},envelope.revision),/HTTPS/);
 await assert.rejects(()=>fetchOrganizationExport(connection,'wrong-revision',{fetchImpl:async()=>Response.json(envelope)}),/differs/);
 await assert.rejects(()=>fetchOrganizationExport(connection,envelope.revision,{fetchImpl:async()=>Response.json({error:connection.token},{status:403})}),error=>!error.message.includes(connection.token)&&error.message.includes('403'));
});

test('isolated browser build preserves operator data and runs graph queries without any backend',async t=>{
 const dir=await temporary(t),artifact=resolve(dir,'data-bundle');await writeDistribution(artifact,envelope,review);
 const original=await readFile(new URL('packs/guide-pack.json',root));
 const built=await buildDistribution(artifact,{parent:dir});assert.deepEqual(await readFile(new URL('packs/guide-pack.json',root)),original);
 const pack=JSON.parse(await readFile(resolve(built.browser,'packs/guide-pack.json'),'utf8')),graph=JSON.parse(await readFile(resolve(built.browser,'data/relationships.json'),'utf8'));
 assert.deepEqual(pack,bundle.pack);assert.deepEqual(graph,bundle.relationships);
 const context={};vm.runInNewContext(await readFile(resolve(built.browser,'packs/active-pack.js'),'utf8'),context);vm.runInNewContext(await readFile(resolve(built.browser,'packs/relationships.js'),'utf8'),context);
 assert.equal(context.STARTUP_GUIDE_PACK.id,pack.id);assert.equal(context.STARTUP_GUIDE_RELATIONSHIPS.research,null);assert.equal(context.STARTUP_GUIDE_RELATIONSHIPS.fictional.id,graph.id);
 const query={as_of:'2026-10-31',from:'demo:a',to:'demo:experiment',max_hops:4};assert.equal(findRelationshipPaths(graph,query).paths.length,1);assert.equal(analyzeInvestorNetwork(graph,{as_of:'2026-10-31',projection:'same_round'}).metrics.find(n=>n.id==='demo:a').betweenness,1);
 const html=await readFile(resolve(built.browser,'index.html'),'utf8');assert.ok(html.includes('Example Alpha Incubator'));assert.ok(html.includes('docs/distribution.html'));
 const manifest=JSON.parse(await readFile(resolve(built.output,'browser-files.json'),'utf8'));
 assert.ok(manifest.files.every(item=>!item.path.startsWith('.github/')&&!item.path.startsWith('tests/')));
 for(const item of manifest.files){assert.ok(!item.path.includes('.local')&&!item.path.includes('credentials'));assert.equal(createHash('sha256').update(await readFile(resolve(built.browser,item.path))).digest('hex'),item.sha256);}
 const worker=await readFile(resolve(built.browser,'sw.js'),'utf8');for(const match of worker.matchAll(/'\.\/([^']+)'/g)){const path=match[1].split('?')[0];if(path)await stat(resolve(built.browser,path));}
 assert.ok((await readdir(built.data_bundle)).includes('manifest.json'));assert.equal((await verifyDistribution(built.data_bundle)).manifest.release.version,'1.0.0');
});

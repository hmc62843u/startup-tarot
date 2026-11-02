import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {buildPublisher} from '../tools/build-publisher.mjs';
import {operatorCommand} from '../enterprise/operator.mjs';
import {prepareOperatorProposal,packageOperatorProposal,checkOperatorInput,inspectOperatorResearch,importOperatorResearch,exportOperatorResearch} from '../enterprise/operator-service.mjs';
const sourceRoot=new URL('../',import.meta.url),built=await buildPublisher({local:false}),root=await mkdtemp(resolve(tmpdir(),'tarot-operator-'));
await mkdir(resolve(root,'publisher'));await copyFile(resolve(built.output,'template.js'),resolve(root,'publisher/template.js'));
const fixture=JSON.parse(await readFile(new URL('enterprise/fixtures/alpha.json',sourceRoot),'utf8')),review=JSON.parse(await readFile(new URL('enterprise/fixtures/distribution-review.json',sourceRoot),'utf8'));
async function approve(proposal){const path=resolve(proposal.proposal,'review.json'),value=JSON.parse(await readFile(path,'utf8'));value.preview_reviewed=true;value.release_review=review;await writeFile(path,JSON.stringify(value));}

test('operator prepares a concrete unapproved proposal and uses the same release engine as Publisher',async()=>{
 const proposal=await prepareOperatorProposal(fixture,{root}),draft=JSON.parse(await readFile(proposal.review,'utf8'));
 assert.equal(proposal.approval_required,true);assert.equal(draft.preview_reviewed,false);assert.equal(draft.release_review.approved,false);assert.equal(draft.release_review.rights_reviewed,false);
 assert.ok((await readFile(proposal.preview,'utf8')).includes('sandbox="allow-scripts allow-downloads allow-forms"'));assert.ok((await readFile(proposal.preview,'utf8')).includes('form-action'));assert.ok((await readFile(proposal.summary,'utf8')).includes(proposal.source_sha256));
 await assert.rejects(()=>packageOperatorProposal(proposal.proposal,{root}),/Human preview review/);
 await approve(proposal);const result=await packageOperatorProposal(proposal.proposal,{root});assert.equal(result.published,false);assert.ok(result.archive.endsWith('.zip'));
 const manifest=JSON.parse(await readFile(result.manifest,'utf8'));assert.equal(manifest.kind,'startup_tarot_browser_distribution');assert.equal(manifest.source.method,'browser-local-files');assert.equal(manifest.scenario_inputs_selected,false);
});
test('operator rejects changed source, preview, summary and template rather than silently reusing review',async()=>{
 for(const name of ['source.json','preview.html','summary.md']){
  const p=await prepareOperatorProposal(fixture,{root});await approve(p);
  const path=resolve(p.proposal,name);if(name==='source.json'){const value=JSON.parse(await readFile(path,'utf8'));value.revision='different';await writeFile(path,JSON.stringify(value));}else await writeFile(path,(await readFile(path,'utf8'))+' changed');
  await assert.rejects(()=>packageOperatorProposal(p.proposal,{root}),/changed/);
 }
 const p=await prepareOperatorProposal(fixture,{root});await approve(p);const path=resolve(root,'publisher/template.js'),original=await readFile(path);await writeFile(path,Buffer.concat([original,Buffer.from('\n')]));
 try{await assert.rejects(()=>packageOperatorProposal(p.proposal,{root}),/changed/);}finally{await writeFile(path,original);}
 const engineProposal=await prepareOperatorProposal(fixture,{root});await approve(engineProposal);const receiptPath=resolve(engineProposal.proposal,'receipt.json'),receipt=JSON.parse(await readFile(receiptPath,'utf8'));receipt.engine_sha256='0'.repeat(64);await writeFile(receiptPath,JSON.stringify(receipt));await assert.rejects(()=>packageOperatorProposal(engineProposal.proposal,{root}),/changed/);
});
test('operator maintenance keeps authentication and expected revision explicit and redacts server errors',async()=>{
 const path=resolve(root,'input.json'),connection=resolve(root,'connection.json'),token='s'.repeat(40);await writeFile(path,JSON.stringify(fixture));await writeFile(connection,JSON.stringify({origin:'http://127.0.0.1:8790',token}));let request,printed='';
 const fetchImpl=async(url,options)=>{request={url,options};const body=JSON.parse(options.body);if(url.endsWith('/import'))return Response.json({revision:'rev2'});if(url.endsWith('/dataset'))return Response.json({revision:'rev1',bundle:fixture});return Response.json({schema_version:1,organization:'test_org',revision:body.revision,bundle:fixture});};
 const options={root,fetchImpl,print:v=>printed+=v};
 const inspected=await operatorCommand(['inspect','--connection',connection],options);assert.equal(inspected.revision,'rev1');
 await assert.rejects(()=>operatorCommand(['import','--connection',connection,'--input',path],options),/Missing --expected/);
 await operatorCommand(['import','--connection',connection,'--input',path,'--expected','rev1'],options);assert.equal(JSON.parse(request.options.body).expected_revision,'rev1');assert.ok(!request.options.body.includes(token));
 const exported=await operatorCommand(['export','--connection',connection,'--revision','rev2'],options);assert.equal(JSON.parse(await readFile(exported.source,'utf8')).revision,'rev2');assert.ok(!printed.includes(token));
 await assert.rejects(()=>operatorCommand(['inspect','--connection',connection],{...options,fetchImpl:async()=>Response.json({error:token},{status:403})}),error=>!error.message.includes(token)&&error.message.includes('403'));
});

test('CLI and shared operations return the same validated results and revision checks',async()=>{
 const path=resolve(root,'service-input.json'),connectionPath=resolve(root,'service-connection.json'),connection={origin:'http://127.0.0.1:8790',token:'d'.repeat(40)};
 await writeFile(path,JSON.stringify(fixture));await writeFile(connectionPath,JSON.stringify(connection));
 let called=0;const fetchImpl=async(url,options)=>{called++;const body=JSON.parse(options.body);if(url.endsWith('/dataset'))return Response.json({revision:'service-rev',bundle:fixture});if(url.endsWith('/import')){assert.equal(body.expected_revision,'service-rev');return Response.json({revision:'next-rev'});}return Response.json({schema_version:1,organization:'test_org',revision:body.revision,bundle:fixture});};
 const options={root,fetchImpl,print:()=>{}};
 assert.deepEqual(await operatorCommand(['check','--input',path],options),checkOperatorInput(fixture));
 assert.deepEqual(await operatorCommand(['inspect','--connection',connectionPath],options),await inspectOperatorResearch(connection,{fetchImpl}));
 assert.deepEqual(await operatorCommand(['import','--connection',connectionPath,'--input',path,'--expected','service-rev'],options),await importOperatorResearch(connection,fixture,'service-rev',{fetchImpl}));
 const before=called;await assert.rejects(()=>importOperatorResearch(connection,fixture,null,{fetchImpl}),/explicit expected revision/);assert.equal(called,before);
 const exported=await exportOperatorResearch(connection,'next-rev',{root,fetchImpl});assert.equal(JSON.parse(await readFile(exported.source,'utf8')).revision,'next-rev');
});

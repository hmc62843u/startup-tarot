import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {shortlistInvestors} from '../js/investor-fit.js';
import {Neo4jStore} from '../enterprise/neo4j.mjs';
import {randomBytes} from 'node:crypto';
import {createReferenceServer,tokenHash} from '../enterprise/server.mjs';
import {operatorCommand} from '../enterprise/operator.mjs';
import {packageOperatorProposal} from '../enterprise/operator-service.mjs';

// Real authenticated HTTP/service/CLI flow; storage is deliberately simulated.
export async function rehearseOpenFor({liveStore=null,organization='synthetic_openfor_pilot'}={}){
 if(liveStore&&!/^openfor_demo_[a-z0-9_]{3,35}$/.test(organization))throw new Error('Live rehearsal requires a dedicated openfor_demo_* organization; pilot organizations are never seeded.');
 const parent=resolve('.local/operator-rehearsal');await mkdir(parent,{recursive:true});const output=await mkdtemp(resolve(parent,'run-'));
 const results=[];const pass=(step,detail)=>results.push({step,status:'PASS',detail});
 const rows=new Map();let sequence=0;
 const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
 const memoryStore={async put(org,value,{owner=null,expected_revision=null}={}){
  const key=JSON.stringify([org,owner]),history=rows.get(key)||[];
  if((history.at(-1)?.revision??null)!==expected_revision)fail('Revision conflict.',409);
  const saved={revision:'rehearsal_'+(++sequence),value:structuredClone(value)};history.push(saved);rows.set(key,history);return {revision:saved.revision};
 },async get(org,{owner=null,revision=null}={}){
  const history=rows.get(JSON.stringify([org,owner]))||[],saved=revision?history.find(r=>r.revision===revision):history.at(-1);
  if(!saved)fail('Dataset/revision not found.',404);return structuredClone(saved);
 }};
 const store=liveStore||memoryStore;
 const token=randomBytes(32).toString('hex'),otherToken=randomBytes(32).toString('hex'),researchToken=randomBytes(32).toString('hex');
 const credentials=[[token,organization,'admin'],[otherToken,organization+'_other','admin'],[researchToken,organization,'researcher']].map(([token,org,role])=>({token_sha256:tokenHash(token),org,role,subject:'test_operator'}));
 const app=createReferenceServer({store,config:{credentials}}),origin=await app.listen(0);
 const connection=resolve(output,'connection.json');await writeFile(connection,JSON.stringify({origin,token}),{mode:0o600});
 const invoke=(args)=>operatorCommand(args,{print:()=>{}});
 try{
  assert.equal((await fetch(origin+'/app.js')).status,404);assert.equal((await fetch(origin+'/style.css')).status,404);assert.ok((await (await fetch(origin+'/')).text()).includes('through Codex'));
  const bundle=JSON.parse(await readFile('enterprise/fixtures/alpha.json','utf8'));
  const raw=JSON.parse(await readFile('enterprise/fixtures/openfor-demo-raw.json','utf8'));
  bundle.pack.name=raw.label;
  const mapping={label:raw.label,decisions:[],omitted_private_notes:raw.operator_private_notes.length};
  const seen=new Map();
  for(const row of raw.investors){
   if(seen.has(row.id)){assert.equal(JSON.stringify({...seen.get(row.id),row:null}),JSON.stringify({...row,row:null}));mapping.decisions.push({row:row.row,action:'deduplicate',id:row.id});continue;}
   seen.set(row.id,row);const profile=bundle.pack.components.research.profiles.find(p=>p.id===row.id);assert.ok(profile);
   profile.name=row.name;profile.notes='FICTIONAL demo input: '+row.notes;
   const node=bundle.relationships.nodes.find(n=>n.profile_id===row.id);if(node)node.name=row.name;
   mapping.decisions.push({row:row.row,action:'map name and labelled notes',id:row.id,source_date:row.source_date,warning:row.source_date?null:'Missing raw date remains unknown; existing fixture evidence dates are not raw-source verification.'});
  }
  for(const row of raw.startup_observations){const snapshot=bundle.pack.components.research.snapshots.find(p=>p.id===row.id);assert.ok(snapshot);snapshot.company=row.company;mapping.decisions.push({row:row.row,action:'map fictional identity only',omitted:['unverified monthly revenue','pilot customer count','missing raw source date'],note:'Original fictional snapshot/metrics remain teaching fixture values, not these raw observations.'});}
  mapping.decisions.push({conflicts:raw.conflicts,action:'omit conflicting raw assertions; do not overwrite fixture teaching claims'});
  mapping.decisions.push({relationships:raw.relationship_observations,action:'omit unconfirmed introduction; retain only separate invented fixture topology'});
  await writeFile(resolve(output,'mapping.json'),JSON.stringify(mapping,null,2)+'\n');
  await writeFile(resolve(output,'raw-input.json'),JSON.stringify(raw,null,2)+'\n');
  pass('0. Normalize raw mock files',{rows:raw.investors.length,unique_investors:seen.size,duplicates:raw.investors.length-seen.size,private_notes_omitted:raw.operator_private_notes.length,unresolved_conflicts:raw.conflicts.length,unconfirmed_links_omitted:raw.relationship_observations.length});
  const input=resolve(output,'synthetic-input.json');await writeFile(input,JSON.stringify(bundle,null,2));
  const check=await invoke(['check','--input',input]);assert.equal(check.kind,'fictional');pass('1. Validate synthetic source',{profiles:check.profiles,snapshots:check.snapshots,edges:check.edges,warnings:check.warnings});
  let baseline=null;try{baseline=(await store.get(organization)).revision;}catch(error){if(error.status!==404)throw error;}
  const first=await invoke(['import','--connection',connection,'--input',input,'--expected',baseline||'new']);pass('2. First import',first);
  const inspected=await invoke(['inspect','--connection',connection]);assert.equal(inspected.revision,first.revision);pass('3. Inspect selected organization',inspected.revision);
  const changed=structuredClone(bundle);changed.pack.components.research.profiles.find(p=>p.id===raw.correction.record_id).notes+=' '+raw.correction.append_note;
  const update=resolve(output,'corrected-input.json');await writeFile(update,JSON.stringify(changed,null,2));
  const second=await invoke(['import','--connection',connection,'--input',update,'--expected',first.revision]);assert.notEqual(first.revision,second.revision);
  await assert.rejects(()=>invoke(['import','--connection',connection,'--input',input,'--expected',first.revision]),/409/);
  assert.deepEqual((await store.get(organization,{revision:first.revision})).value,bundle);pass('4. Correct with revision protection',{previous:first.revision,current:second.revision,stale_write:'rejected; original revision unchanged'});
  const request=(auth,action,body)=>fetch(origin+'/v1/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth},body:JSON.stringify(body)});
  assert.equal((await request(otherToken,'distribution/export',{revision:second.revision})).status,404);
  assert.equal((await request(researchToken,'import',{bundle,expected_revision:second.revision})).status,403);
  assert.equal((await request(researchToken,'distribution/export',{revision:second.revision})).status,403);
  assert.equal((await request(token,'dataset',{org:organization+'_other'})).status,403);pass('5. Authorization boundaries','Other organization cannot export this revision; researcher cannot import/export; body cannot override organization.');
  // Sentinel exists only in a separate owner scope, never in the shared bundle.
  await store.put(organization,{nodes:[],edges:[],note:'SYNTHETIC_OWNER_ONLY_SENTINEL'},{owner:'test_operator',expected_revision:await store.get(organization,{owner:'test_operator'}).then(v=>v.revision).catch(e=>{if(e.status!==404)throw e;return null;})});
  const exported=await invoke(['export','--connection',connection,'--revision',second.revision]),exportText=await readFile(exported.source,'utf8'),envelope=JSON.parse(exportText);
  assert.equal(envelope.organization,organization);assert.equal(envelope.revision,second.revision);assert.deepEqual(envelope.bundle,changed);
  assert.ok(!exportText.includes(token)&&!exportText.includes('SYNTHETIC_OWNER_ONLY_SENTINEL')&&!exportText.includes('SYNTHETIC_PRIVATE_NOTE_DO_NOT_DISTRIBUTE'));pass('6. Export selected revision',{revision:envelope.revision,exact_data:true,credentials_and_owner_sentinel:'absent'});
  const bad=structuredClone(changed);bad.pack.credentials={password:'synthetic forbidden value'};const badPath=resolve(output,'rejected-input.json');await writeFile(badPath,JSON.stringify(bad));
  await assert.rejects(()=>invoke(['import','--connection',connection,'--input',badPath,'--expected',second.revision]),/credential|reserved|unsupported fields/);pass('7. Reject credential-bearing input','Rejected before import.');
  const historical=await invoke(['export','--connection',connection,'--revision',first.revision]);
  const restored=await invoke(['import','--connection',connection,'--input',historical.source,'--expected',second.revision]);
  assert.deepEqual((await store.get(organization)).value,bundle);
  assert.deepEqual((await store.get(organization,{revision:second.revision})).value,changed);
  const current=await invoke(['import','--connection',connection,'--input',exported.source,'--expected',restored.revision]);
  pass('8. Recover a prior revision safely',{restored_as_new:restored.revision,corrected_revision_preserved:true,current:current.revision});
  const proposal=await invoke(['prepare','--input',exported.source]);const review=JSON.parse(await readFile(proposal.review,'utf8'));assert.equal(review.preview_reviewed,false);assert.equal(review.release_review.approved,false);
  await assert.rejects(()=>packageOperatorProposal(proposal.proposal),/Human preview review/);pass('9. Prepare and enforce approval gate',{proposal:proposal.proposal,source_sha256:proposal.source_sha256,package:'blocked pending genuine review/approval'});
  const researchInput=resolve('enterprise/fixtures/openfor-research.json');
  const research=JSON.parse(await readFile(researchInput,'utf8'));
  const fitInputs={sector:'hardware',stage:'pre-seed',geography:'Japan',check:{amount:150000,currency:'USD'}};
  const fit=shortlistInvestors(fitInputs,research.pack.components.research.profiles,'2026-10-31');
  assert.equal(fit.find(r=>r.id==='monozukuri_ventures_001').fit,'strong');
  assert.equal(fit.find(r=>r.name==='Geek Ventures').fit,'insufficient');
  await writeFile(resolve(output,'founder-fit.json'),JSON.stringify({kind:'separate sourced illustration',as_of:'2026-10-31',notice:'Historical fixture assessment date, not a fresh source review. Inputs are fictional; alignment is not eligibility or funding.',inputs:fitInputs,results:fit},null,2)+'\n');
  const founderProposal=await invoke(['prepare','--input',researchInput,'--scenario','building_ai']);
  const link=p=>p.replaceAll('\\','/');
  const presentation='# Private OpenFor demo — five-minute script\n\nSynthetic operator data; '+(liveStore?'live Neo4j':'AUTOMATED TEST ONLY: in-memory storage')+'; organization '+organization+'. No real OpenFor private records.\n\n1. **Inputs (30 seconds).** Open [raw mock data]('+link(resolve(output,'raw-input.json'))+'). Say: these invented examples represent the files an operator could supply.\n2. **Mapping (60 seconds).** Open [mapping decisions]('+link(resolve(output,'mapping.json'))+'). Show deduplication, missing dates, unresolved stage conflict, omitted introduction and private note. Say: ambiguous facts stay unresolved.\n3. **Maintenance (60 seconds).** Open [checkpoint results]('+link(resolve(output,'results.json'))+'). Show new revisions, stale-write rejection and recovery. Say: the demo uses live storage only when the report says live Neo4j.\n4. **Publisher handoff (30 seconds).** Open [synthetic proposal summary]('+link(proposal.summary)+'). Explain: recipient-safe export, unapproved proposal, no delivery.\n5. **Founder usefulness (90 seconds).** Open the separate [OpenFor-context preview]('+link(founderProposal.preview)+'). Go to Investor → Explore investor fit; enter hardware / pre-seed / Japan / 150000 / USD. Expect Monozukuri four-field alignment and Geek insufficient evidence. Open Evidence & dates. [Expected results]('+link(resolve(output,'founder-fit.json'))+') use assessment date 2026-10-31; confirm dates/current sources before a later presentation. These fictional inputs and public-source profiles are a separate illustration, not the synthetic maintenance dataset or an introduction promise.\n6. **Invitation (30 seconds).** Ask OpenFor to nominate one operator and a small authorized dataset for the same maintenance workflow in a clean pilot organization. Keep the demo dataset as a template, never as real pilot evidence.\n\nBrowser smoke check before presenting: open the exact linked preview, confirm Investor navigation, comparison result and Evidence & dates; then Relationships & introduction paths, select Y Combinator (2017 government reference) → Airbnb user visits (documented historical activity), maximum 4, both checkboxes unchecked, no historical cutoff; submit and inspect the result below the form. Record observed results separately. This script does not claim a browser pass.\n\nIf live readiness fails, stop and resolve setup; do not show an automated-test report as live evidence. If browser navigation fails, show the clearly labelled expected-results JSON and record the issue. Neither proposal is approved; do not package, send or publish without separate authorization.\n';
  await writeFile(resolve(output,'presentation.md'),presentation);
  const report={kind:'synthetic_operator_rehearsal',mode:liveStore?'synthetic-demo-live-storage':'automated-test',organization,storage:liveStore?'live Neo4j':'in-memory test double; NOT Neo4j',transport:'real loopback HTTP server and operator CLI adapter',data:'labelled mock OpenFor operator rows mapped onto fictional alpha teaching contracts; no real OpenFor private data',results,proposal,founderProposal,founder_fit_check:true,not_tested:[...(liveStore?['Neo4j restart durability/native query parity']:['Neo4j durability/native queries']),'real OpenFor private data','browser UX/offline persistence','live LLM'],published:false};
  await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2)+'\n');await writeFile(resolve(output,'results.md'),'# OpenFor synthetic demo rehearsal\n\n'+raw.label+'\n\nStorage: '+(liveStore?'live Neo4j':'in-memory automated test')+'; organization: '+organization+'; real authenticated loopback HTTP and operator commands.\n\n| Checkpoint | Result |\n| --- | --- |\n'+results.map(r=>'| '+r.step+' | '+r.status+' |').join('\n')+'\n\nMapping: mapping.json. Details: results.json.\n\nProposal: '+proposal.proposal+'\n\nApproval pending. No delivery. Real private-data operation, restart durability, browser and LLM checks remain separate gates.\n');
  console.log(JSON.stringify({report:resolve(output,'results.md'),details:resolve(output,'results.json'),mapping:resolve(output,'mapping.json'),presentation:resolve(output,'presentation.md'),founder_preview:founderProposal.preview,proposal:proposal.proposal,checks:results.length,published:false},null,2));
  return report;
 }finally{
  await app.close();await writeFile(connection,JSON.stringify({origin,token:'EXPIRED_TEST_CREDENTIAL_SERVER_STOPPED'}));
 }
}
async function main(){
 const args=process.argv.slice(2),options={};
 for(let i=0;i<args.length;i+=2){if(!['--database-config','--organization'].includes(args[i])||!args[i+1]||options[args[i]])throw new Error('Usage: node tools/rehearse-openfor.mjs --database-config LOCAL_FILE --organization openfor_demo_NAME');options[args[i]]=args[i+1];}
 if(!options['--database-config']||!options['--organization'])throw new Error('Live storage required. Supply --database-config LOCAL_FILE and --organization openfor_demo_NAME. In-memory storage is for automated tests only.');
 if(!/^openfor_demo_[a-z0-9_]{3,35}$/.test(options['--organization']))throw new Error('Choose a dedicated openfor_demo_* organization; never use a pilot organization.');
 const config=JSON.parse(await readFile(options['--database-config'],'utf8'));const store=new Neo4jStore(config);
 try{await store.query('RETURN 1 AS ready');await store.init();}catch{throw new Error('Live Neo4j unavailable. Check the selected local configuration and start the database; no simulated fallback was used.');}
 return rehearseOpenFor({liveStore:store,organization:options['--organization']});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});

import {readFile,writeFile,mkdir,mkdtemp,lstat} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fetchOrganizationExport,referenceRequest} from '../tools/distribute-incubator.mjs';
import {publisherInput,publisherCheck,publisherHash,publisherPreview,publisherRelease,publisherZip} from '../publisher/core.js';
import {rejectPublishingSecrets} from '../js/publishing.js';

export const operatorRoot=fileURLToPath(new URL('../',import.meta.url));
const json=value=>JSON.stringify(value,null,2)+'\n';
const operatorEscape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export async function operatorRead(path,max=6*1024*1024){const info=await lstat(path);if(!info.isFile()||info.size>max)throw new Error('Expected a bounded regular local file.');return readFile(path,'utf8');}
export const readOperatorJSON=async(path,max)=>JSON.parse((await operatorRead(path,max)).replace(/^\uFEFF/,''));
export async function operatorTemplate(root=operatorRoot){
 const script=await operatorRead(resolve(root,'publisher/template.js'),32*1024*1024),prefix='globalThis.STARTUP_PUBLISHER_TEMPLATE = ';
 if(!script.startsWith(prefix)||!script.trimEnd().endsWith(';'))throw new Error('Prepared Publisher template is missing or invalid. Rebuild it once with tools/build-publisher.mjs.');
 const engine=await Promise.all(['enterprise/operator-service.mjs','publisher/core.js','js/publishing.js'].map(path=>readFile(resolve(operatorRoot,path),'utf8')));
 return {template:JSON.parse(script.slice(prefix.length).trimEnd().slice(0,-1)),hash:await publisherHash(script),engine_hash:await publisherHash(engine.join('\n'))};
}
function proposalSummary(envelope,checks,sourceHash,scenario){return '# Release proposal — approval required\n\nSource: '+envelope.organization+' / '+envelope.revision+'\n\nSource SHA-256: '+sourceHash+'\n\nData: '+checks.kind+'; '+checks.profiles+' investors, '+checks.snapshots+' startup snapshots, '+checks.edges+' relationship edges.\n\nPreview scenario: '+(scenario?.title||'Empty founder situation')+'. Scenario inputs and preview edits are excluded from the release.\n\n'+checks.warnings.map(w=>'- '+w).join('\n')+'\n\nOpen preview.html and inspect the four footer tabs and header Research workspace. Complete review.json only after human approval of this exact source and release identity, audience, privacy, rights and update terms. Booleans start false.\n\nPackaging creates local files only. Sending or publishing requires separate explicit instructions naming the artifact and destination.\n';}
export async function prepareOperatorProposal(input,{root=operatorRoot,scenarioId=null}={}){
 const envelope=publisherInput(input),checks=publisherCheck(envelope),loaded=await operatorTemplate(root);
 let scenario=null;if(scenarioId){scenario=loaded.template.scenarios.cases.find(s=>s.id===scenarioId);if(!scenario)throw new Error('Unknown illustrative scenario.');}
 const preview=await publisherPreview(loaded.template,envelope,scenario),parent=resolve(root,'.local/operator');await mkdir(parent,{recursive:true});const directory=await mkdtemp(resolve(parent,'proposal-'));
 const summary=proposalSummary(envelope,checks,preview.source_hash,scenario);
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; frame-src \'self\'; connect-src \'none\'; base-uri \'none\'"><title>Founder preview — approval required</title><style>html,body{height:100%;margin:0;overflow:hidden}body{display:flex;flex-direction:column;font:13px system-ui}h1{display:none}p{margin:0;padding:6px 12px;background:#f5f2e8}iframe{display:block;width:100%;flex:1;min-height:0;border:0;box-sizing:border-box}</style></head><body><h1>Founder preview</h1><p>Operator preview · Unapproved · Details inside preview; review summary.md before packaging.</p><iframe title="Isolated Founder Workspace" sandbox="allow-scripts allow-downloads allow-forms" referrerpolicy="no-referrer" srcdoc="'+operatorEscape(preview.html)+'"></iframe></body></html>';
 const review={schema_version:1,source_sha256:preview.source_hash,preview_reviewed:false,release_review:{id:'research_release',version:'0.1.0',brand:'Research release',audience:'',reviewed_by:'',reviewed_date:new Date().toISOString().slice(0,10),distribution_statement:'',update_instructions:'',attribution_notice:'',approved:false,private_data_reviewed:false,rights_reviewed:false}};
 const receipt={schema_version:1,proposal_id:basename(directory),source_sha256:preview.source_hash,template_sha256:loaded.hash,engine_sha256:loaded.engine_hash,preview_sha256:await publisherHash(html),summary_sha256:await publisherHash(summary),scenario_id:scenarioId};
 for(const [name,data] of [['source.json',json(envelope)],['summary.md',summary],['preview.html',html],['review.json',json(review)],['receipt.json',json(receipt)]])await writeFile(resolve(directory,name),data,{flag:'wx',mode:0o600});
 return {proposal:directory,summary:resolve(directory,'summary.md'),preview:resolve(directory,'preview.html'),review:resolve(directory,'review.json'),source_sha256:preview.source_hash,approval_required:true};
}
export async function packageOperatorProposal(directory,{root=operatorRoot}={}){
 directory=resolve(directory);const envelope=publisherInput(await readOperatorJSON(resolve(directory,'source.json'))),review=await readOperatorJSON(resolve(directory,'review.json'),64000),receipt=await readOperatorJSON(resolve(directory,'receipt.json'),64000),loaded=await operatorTemplate(root);
 if(receipt.schema_version!==1||review.schema_version!==1||Object.keys(review).some(k=>!['schema_version','source_sha256','preview_reviewed','release_review'].includes(k)))throw new Error('Invalid proposal/review envelope. Prepare a fresh proposal.');
 const hash=await publisherHash(json(envelope));
 if(hash!==receipt.source_sha256||hash!==review.source_sha256||loaded.hash!==receipt.template_sha256||loaded.engine_hash!==receipt.engine_sha256||await publisherHash(await operatorRead(resolve(directory,'preview.html'),8*1024*1024))!==receipt.preview_sha256||await publisherHash(await operatorRead(resolve(directory,'summary.md'),64000))!==receipt.summary_sha256)throw new Error('Proposal source, preview, summary, template or packaging code changed. Prepare a fresh proposal and obtain review again.');
 if(review.preview_reviewed!==true)throw new Error('Human preview review is required. Complete the proposal review after explicit operator approval.');
 const release=await publisherRelease(loaded.template,envelope,review.release_review,{source_hash:hash,reviewed:true}),zip=publisherZip(release.files);
 const parent=resolve(directory,'releases');await mkdir(parent,{recursive:true});const output=await mkdtemp(resolve(parent,'release-'));
 await writeFile(resolve(output,release.filename),zip,{flag:'wx',mode:0o600});await writeFile(resolve(output,'release-manifest.json'),json(release.manifest),{flag:'wx',mode:0o600});
 return {archive:resolve(output,release.filename),manifest:resolve(output,'release-manifest.json'),source_sha256:hash,zip_sha256:await publisherHash(zip),published:false};
}

// Typed operations shared by the CLI and any future adapter. No argument parsing or output.
export function checkOperatorInput(input){
 const envelope=publisherInput(input);
 return {source:{organization:envelope.organization,revision:envelope.revision},...publisherCheck(envelope)};
}
export async function inspectOperatorResearch(connection,{fetchImpl=fetch}={}){
 const saved=await referenceRequest(connection,'dataset',{}, {fetchImpl});
 return {revision:saved.revision,...publisherCheck(publisherInput(saved.bundle))};
}
export async function importOperatorResearch(connection,input,expectedRevision,{fetchImpl=fetch}={}){
 const envelope=publisherInput(input);rejectPublishingSecrets(envelope.bundle);
 if(expectedRevision!=='new'&&(typeof expectedRevision!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(expectedRevision)))throw new Error('Supply an explicit expected revision, or new for the first import.');
 const saved=await referenceRequest(connection,'import',{expected_revision:expectedRevision==='new'?null:expectedRevision,bundle:envelope.bundle},{fetchImpl});
 return {revision:saved.revision,imported:true};
}
export async function exportOperatorResearch(connection,revision,{root=operatorRoot,fetchImpl=fetch}={}){
 const envelope=await fetchOrganizationExport(connection,revision,{fetchImpl}),parent=resolve(root,'.local/operator');await mkdir(parent,{recursive:true});
 const dir=await mkdtemp(resolve(parent,'export-')),path=resolve(dir,'source.json');
 await writeFile(path,json(envelope),{flag:'wx',mode:0o600});
 return {source:path,revision:envelope.revision,...publisherCheck(envelope)};
}

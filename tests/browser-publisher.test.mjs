import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {buildPublisher} from '../tools/build-publisher.mjs';
import {publisherInput,publisherCheck,publisherPreview,publisherRelease,publisherZip} from '../publisher/core.js';
import {validateExportEnvelope,validateReleaseReview} from '../tools/incubator-distribution.mjs';
import {findRelationshipPaths} from '../js/relationships.js';
const root=new URL('../',import.meta.url),built=await buildPublisher({local:false}),templateContext={};
vm.runInNewContext(await readFile(resolve(built.output,'template.js'),'utf8'),templateContext);
const template=JSON.parse(JSON.stringify(templateContext.STARTUP_PUBLISHER_TEMPLATE)),review=JSON.parse(await readFile(new URL('enterprise/fixtures/distribution-review.json',root),'utf8'));
const env=publisherInput(template.samples.fictional);

test('browser Publisher and Node share validation while accepting independent file inputs',()=>{
 assert.equal(validateExportEnvelope(env),env);assert.equal(validateReleaseReview(review),review);assert.equal(publisherCheck(env).kind,'fictional');
 const bad=structuredClone(env);bad.bundle.pack.credentials={password:'secret'};assert.throws(()=>publisherInput(bad),/credential|reserved|unsupported fields/);
 const mismatched=structuredClone(env);mismatched.bundle.relationships.pack_id='wrong';assert.throws(()=>publisherInput(mismatched),/identity/);
 assert.equal(publisherInput(env).revision,'local_file');assert.ok(template.files.every(f=>!f.path.startsWith('.local/')&&!f.path.includes('credentials')));
});
test('srcdoc preview is self contained, labelled and does not use browser storage or helper',async()=>{
 const research=publisherInput(template.samples.openfor),preview=await publisherPreview(template,research,template.scenarios.cases[0]);
 assert.equal(preview.html.match(/<script>/g).length,3);assert.ok(!/<script[^>]+src=/.test(preview.html));assert.ok(preview.html.includes('const previewMemory=new Map'));assert.ok(preview.html.includes('const location={protocol:"file:"'));assert.ok(preview.html.includes('illustrative_unverified'));assert.ok(preview.html.includes('connect-src \'none\''));
 const safe=structuredClone(research);safe.bundle.pack.name='</script><script>UNTRUSTED_EXECUTION</script>';
 const escaped=await publisherPreview(template,safe);assert.ok(!escaped.html.includes('</script><script>UNTRUSTED_EXECUTION'));
 await assert.rejects(()=>publisherPreview(template,env,template.scenarios.cases[0]),/requires the OpenFor/);
});
test('reviewed browser release generates a verifiable ZIP without preview assumptions',async()=>{
 const preview=await publisherPreview(template,env);
 await assert.rejects(()=>publisherRelease(template,env,review,preview),/review/);
 await assert.rejects(()=>publisherRelease(template,env,{...review,approved:false},{...preview,reviewed:true}),/approval/);
 const changed=structuredClone(env);changed.revision='changed';await assert.rejects(()=>publisherRelease(template,changed,review,{...preview,reviewed:true}),/exact data/);
 const release=await publisherRelease(template,env,review,{...preview,reviewed:true}),archive=publisherZip(release.files);
 const file=resolve(built.output,'test-release.zip');await writeFile(file,archive);
 assert.equal(new DataView(archive.buffer).getUint32(0,true),0x04034b50);
 assert.equal(new DataView(archive.buffer).getUint32(archive.length-22,true),0x06054b50);
 assert.ok(!release.files.has('openfor-illustrative.json'));assert.equal(release.manifest.scenario_inputs_selected,false);
 const decode=p=>new TextDecoder().decode(release.files.get('browser-package/'+p));
 assert.ok(!decode('js/app.bundle.js').includes('const previewMemory=new Map'));assert.ok(decode('index.html').includes(review.brand));
 const hashes=JSON.parse(new TextDecoder().decode(release.files.get('browser-files.json')));
 for(const f of hashes.files)assert.equal(createHash('sha256').update(release.files.get('browser-package/'+f.path)).digest('hex'),f.sha256);
 const graph=JSON.parse(decode('data/relationships.json'));assert.equal(findRelationshipPaths(graph,{as_of:'2026-10-31',from:'demo:a',to:'demo:experiment',max_hops:4}).paths.length,1);
 for(const match of decode('sw.js').matchAll(/'\.\/([^']+)'/g))assert.ok(release.files.has('browser-package/'+match[1].split('?')[0]),match[1]);
 assert.throws(()=>publisherZip(new Map([['../private',new Uint8Array()]])),/Unsafe/);
 assert.ok((await stat(file)).size>0);
});

test('lean Publisher UI performs preview and download with network and storage unavailable',async()=>{
 const html=await readFile(resolve(built.output,'index.html'),'utf8'),code=await readFile(resolve(built.output,'app.bundle.js'),'utf8'),ids={},downloads=[];let network=0;
 class Element{constructor(tag='div'){this.tagName=tag;this.value='';this.textContent='';this.children=[];this.handlers={};this.classList={toggle(){}};}addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}append(child){this.children.push(child);}async emit(name){for(const fn of this.handlers[name]||[])await fn();}async click(){if(this.tagName==='a')return;await this.emit('click');}}
 for(const match of html.matchAll(/id="([^\"]+)"/g))ids[match[1]]=new Element();
 class DownloadURL extends URL{static createObjectURL(blob){downloads.push(blob);return 'blob:test';}static revokeObjectURL(){}}
 const sandbox={STARTUP_PUBLISHER_TEMPLATE:template,document:{getElementById:id=>ids[id],createElement:tag=>new Element(tag),querySelectorAll:()=>Object.values(ids)},URL:DownloadURL,Blob,TextEncoder,TextDecoder,crypto:globalThis.crypto,structuredClone,atob,setTimeout:fn=>fn(),fetch:()=>{network++;throw Error('Network unavailable');},localStorage:{getItem(){throw Error('Storage unavailable');},setItem(){throw Error('Storage unavailable');}}};
 assert.ok(html.includes('sandbox="allow-scripts allow-downloads allow-forms"'));
 vm.runInNewContext(code,sandbox);await ids['demo-fictional'].click();assert.ok(ids['data-summary'].textContent.includes('fictional'));
 await ids.preview.click();assert.ok(ids['preview-frame'].srcdoc.includes('FOUNDER PREVIEW'));assert.equal(ids['preview-reviewed'].checked,false);
 await ids['download-zip'].click();assert.ok(ids.status.textContent.includes('review'));
 const values={brand:review.brand,version:review.version,audience:review.audience,reviewer:review.reviewed_by,'release-id':review.id,'review-date':review.reviewed_date,scope:review.distribution_statement,updates:review.update_instructions,attribution:review.attribution_notice};for(const [id,value] of Object.entries(values))ids[id].value=value;
 for(const id of ['preview-reviewed','privacy','rights','approved'])ids[id].checked=true;
 await ids['download-zip'].click();assert.equal(downloads.length,1);assert.ok(ids['release-result'].textContent.includes('.zip'));
 await ids['demo-research'].click();assert.equal(ids['preview-reviewed'].checked,false);assert.equal(ids['preview-frame'].hidden,true);assert.equal(network,0);
});

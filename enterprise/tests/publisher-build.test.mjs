import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createReferenceServer,tokenHash} from '../server.mjs';
import {distributionZip} from '../../tools/distribution-zip.mjs';
import {inflateRawSync} from 'node:zlib';
const root=new URL('../../',import.meta.url),bundle=JSON.parse(await readFile(new URL('enterprise/fixtures/openfor-research.json',root),'utf8')),review=JSON.parse(await readFile(new URL('enterprise/fixtures/distribution-review.json',root),'utf8'));
function unzip(bytes){const files=new Map();let at=0;while(bytes.readUInt32LE(at)===0x04034b50){const size=bytes.readUInt32LE(at+18),nameSize=bytes.readUInt16LE(at+26),extra=bytes.readUInt16LE(at+28),name=bytes.subarray(at+30,at+30+nameSize).toString(),start=at+30+nameSize+extra;files.set(name,inflateRawSync(bytes.subarray(start,start+size)));at=start+size;}assert.equal(bytes.readUInt32LE(at),0x02014b50);assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);return files;}
test('preview and reviewed ZIP enforce scopes, labels, isolation, integrity and expiry',async()=>{
 await mkdir(new URL('release/',root),{recursive:true});const parent=await mkdtemp(new URL('release/publisher-test-',root));let now=Date.now(),reads=0;
 const tokens=['a'.repeat(40),'b'.repeat(40),'c'.repeat(40)],config={credentials:tokens.map((token,i)=>({token_sha256:tokenHash(token),org:i===1?'other_org':'demo_org',subject:i===2?'member':'operator',role:i===2?'researcher':'admin'}))};
 const store={async get(org,{revision}={}){reads++;assert.equal(org,'demo_org');if(revision&&revision!=='rev1')throw Object.assign(new Error('Unknown revision'),{status:404});return {revision:'rev1',value:bundle};}};
 const app=createReferenceServer({store,config,publisherOptions:{parent,now:()=>now}}),origin=await app.listen(0);
 const post=async(action,body={},index=0,headers={})=>fetch(origin+'/v1/publisher/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokens[index],...headers},body:JSON.stringify(body)});
 try{
  assert.equal((await post('preview',{revision:'rev1'},2)).status,403);
  assert.equal((await post('preview',{revision:'rev1'},0,{Origin:'null'})).status,403);
  assert.equal((await post('preview',{revision:'unknown'})).status,404);
  const previewResponse=await post('preview',{revision:'rev1',scenario_id:'building_ai'});assert.equal(previewResponse.status,200);const preview=await previewResponse.json();
  const page=await fetch(origin+preview.url,{headers:{Origin:'null'}}),html=await page.text();assert.equal(page.status,200);assert.ok(html.includes('OPERATOR PREVIEW'));assert.ok(html.includes('illustrative_unverified'));assert.ok(page.headers.get('content-security-policy').includes("connect-src 'none'"));assert.ok(!page.headers.get('content-security-policy').includes('allow-same-origin'));
  const prefix=preview.url.replace('index.html',''),script=await (await fetch(origin+prefix+'js/app.bundle.js')).text();assert.ok(script.includes('const previewMemory=new Map'));assert.ok(script.includes('const location={protocol:"file:"'));assert.ok(script.includes('Harbor Building AI'));
  assert.equal((await fetch(origin+prefix+'enterprise/server.mjs')).status,404);assert.equal((await fetch(origin+prefix+'sw.js')).status,404);
  assert.equal((await post('build',{revision:'rev1',preview_id:preview.preview_id,preview_reviewed:true,release_review:review},1)).status,404);
  assert.equal((await post('build',{revision:'rev1',preview_id:preview.preview_id,release_review:review})).status,400);
  assert.equal((await post('build',{revision:'rev1',preview_id:preview.preview_id,preview_reviewed:true,release_review:{...review,approved:false}})).status,400);
  const response=await post('build',{revision:'rev1',preview_id:preview.preview_id,preview_reviewed:true,release_review:review});assert.equal(response.status,200);const build=await response.json();assert.equal(build.scenario_included,false);
  assert.equal((await post('download',{build_id:build.build_id},1)).status,404);
  const download=await post('download',{build_id:build.build_id});assert.equal(download.headers.get('content-type'),'application/zip');const bytes=Buffer.from(await download.arrayBuffer()),files=unzip(bytes);
  assert.ok(files.has('browser-package/index.html'));assert.ok(files.has('data-bundle/manifest.json'));assert.equal(JSON.parse(files.get('data-bundle/guide-pack.json')).id,bundle.pack.id);
  assert.ok(!files.get('browser-package/js/app.bundle.js').toString().includes('const previewMemory=new Map'));assert.ok(!files.has('openfor-illustrative.json'));assert.ok([...files.keys()].every(p=>!p.includes('.local')&&!p.includes('credentials')));
  assert.ok(!bytes.includes(Buffer.from(tokens[0])));assert.ok(reads>0);
  await writeFile(resolve(parent,'accepted-test.zip'),bytes);
  const manifest=JSON.parse(files.get('browser-files.json'));const first=manifest.files[0];const job=[...app.publisher.jobs.values()].find(j=>j.browser);assert.ok(job);
  // The ZIP writer verifies file hashes rather than archiving arbitrary directories.
  await assert.rejects(()=>distributionZip({output:parent,browser:parent,data_bundle:parent}));
  await post('clear');assert.equal((await fetch(origin+preview.url)).status,404);assert.equal((await post('download',{build_id:build.build_id})).status,404);
  const p2=await (await post('preview',{revision:'rev1'})).json();now+=21*60*1000;assert.equal((await fetch(origin+p2.url)).status,404);
 }finally{await app.close();}
});

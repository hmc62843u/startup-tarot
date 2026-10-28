import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {assertFictionalRecord,checkReleaseLibraries} from '../tools/release-policy.mjs';
import {documentPages,renderMarkdown} from '../tools/build-docs.mjs';
import {iconPng} from '../tools/build-icons.mjs';

test('PWA icon bytes match the declared sizes and reproducible vector mark',async()=>{
    const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));
    for(const icon of manifest.icons){
        const size=Number(icon.sizes.split('x')[0]);
        const bytes=await readFile(new URL('../'+icon.src.replace(/^\.\//,''),import.meta.url));
        assert.equal(bytes.readUInt32BE(16),size);
        assert.equal(bytes.readUInt32BE(20),size);
        assert.deepEqual(bytes,iconPng(size));
        assert.ok(bytes.length<50000);
    }
});

test('every library file is registered, explicitly fictional and linked to a local specification',async()=>{
    await checkReleaseLibraries();
    const worker=await readFile(new URL('../sw.js',import.meta.url),'utf8');
    for(const path of ['docs/examples.html','docs/guide.html','docs/guide-packs.html','docs/data-license.html','docs/license.html','LICENSE','DATA_LICENSE.md','README.md','EXAMPLES.md','GUIDE.md','REFERENCE.md','docs/reference.html','DEVELOPMENT.md','assets/how-it-works.svg','assets/methodology.svg','GUIDE_PACKS.md','data/guide-pack.schema.json']) assert.ok(worker.includes("'./"+path+"'"),'Offline resource: '+path);
});

test('styled documentation stays synchronized with source files and supports direct-file navigation',async()=>{
    for(const page of await documentPages()){
        const saved=await readFile(new URL('../'+page.path,import.meta.url),'utf8');
        assert.equal(saved.replace(/css\/style\.css\?v=[a-f0-9]+/g,'css/style.css'),page.html);
        assert.ok(saved.includes('href="../index.html"'));
        assert.ok(!saved.includes('<script'));
        for(const match of saved.matchAll(/\b(?:href|src)="([^"]+)"/g)){
            const link=match[1];
            if(link.startsWith('#')||link.startsWith('//')||/^[a-z][a-z0-9+.-]*:/i.test(link))continue;
            const target=new URL(link,new URL('../'+page.path,import.meta.url));target.search='';target.hash='';
            await stat(target);
        }
    }
    const shell=await readFile(new URL('../index.html',import.meta.url),'utf8');
    assert.equal((shell.match(/href="docs\/guide.html"/g)||[]).length,1);
    assert.ok(!shell.includes('Read the methodology'));
    assert.ok(!shell.includes('Package format and reuse notes'));
    const guide=await readFile(new URL('../docs/guide.html',import.meta.url),'utf8');
    assert.ok(guide.includes('id="methodology"'));
    assert.ok(guide.includes('class="document-page visual-guide"'));
    assert.ok(guide.includes('<img src="../assets/how-it-works.svg"'));
    assert.ok(guide.includes('href="reference.html#methodology"'));
    assert.ok(guide.includes('<table>'));
    assert.ok(guide.includes('href="data-license.html"'));
    assert.ok(renderMarkdown('<script>alert(1)</script>').includes('&lt;script&gt;'));
    assert.ok(!renderMarkdown('![unsafe](javascript:alert)').includes('<img'));
    assert.ok(!renderMarkdown('![remote](https://example.org/image.png)').includes('<img'));
    assert.ok(!renderMarkdown('![outside](../private.png)').includes('<img'));
    assert.ok(renderMarkdown('<a id="demo_discovery"></a>').includes('id="demo_discovery"'));
    assert.ok(!renderMarkdown('<a id="demo" onclick="alert(1)"></a>').includes('<a '));
});

test('public build policy rejects research, external sources and false historical evidence',async()=>{
    const original=JSON.parse(await readFile(new URL('../startups/demo_tools_reservations.json',import.meta.url),'utf8'));
    for (const modify of [
        record=>{delete record.data_kind;},
        record=>{record.distribution_basis='public_web';},
        record=>{record.data_license='unknown';},
        record=>{record.sources[0].url='https://example.org/source';},
        record=>{record.sources[0].url='javascript:alert(1)';},
        record=>{record.sources[0].evidence_type='retrospective_account';}
    ]) {
        const record=structuredClone(original);modify(record);
        assert.throws(()=>assertFictionalRecord(record));
    }
    assert.doesNotThrow(()=>assertFictionalRecord(original));
});

test('README research animation is shipped with an honest walkthrough and no obsolete template',async()=>{
    const root=new URL('../',import.meta.url);
    const readme=await readFile(new URL('README.md',root),'utf8');
    const gif=await readFile(new URL('assets/research-walkthrough.gif',root));
    assert.ok(gif.subarray(0,6).toString().startsWith('GIF8'));
    assert.ok(readme.includes('assets/research-walkthrough.gif'));
    assert.ok(readme.includes('startup-only'));
    assert.ok(!readme.includes('TEST-RESEARCH-01 survived'));
    const exporter=await readFile(new URL('tools/export-release.mjs',root),'utf8');
    assert.ok(exporter.includes("'assets/research-walkthrough.gif'"));
    assert.ok(!exporter.includes('templates/example_fictional.json'));
    const template=JSON.parse(await readFile(new URL('templates/blank_investor.json',root),'utf8'));
    assert.ok(template.source_url.startsWith('./docs/examples.html#'));
});

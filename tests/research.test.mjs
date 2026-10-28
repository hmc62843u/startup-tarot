import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {researchFixture} from './research-helpers.mjs';
const validator='data:text/javascript;base64,'+readFileSync(new URL('../js/validator.js',import.meta.url)).toString('base64');
const source=readFileSync(new URL('../js/research-library.js',import.meta.url),'utf8').replace("'./validator.js'",JSON.stringify(validator));
const {validateResearchPackage,parseResearchPackage,researchWorkspaceKey,researchContentKey,researchRecords}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('research Guide Pack accepts dated, attributed, licensed records without changing their source URLs',()=>{
    const fixture=researchFixture();
    assert.deepEqual(validateResearchPackage(fixture).errors,[]);
    assert.deepEqual(parseResearchPackage('\uFEFF'+JSON.stringify(fixture)),fixture);
    assert.equal(researchContentKey(fixture),researchContentKey(Object.fromEntries(Object.entries(fixture).reverse())));
    assert.equal(researchWorkspaceKey(fixture),'research:synthetic_test_library@1.0.0');
    assert.equal(researchWorkspaceKey(null),'demo');
    fixture.profiles=[];
    assert.equal(validateResearchPackage(fixture).isValid,true);
    fixture.snapshots=[];
    assert.equal(validateResearchPackage(fixture).isValid,false);
});

test('included optional research download validates independently of the fictional library',()=>{
    const text=readFileSync(new URL('../packs/guide-pack.json',import.meta.url),'utf8');
    const library=parseResearchPackage(text);
    const records=researchRecords(library);
    assert.equal(records.profiles.length,9);
    assert.equal(records.snapshots.length,3);
    assert.equal(records.profiles.filter(p=>p.comparison_enabled===false).length,7);
    assert.equal(library.license.id,'CC-BY-4.0');
    assert.equal(library.repository_url,null);
    const shell=readFileSync(new URL('../index.html',import.meta.url),'utf8');
    assert.ok(shell.includes('href="packs/guide-pack.json" download="guide-pack.json"'));
    const exporter=readFileSync(new URL('../tools/export-release.mjs',import.meta.url),'utf8');
    for(const path of ['guide-pack.json','README.md','LICENSE.md','SOURCES.md','THIRD_PARTY_NOTICES.md','DATA_NOTICE.md']){
        assert.ok(readFileSync(new URL('../packs/'+path,import.meta.url)).length>0);
        assert.ok(exporter.includes("'packs/"+path+"'"));
    }
    const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
    assert.ok(!worker.includes('packs/guide-pack.json'));
});

test('local packages accept an absent repository URL while rejecting unsafe provided URLs',()=>{
    for(const value of [null,undefined]) {
        const fixture=researchFixture();
        if(value===undefined)delete fixture.repository_url;else fixture.repository_url=value;
        assert.equal(parseResearchPackage(JSON.stringify(fixture)).repository_url,value);
    }
    for(const value of ['', 'file:///C:/private/research', 'javascript:alert(1)', 'https://user:secret@example.org/', 42]) {
        const fixture=researchFixture();fixture.repository_url=value;
        assert.equal(validateResearchPackage(fixture).isValid,false);
    }
});

test('research import rejects malformed records, duplicate IDs, false fictional labels and unsafe sources',()=>{
    for(const change of [
        p=>{p.schema_version=2;},p=>{p.version='latest';},p=>{p.license=null;},p=>{p.license.id='unknown';},
        p=>{p.rights_review.status='unreviewed';},p=>{p.rights_review.reviewed_date='2026-02-31';},
        p=>{p.profiles.push(structuredClone(p.profiles[0]));},p=>{p.profiles[0].data_kind='fictional';},
        p=>{p.profiles[0].source_url='javascript:alert(1)';},p=>{p.profiles[0].source_url='https://user:secret@example.org/';},
        p=>{p.snapshots[0].sources[0].url='./docs/examples.html#fixture';},p=>{p.snapshots[0].fields.product.source_id='missing';},
        p=>{p.profiles[0].criteria_weights=null;},p=>{p.snapshots[0].sources={};},
        p=>{p.profiles=Array(251).fill(p.profiles[0]);}
    ]) {
        const fixture=researchFixture();change(fixture);
        assert.equal(validateResearchPackage(fixture).isValid,false);
    }
    assert.throws(()=>parseResearchPackage('{invalid'),/not valid JSON/);
    assert.throws(()=>parseResearchPackage(' '.repeat(5*1024*1024+1)),/5 MB/);
});

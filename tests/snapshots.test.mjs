import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root),'utf8').replace(/^\uFEFF/,''));
const moduleFrom=path=>import('data:text/javascript;base64,'+readFileSync(new URL(path,root)).toString('base64'));
const {validateStartupSnapshot}=await moduleFrom('js/validator.js');
const index=read('data/startup-library.json');
const snapshots=index.snapshots.map(path=>read('data/'+path));

test('fictional index has three valid, unique scenario snapshots',()=>{
    assert.equal(snapshots.length,3);
    assert.equal(new Set(snapshots.map(snapshot=>snapshot.id)).size,3);
    snapshots.forEach(snapshot=>assert.deepEqual(validateStartupSnapshot(snapshot).errors,[],snapshot.id));
    assert.equal(snapshots[0].metrics[0].unit,'reservations');
    assert.equal(snapshots[0].metrics[0].value,8);
    assert.equal(snapshots[1].metrics[0].unit,'bookings');
    assert.equal(snapshots[1].metrics[0].value,5);
    assert.equal(snapshots[1].fields.funding.value,null);
    assert.deepEqual(snapshots[2].metrics,[]);
    assert.equal(snapshots[2].sources[0].evidence_type,'fictional_scenario');
});

test('snapshots reject unsupported source claims and later metrics',()=>{
    let copy=structuredClone(snapshots[0]);
    copy.fields.product.source_id='missing';
    assert.equal(validateStartupSnapshot(copy).isValid,false);
    copy=structuredClone(snapshots[0]);
    copy.metrics[0].as_of_date='2025-06-01';
    assert.equal(validateStartupSnapshot(copy).isValid,false);
    copy=structuredClone(snapshots[2]);
    copy.sources[0].evidence_date='2025-05-01';
    assert.equal(validateStartupSnapshot(copy).isValid,false);
    copy=structuredClone(snapshots[1]);
    copy.fields.funding={value:null,source_id:'primary'};
    assert.equal(validateStartupSnapshot(copy).isValid,false);
});

test('malformed collections and invalid dates fail validation without crashing',()=>{
    for(const change of [{sources:{}},{metrics:{}},{snapshot_date:'2025-02-31'}]){
        assert.equal(validateStartupSnapshot({...snapshots[0],...change}).isValid,false);
    }
});

test('editorial lessons need known facts, valid source references and explicit matching context',()=>{
    for(const mutate of [
        snapshot=>{snapshot.preparation_lessons[0].source_ids=['missing'];},
        snapshot=>{snapshot.preparation_lessons[0].source_ids={};},
        snapshot=>{snapshot.preparation_lessons[0].evidence_fields=['funding'];},
        snapshot=>{snapshot.preparation_lessons[0].business_models=[];}
    ]){
        const snapshot=structuredClone(snapshots[1]);
        mutate(snapshot);
        assert.equal(validateStartupSnapshot(snapshot).isValid,false);
    }
});

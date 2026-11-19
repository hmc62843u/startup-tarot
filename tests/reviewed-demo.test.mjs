import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {assertReleaseRecord,checkReleaseLibraries} from '../tools/release-policy.mjs';

// Entire fixture is synthetic, including the example.org source and review identity.
const fixture=()=>({
    id:'synthetic_review_contract',name:'Synthetic review-contract fixture',data_kind:'research',
    distribution_basis:'reviewed_sources',data_license:'CC-BY-4.0',source_url:'https://example.org/investor',retrieved_date:'2026-11-19',
    funding_type:'equity',organization_type:'vc',stage_focus:['seed'],
    criteria_weights:{team_credibility:.2,problem_clarity:.2,technical_feasibility:.2,market_urgency:.2,traction_evidence:.2},
    weights_basis:'editor_estimate',weight_notes:'Schema placeholders, not investor criteria.',notes:'Synthetic test only; no real investment or endorsement.',
    fit_claims:[{field:'stage',values:['seed'],basis:'declared',strict:false,statement:'Synthetic stage criterion.',source_url:'https://example.org/investor',checked_date:'2026-11-19'}],
    attribution:{publisher:'Synthetic publisher',source_url:'https://example.org/data',license_url:'https://creativecommons.org/licenses/by/4.0/',version:'test-1',changes:'Selected and paraphrased.',retrieved_date:'2026-11-19'},
    distribution_review:{approved:true,reviewer:'Synthetic reviewer',reviewed_date:'2026-11-19',scope:'Synthetic contract test only',statement:'Synthetic declaration; no actual distribution approval.'}
});

test('reviewed real-profile route is separate from fictional records and historical snapshots',async()=>{
    assert.doesNotThrow(()=>assertReleaseRecord(fixture(),'profiles'));
    assert.throws(()=>assertReleaseRecord(fixture(),'snapshots'));
    const fictional=JSON.parse(await readFile(new URL('../profiles/demo_discovery.json',import.meta.url)));
    assert.doesNotThrow(()=>assertReleaseRecord(fictional,'profiles'));
    assert.throws(()=>assertReleaseRecord({...fictional,data_kind:'research'},'profiles'));
});

test('missing approval, attribution, evidence and ambiguous licensing fail closed',()=>{
    for(const mutate of [
        p=>{p.distribution_review.approved=false;},p=>{delete p.distribution_review.reviewer;},
        p=>{p.distribution_review.reviewed_date='2026-02-30';},p=>{p.data_license=' unknown ';},
        p=>{p.attribution.retrieved_date='2026-11-20';},
        p=>{delete p.attribution.version;},p=>{p.attribution.license_url='javascript:alert(1)';},
        p=>{p.fit_claims=[];},p=>{p.fit_claims[0].basis='inferred';},
        p=>{p.fit_claims[0].checked_date='2026-11-20';},p=>{p.fit_claims[0].source_url='./invented';},
        p=>{p.preparation_topics=[{topic:'invented'}];},p=>{delete p.weight_notes;}
    ]) {const p=fixture();mutate(p);assert.throws(()=>assertReleaseRecord(p,'profiles'));}
});

test('indexed release checks accept separate reviewed profiles and fictional scenarios but reject revoked approval',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'reviewed-demo-'));
    try {
        for(const name of ['profiles','startups','data'])await mkdir(join(directory,name));
        const snapshot=JSON.parse(await readFile(new URL('../startups/demo_tools_reservations.json',import.meta.url)));
        const anchor=snapshot.sources[0].url.split('#')[1];
        await writeFile(join(directory,'EXAMPLES.md'),'<a id="'+anchor+'"></a>');
        await writeFile(join(directory,'startups/scenario.json'),JSON.stringify(snapshot));
        await writeFile(join(directory,'profiles/investor.json'),JSON.stringify(fixture()));
        await writeFile(join(directory,'data/library.json'),JSON.stringify({profiles:['../profiles/investor.json']}));
        await writeFile(join(directory,'data/startup-library.json'),JSON.stringify({snapshots:['../startups/scenario.json']}));
        const root=pathToFileURL(directory+'/');
        await checkReleaseLibraries(root);
        const unapproved=fixture();unapproved.distribution_review.approved=false;
        await writeFile(join(directory,'profiles/investor.json'),JSON.stringify(unapproved));
        await assert.rejects(()=>checkReleaseLibraries(root),/approval/);
    } finally {await rm(directory,{recursive:true,force:true});}
});

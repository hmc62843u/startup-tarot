import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessInvestorFit, shortlistInvestors} from '../js/investor-fit.js';
import {validateInvestorProfile, validFitClaim} from '../js/validator.js';
const pack=JSON.parse(await readFile(new URL('../packs/guide-pack.json',import.meta.url)));
const profiles=pack.components.research.profiles;
const profile=profiles.find(p=>p.id==='firstminute_vc_seed_001');
const startup={sector:'technology',stage:'seed',geography:'UK',check:{amount:2000000,currency:'GBP'}};
const assess=(s=startup,p=profile,date='2026-10-30')=>assessInvestorFit(s,p,date);
test('documented fit retains four source claims and dates',()=>{
 const r=assess();assert.equal(r.fit,'strong');assert.equal(r.evidenceCoverage,'complete');assert.equal(r.reasons.length,4);assert.equal(r.evidence.length,4);
});
test('explicit stage mismatch is distinct from missing information',()=>{
 assert.equal(assess({...startup,stage:'growth'}).fit,'mismatch');
 const r=assess({});assert.equal(r.fit,'insufficient');assert.equal(r.unknowns.length,4);assert.equal(r.conflicts.length,0);
});
test('currency mismatch and outside preferred region are unknown, not rejection',()=>{
 const r=assess({...startup,geography:'US',check:{amount:2000000,currency:'USD'}});
 assert.equal(r.conflicts.length,0);assert.equal(r.unknowns.length,2);
});
test('stale, future and inferred claims cannot establish fit',()=>{
 for(const date of ['2027-10-30','2026-10-29'])assert.equal(assess(startup,profile,date).fit,'insufficient');
 assert.equal(assess(startup,{...profile,fit_claims:profile.fit_claims.map(c=>({...c,basis:'inferred'}))}).fit,'insufficient');
});
test('contradictory declared requirements remain unresolved',()=>{
 const p={...profile,fit_claims:[...profile.fit_claims,{...profile.fit_claims[0],values:['growth']}]};
 const r=assess(startup,p);assert.ok(r.unknowns.some(s=>s.includes('conflicting')));assert.equal(r.conflicts.length,0);
});
test('legacy weights and tags do not become mandates; reference records stay excluded',()=>{
 assert.equal(assess(startup,{...profile,fit_claims:[]}).fit,'insufficient');
 const results=shortlistInvestors(startup,profiles,'2026-10-30');assert.equal(results.filter(r=>r.fit==='excluded').length,8);
 assert.equal(assess(startup,{...profile,data_kind:'fictional'}).fit,'excluded');
});
test('malformed dates, amounts and claims fail validation',()=>{
 assert.equal(validFitClaim({...profile.fit_claims[0],source_url:'https://'}),false);
 assert.equal(validFitClaim({...profile.fit_claims[0],source_url:'javascript:alert(1)'}),false);
 assert.equal(validFitClaim({...profile.fit_claims[0],checked_date:'2026-02-30'}),false);
 assert.equal(validFitClaim({...profile.fit_claims[3],max:0}),false);
 assert.equal(validateInvestorProfile({...profile,fit_claims:[{}]}).isValid,false);
 assert.equal(validateInvestorProfile(profile).isValid,true);
});
test('results explain the actual mandate and never count repeated claims twice',()=>{
 const r=assess(startup,{...profile,fit_claims:[...profile.fit_claims,...profile.fit_claims]});
 assert.equal(r.reasons.length,4);
 assert.ok(r.reasons.some(reason=>reason.includes('GBP 1 million to 3 million')));
 assert.ok(assess({...startup,stage:'growth'}).conflicts[0].includes('pre-seed and seed'));
});
test('expanded pack assesses six equity profiles and preserves eight exclusions',()=>{
 const results=shortlistInvestors(startup,profiles,'2026-10-30');
 assert.equal(results.filter(r=>r.fit!=='excluded').length,6);
 assert.equal(results.filter(r=>r.fit==='excluded').length,8);
 for(const p of profiles)assert.equal(validateInvestorProfile(p).isValid,true,p.id);
});
test('US software pre-seed case retains Hustle first-check evidence and extra conditions',()=>{
 const p=profiles.find(p=>p.id==='hustle_fund_current_001');
 const r=assess({sector:'SaaS',stage:'pre-seed',geography:'US',check:{amount:150000,currency:'USD'}},p);
 assert.equal(r.fit,'strong');assert.equal(r.reasons.length,4);
 assert.ok(r.cautions.some(c=>c.includes('Full-time')));
 assert.ok(r.cautions.some(c=>c.includes('medical devices')));
 assert.equal(assess({...startup,stage:'seed'},p).fit,'mismatch');
});
test('UK climate pre-seed and inception cybersecurity cases have sourced alignments',()=>{
 const ada=profiles.find(p=>p.id==='ada_ventures_current_001');
 const r=assess({sector:'climate',stage:'pre-seed',geography:'UK',check:{amount:500000,currency:'GBP'}},ada);
 assert.equal(r.reasons.length,4);assert.equal(r.fit,'strong');
 const bold=profiles.find(p=>p.id==='boldstart_ventures_current_001');
 const early=assess({sector:'cybersecurity',stage:'pre-company',geography:'US',check:{amount:1000000,currency:'USD'}},bold);
 assert.equal(early.reasons.length,3);assert.ok(early.unknowns.some(s=>s.startsWith('Geography:')));
});
test('round totals and maximum-only checks never become invented check ranges',()=>{
 for(const id of ['connect_ventures_current_001','concept_ventures_current_001']){
   const p=profiles.find(p=>p.id===id),r=assess(startup,p);
   assert.ok(!p.fit_claims.some(c=>c.field==='check'));
   assert.ok(r.unknowns.some(s=>s.startsWith('Investor check:')));
   assert.ok(r.cautions.length>0);
 }
});
test('stage or geography overlap alone never qualifies as worth investigating',()=>{
 const r=assess({...startup,sector:'restaurants'});
 assert.equal(r.fit,'insufficient');assert.equal(r.evidenceCoverage,'partial');
 assert.equal(assess({...startup,check:null}).fit,'investigate');
 assert.equal(assess({...startup,stage:null}).fit,'insufficient');
});
test('US SaaS scenario separates strong alignment from partial overlap',()=>{
 const results=shortlistInvestors({sector:'SaaS',stage:'pre-seed',geography:'US',check:{amount:150000,currency:'USD'}},profiles,'2026-10-30');
 assert.equal(results[0].id,'hustle_fund_current_001');assert.equal(results[0].fit,'strong');
 assert.equal(results[0].evidenceCoverage,'complete');
 assert.equal(results.find(r=>r.id==='firstminute_vc_seed_001').fit,'investigate');
 assert.ok(results.filter(r=>r.fit!=='excluded'&&!['hustle_fund_current_001','firstminute_vc_seed_001'].includes(r.id)).every(r=>r.fit==='insufficient'));
});

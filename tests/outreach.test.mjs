import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessInvestorFit} from '../js/investor-fit.js';
import {canonicalSector,sectorFitsMandate} from '../js/sectors.js';
import {outreachStorageKey,emptyOutreachWorkspace,readOutreachWorkspace,writeOutreachWorkspace,saveInvestorEntry,reviewInvestorEntry,createOutreachDraft,exportOutreachMarkdown} from '../js/outreach.js';
const pack=JSON.parse(await readFile(new URL('../packs/guide-pack.json',import.meta.url)));
const profiles=pack.components.research.profiles,date='2026-10-30';
const profile=profiles.find(p=>p.id==='hustle_fund_current_001');
const input={sector:'software as a service',stage:'pre-seed',geography:'US',check:{amount:150000,currency:'USD'}};
const result=assessInvestorFit(input,profile,date);
const saved=()=>saveInvestorEntry(emptyOutreachWorkspace(),input,result,pack.version,date);
test('controlled aliases preserve direction and do not broaden a narrow mandate',()=>{
 assert.equal(canonicalSector('  Software as a Service '),'saas');
 assert.equal(sectorFitsMandate('SaaS','software'),true);
 assert.equal(sectorFitsMandate('software','SaaS'),false);
 assert.equal(sectorFitsMandate('cyber security','technology'),true);
 assert.equal(sectorFitsMandate('AI','AI infrastructure'),false);
 assert.equal(sectorFitsMandate('climate','climate technology'),false);
 assert.equal(sectorFitsMandate('unknown','*'),false);
});
test('shortlist round-trips without changing saved assessments or experiment storage',()=>{
 const data=new Map([['founder_gap_data','keep experiments']]);
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const key=outreachStorageKey(pack),workspace=saved();workspace.entries[0].notes='Confirm full-time condition';
 writeOutreachWorkspace(storage,key,workspace);
 assert.deepEqual(readOutreachWorkspace(storage,key),workspace);
 assert.equal(data.get('founder_gap_data'),'keep experiments');
 assert.equal(key,outreachStorageKey({...pack,version:'next'}));
 assert.notEqual(key,outreachStorageKey({...pack,provider:{id:'someone_else'}}));
});
test('corrupt storage is preserved and quota errors propagate',()=>{
 const storage={getItem:()=>'{broken',setItem:()=>{throw new Error('quota');}};
 assert.throws(()=>readOutreachWorkspace(storage,'key'));
 assert.throws(()=>writeOutreachWorkspace(storage,'key',saved()),/quota/);
 assert.equal(storage.getItem('key'),'{broken');
});
test('source changes require review and preserve notes and older editable drafts',()=>{
 const w=saved(),e=w.entries[0];e.notes='Keep this answer';e.draft='My edited draft';e.draftKey=e.assessmentKey;e.draftFounderKey='{}';
 assert.equal(reviewInvestorEntry(e,profiles,input,date).changed,false);
 const modified={...profile,fit_claims:profile.fit_claims.map(c=>({...c,statement:c.statement+' Updated.'}))};
 const review=reviewInvestorEntry(e,[modified],input,date);
 assert.equal(review.changed,true);assert.equal(review.draftNeedsReview,true);assert.equal(review.canDraft,false);
 const next=saveInvestorEntry(w,input,review.current,'next',date);
 assert.equal(next.entries[0].notes,e.notes);assert.equal(next.entries[0].draft,e.draft);
 assert.equal(reviewInvestorEntry(next.entries[0],[modified],input,date).draftNeedsReview,true);
 assert.equal(reviewInvestorEntry(e,[],input,date).changed,true);
});
test('startup changes and stale evidence block drafting',()=>{
 const e=saved().entries[0];
 for(const review of [reviewInvestorEntry(e,profiles,{...input,stage:'seed'},date),reviewInvestorEntry(e,profiles,input,'2027-10-30')]){
   assert.equal(review.canDraft,false);assert.throws(()=>createOutreachDraft(e,{},review));
 }
});
test('draft uses founder input and source attribution, exports include unknowns and review state',()=>{
 const w=saved(),e=w.entries[0];w.founder={name:'Alex',company:'Example',summary:'Software for small shops.',progress:'Five pilot users.'};
 const review=reviewInvestorEntry(e,profiles,input,date,w.founder);e.draft=createOutreachDraft(e,w.founder,review);e.draftKey=e.assessmentKey;e.draftFounderKey=JSON.stringify(w.founder);
 assert.ok(e.draft.includes('Five pilot users.'));assert.ok(e.draft.includes(profile.source_url));
 assert.ok(!e.draft.includes('perfect fit'));assert.equal(reviewInvestorEntry(e,profiles,input,date,w.founder).draftNeedsReview,false);
 assert.equal(reviewInvestorEntry(e,profiles,input,date,{...w.founder,progress:'Changed'}).draftNeedsReview,true);
 const text=exportOutreachMarkdown(w,profiles,'2027-10-30',pack);
 assert.ok(text.includes('REVIEW REQUIRED'));assert.ok(text.includes('Full-time'));assert.ok(text.includes('Nothing')||text.includes('nothing'));
});
test('draft cites a current matching claim rather than an older or unrelated sector claim',()=>{
 const old={...profile.fit_claims.find(c=>c.field==='sector'),statement:'Old focus - do not use',checked_date:'2025-01-01'};
 const unrelated={...old,checked_date:date,values:['hardware'],statement:'Unrelated focus - do not use'};
 const p={...profile,fit_claims:[old,unrelated,...profile.fit_claims]};
 const r=assessInvestorFit(input,p,date),entry=saveInvestorEntry(emptyOutreachWorkspace(),input,r,pack.version,date).entries[0];
 const draft=createOutreachDraft(entry,{},reviewInvestorEntry(entry,[p],input,date));
 assert.ok(!draft.includes('do not use'));assert.ok(draft.includes('Software across verticals'));
});

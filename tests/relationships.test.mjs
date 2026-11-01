import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {validateRelationshipDataset,findRelationshipPaths,analyzeInvestorNetwork,findIntroductionPaths,relationshipEvidence} from '../js/relationships.js';
import {emptyPrivateRelationships,addPrivateContact,recordPrivateConnection,revokePrivateConnection} from '../js/private-relationships.js';
import {buildResearchPacket,validateResearchOutput} from '../js/research.js';
const root=new URL('../',import.meta.url),read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const publicData=await read('data/relationships.json'),demo=await read('data/relationships-demo.json'),pack=await read('packs/guide-pack.json'),date='2026-10-30';
const publicQuery={as_of:date,from:'investor:yc_accelerator_001',to:'activity:airbnb_user_visits',max_hops:4};
test('public and fictional artifacts validate and remain separate in the generated wrapper',async()=>{
 assert.equal(validateRelationshipDataset(publicData).isValid,true);assert.equal(validateRelationshipDataset(demo).isValid,true);
 const sandbox={};vm.runInNewContext(await readFile(new URL('packs/relationships.js',root),'utf8'),sandbox);
 assert.equal(JSON.stringify(sandbox.STARTUP_GUIDE_RELATIONSHIPS.research),JSON.stringify(publicData));
 assert.equal(sandbox.STARTUP_GUIDE_RELATIONSHIPS.fictional.dataset_kind,'fictional');
 assert.throws(()=>relationshipEvidence(demo,demo.edges.slice(0,1).map(e=>e.id),{as_of:date}),/Only public/);
});
test('bounded multi-hop discovery exposes the actual three-edge historical path and orientation',()=>{
 const result=findRelationshipPaths(publicData,publicQuery);assert.equal(result.paths.length,1);
 assert.deepEqual(result.paths[0].edges,['yc_airbnb','airbnb_snapshot_identity','airbnb_visits']);
 assert.deepEqual(result.paths[0].directions,['forward','reverse','forward']);assert.equal(result.truncated,false);
 assert.equal(findRelationshipPaths(publicData,{...publicQuery,directed:true}).paths.length,0);
 assert.equal(findRelationshipPaths(publicData,{...publicQuery,max_hops:2}).paths.length,0);
 assert.equal(findRelationshipPaths(publicData,{...publicQuery,historical_cutoff:'2009-01-23'}).paths.length,0);
 assert.throws(()=>findRelationshipPaths(publicData,{...publicQuery,max_hops:7}),/six/);
 assert.throws(()=>findRelationshipPaths(publicData,{...publicQuery,from:'unknown'}),/existing/);
});
test('same-company overlap is never promoted to documented same-round co-investment',()=>{
 const rounds=analyzeInvestorNetwork(publicData,{as_of:date,projection:'same_round'}),companies=analyzeInvestorNetwork(publicData,{as_of:date,projection:'shared_company'});
 assert.equal(rounds.links.length,1);assert.ok(rounds.links[0].shared_rounds.includes('round:tessl_inception_2024'));
 assert.ok(!rounds.links.some(e=>[e.from,e.to].includes('investor:firstminute_vc_seed_001')));
 assert.ok(companies.links.some(e=>[e.from,e.to].includes('investor:firstminute_vc_seed_001')&&[e.from,e.to].includes('investor:boldstart_ventures_current_001')));
 assert.equal(companies.coverage.complete,false);
 const dated=analyzeInvestorNetwork(publicData,{as_of:date,projection:'shared_company',from_date:'2024-01-01',to_date:'2024-12-31'});
 assert.ok(dated.omitted.unknown_event_date>0);assert.ok(!dated.links.some(e=>[e.from,e.to].includes('investor:firstminute_vc_seed_001')));
});
test('network bridge calculations agree with the labelled synthetic star topology',()=>{
 const result=analyzeInvestorNetwork(demo,{as_of:date,projection:'same_round'});
 assert.equal(result.dataset_kind,'fictional');assert.equal(result.links.length,3);assert.equal(result.components.length,1);
 const center=result.metrics.find(m=>m.id==='demo:a');assert.equal(center.degree,3);assert.equal(center.betweenness,1);
 assert.ok(result.metrics.filter(m=>m.id!=='demo:a').every(m=>m.degree===1&&m.betweenness===0));
});
function privateFixture(){
 let data=emptyPrivateRelationships([{id:'target',type:'investor',name:'Example target (test only)'}]);data=addPrivateContact(data,{id:'alice',name:'Example contact (test only)',permission:true});
 for(const [from,to,id] of [['private:self','alice','first'],['alice','target','second']])data=recordPrivateConnection(data,{id,source_id:'source-'+id,from,to,note:'Synthetic confirmation for tests only.',checked_date:date,verification:'founder_confirmed',permission_use:true,willingness:'yes',storage_permission:true});return data;
}
test('introduction discovery requires directional, permitted, recent confirmations and willingness',()=>{
 const data=privateFixture(),options={as_of:date,from:'private:self',to:'target',max_hops:4};
 const paths=findIntroductionPaths(data,options);assert.equal(paths.paths.length,1);assert.equal(paths.paths[0].status,'founder_confirmed_willing');
 assert.equal(findRelationshipPaths(data,options).paths.length,0,'generic public traversal excludes private edges');
 const unknown=structuredClone(data);unknown.edges[1].willingness='unknown';assert.equal(findIntroductionPaths(unknown,options).paths.length,0);
 assert.equal(findIntroductionPaths(unknown,{...options,include_possible:true}).paths[0].status,'possible_needs_confirmation');
 unknown.edges[1].willingness='no';assert.equal(findIntroductionPaths(unknown,{...options,include_possible:true}).paths.length,0);
 const revoked=revokePrivateConnection(data,'second',date);assert.equal(findIntroductionPaths(revoked,{...options,include_possible:true}).paths.length,0);assert.ok(revoked.changes.length>data.changes.length);
 assert.equal(findIntroductionPaths(data,{...options,as_of:'2027-10-30',include_possible:true}).paths.length,0);
 assert.equal(findIntroductionPaths(data,{...options,from:'target',to:'private:self'}).paths.length,0,'social edges cannot be reversed to invent permission');
 assert.throws(()=>relationshipEvidence(data,['first'],{as_of:date}),/Only public/);assert.throws(()=>analyzeInvestorNetwork(data,{as_of:date}),/Private contacts/);
});
test('private writes require storage consent, retain earlier confirmation evidence, and reject malformed links',()=>{
 const original=privateFixture();assert.throws(()=>addPrivateContact(original,{id:'new',name:'Unapproved',permission:false}),/permission/);
 const next=recordPrivateConnection(original,{id:'ignored-new',source_id:'new-source',from:'alice',to:'target',note:'Updated synthetic confirmation; willingness unknown.',checked_date:date,verification:'unconfirmed',permission_use:true,willingness:'unknown',storage_permission:true});
 assert.equal(next.edges.length,original.edges.length);assert.equal(next.edges.find(e=>e.id==='second').verification,'unconfirmed');assert.ok(next.sources.some(s=>s.id==='source-second'));assert.ok(next.changes.at(-1).previous);
 const malformed=structuredClone(publicData);malformed.edges[0].to='missing';assert.equal(validateRelationshipDataset(malformed).isValid,false);
 const privateLeak=structuredClone(publicData);privateLeak.nodes.push({id:'person',type:'person',name:'Do not distribute'});assert.equal(validateRelationshipDataset(privateLeak).isValid,false);
});
test('selected public path provenance enters research packets; private and fictional links cannot',()=>{
 const path=findRelationshipPaths(publicData,publicQuery).paths[0];
 const options={packet_id:'graph-packet',question:'What can this historical path suggest researching?',assessment_date:date,startup_context:{},investor_ids:[],snapshot_ids:[],relationship_selection:{dataset:publicData,edge_ids:path.edges}};
 const packet=buildResearchPacket(pack,options);assert.equal(packet.evidence_items.length,3);assert.equal(packet.linked_records.length,4);
 assert.ok(packet.evidence_items.every(e=>e.field==='relationship'));assert.equal(packet.selection_manifest.relationships.version,publicData.version);
 const output={packet_id:packet.packet_id,output_version:'1',summary:'Historical links do not establish current eligibility.',findings:[],interpretations:[],hypotheses:[],unknowns:['Current fit requires review.'],contradictions:[],proposed_investigations:[],historical_comparisons:[{snapshot_id:'airbnb_2009_01_23',evidence_ids:[packet.evidence_items[2].evidence_id],similarities:'A founder may investigate user needs.',differences:'Different market and timing.',temporal_limit:'Source correspondence was published later.'}],caveats:['No causal claim.'],change_summary:'Initial path research.'};
 assert.equal(validateResearchOutput(output,packet).isValid,true);
 assert.throws(()=>buildResearchPacket(pack,{...options,historical_cutoff:'2009-01-23'}),/needs review/);
 assert.throws(()=>buildResearchPacket(pack,{...options,relationship_selection:{dataset:{...publicData,...privateFixture()},edge_ids:['first']}}),/Only public|belong/);
});

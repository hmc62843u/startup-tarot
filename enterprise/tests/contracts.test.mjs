import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateBundle,organizationCatalog,executeOrganizationPlan,prepareOrganizationPacket} from '../domain.mjs';
import {validateGraphPlan} from '../../js/graph-research.js';
import {scopeKey} from '../neo4j.mjs';
const fixture=JSON.parse(await readFile(new URL('../fixtures/alpha.json',import.meta.url),'utf8'));
test('standalone reference preserves fictional records and bounded query contract',()=>{
 validateBundle(fixture);const input={assessment_date:'2026-10-30',question:'Inspect fictional shared rounds.',packet_id:'demo-packet'},catalog=organizationCatalog(fixture,input);
 assert.equal(catalog.simulation,true);assert.throws(()=>validateGraphPlan({summary:'Unsupported.',queries:[{kind:'cypher',from:null,to:null,max_hops:1,projection:null,reason:'Reject arbitrary code.'}]},catalog));
 const result=executeOrganizationPlan(fixture,input,{summary:'Fictional network.',queries:[{kind:'network',from:null,to:null,max_hops:1,projection:'same_round',reason:'Inspect a fictional star topology.'}]}),packet=prepareOrganizationPacket(fixture,input,result);
 assert.equal(packet.simulation,true);assert.equal(result.audit.results[0].result.metrics[0].betweenness,1);
 assert.notEqual(scopeKey('example_alpha','founder'),scopeKey('example_beta','founder'));
});

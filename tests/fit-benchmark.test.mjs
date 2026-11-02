import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {shortlistInvestors} from '../js/investor-fit.js';
const pack=JSON.parse(await readFile(new URL('../packs/guide-pack.json',import.meta.url)));
const benchmark=JSON.parse(await readFile(new URL('../data/fit-benchmark.json',import.meta.url)));
for(const scenario of benchmark.cases)test('benchmark: '+scenario.name,()=>{
 const results=shortlistInvestors(scenario.input,pack.components.research.profiles,scenario.as_of||benchmark.as_of);
 for(const [id,expected] of Object.entries(scenario.expected))assert.equal(results.find(r=>r.id===id)?.fit,expected,scenario.rationale);
 assert.equal(results.filter(r=>r.fit==='excluded').length,8);
});

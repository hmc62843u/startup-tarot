import test from 'node:test';
import {rehearseOpenFor} from '../tools/rehearse-openfor.mjs';
test('repeatable synthetic OpenFor operator demo over real HTTP',rehearseOpenFor);
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('live demo refuses pilot namespaces before writing or contacting storage',async()=>{
 await assert.rejects(()=>rehearseOpenFor({liveStore:{},organization:'openfor_pilot'}),/dedicated openfor_demo/);
});

test('demo CLI requires explicit live configuration and never defaults to simulation',()=>{
 const result=spawnSync(process.execPath,['tools/rehearse-openfor.mjs'],{encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/Live storage required/);
 const pilot=spawnSync(process.execPath,['tools/rehearse-openfor.mjs','--database-config','does-not-exist.json','--organization','openfor_pilot'],{encoding:'utf8'});
 assert.equal(pilot.status,1);assert.match(pilot.stderr,/dedicated openfor_demo/);assert.ok(!pilot.stderr.includes('ENOENT'));
});

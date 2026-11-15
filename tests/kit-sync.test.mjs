import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';

// Files copied by hand from Guide Pack Kit. This check runs only when the kit is
// checked out beside this repository (or GUIDE_PACK_KIT points to it); it is
// skipped elsewhere, including CI, which checks out this repository alone.
const app=new URL('../',import.meta.url);
const kit=process.env.GUIDE_PACK_KIT?new URL('file:///'+process.env.GUIDE_PACK_KIT.replace(/\\/g,'/').replace(/\/?$/,'/')):new URL('../../guide-pack-kit/',import.meta.url);
const kitPresent=await access(new URL('dist/guide-pack.json',kit)).then(()=>true,()=>false);
const read=url=>readFile(url,'utf8').then(text=>text.replace(/^﻿/,'').replace(/\r\n/g,'\n'));

// [kit path, app path, optional adjustment applied to the kit text before comparing]
const renamedProfileSchema=text=>text.replaceAll('"profile.schema.json"','"schema.json"');
const copies=[
    ['dist/guide-pack.json','packs/guide-pack.json'],
    ['examples/demo-guide-pack.json','packs/demo-guide-pack.json'],
    ['components/relationships.json','data/relationships.json'],
    ['schema/profile.schema.json','data/schema.json'],
    ['schema/guide-pack.schema.json','data/guide-pack.schema.json'],
    ['schema/guide-pack-v1.schema.json','data/guide-pack-v1.schema.json',renamedProfileSchema],
    ['schema/guide-pack-v2.schema.json','data/guide-pack-v2.schema.json',renamedProfileSchema],
    ['SOURCES.md','packs/SOURCES.md'],
    ['DATA_NOTICE.md','packs/DATA_NOTICE.md'],
    ['THIRD_PARTY_NOTICES.md','packs/THIRD_PARTY_NOTICES.md']
];

for(const [from,to,adjust=text=>text] of copies){
    test('Copy of Guide Pack Kit '+from+' is current: '+to,{skip:kitPresent?false:'Guide Pack Kit checkout not found'},async()=>{
        assert.equal(await read(new URL(to,app)),adjust(await read(new URL(from,kit))),to+' differs from guide-pack-kit/'+from+'. Copy the reviewed kit file again.');
    });
}

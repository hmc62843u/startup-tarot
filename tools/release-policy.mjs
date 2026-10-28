import {readFile,readdir} from 'node:fs/promises';
import {renderMarkdown} from './build-docs.mjs';

export function assertFictionalRecord(record) {
    if (record?.data_kind!=='fictional' || record.distribution_basis!=='original_demo' || record.data_license!=='MIT') {
        throw new Error('Public demo accepts only original fictional records under its declared MIT data license.');
    }
    const links=record.sources?record.sources.map(source=>source.url):[record.source_url,...(record.preparation_topics||[]).map(topic=>topic.source_url)];
    if (!links.length || links.some(url=>typeof url!=='string'||!/^\.\/docs\/examples\.html#[a-z0-9_-]+$/.test(url))) {
        throw new Error('Fictional records must link to local scenario specifications.');
    }
    if (record.sources?.some(source=>source.evidence_type!=='fictional_scenario')) throw new Error('Fictional records cannot claim historical evidence.');
}

export async function checkReleaseLibraries(root=new URL('../',import.meta.url)) {
    const spec=renderMarkdown(await readFile(new URL('EXAMPLES.md',root),'utf8'));
    for (const [directory,index,key] of [['profiles','data/library.json','profiles'],['startups','data/startup-library.json','snapshots']]) {
        const manifest=JSON.parse(await readFile(new URL(index,root),'utf8'));
        const listed=manifest[key];
        if (!Array.isArray(listed)||new Set(listed).size!==listed.length) throw new Error('Invalid or duplicate library index.');
        const files=await readdir(new URL(directory+'/',root),{withFileTypes:true});
        if (files.some(file=>!file.isFile()||!file.name.endsWith('.json'))) throw new Error('Only registered demo JSON files belong in '+directory);
        const actual=files.map(file=>'../'+directory+'/'+file.name).sort();
        if (JSON.stringify([...listed].sort())!==JSON.stringify(actual)) throw new Error('Unregistered or missing library files in '+directory);
        for (const path of listed) {
            const record=JSON.parse(await readFile(new URL(path,new URL(index,root)),'utf8'));
            assertFictionalRecord(record);
            const links=record.sources?record.sources.map(source=>source.url):[record.source_url,...(record.preparation_topics||[]).map(topic=>topic.source_url)];
            if (links.some(url=>!spec.includes('id="'+url.split('#')[1]+'"'))) throw new Error('Missing scenario specification anchor.');
        }
    }
}

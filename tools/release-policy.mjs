import {readFile,readdir} from 'node:fs/promises';
import {renderMarkdown} from './build-docs.mjs';
import {validateInvestorProfile} from '../js/validator.js';

const releaseText=value=>typeof value==='string'&&value.trim().length>0;
const releaseDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const releaseUrl=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password;}catch{return false;}};

/** Real investor facts stay separate from hypothetical founder inputs and fictional snapshots. */
export function assertReviewedInvestor(record) {
    const review=record?.distribution_review,attribution=record?.attribution;
    if(record?.data_kind!=='research'||record.distribution_basis!=='reviewed_sources'||!validateInvestorProfile(record).isValid)
        throw new Error('Real demo investors need a valid research profile and reviewed_sources basis.');
    if(!review||review.approved!==true||!releaseText(review.reviewer)||!releaseDate(review.reviewed_date)||!releaseText(review.scope)||!releaseText(review.statement))
        throw new Error('Real demo investors need explicit dated distribution approval, reviewer, scope and rights statement.');
    if(!releaseText(record.data_license)||['unknown','none','unlicensed'].includes(record.data_license.trim().toLowerCase())||!attribution||!releaseText(attribution.publisher)||!releaseUrl(attribution.source_url)||!releaseUrl(attribution.license_url)||!releaseText(attribution.version)||!releaseText(attribution.changes)||!releaseDate(attribution.retrieved_date))
        throw new Error('Real demo investors need a documented reuse basis and versioned attribution.');
    if(!Array.isArray(record.fit_claims)||!record.fit_claims.length||record.fit_claims.some(claim=>claim.basis!=='declared'||claim.checked_date>review.reviewed_date))
        throw new Error('Real demo investor comparisons need declared source claims checked by the review date.');
    if(record.retrieved_date>review.reviewed_date||attribution.retrieved_date>review.reviewed_date)
        throw new Error('Distribution review cannot predate the retrieved record or attribution.');
    if(record.preparation_topics?.length)
        throw new Error('Real demo profiles support mandate comparisons only; preparation topics need a reviewed research pack.');
    if(!releaseText(record.notes)||!releaseText(record.weight_notes)||record.weights_basis!=='editor_estimate')
        throw new Error('Real demo investors must disclose limitations and editorial weights separately from investor criteria.');
}

export function assertReleaseRecord(record,kind) {
    if(record?.data_kind==='fictional')return assertFictionalRecord(record);
    if(kind==='profiles')return assertReviewedInvestor(record);
    throw new Error('Real startup history belongs in a reviewed research pack; demo snapshots remain fictional.');
}

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
            assertReleaseRecord(record,key);
            const links=record.sources?record.sources.map(source=>source.url):[record.source_url,...(record.preparation_topics||[]).map(topic=>topic.source_url)];
            if (record.data_kind==='fictional'&&links.some(url=>!spec.includes('id="'+url.split('#')[1]+'"'))) throw new Error('Missing scenario specification anchor.');
        }
    }
}

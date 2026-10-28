import { validateInvestorProfile, validateStartupSnapshot } from './validator.js';

export const MAX_RESEARCH_BYTES=5*1024*1024;
function researchObject(value) { return value!==null && typeof value==='object' && !Array.isArray(value); }
function researchText(value) { return typeof value==='string' && value.trim().length>0; }
function researchDate(value) {
    if (typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed=new Date(value+'T00:00:00Z');
    return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
function researchUrl(value) {
    try { const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password; } catch { return false; }
}

function validateFlatResearch(value,kind='research') {
    const errors=[];
    if (!researchObject(value)) return {isValid:false,errors:['Guide Pack must be a JSON object.']};
    if (value.schema_version!==1) errors.push('Unsupported schema_version; expected 1.');
    if (!/^[a-z][a-z0-9_-]{2,63}$/.test(value.id||'')) errors.push('Package id must contain 3–64 lowercase letters, digits, underscores or hyphens, starting with a letter.');
    if (!researchText(value.name)) errors.push('Package name is required.');
    if (!/^\d+\.\d+\.\d+$/.test(value.version||'')) errors.push('Version must use major.minor.patch.');
    if (value.repository_url != null && !researchUrl(value.repository_url)) errors.push('Repository URL must be HTTP/HTTPS without credentials, or null for a local package.');
    if (!researchDate(value.updated_date)) errors.push('A real updated_date is required.');
    if (!researchObject(value.license)||!researchText(value.license.id)||['unknown','unlicensed','none'].includes(String(value.license?.id).toLowerCase())||!researchUrl(value.license.url)||!researchText(value.license.scope)||!researchText(value.license.notice)) errors.push('License id, URL, scope and notice are required; unknown or missing licensing cannot be imported.');
    if (!researchObject(value.rights_review)||value.rights_review.status!=='reviewed_for_distribution'||!researchDate(value.rights_review.reviewed_date)||!researchText(value.rights_review.statement)) errors.push('Publisher must declare a dated reuse-rights review for distribution. This declaration is not independent legal clearance.');
    let total=0;
    for (const [key,validate] of [['profiles',validateInvestorProfile],['snapshots',validateStartupSnapshot]]) {
        if (!Array.isArray(value[key])) {errors.push(key+' must be an array.');continue;}
        total+=value[key].length;
        if(value[key].length>250){errors.push('At most 250 '+key+' are supported.');continue;}
        const ids=new Set();
        value[key].forEach((record,index)=>{
            const label=key+'['+index+']';
            if (!researchObject(record)) {errors.push(label+' must be an object.');return;}
            if(record.data_kind!==kind)errors.push(label+' must explicitly use data_kind: '+kind+'; fictional and research records cannot be mixed.');
            if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(record.id||'')||ids.has(record.id))errors.push(label+' needs a unique simple record id.');
            ids.add(record.id);
            const result=validate(record);
            errors.push(...result.errors.map(error=>label+': '+error));
            const urls=key==='profiles'?[record.source_url,...(Array.isArray(record.preparation_topics)?record.preparation_topics:[]).map(topic=>topic?.source_url)]:
                (Array.isArray(record.sources)?record.sources:[]).map(source=>source?.url);
            if(kind==='research'&&urls.some(url=>!researchUrl(url)))errors.push(label+' needs absolute HTTP/HTTPS source URLs without credentials.');
        });
    }
    if(!total)errors.push('Include at least one investor profile or startup snapshot.');
    return {isValid:errors.length===0,errors};
}

// Providers supply declarative data. The app owns the only supported matching operator.
const providerId=value=>typeof value==='string'&&/^[a-z][a-z0-9_-]{2,63}$/.test(value);
function providerKeys(value,allowed,errors,label){
    if(!researchObject(value)){errors.push(label+' must be an object.');return false;}
    if(Object.keys(value).some(key=>!allowed.includes(key)))errors.push(label+' contains unsupported fields.');
    return true;
}
export function researchRecords(value) {
    if(value?.schema_version!==2)return {profiles:value?.profiles||[],snapshots:value?.snapshots||[]};
    const {research,matching,suggestions}=value.components;
    return {
        profiles:research.profiles.map(profile=>({...profile,preparation_topics:matching.investor_topics.filter(topic=>topic.profile_id===profile.id).map(({profile_id,...topic})=>topic)})),
        snapshots:research.snapshots.map(snapshot=>({...snapshot,preparation_lessons:matching.rules.filter(rule=>rule.snapshot_id===snapshot.id).map(rule=>{
            const suggestion=suggestions.find(item=>item.id===rule.suggestion_id);
            return {...suggestion,topic:rule.topic,business_models:rule.business_models,startup_stages:rule.startup_stages,validation_focus:rule.validation_focus,evidence_fields:rule.evidence_fields,source_ids:rule.source_ids};
        })}))
    };
}
export function validateResearchPackage(value) {
    if(value?.schema_version!==2)return validateFlatResearch(value);
    const errors=[];
    providerKeys(value,['schema_version','id','name','version','repository_url','updated_date','license','rights_review','provider','dataset_kind','quality','components'],errors,'Package');
    if(!['research','fictional'].includes(value.dataset_kind))errors.push('dataset_kind must be research or fictional.');
    if(providerKeys(value.provider,['id','name','url'],errors,'Provider')){
        if(!providerId(value.provider.id)||!researchText(value.provider.name))errors.push('Provider needs a stable id and name.');
        if(value.provider.url!=null&&!researchUrl(value.provider.url))errors.push('Provider URL must be HTTP/HTTPS without credentials or null.');
    }
    if(providerKeys(value.quality,['research','matching','suggestions'],errors,'Quality'))for(const key of ['research','matching','suggestions']){
        const claim=value.quality[key];
        if(providerKeys(claim,['status','statement','reviewed_date'],errors,'Quality '+key)){
            if(!['not_evaluated','self_reviewed','independent_review'].includes(claim.status)||!researchText(claim.statement))errors.push('Quality '+key+' needs a supported status and statement.');
            if(claim.status!=='not_evaluated'&&!researchDate(claim.reviewed_date))errors.push('Evaluated quality claims need a real reviewed_date.');
            if(claim.reviewed_date!==undefined&&!researchDate(claim.reviewed_date))errors.push('Quality review dates must be real dates.');
        }
    }
    if(!providerKeys(value.components,['research','matching','suggestions'],errors,'Components'))return {isValid:false,errors};
    const {research,matching,suggestions}=value.components;
    if(!providerKeys(research,['profiles','snapshots'],errors,'Research')||!providerKeys(matching,['investor_topics','rules','evaluation_cases'],errors,'Matching'))return {isValid:false,errors};
    for(const [label,items,limit] of [['profiles',research.profiles,250],['snapshots',research.snapshots,250],['investor_topics',matching.investor_topics,500],['rules',matching.rules,500],['suggestions',suggestions,500]]){
        if(!Array.isArray(items)||items.length>limit)errors.push(label+' must be an array with at most '+limit+' items.');
    }
    if(errors.length)return {isValid:false,errors};
    const profiles=new Set(research.profiles.map(p=>p?.id));const snapshots=new Set(research.snapshots.map(s=>s?.id));
    if(research.profiles.some(p=>!researchObject(p)||p.preparation_topics!==undefined)||research.snapshots.some(s=>!researchObject(s)||s.preparation_lessons!==undefined))errors.push('Research facts cannot embed matching topics or suggestion lessons.');
    const topics=new Set();
    for(const topic of matching.investor_topics){
        if(!providerKeys(topic,['profile_id','topic','statement','source_url','published_date','retrieved_date'],errors,'Investor topic'))continue;
        const key=topic.profile_id+':'+topic.topic;
        if(!profiles.has(topic.profile_id)||topics.has(key))errors.push('Investor topic needs an existing profile and a unique profile/topic pair.');
        topics.add(key);
    }
    const suggestionIds=new Set();
    for(const suggestion of suggestions){
        if(!providerKeys(suggestion,['id','title','target_task_id','approach','interpretation','caution'],errors,'Suggestion'))continue;
        for(const key of ['id','title','target_task_id','approach','interpretation','caution'])if(!researchText(suggestion[key]))errors.push('Suggestion needs '+key+'.');
        if(!providerId(suggestion.id)||suggestionIds.has(suggestion.id))errors.push('Suggestion needs a unique simple id.');
        suggestionIds.add(suggestion.id);
        if(!['suggestion:customer-evidence','suggestion:next-milestone','suggestion:team-evidence','suggestion:product-evidence'].includes(suggestion.target_task_id))errors.push('Unsupported suggestion task.');
    }
    const ruleIds=new Set();
    for(const rule of matching.rules){
        if(!providerKeys(rule,['id','type','snapshot_id','suggestion_id','topic','business_models','startup_stages','validation_focus','evidence_fields','source_ids'],errors,'Matching rule'))continue;
        if(!providerId(rule.id)||ruleIds.has(rule.id)||rule.type!=='context_topic_v1')errors.push('Rule needs a unique id and supported context_topic_v1 type.');
        ruleIds.add(rule.id);
        if(!snapshots.has(rule.snapshot_id)||!suggestionIds.has(rule.suggestion_id)||!researchText(rule.topic))errors.push('Rule needs an existing snapshot, suggestion and topic.');
        for(const key of ['business_models','startup_stages','validation_focus','evidence_fields','source_ids'])if(Array.isArray(rule[key])&&new Set(rule[key]).size!==rule[key].length)errors.push('Rule '+key+' cannot contain duplicates.');
    }
    for(const suggestion of suggestions)if(!matching.rules.some(rule=>rule?.suggestion_id===suggestion?.id))errors.push('Suggestion must be referenced by a rule.');
    if(matching.evaluation_cases!==undefined){
        if(!Array.isArray(matching.evaluation_cases)||matching.evaluation_cases.length>50)errors.push('Supply at most 50 evaluation cases.');
        else {
            const caseIds=new Set();
            for(const item of matching.evaluation_cases){
                if(!providerKeys(item,['id','name','startup','investor_ids','expected_suggestion_ids','rationale'],errors,'Evaluation case'))continue;
                if(!providerId(item.id)||caseIds.has(item.id)||!researchText(item.name)||!researchText(item.rationale))errors.push('Evaluation case needs a unique id, name and rationale.');
                caseIds.add(item.id);
                for(const [key,known] of [['investor_ids',profiles],['expected_suggestion_ids',suggestionIds]])if(!Array.isArray(item[key])||item[key].length>known.size||new Set(item[key]).size!==item[key].length||item[key].some(id=>!known.has(id)))errors.push('Evaluation '+key+' must uniquely reference known records.');
                if(!providerKeys(item.startup,['business_model','current_stage','validation_focus','sectors'],errors,'Evaluation startup'))continue;
                const choices={business_model:['marketplace','service','saas','hardware','consumer_product','other'],current_stage:['pre-company','idea','pre-seed','seed','series-a','growth'],validation_focus:['customer_problem','demand','operations','technical_feasibility']};
                for(const [key,allowed] of Object.entries(choices))if(item.startup[key]!==null&&!allowed.includes(item.startup[key]))errors.push('Evaluation startup '+key+' must be supported or null.');
                if(!Array.isArray(item.startup.sectors)||item.startup.sectors.length>20||item.startup.sectors.some(value=>!researchText(value)))errors.push('Evaluation sectors must be an array of at most 20 nonempty strings.');
            }
        }
    }
    if(errors.length)return {isValid:false,errors};
    // Reuse the app's established validators and matcher after a non-executable projection.
    const records=researchRecords(value);
    return validateFlatResearch({...value,schema_version:1,...records},value.dataset_kind);
}

export function parseResearchPackage(text) {
    if (typeof text!=='string'||text.length>MAX_RESEARCH_BYTES) throw new Error('Choose a JSON Guide Pack no larger than 5 MB.');
    let value;
    try { value=JSON.parse(text.replace(/^\uFEFF/,'')); } catch { throw new Error('The selected file is not valid JSON.'); }
    const result=validateResearchPackage(value);
    if(!result.isValid)throw new Error(result.errors.slice(0,12).join(' '));
    return value;
}

export function researchWorkspaceKey(library) { return library?(library.schema_version===2?'provider:'+library.provider.id+':':'research:')+library.id+'@'+library.version:'demo'; }

export function researchContentKey(library) {
    return JSON.stringify(library,(key,value)=>researchObject(value)?Object.fromEntries(Object.keys(value).sort().map(name=>[name,value[name]])):value);
}

import {validateResearchPackage,researchRecords} from './research-library.js';
import {validateRelationshipDataset} from './relationships.js';

export const publishingRequire=(ok,message,status=400)=>{if(!ok)throw Object.assign(new Error(message),{status});};
export const publishingKind=pack=>pack.schema_version===2?pack.dataset_kind:'research';
export function validatePublishingBundle(bundle){
 publishingRequire(bundle?.schema_version===1&&Object.keys(bundle).every(k=>['schema_version','pack','relationships'].includes(k)),'Expected {schema_version:1, pack, relationships}; private contacts require their separate owner route.');
 const pack=validateResearchPackage(bundle.pack),graph=validateRelationshipDataset(bundle.relationships);
 publishingRequire(pack.isValid,'Invalid Guide Pack: '+pack.errors.join(' '));publishingRequire(graph.isValid,'Invalid graph: '+graph.errors.join(' '));
 const data=bundle.relationships;
 publishingRequire(['research','fictional'].includes(data.dataset_kind)&&data.dataset_kind===publishingKind(bundle.pack),'Pack and graph must both be research or both explicitly fictional.');
 publishingRequire(data.pack_id===bundle.pack.id&&data.provider_id===(bundle.pack.provider?.id||'legacy'),'Graph provider/pack identity mismatch.');
 publishingRequire(new TextEncoder().encode(JSON.stringify(bundle)).length<=5*1024*1024,'Import exceeds 5 MiB.');
 const records=researchRecords(bundle.pack);
 for(const n of data.nodes){if(n.profile_id)publishingRequire(records.profiles.some(p=>p.id===n.profile_id),'Unknown profile_id.');if(n.snapshot_id)publishingRequire(records.snapshots.some(p=>p.id===n.snapshot_id),'Unknown snapshot_id.');}
 return bundle;
}
const publishingSensitive=new Set(['__proto__','prototype','constructor','private_contacts','private_connections','private_relationships','owner_notes','research_history','research_runs','runs','feedback','access_token','refresh_token','id_token','client_secret','password','credentials','token_sha256','authorization']);
export function rejectPublishingSecrets(value,path='bundle'){
 if(!value||typeof value!=='object')return;
 for(const [key,child] of Object.entries(value)){publishingRequire(!publishingSensitive.has(key.toLowerCase()),'Remove reserved private/credential/history field: '+path+'.'+key);rejectPublishingSecrets(child,path+'.'+key);}
}
// Talk and podcast recordings identify the people speaking, so founder packages may not cite them.
// Keep person-level material (names, quotes, links to talks) in the operator's own graph.
// Hosts (and host/path pairs) that serve recorded talks, podcasts, webinars or videos. A link matches with or
// without http(s):// ("youtu.be/x"); the host must start a word and end the host part, so look-alikes such as
// "notyoutube.com.example.org" pass. Links to session pages on other sites are left to the human reviewer.
const recordingHosts=['youtube\\.com','youtu\\.be','youtube-nocookie\\.com','vimeo\\.com','podcasts\\.apple\\.com','open\\.spotify\\.com',
 'podcasters\\.spotify\\.com','anchor\\.fm','soundcloud\\.com','podcasts\\.google\\.com','music\\.amazon\\.[a-z.]+/podcasts','overcast\\.fm',
 'pca\\.st','pocketcasts\\.com','castbox\\.fm','podbean\\.com','tiktok\\.com','fb\\.watch','facebook\\.com/watch','(?:x|twitter)\\.com/i/broadcasts',
 'linkedin\\.com/(?:events|video)','zoom\\.us/rec','loom\\.com/share','twitch\\.tv','dailymotion\\.com','ted\\.com/talks','rumble\\.com',
 'bilibili\\.com','b23\\.tv','nicovideo\\.jp','nico\\.ms','voicy\\.jp','stand\\.fm','listen\\.style'];
const personLevelLink=new RegExp('(?<![a-z0-9.@-])(?:https?:\\/\\/)?(?:[a-z0-9-]+\\.)*(?:'+recordingHosts.join('|')+')(?=[\\/:?#\\s]|[.,;)](?:\\s|$)|$)','i');
export function rejectPersonLevelSources(value,path='bundle'){
 if(typeof value==='string'){publishingRequire(!personLevelLink.test(value),'Remove talk or podcast link (person-level source; keep it in the operator graph): '+path);return;}
 if(!value||typeof value!=='object')return;
 for(const [key,child] of Object.entries(value))rejectPersonLevelSources(child,path+'.'+key);
}
// Names of people held in the operator's graph must not reach founder packages either.
// The people list is private operator data ({schema_version:1, people:[{name, aliases?}]}); it is
// never written into a package, and errors cite the list position, not the name.
const personText=s=>String(s).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const latinWord=/[\p{Script=Latin}\p{N}]/u;
export function validatePeopleList(list){
 publishingRequire(list?.schema_version===1&&Array.isArray(list.people)&&Object.keys(list).every(k=>['schema_version','people'].includes(k)),'People list must be {schema_version:1, people:[{name, aliases}]}.');
 list.people.forEach((p,i)=>{publishingRequire(p&&typeof p.name==='string'&&Object.keys(p).every(k=>['name','aliases'].includes(k))&&(p.aliases===undefined||Array.isArray(p.aliases)&&p.aliases.every(a=>typeof a==='string')),'People list entry #'+(i+1)+' needs a name and optional aliases.');
  for(const n of [p.name,...(p.aliases||[])])publishingRequire(personText(n).length>=2,'People list entry #'+(i+1)+' has a name or alias shorter than 2 characters.');});
 return list;
}
// Separators people put between name parts: spaces, dots, hyphens, underscores, middle dots.
const nameSeparator='[\\s._\\-\u00b7\u30fb]';
// Titles and honorifics that mark a lone surname or given name as a person (lowercase; text is lowercased first).
const personTitles='(?:mr|mrs|ms|miss|mx|dr|prof|professor)\\.?';
const personSuffixes='san|sama|sensei|shi';
const japaneseHonorifics='さん|様|さま|氏|先生|サン';
const escapeRegExp=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function personMatchers(list){
 return validatePeopleList(list).people.map((p,i)=>({entry:i+1,forms:[p.name,...(p.aliases||[])].map(personText).map(form=>{
  // Other scripts (kanji, kana) match as substrings, ignoring separators between characters ("岡部 理奈").
  // A leading part of two or more characters also matches before a Japanese honorific ("岡部さん", "岡部氏"), since the
  // family name comes first; a one-character family name has to be listed as an alias.
  if(!latinWord.test(form)){const chars=[...form.replace(new RegExp(nameSeparator,'gu'),'')];const full=chars.map(escapeRegExp).join(nameSeparator+'*');
   const heads=[];for(let n=2;n<chars.length;n++)heads.push(chars.slice(0,n).map(escapeRegExp).join(nameSeparator+'*'));
   const re=new RegExp(full+(heads.length?'|(?:'+heads.join('|')+')'+nameSeparator+'*(?:'+japaneseHonorifics+')':''),'u');return text=>re.test(text);}
  // Latin forms match whole words only, so "Okabe" doesn't match "Okabeworks". Name parts may be joined by any
  // separator ("rina.okabe"); a two-part name also matches in reversed order ("Okabe Rina"). A single-letter part
  // ("R. Okabe") needs a separator, so initials never glue onto a word.
  const parts=form.split(new RegExp(nameSeparator+'+','u')).filter(Boolean);
  const join=ps=>ps.map(escapeRegExp).join(ps.some(x=>[...x].length<2)?nameSeparator+'+':nameSeparator+'*');
  const orders=[parts];if(parts.length===2&&parts.every(x=>[...x].length>=2))orders.push([parts[1],parts[0]]);
  // A single part of the name also matches when a title or honorific marks it as a person ("Ms. Okabe", "Okabe-san").
  const single=parts.length>1?parts.filter(x=>[...x].length>=2).map(escapeRegExp):[];
  const titled=single.length?'|(?:'+personTitles+')'+nameSeparator+'*(?:'+single.join('|')+')|(?:'+single.join('|')+')'+nameSeparator+'?(?:'+personSuffixes+')':'';
  const re=new RegExp('(?<![\\p{L}\\p{N}])(?:'+orders.map(join).join('|')+titled+')(?![\\p{L}\\p{N}])','u');return text=>re.test(text);})}));
}
export function rejectListedPeople(value,list,path='bundle'){
 const matchers=personMatchers(list);
 (function walk(v,p){
  if(typeof v==='string'){const text=personText(v);for(const m of matchers)publishingRequire(!m.forms.some(f=>f(text)),'Remove listed person #'+m.entry+' (person-level material; keep it in the operator graph): '+p);return;}
  if(!v||typeof v!=='object')return;
  // Keys are checked too, so a name used as an object key ({"Rina Okabe": …}) is caught.
  for(const [key,child] of Object.entries(v)){const k=personText(key);for(const m of matchers)publishingRequire(!m.forms.some(f=>f(k)),'Remove listed person #'+m.entry+' (person-level material in a field name; keep it in the operator graph): '+p);walk(child,p+'.'+key);}
 })(value,path);
 return matchers.length;
}
export function validatePublishingEnvelope(envelope){
 publishingRequire(envelope?.schema_version===1&&Object.keys(envelope).every(k=>['schema_version','organization','revision','bundle'].includes(k)),'Expected an organization distribution export envelope.');
 publishingRequire(/^[a-z][a-z0-9_-]{2,63}$/.test(envelope.organization)&&typeof envelope.revision==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(envelope.revision),'Organization and explicit revision required.');
 validatePublishingBundle(envelope.bundle);rejectPublishingSecrets(envelope.bundle);rejectPersonLevelSources(envelope.bundle);return envelope;
}
export function validatePublishingReview(review){
 const fields=['id','version','brand','audience','reviewed_by','reviewed_date','distribution_statement','update_instructions','attribution_notice','approved','private_data_reviewed','rights_reviewed'];
 publishingRequire(review&&Object.keys(review).length===fields.length&&fields.every(k=>Object.hasOwn(review,k)),'Supply the documented release review fields only.');
 publishingRequire(/^[a-z][a-z0-9_-]{2,63}$/.test(review.id)&&/^\d+\.\d+\.\d+$/.test(review.version),'Simple release ID and semantic version required.');
 for(const field of ['brand','audience','reviewed_by','distribution_statement','update_instructions','attribution_notice'])publishingRequire(typeof review[field]==='string'&&review[field].trim().length>0&&review[field].length<=4000,'Review needs bounded text: '+field);
 publishingRequire(review.brand.length<=100&&!/[\r\n]/.test(review.brand),'Brand must fit on one line (100 characters).');
 publishingRequire(/^\d{4}-\d{2}-\d{2}$/.test(review.reviewed_date)&&Number.isFinite(Date.parse(review.reviewed_date))&&new Date(review.reviewed_date).toISOString().slice(0,10)===review.reviewed_date,'Real reviewed_date required.');
 publishingRequire(review.approved===true&&review.private_data_reviewed===true&&review.rights_reviewed===true,'Operator approval, privacy review and distribution-rights review are required.');return review;
}

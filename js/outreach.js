import {validFitClaim} from './validator.js';
import {sectorFitsMandate} from './sectors.js';
import {assessInvestorFit} from './investor-fit.js';

/** Version-independent identity preserves notes across research updates. */
export function outreachStorageKey(pack) {
  return 'startup-guide-outreach:'+JSON.stringify([pack.provider?.id||'legacy',pack.id]);
}
export function emptyOutreachWorkspace(){return {schema_version:1,query:{},founder:{},entries:[]};}
export function readOutreachWorkspace(storage,key){
  const raw=storage.getItem(key);
  if(raw===null)return emptyOutreachWorkspace();
  const data=JSON.parse(raw);
  const isObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
  if(data?.schema_version!==1||!Array.isArray(data.entries)||!isObject(data.query)||!isObject(data.founder)
    ||data.entries.some(e=>!e||typeof e.id!=='string'||!isObject(e.input)||!isObject(e.result)||!['evidence','reasons','conflicts','unknowns','cautions','matchedFields'].every(k=>Array.isArray(e.result[k]))||!e.result.evidence.every(validFitClaim)||typeof e.notes!=='string'||typeof e.draft!=='string')
    ||new Set(data.entries.map(e=>e.id)).size!==data.entries.length)throw new Error('Saved shortlist format is invalid. Existing data has been preserved.');
  return data;
}
export function writeOutreachWorkspace(storage,key,data){storage.setItem(key,JSON.stringify(data));}
export function assessmentKey(input,result){
  return JSON.stringify([input,result.id,result.name,result.fit,result.matchedFields,result.evidenceCoverage,result.reasons,result.conflicts,result.unknowns,result.cautions,result.evidence]);
}
export function saveInvestorEntry(workspace,input,result,packVersion,date){
  if(result.fit==='excluded')throw new Error('Excluded records cannot be shortlisted.');
  const previous=workspace.entries.find(e=>e.id===result.id);
  const key=assessmentKey(input,result);
  const entry={id:result.id,input:structuredClone(input),result:structuredClone(result),assessmentKey:key,
    packVersion,savedAt:date,archived:previous?.archived||false,notes:previous?.notes||'',draft:previous?.draft||'',draftKey:previous?.draftKey||null,draftFounderKey:previous?.draftFounderKey||null};
  return {...workspace,query:structuredClone(input),entries:[...workspace.entries.filter(e=>e.id!==entry.id),entry]};
}
export function reviewInvestorEntry(entry,profiles,input,date,founder={}){
  const profile=profiles.find(p=>p.id===entry.id);
  const current=profile?assessInvestorFit(input,profile,date):null;
  const changed=!current||assessmentKey(input,current)!==entry.assessmentKey;
  return {current,changed,asOf:date,canDraft:!changed&&['strong','investigate'].includes(current?.fit),
    draftNeedsReview:!!entry.draft&&(changed||entry.draftKey!==entry.assessmentKey||entry.draftFounderKey!==JSON.stringify(founder))};
}
export function verificationQuestions(result){
  return [...new Set([...result.unknowns,...result.conflicts,...result.cautions,
    'Confirm the fund is currently deploying capital and accepting approaches.',
    'Confirm full eligibility, available check size and any competing portfolio investments.'])];
}
export function createOutreachDraft(entry,founder,review){
  if(!review.canDraft)throw new Error('Review and update the saved assessment before preparing outreach. Stage and sector must align.');
  const r=review.current;
  const source=r.evidence.find(c=>c.field==='sector'&&c.basis==='declared'&&validFitClaim(c)
    &&Date.parse(c.checked_date)<=Date.parse(review.asOf)&&Date.parse(review.asOf)-Date.parse(c.checked_date)<=180*86400000
    &&c.values.some(v=>sectorFitsMandate(entry.input.sector,v)));
  return 'Subject: '+(founder.company||'[Company]')+' - investment fit enquiry\n\nHello '+r.name+' team,\n\n'+
    'I am '+(founder.name||'[Your name]')+', building '+(founder.company||'[Company]')+'. '+(founder.summary||'[Describe what you build and who it serves.]')+'\n\n'+
    (founder.progress?'Our current evidence: '+founder.progress+'\n\n':'[Add a specific, verifiable progress point before sending.]\n\n')+
    'I read your published investment focus: '+(source?.statement||'[Confirm the current investment focus.]')+'\n'+
    (source?'Source: '+source.source_url+' (checked '+source.checked_date+').\n\n':'\n')+
    'We are exploring '+entry.input.stage+' funding'+(entry.input.check&&Number.isFinite(entry.input.check.amount)&&entry.input.check.amount>0?' and a check of '+entry.input.check.amount+' '+entry.input.check.currency:'')+'. '+
    'Would you be open to reviewing a short overview and confirming whether this is within your current mandate?\n\n'+
    'Best,\n'+(founder.name||'[Your name]');
}
export function exportOutreachMarkdown(workspace,profiles,date,pack){
  const lines=['# Investor shortlist','', 'Exported: '+date,'Pack: '+pack.name+' '+pack.version,
    'Founder-provided information and editable drafts are not independently verified. Saved evidence is historical until reviewed. Nothing has been sent.','',
    '## Startup profile','',JSON.stringify(workspace.query),'',
    'Founder: '+(workspace.founder.name||'Not supplied'),'Founder-provided progress: '+(workspace.founder.progress||'Not supplied'),
    'Company: '+(workspace.founder.company||'Not supplied'),'Summary: '+(workspace.founder.summary||'Not supplied'),''];
  for(const e of workspace.entries){
    const review=reviewInvestorEntry(e,profiles,workspace.query,date,workspace.founder);
    lines.push('## '+e.result.name,'','Saved: '+e.savedAt+' | Pack '+e.packVersion+' | '+(e.archived?'Archived':'Active'),
      'Saved alignment: '+e.result.fit+' | Evidence coverage: '+e.result.evidenceCoverage,
      'Review: '+(review.changed?'Required - startup profile or evidence changed':'Assessment unchanged'),
      'Timing (as of '+date+'): '+((review.current||e.result).timing?.text||'Not assessed'),
      'Saved startup profile: '+JSON.stringify(e.input),'','### Verification questions','',
      ...verificationQuestions(review.current||e.result).map(q=>'- '+q),'','### Notes','',e.notes||'None','',
      '### Saved evidence','',...e.result.evidence.map(c=>'- '+c.statement+' | '+c.source_url+' | Checked '+c.checked_date),'',
      '### Editable outreach draft','',review.draftNeedsReview?'REVIEW REQUIRED: this draft may use an older assessment.':'Draft for founder review; nothing has been sent.',
      '',e.draft||'No draft saved.','');
  }
  return lines.join('\n');
}

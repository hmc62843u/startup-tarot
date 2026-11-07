import {sectorFitsMandate} from './sectors.js';
import {validFitClaim, validTimingClaim, announcedStart} from './validator.js';

const YEAR=365.25*86400000;
/** Informational "for now or for later" hint from the latest dated fund announcement. Never changes fit or ranking. */
export function assessTiming(profile, asOf) {
  const day=Date.parse(asOf);
  const claims=(profile.timing_claims||[]).filter(c=>validTimingClaim(c)&&['declared','observed'].includes(c.basis)
    &&Number.isFinite(day)&&Date.parse(c.checked_date)<=day&&Date.parse(announcedStart(c.announced_date))<=day);
  if(!claims.length) return {status:'unknown',text:'Timing unknown: no dated fund announcement in this collection. Check recent investments and ask whether the fund is making new investments.',evidence:[]};
  const c=claims.reduce((a,b)=>announcedStart(b.announced_date)>announcedStart(a.announced_date)?b:a);
  const age=(day-Date.parse(announcedStart(c.announced_date)))/YEAR;
  const stale=day-Date.parse(c.checked_date)>180*86400000?' Fund information checked '+c.checked_date+'; it needs review.':'';
  const fund=c.fund_name+', announced '+c.announced_date;
  const [status,text]=age<3?['now',fund+'. Likely still making new investments; confirm with the investor.']
    :age>5?['later','Latest fund found: '+fund+'. It may now focus on follow-on investments; confirm whether it is making new ones.']
    :['unknown','Latest fund found: '+fund+'. Timing is unclear; check recent investments and confirm with the investor.'];
  return {status,text:text+stale,evidence:[c]};
}

export function assessInvestorFit(startup, profile, asOf) {
  const result={id:profile.id,name:profile.name,fit:'insufficient',evidenceCoverage:'none',matchedFields:[],reasons:[],conflicts:[],unknowns:[],evidence:[],cautions:[...(profile.eligibility_requirements||[]),...(profile.anti_criteria||[])]};
  if(profile.comparison_enabled===false || profile.funding_type!=='equity' || profile.data_kind==='fictional') {
    return {...result,fit:'excluded',unknowns:['Historical, fictional, or non-equity record; excluded from the investor shortlist.']};
  }
  const day=Date.parse(asOf);
  const labels={stage:'Funding stage',sector:'Sector',geography:'Geography',check:'Investor check'};
  for(const field of ['stage','sector','geography','check']) {
    const input=startup[field];
    const label=labels[field];
    const claims=(profile.fit_claims||[]).filter(c=>validFitClaim(c)&&c.field===field);
    result.evidence.push(...claims);
    const usable=claims.filter(c=>c.basis==='declared'&&Number.isFinite(day)&&day>=Date.parse(c.checked_date)&&day-Date.parse(c.checked_date)<=180*86400000);
    if(!input || input==='unknown' || (field==='check'&&(!Number.isFinite(input.amount)||input.amount<=0))) {
      result.unknowns.push(label+': startup information missing.');continue;
    }
    if(!usable.length){result.unknowns.push(label+': no recent declared criterion (180-day review policy).');continue;}
    let matched=false,conflict=false,uncertain=false;
    const details=[...new Set(usable.map(c=>c.statement))].join(' ');
    for(const c of usable){
      if(field==='check'&&c.currency!==input.currency){uncertain=true;continue;}
      const match=field==='check'?input.amount>=c.min&&input.amount<=c.max:c.values.some(v=>field==='sector'?sectorFitsMandate(input,v):v.toLowerCase()===String(input).trim().toLowerCase()||v==='*');
      if(match)matched=true;else if(c.strict)conflict=true;else uncertain=true;
    }
    if(matched&&conflict)result.unknowns.push(label+': conflicting declared criteria; confirm with the investor. '+details);
    else if(conflict)result.conflicts.push(label+': outside a documented requirement. '+details);
    else if(matched){result.matchedFields.push(field);result.reasons.push(label+': aligns with a documented criterion. '+details);}
    else result.unknowns.push(label+': '+(uncertain?'outside stated focus or currency differs; confirm fit. ':'not established. ')+details);
  }
  result.fit=result.conflicts.length?'mismatch':result.matchedFields.length===4?'strong':
    result.matchedFields.includes('stage')&&result.matchedFields.includes('sector')?'investigate':'insufficient';
  result.evidenceCoverage=!result.unknowns.length?'complete':result.reasons.length||result.conflicts.length?'partial':'none';
  result.timing=assessTiming(profile,asOf);
  return result;
}

export function shortlistInvestors(startup,profiles,asOf){
  const order={strong:0,investigate:1,insufficient:2,mismatch:3,excluded:4};
  return profiles.map(p=>assessInvestorFit(startup,p,asOf)).sort((a,b)=>order[a.fit]-order[b.fit]||b.reasons.length-a.reasons.length||a.id.localeCompare(b.id));
}

/** Editorial vocabulary, not inferred investor intent. Broader mandates accept narrower sectors only. */
export function canonicalSector(value){
  const text=String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  return ({'software as a service':'saas','software-as-a-service':'saas','cyber security':'cybersecurity',
    'cyber-security':'cybersecurity','artificial intelligence':'ai','deeptech':'deep tech',
    'climate tech':'climate technology','climate-tech':'climate technology','ai infra':'ai infrastructure'})[text]||text;
}
export function sectorFitsMandate(sector,mandate){
  const input=canonicalSector(sector),target=canonicalSector(mandate);
  if(!input||input==='unknown')return false;
  if(input===target||target==='*')return true;
  const broader={saas:['software','technology'],software:['technology'],cybersecurity:['software','technology'],
    'ai infrastructure':['technology'],'deep tech':['technology'],'climate technology':['climate','technology']};
  return (broader[input]||[]).includes(target);
}

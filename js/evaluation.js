import { matchHistoricalCandidates } from './matching.js';

/** Run validated provider examples through the same matcher used for actual suggestions. */
export function evaluateMatchingCases(cases,profiles,snapshots) {
  const results=cases.map(item=>{
    const lens=item.investor_ids.length?profiles.filter(profile=>item.investor_ids.includes(profile.id)):profiles;
    const actual=[...new Set(matchHistoricalCandidates(item.startup,lens,snapshots).map(suggestion=>suggestion.id.replace(/^historical:/,'')))].sort();
    const expected=[...item.expected_suggestion_ids].sort();
    return {id:item.id,name:item.name,rationale:item.rationale,actual,expected,passed:JSON.stringify(actual)===JSON.stringify(expected)};
  });
  const positive=cases.filter(item=>item.expected_suggestion_ids.length>0).length;
  return {total:results.length,passed:results.filter(item=>item.passed).length,failed:results.filter(item=>!item.passed).length,positive,negative:cases.length-positive,results};
}

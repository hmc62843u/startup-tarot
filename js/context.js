/** Automated checks use modeled focus only; estimated weights are never requirements. */
export function normalizeSector(value) {
  const normalized = String(value).trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const aliases = { 'artificial intelligence': 'ai', 'deeptech': 'deep tech', 'hard tech': 'hardtech', 'software as a service': 'saas', 'developer tools': 'developer tools' };
  return aliases[normalized] || normalized;
}

export function analyzeGap(startup, profile) {
  if (profile.comparison_enabled === false) return [];
  const gaps = [];
  if (startup.current_stage && startup.current_stage !== 'unknown' && !profile.stage_focus.includes(startup.current_stage)) {
    gaps.push({
      severity: 'MEDIUM', category: 'Stage Fit',
      message: 'Your stage (' + startup.current_stage + ') is outside this profile’s modeled focus (' + profile.stage_focus.join(', ') + ').',
      action: 'Confirm the investor’s current stage mandate; this is not an eligibility decision.'
    });
  }
  const sectors = (profile.sector_focus || []).map(normalizeSector);
  const startupSectors = (startup.sectors || []).map(normalizeSector).filter(sector=>sector && sector!=='unknown');
  const generalist = sectors.some(s => ['broad', 'generalist', 'all', '*', 'all sectors', 'all industries'].includes(s));
  if (startupSectors.length && sectors.some(sector=>sector && sector!=='unknown') && !generalist && !sectors.some(s => startupSectors.includes(s))) {
    gaps.push({
      severity: 'MEDIUM', category: 'Sector Fit',
      message: 'No sector label matches this profile’s modeled focus.',
      action: 'Review sector adjacency and the investor’s mandate; a label mismatch does not establish exclusion.'
    });
  }
  return gaps;
}

export function profileSectors(profile) {
  if (!Array.isArray(profile.sector_focus)) return ['unknown'];
  if (!profile.sector_focus.length) return ['generalist'];
  return [...new Set(profile.sector_focus.map(normalizeSector).filter(Boolean).map(s =>
    ['broad', 'all', '*', 'all sectors', 'all industries'].includes(s) ? 'generalist' : s))];
}

/** Browsing filters never alter the comparison library. Specific sectors include generalists. */
export function filterProfiles(profiles, filters = {}) {
  return profiles.filter(profile => {
    if (filters.funding && profile.funding_type !== filters.funding) return false;
    if (filters.stage && !profile.stage_focus.includes(filters.stage)) return false;
    if (filters.sector) {
      const sector = normalizeSector(filters.sector);
      const sectors = profileSectors(profile);
      if (!sectors.includes(sector) && !(sector !== 'unknown' && sectors.includes('generalist'))) return false;
    }
    return true;
  });
}

/** Report selections are explicit and independent of the library browser controls. */
export function buildComparison(startup, profiles, filters = {}, groupBy = '') {
  const comparable = profiles.filter(profile => profile.comparison_enabled !== false);
  const selected = filterProfiles(comparable, filters).filter(profile => !filters.profileId || profile.id === filters.profileId);
  const results = selected.map(profile => ({ profile, gaps: analyzeGap(startup, profile) })).filter(result => {
    if (filters.focus === 'stage') return result.gaps.some(gap => gap.category === 'Stage Fit');
    if (filters.focus === 'sector') return result.gaps.some(gap => gap.category === 'Sector Fit');
    if (filters.focus === 'none') return result.gaps.length === 0;
    return true;
  });
  const groups = groupBy === 'funding'
    ? [...new Set(results.map(result => result.profile.funding_type || 'unknown'))].sort().map(key => ({
        key, results: results.filter(result => (result.profile.funding_type || 'unknown') === key)
      }))
    : [{ key: '', results }];
  return { total: comparable.length, results, groups };
}

export function startupEvidenceKey(startup) {
  return JSON.stringify([
    startup.current_stage ?? null, startup.sectors ?? [],
    startup.founders_have_domain_expertise ?? null,
    startup.prototype_status ?? null, startup.paid_pilots ?? null,
    startup.business_model || null, startup.validation_focus || null
  ]);
}

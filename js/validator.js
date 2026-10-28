/**
 * Validate user supplied investor profiles before they are stored or analyzed.
 */

const ALLOWED_TYPES = ["angel", "vc_seed", "vc_series_a", "accelerator", "grant", "corporate"];
const ALLOWED_STAGES = ["pre-company", "idea", "pre-seed", "seed", "series-a", "growth"];
const FUNDING_TYPES = ['equity', 'grant', 'unknown'];
const ORGANIZATION_TYPES = ['vc', 'corporate_vc', 'angel', 'accelerator', 'talent_investor', 'grant_program', 'unknown'];

function validSource(value,fictional=false) {
  if (fictional) return typeof value==='string' && /^\.\/docs\/examples\.html#[a-z0-9_-]+$/.test(value);
  try { return ['http:','https:'].includes(new URL(value).protocol); } catch { return false; }
}

export function normalizeProfile(profile) {
  const legacy = {
    vc_seed: ['equity', 'vc'], vc_series_a: ['equity', 'vc'],
    angel: ['equity', 'angel'], corporate: ['equity', 'corporate_vc'],
    grant: ['grant', 'grant_program'], accelerator: ['unknown', 'accelerator']
  }[profile.type] || ['unknown', 'unknown'];
  return { ...profile, funding_type: profile.funding_type ?? legacy[0], organization_type: profile.organization_type ?? legacy[1] };
}
const REQUIRED_WEIGHT_KEYS = [
  "team_credibility",
  "problem_clarity",
  "technical_feasibility",
  "market_urgency",
  "traction_evidence"
];

export function validateInvestorProfile(json) {
  const errors = [];

  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { isValid: false, errors: ["File must contain a valid JSON object."] };
  }

  const requiredFields = ["id", "name", "source_url", "retrieved_date", "stage_focus", "criteria_weights"];
  for (const field of requiredFields) {
    if (!(field in json)) errors.push(`Missing required field: "${field}"`);
  }

  if (typeof json.id !== "string" || !json.id.trim()) {
    errors.push('"id" must be a non-empty string.');
  }
  if (typeof json.name !== "string" || !json.name.trim()) {
    errors.push('"name" must be a non-empty string.');
  }
  const hasDimensions = json.funding_type !== undefined || json.organization_type !== undefined;
  if (hasDimensions) {
    if (!FUNDING_TYPES.includes(json.funding_type)) errors.push('Invalid or missing funding_type.');
    if (!ORGANIZATION_TYPES.includes(json.organization_type)) errors.push('Invalid or missing organization_type.');
  } else if (!ALLOWED_TYPES.includes(json.type)) {
    errors.push('Provide funding_type and organization_type, or a supported legacy type.');
  }

  if (!validSource(json.source_url,json.data_kind==='fictional')) errors.push('Source must be an HTTP/HTTPS URL, or a local docs/examples.html anchor for explicitly fictional records.');

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof json.retrieved_date !== "string" || !dateRegex.test(json.retrieved_date)) {
    errors.push('"retrieved_date" must be in YYYY-MM-DD format.');
  } else {
    const date = new Date(`${json.retrieved_date}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== json.retrieved_date) {
      errors.push('"retrieved_date" must be a real calendar date in YYYY-MM-DD format.');
    }
  }

  if (!Array.isArray(json.stage_focus) || json.stage_focus.length === 0) {
    errors.push('"stage_focus" must be a non-empty array.');
  } else {
    json.stage_focus.forEach(stage => {
      if (!ALLOWED_STAGES.includes(stage)) {
        errors.push(`Invalid stage in "stage_focus": "${stage}". Allowed: ${ALLOWED_STAGES.join(", ")}`);
      }
    });
  }

  if (!json.criteria_weights || typeof json.criteria_weights !== "object" || Array.isArray(json.criteria_weights)) {
    errors.push('"criteria_weights" must be an object.');
  } else {
    REQUIRED_WEIGHT_KEYS.forEach(key => {
      const value = json.criteria_weights[key];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(`Weight "${key}" must be a number.`);
      } else if (value < 0 || value > 1) {
        errors.push(`Weight "${key}" must be between 0 and 1.`);
      }
    });
  }

  if (json.sector_focus !== undefined && (!Array.isArray(json.sector_focus) || json.sector_focus.some(value => typeof value !== "string"))) {
    errors.push('"sector_focus" must be an array of strings.');
  }

  if (json.criteria_weights && REQUIRED_WEIGHT_KEYS.every(key => Number.isFinite(json.criteria_weights[key]))) {
    const sum = REQUIRED_WEIGHT_KEYS.reduce((total, key) => total + json.criteria_weights[key], 0);
    if (Math.abs(sum - 1) > 0.001) errors.push('The five criteria weights must total 1.00.');
  }
  if (json.comparison_enabled !== undefined && typeof json.comparison_enabled !== 'boolean') {
    errors.push('"comparison_enabled" must be a boolean.');
  }
  for (const field of ['geography_focus', 'explicit_criteria', 'anti_criteria', 'eligibility_requirements']) {
    if (json[field] !== undefined && (!Array.isArray(json[field]) || json[field].some(value => typeof value !== 'string'))) {
      errors.push('"' + field + '" must be an array of strings.');
    }
  }

  if (json.preparation_topics !== undefined) {
    if (!Array.isArray(json.preparation_topics)) errors.push('preparation_topics must be an array.');
    else for (const topic of json.preparation_topics) {
      if (!topic || typeof topic !== 'object') { errors.push('Invalid preparation topic.'); continue; }
      if (typeof topic.topic !== 'string' || !topic.topic.trim() || typeof topic.statement !== 'string' || !topic.statement.trim()) errors.push('Topic and statement are required.');
      if (!validSource(topic.source_url,json.data_kind==='fictional')) errors.push('Preparation topic needs a valid source.');
      for (const key of ['published_date','retrieved_date']) {
        const value=topic[key];
        const parsed=new Date(value+'T00:00:00Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10)!==value) errors.push('Preparation topic needs a real '+key);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

/** Historical facts require per-claim sources and retain unknown values as null. */
export function validateStartupSnapshot(snapshot) {
  const errors = [];
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const date = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
  };
  if (!object(snapshot)) return { isValid:false, errors:['Snapshot must be an object.'] };
  for (const key of ['id','company','sector_basis']) {
    if (typeof snapshot[key] !== 'string' || !snapshot[key].trim()) errors.push(key + ' must be a non-empty string.');
  }
  if (!date(snapshot.snapshot_date)) errors.push('Invalid snapshot_date.');
  if (snapshot.stage !== null && !ALLOWED_STAGES.includes(snapshot.stage)) errors.push('Stage must be an allowed label or null.');
  if (!Array.isArray(snapshot.sectors) || snapshot.sectors.some(value => typeof value !== 'string')) errors.push('Sectors must be strings.');
  const sources = new Set();
  if (!Array.isArray(snapshot.sources) || !snapshot.sources.length) errors.push('At least one source is required.');
  for (const source of Array.isArray(snapshot.sources) ? snapshot.sources : []) {
    if (!object(source)) { errors.push('Invalid source.'); continue; }
    if (!source.id || sources.has(source.id)) errors.push('Source IDs must be present and unique.');
    sources.add(source.id);
    if (!validSource(source.url,snapshot.data_kind==='fictional')) errors.push('Invalid source URL.');
    if (typeof source.title !== 'string' || !source.title.trim()) errors.push('Source title is required.');
    if (!date(source.retrieved_date)) errors.push('Invalid retrieval date.');
    const publication = source.published_date;
    if (!date(publication) && !(typeof publication === 'string' && /^\d{4}-\d{2}$/.test(publication) && date(publication + '-01'))) errors.push('Invalid publication date.');
    const allowedEvidence=snapshot.data_kind==='fictional'?['fictional_scenario']:['retrospective_account','contemporary_correspondence_published_later','contemporary_record'];
    if (!allowedEvidence.includes(source.evidence_type)) errors.push('Invalid evidence type.');
    if (source.evidence_date && (!date(source.evidence_date) || source.evidence_date > snapshot.snapshot_date)) errors.push('Evidence date falls outside the snapshot.');
  }
  for (const key of ['product','customers','team','funding']) {
    const fact = snapshot.fields?.[key];
    if (!object(fact) || !(fact.value === null || (typeof fact.value === 'string' && fact.value.trim()))) errors.push('Invalid fact: ' + key);
    else if (fact.value === null ? fact.source_id !== null : !sources.has(fact.source_id)) errors.push('Invalid source for fact: ' + key);
  }
  if (!Array.isArray(snapshot.metrics)) errors.push('Metrics must be an array; use [] when unknown.');
  for (const metric of Array.isArray(snapshot.metrics) ? snapshot.metrics : []) {
    if (!object(metric)) { errors.push('Invalid metric.'); continue; }
    for (const key of ['name','unit','period']) if (typeof metric[key] !== 'string' || !metric[key].trim()) errors.push('Metric needs ' + key);
    if (!Number.isFinite(metric.value) || metric.value < 0) errors.push('Metric needs a nonnegative numeric value.');
    if (!date(metric.as_of_date) || metric.as_of_date > snapshot.snapshot_date) errors.push('Metric date falls outside the snapshot.');
    if (!sources.has(metric.source_id)) errors.push('Metric source is missing.');
  }
  if (!Array.isArray(snapshot.limitations) || !snapshot.limitations.length || snapshot.limitations.some(value => typeof value !== 'string')) errors.push('Limitations are required.');

  if (snapshot.preparation_lessons !== undefined) {
    if (!Array.isArray(snapshot.preparation_lessons)) errors.push('preparation_lessons must be an array.');
    else {
      const ids=new Set();
      for (const lesson of snapshot.preparation_lessons) {
        if (!object(lesson)) { errors.push('Invalid preparation lesson.'); continue; }
        for (const key of ['id','title','topic','approach','interpretation','caution']) {
          if (typeof lesson[key] !== 'string' || !lesson[key].trim()) errors.push('Lesson needs '+key);
        }
        if (ids.has(lesson.id)) errors.push('Duplicate lesson ID within snapshot.');
        ids.add(lesson.id);
        if (!['suggestion:customer-evidence','suggestion:next-milestone','suggestion:team-evidence','suggestion:product-evidence'].includes(lesson.target_task_id)) errors.push('Unsupported lesson target task.');
        const enums={
          business_models:['marketplace','service','saas','hardware','consumer_product','other'],
          startup_stages:ALLOWED_STAGES,
          validation_focus:['customer_problem','demand','operations','technical_feasibility']
        };
        for (const [key,allowed] of Object.entries(enums)) {
          if (!Array.isArray(lesson[key]) || !lesson[key].length || lesson[key].some(value=>!allowed.includes(value))) errors.push('Invalid lesson '+key);
        }
        if (!Array.isArray(lesson.source_ids) || !lesson.source_ids.length || lesson.source_ids.some(id=>!sources.has(id))) errors.push('Lesson sources are missing.');
        if (!Array.isArray(lesson.evidence_fields) || !lesson.evidence_fields.length || lesson.evidence_fields.some(key=>
          !['product','customers','team','funding'].includes(key) || snapshot.fields?.[key]?.value == null
          || !Array.isArray(lesson.source_ids) || !lesson.source_ids.includes(snapshot.fields[key].source_id))) errors.push('Lesson needs known, source-backed evidence fields.');
      }
    }
  }
  return { isValid:errors.length === 0, errors };
}

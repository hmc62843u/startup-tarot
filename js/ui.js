/** Render profile data as text, including data imported from local files. */
function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function field(parent, label, value) {
    const row = element('p');
    row.append(element('strong', label + ': '), document.createTextNode(value || 'Not specified'));
    parent.append(row);
}

function listSection(parent, title, values) {
    if (!Array.isArray(values) || !values.length) return;
    parent.append(element('h4', title));
    const list = element('ul', undefined, 'criteria-list');
    values.forEach(value => list.append(element('li', String(value))));
    parent.append(list);
}

export function renderLibrary(profiles, containerId) {
    const container = document.getElementById(containerId);
    container.replaceChildren();
    if (!profiles.length) {
        container.append(element('p', 'No profiles to show. Clear filters to see all available profiles.', 'text-muted'));
        return;
    }
    profiles.forEach(profile => {
        const card = element('article', undefined, 'card profile-card');
        card.append(element('h3', profile.name));
        field(card, 'Comparison status', profile.data_kind==='fictional'?(profile.comparison_enabled===false?'Reference-only browsing example':'Included for demonstration; no real eligibility claim'):profile.comparison_enabled === false ? 'Reference only — availability unconfirmed' : 'Included; eligibility requires manual review');
        if (profile.profile_basis) field(card, 'Profile basis', profile.profile_basis);
        field(card, 'Funding', profile.funding_type || 'unknown');
        field(card, 'Organization / program', (profile.organization_type || 'unknown').replaceAll('_', ' '));
        field(card, 'Stages', profile.stage_focus.join(', '));
        field(card, 'Sectors', Array.isArray(profile.sector_focus) ? (profile.sector_focus.join(', ') || 'Generalist / unrestricted') : 'Unknown');
        const details = element('details');
        details.append(element('summary', 'View full investor profile'));
        field(details, 'Geography', Array.isArray(profile.geography_focus) ? profile.geography_focus.join(', ') : '');
        details.append(element('p', 'Geography and evidence expectations below require manual review; profile inclusion does not confirm eligibility.', 'text-muted'));
        field(details, 'Check size', profile.check_size_range_usd);
        field(details, profile.data_kind==='fictional'?'Scenario authored':'Retrieved', profile.retrieved_date);
        if (profile.reviewed_date) field(details, 'Reviewed', profile.reviewed_date);
        const link = element('a', profile.data_kind==='fictional'?'View scenario specification':'View source');
        link.href = profile.source_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        details.append(link);
        details.append(element('h4', 'Criteria weights'));
        details.append(element('p', profile.weight_notes || 'Weight provenance is unspecified. These values are not used as eligibility requirements.', 'text-muted'));
        const weights = element('ul', undefined, 'criteria-list');
        Object.entries(profile.criteria_weights).filter(([, value]) => typeof value === 'number').forEach(([key, value]) => {
            weights.append(element('li', key.replaceAll('_', ' ') + ': ' + Math.round(value * 100) + '%'));
        });
        details.append(weights);
        listSection(details, 'Evidence expectations and stated preferences', profile.explicit_criteria);
        listSection(details, 'What they avoid', profile.anti_criteria);
        listSection(details, 'Eligibility to verify', profile.eligibility_requirements);
        if (profile.preparation_topics?.length) {
            details.append(element('h4',profile.data_kind==='research'?'Published interests used for preparation ideas':'Illustrative interests used for preparation ideas'));
            renderPreparationSources(profile.preparation_topics.map(topic=>({
                kind:'investor',name:profile.name,url:topic.source_url,statement:topic.statement,data_kind:profile.data_kind,
                published_date:topic.published_date,retrieved_date:topic.retrieved_date
            })),details);
        }
        if (profile.notes) field(details, 'Notes', profile.notes);
        card.append(details);
        container.append(card);
    });
}

export function renderReport(gaps, containerId) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;
    container.replaceChildren();
    if (!gaps.length) {
        container.append(element('p', 'No gaps flagged by the available automated checks.', 'success-msg'));
        return;
    }
    const list = element('ul', undefined, 'gap-list');
    gaps.forEach(gap => {
        const item = element('li', undefined, 'gap-item severity-' + gap.severity.toLowerCase());
        item.append(element('strong', '[' + gap.severity + '] ' + gap.category),
            element('p', gap.message), element('em', 'Next step: ' + gap.action));
        list.append(item);
    });
    container.append(list);
}

export function renderComparison(startup, results, container, groups = [{ key: '', results }], overviewContainer = container) {
    container.replaceChildren();
    const hasGap = (result, category) => result.gaps.some(gap => gap.category === category);
    const metrics = [
        ['Profiles shown', results.length, 'neutral'],
        ['Stage differences', results.filter(result => hasGap(result, 'Stage Fit')).length, 'review'],
        ['Sector differences', results.filter(result => hasGap(result, 'Sector Fit')).length, 'review'],
        ['No flagged differences', results.filter(result => result.gaps.length === 0).length, 'aligned']
    ];
    const overview = element('div', undefined, 'report-overview');
    metrics.forEach(([label, count, tone]) => {
        const metric = element('div', undefined, 'report-metric metric-' + tone);
        metric.append(element('strong', String(count), 'metric-value'), element('span', label, 'metric-label'));
        overview.append(metric);
    });
    if (overviewContainer !== container) overviewContainer.replaceChildren();
    overviewContainer.append(overview);

    const evidence = element('div', undefined, 'startup-snapshot');
    evidence.append(element('strong', 'Your saved startup'));
    const chips = element('div', undefined, 'snapshot-chips');
    [
        'Stage: ' + String(startup.current_stage || 'unknown').replaceAll('-', ' '),
        'Sectors: ' + ((startup.sectors || []).join(', ') || 'unknown'),
        'Product: ' + String(startup.prototype_status || 'unknown').replaceAll('_', ' '),
        'Domain experience: ' + (startup.founders_have_domain_expertise===true ? 'yes' : startup.founders_have_domain_expertise===false ? 'no / partial' : 'unknown'),
        'Pilots / LOIs: ' + (startup.paid_pilots ?? 'unknown')
    ].forEach(text => chips.append(element('span', text, 'snapshot-chip')));
    evidence.append(chips);
    const explanation = element('details', undefined, 'shared-review');
    explanation.append(element('summary', 'How comparisons work'));
    explanation.append(element('p', 'Only modeled stage and sector focus are checked. Eligibility and evidence require manual review, even with no automated gaps.', 'report-explanation'));
    explanation.append(evidence);
    explanation.append(element('p', 'Review team capabilities, technical feasibility, customer evidence, problem clarity, market urgency, geography, and funding terms. Estimated weights do not establish prototype, experience, or traction requirements. Reference-only profiles are excluded.'));
    container.append(explanation);

    if (!results.length) {
        container.append(element('p', 'No profiles match these report filters. Clear filters to restore the full comparison.', 'empty-results'));
    }
    const fundingLabels = { equity: 'Equity investment', grant: 'Grant funding', unknown: 'Funding type unknown' };
    const badge = (label, unknown, difference) => {
        const tone = unknown ? 'unknown' : difference ? 'review' : 'aligned';
        const symbol = unknown ? '?' : difference ? '!' : '✓';
        const status = unknown ? 'Unknown' : difference ? 'Review difference' : 'Within modeled focus';
        return element('span', symbol + ' ' + label + ' · ' + status, 'focus-badge badge-' + tone);
    };
    groups.forEach(group => {
        const section = group.key ? element('section', undefined, 'report-group') : container;
        if (group.key) {
            section.append(element('h3', (fundingLabels[group.key] || group.key) + ' (' + group.results.length + ')'));
            container.append(section);
        }
        group.results.forEach(({profile, gaps}) => {
            const card = element('article', undefined, 'comparison-card');
            const heading = element('div', undefined, 'comparison-heading');
            heading.append(element(group.key ? 'h4' : 'h3', profile.name),
                element('span', fundingLabels[profile.funding_type] || fundingLabels.unknown, 'funding-tag'));
            card.append(heading);

            const statuses = element('div', undefined, 'focus-statuses');
            statuses.append(
                badge('Stage', !startup.current_stage || startup.current_stage==='unknown' || !Array.isArray(profile.stage_focus) || !profile.stage_focus.length, gaps.some(gap => gap.category === 'Stage Fit')),
                badge('Sector', !startup.sectors?.some(sector=>String(sector).trim()&&String(sector).trim().toLowerCase()!=='unknown') || !Array.isArray(profile.sector_focus), gaps.some(gap => gap.category === 'Sector Fit'))
            );
            card.append(statuses);

            const details = element('details', undefined, 'comparison-details');
            details.append(element('summary', 'Details & next steps'));
            if (gaps.length) {
                const output = element('div');
                renderReport(gaps, output);
                details.append(output);
            }
            field(details, 'Modeled stages', profile.stage_focus?.join(', '));
            field(details, 'Modeled sectors', Array.isArray(profile.sector_focus) ? (profile.sector_focus.join(', ') || 'Generalist') : 'Unknown');
            field(details, 'Geography', profile.geography_focus?.join(', '));
            field(details, 'Funding amount / currency', profile.check_size_range_usd);
            field(details, profile.data_kind==='fictional'?'Scenario authored':'Source retrieved', profile.retrieved_date);
            if (profile.reviewed_date) field(details, 'Profile reviewed', profile.reviewed_date);
            const link = element('a', 'View source');
            link.href = profile.source_url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            details.append(link);
            listSection(details, 'Eligibility to verify', profile.eligibility_requirements);
            listSection(details, 'Evidence expectations and preferences', profile.explicit_criteria);
            listSection(details, 'Supported exclusions', profile.anti_criteria);
            if (profile.profile_basis) field(details, 'Profile basis', profile.profile_basis);
            if (profile.notes) field(details, 'Notes', profile.notes);
            card.append(details);
            section.append(card);
        });
    });
}

export function renderFilterChips(filters, container, onRemove) {
    container.replaceChildren();
    filters.forEach(({ id, label }) => {
        const button = element('button', label + ' ×', 'filter-chip');
        button.type = 'button';
        button.setAttribute('aria-label', 'Remove ' + label);
        button.addEventListener('click', () => onRemove(id));
        container.append(button);
    });
}

export function toggleView(viewName) {
    const view = document.getElementById('view-' + viewName);
    if (!view) return;
    document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el === view));
    document.querySelectorAll('nav button[data-view]').forEach(button => {
        const selected = button.dataset.view === viewName;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
}

export function renderValidationErrors(errors, container) {
  const list = document.createElement("ul");
  list.className = "error-msg";
  errors.forEach(message => {
    const item = document.createElement("li");
    item.textContent = message;
    list.appendChild(item);
  });
  container.appendChild(list);
}

function snapshotFact(snapshot, key) {
    return snapshot.fields[key]?.value ?? 'Unknown';
}

function metricText(snapshot) {
    if (!snapshot.metrics.length) return 'Unknown — no metric established by these sources';
    return snapshot.metrics.map(metric => metric.value + ' ' + metric.unit + ' · ' + metric.period + ' · as of ' + metric.as_of_date).join('; ');
}

function evidenceLabel(value) {
    return {
        retrospective_account: 'Later recollection',
        contemporary_correspondence_published_later: 'Contemporary correspondence, published later',
        contemporary_record: 'Contemporary record',
        fictional_scenario: 'Fictional scenario · not historical evidence'
    }[value] || 'Unknown evidence type';
}

function factSource(snapshot, sourceId) {
    const source = snapshot.sources.find(source => source.id === sourceId);
    const link = element('a', 'Source');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = source.title;
    return link;
}

export function renderStartupSnapshots(snapshots, container) {
    container.replaceChildren();
    snapshots.forEach(snapshot => {
        const card = element('article', undefined, 'card snapshot-card');
        card.append(element('h3', snapshot.company), element('p', 'Snapshot: ' + snapshot.snapshot_date, 'comparison-summary'));
        const badges = element('div', undefined, 'snapshot-chips');
        badges.append(element('span', snapshot.data_kind==='fictional'?'Original fictional example':'Imported historical account', 'snapshot-chip'));
        snapshot.sources.forEach(source => badges.append(element('span', evidenceLabel(source.evidence_type), 'snapshot-chip')));
        card.append(badges);
        const facts = element('details');
        facts.append(element('summary', 'Evidence, metrics & sources'));
        field(facts, 'Stage', snapshot.stage || 'Unknown — no stage classification inferred');
        field(facts, 'Sector tags', snapshot.sectors.join(', '));
        field(facts, 'Tag basis', snapshot.sector_basis);
        for (const key of ['product','customers','team','funding']) {
            const line = element('p');
            line.append(element('strong', key[0].toUpperCase() + key.slice(1) + ': '), document.createTextNode(snapshotFact(snapshot,key) + ' '));
            if (snapshot.fields[key].source_id) line.append(factSource(snapshot,snapshot.fields[key].source_id));
            facts.append(line);
        }
        facts.append(element('h4', 'Recorded metrics'));
        if (!snapshot.metrics.length) facts.append(element('p', 'Unknown — no numeric traction metric established by the selected sources.'));
        snapshot.metrics.forEach(metric => {
            const line = element('p', metric.name + ': ' + metric.value + ' ' + metric.unit + ' · ' + metric.period + ' · ' + metric.as_of_date + ' ');
            line.append(factSource(snapshot,metric.source_id));
            facts.append(line);
        });
        facts.append(element('h4', 'Source provenance'));
        snapshot.sources.forEach(source => {
            const line = element('p');
            const link = factSource(snapshot,source.id);
            link.textContent = source.title;
            line.append(link, document.createTextNode(snapshot.data_kind==='fictional'?' · Authored '+source.published_date+' · '+evidenceLabel(source.evidence_type):' · Published ' + source.published_date + ' · Retrieved ' + source.retrieved_date + ' · ' + evidenceLabel(source.evidence_type)));
            if (source.evidence_date) line.append(document.createTextNode(' · Evidence dated ' + source.evidence_date));
            facts.append(line);
        });
        listSection(facts, 'Limits of this snapshot', snapshot.limitations);
        if (snapshot.preparation_lessons?.length) {
            listSection(facts,'Editorial preparation interpretations',snapshot.preparation_lessons.map(lesson=>lesson.title+' — '+lesson.approach));
            facts.append(element('p',snapshot.data_kind==='fictional'?'These optional interpretations use invented scenario details. They provide no historical outcome evidence.':'These interpretations are supplied by the library publisher. Review the historical sources and limitations; an action does not establish what caused an outcome.','text-muted'));
        }
        card.append(facts);
        container.append(card);
    });
}

export function renderSnapshotComparison(startup, snapshot, container, dirty = false) {
    container.replaceChildren();
    if (dirty) { container.textContent = 'Save your startup edits before comparing example scenarios.'; return; }
    if (!startup.current_stage) { container.textContent = 'Complete Home setup to view a side-by-side contrast. You can browse the example scenarios below.'; return; }
    if (!snapshot) { container.textContent = 'Choose a snapshot for a side-by-side contrast.'; return; }
    container.append(element('p', (snapshot.data_kind==='fictional'?'This is a fictional comparison.':'Imported historical context differs from yours.')+' Metrics retain their original units; no score or success prediction is calculated.', 'report-explanation'));
    const table = element('table', undefined, 'snapshot-table');
    const caption = element('caption', 'Your saved startup vs. ' + snapshot.company + ' · ' + snapshot.snapshot_date);
    table.append(caption);
    const head = element('thead');
    const headers = element('tr');
    ['Dimension','Your saved startup',snapshot.data_kind==='fictional'?'Example scenario':'Historical snapshot'].forEach(label => {
        const cell = element('th',label); cell.scope = 'col'; headers.append(cell);
    });
    head.append(headers); table.append(head);
    const body = element('tbody');
    const rows = [
        ['Stage',startup.current_stage,snapshot.stage || 'Unknown'],
        ['Sector tags',(startup.sectors || []).join(', ') || 'Unknown',snapshot.sectors.join(', ')],
        ['Product evidence',String(startup.prototype_status || 'Unknown').replaceAll('_',' '),snapshotFact(snapshot,'product')],
        ['Customer context','Unknown — not collected in the startup form',snapshotFact(snapshot,'customers')],
        ['Team evidence','Domain experience (self-report): ' + (startup.founders_have_domain_expertise === true ? 'yes' : startup.founders_have_domain_expertise === false ? 'no / partial' : 'unknown') + '; other capabilities not assessed',snapshotFact(snapshot,'team')],
        ['Funding','Unknown — not collected in the startup form',snapshotFact(snapshot,'funding')],
        ['Traction',startup.paid_pilots == null ? 'Unknown — no pilot/LOI count recorded' : String(startup.paid_pilots) + ' pilots / LOIs recorded; deliveries, guests and revenue not collected',metricText(snapshot)]
    ];
    rows.forEach(([label,current,historical]) => {
        const row = element('tr');
        const title = element('th',label); title.scope = 'row';
        row.append(title,element('td',current),element('td',historical));
        body.append(row);
    });
    table.append(body);
    const scroll = element('div',undefined,'table-scroll');
    scroll.tabIndex = 0;
    scroll.append(table); container.append(scroll);
    const provenance = element('p', undefined, 'text-muted');
    provenance.append(document.createTextNode('Sources: '));
    snapshot.sources.forEach(source => {
        const link = factSource(snapshot,source.id);
        link.textContent = source.title + ' (' + evidenceLabel(source.evidence_type) + ')';
        provenance.append(link,document.createTextNode(' '));
    });
    container.append(provenance);
    listSection(container,'Interpretation limits',snapshot.limitations);
}

export function renderMetricOverview(metrics, container) {
    container.replaceChildren();
    const overview = element('div',undefined,'report-overview');
    metrics.forEach(([label,count,tone='neutral']) => {
        const metric = element('div',undefined,'report-metric metric-' + tone);
        metric.append(element('strong',String(count),'metric-value'),element('span',label,'metric-label'));
        overview.append(metric);
    });
    container.append(overview);
}

export function renderSnapshotOverview(snapshots, container) {
    renderMetricOverview([
        ['Example scenarios',snapshots.length],
        ['Companies',new Set(snapshots.map(snapshot=>snapshot.company)).size],
        ['Cases with a recorded metric',snapshots.filter(snapshot=>snapshot.metrics.length).length]
    ],container);
}

export function renderPreparationBoard(tasks, board, overview, onSave,{otherExercises=null}={}) {
    board.replaceChildren();
    const statuses = {todo:'To explore',in_progress:'Trying',evidence_recorded:'Learning recorded'};
    const basisLabels = {
        modeled_difference:'Modeled fit question',published_requirement:'Scenario rule to inspect',
        optional_suggestion:'General exercise',combined_suggestion:'Startup example + investor interest'
    };
    const optional=task=>task.basis==='optional_suggestion'&&task.progress.status==='todo'
        &&!task.progress.notes&&!task.progress.needsReview&&!task.progress.experiment;
    const otherTasks=tasks.filter(optional),chosenTasks=tasks.filter(task=>!optional(task));
    renderMetricOverview([
        ['Your moves',chosenTasks.length],['Other exercises',otherTasks.length],
        ['Trying',tasks.filter(task=>task.progress.status==='in_progress').length],
        ['Learning recorded',tasks.filter(task=>task.progress.status==='evidence_recorded').length,'aligned']
    ],overview);
    board.className='preparation-board preparation-focused';
    board.hidden=!chosenTasks.length&&!!otherExercises;
    const renderCard=task=>{
            const card = element('article',undefined,'preparation-task');
            const key=encodeURIComponent(task.id);
            card.setAttribute('id','task-card-'+key);
            const researchTask=task.sources.some(source=>source.data_kind==='research');
            const savedPlan=!!task.progress.experiment;
            const editablePlan=!!task.experimentPlan||savedPlan||task.basis==='optional_suggestion';
            const basisLabel=savedPlan&&!task.experimentPlan?'Your saved plan · no current library connection':task.supportKind==='snapshot_only'?'Startup example only':researchTask&&task.basis==='published_requirement'?'Source-linked eligibility check':researchTask&&task.basis==='combined_suggestion'?'Startup example + investor interest':basisLabels[task.basis];
            card.append(element('span',basisLabel,'task-basis basis-' + task.basis),
                element('h4',task.title));
            if(task.progress.needsReview){
                const reasons=task.progress.reviewReasons||[];
                const notice=reasons.includes('startup_changed')?'Your situation changed — review your saved evidence. Your fields and notes are kept.':
                    reasons.includes('investor_lens_changed')?'Investor lens changed — review this plan’s supporting connection. Your fields and notes are kept.':
                    reasons.includes('connection_changed')?'Supporting connection changed — review this plan. Your fields and notes are kept.':
                    reasons.includes('checkpoint_needed')?'Choose continue, change or stop before marking learning recorded.':'Review your saved work; its context may have changed.';
                card.append(element('p',notice,'task-review-notice'));
            }
            const details = element('details');
            details.setAttribute('id','task-details-'+encodeURIComponent(task.id));
            details.append(element('summary',editablePlan?'Experiment plan & learning':'Details & learning'));
            const rationale=element('details',undefined,'task-rationale');
            rationale.append(element('summary',editablePlan?'Why this plan?':'Why this exercise?'));
            field(rationale,'Why',task.reason);
            field(rationale,'Evidence to record',task.evidence);
            if (task.relevance) field(rationale,'Your situation',task.relevance);
            if (task.caution) field(rationale,'Interpretation limits',task.caution);
            if (task.interpretations) listSection(rationale,'Editorial interpretation',task.interpretations);
            if (!task.sources.length) rationale.append(element('p','App suggestion; not an investor requirement.','text-muted'));
            renderPreparationSources(task.sources,rationale);
            const form = element('form');form.setAttribute('id','task-form-'+key);
            const statusLabel = element('label','Move status');
            const select = element('select');
            statusLabel.append(select);
            Object.entries(statuses).forEach(([key,label]) => {
                const option = element('option',label);option.value=key;select.append(option);
            });
            select.value=task.progress.status;
            const notesLabel = element('label','What you learned · notes or links');
            const notes = element('textarea');
            notes.rows=3;notes.value=task.progress.notes;notes.setAttribute('id','task-notes-'+key);
            notes.placeholder='Record what you found, its date and a supporting link.';
            notesLabel.append(notes);
            const planFields={};
            const plan=task.progress.experiment || task.experimentPlan;
            if (editablePlan) {
                const planBox=element('fieldset',undefined,'experiment-fields');
                planBox.setAttribute('id','experiment-editor-'+key);
                planBox.append(element('legend',savedPlan?'Your experiment plan':task.experimentPlan?'Adapt this experiment':'Plan your experiment','sr-only'));
                const more=element('details',undefined,'plan-more');more.setAttribute('id','task-more-'+key);
                more.append(element('summary','More plan details'));
                more.append(element('p','Set a question, decision conditions or a review date when useful.','text-muted'));
                const learning=element('details',undefined,'plan-learning');learning.setAttribute('id','task-learning-'+key);
                learning.append(element('summary','Progress & notes'));
                learning.open=!!task.progress.notes||task.progress.status!=='todo';
                const inputs=[
                    ['action','What will you try?','textarea'],
                    ['evidenceNeeded','What will you look for?','textarea'],
                    ['question','Learning question','textarea'],
                    ['continueWhen','Continue if…','textarea'],
                    ['changeWhen','Change the approach if…','textarea'],
                    ['stopWhen','Stop if…','textarea'],
                    ['reviewDate','Review date','input']
                ];
                inputs.forEach(([key,label,tag])=>{
                    const wrapper=element('label',label);
                    const input=element(tag);
                    if (tag==='input') input.type='date';
                    else input.rows=2;
                    input.value=plan?.[key] || '';
                    input.setAttribute('id','task-'+key+'-'+encodeURIComponent(task.id));
                    if (tag==='textarea') input.placeholder='Make this specific to your situation.';
                    planFields[key]=input;wrapper.append(input);
                    if(key==='action'||key==='evidenceNeeded')planBox.append(wrapper);
                    else more.append(wrapper);
                });
                const outcomeLabel=element('label','At the checkpoint, what next?');
                const outcome=element('select');
                [['unreviewed','Not reviewed yet'],['continue','Continue'],['change','Change the approach'],['stop','Stop this experiment']].forEach(([value,label])=>{
                    const option=element('option',label);option.value=value;outcome.append(option);
                });
                outcome.value=['continue','change','stop'].includes(plan?.outcome)?plan.outcome:'unreviewed';
                planFields.outcome=outcome;outcomeLabel.append(outcome);learning.append(statusLabel,notesLabel,outcomeLabel);
                planBox.append(more,learning);form.append(planBox);
            }
            const save = element('button','Save progress','btn-primary');
            save.type='submit';save.setAttribute('id','save-task-'+key);
            const message = element('p',undefined,'task-message');
            message.setAttribute('role','status');message.setAttribute('id','task-save-message-'+key);
            const saveBar=element('div',undefined,'task-save-bar');saveBar.append(save,message);
            if(!editablePlan)form.append(statusLabel,notesLabel);
            form.append(saveBar);
            const reveal=input=>{
                let parent=input.parentElement;
                while(parent&&parent!==form){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
                input.focus();
            };
            form.addEventListener('submit',event => {
                event.preventDefault();
                if (select.value==='evidence_recorded'&&!notes.value.trim()) {
                    message.textContent='Add an evidence note or link before marking evidence recorded.';
                    reveal(notes);return;
                }
                const experiment=editablePlan?Object.fromEntries(Object.entries(planFields).map(([key,input])=>[key,input.value.trim()])):null;
                const activePlan=!!task.experimentPlan||savedPlan||(experiment&&Object.entries(experiment).some(([key,value])=>key==='outcome'?value!=='unreviewed':value.length>0));
                if (activePlan && select.value==='evidence_recorded' && planFields.outcome.value==='unreviewed') {
                    message.textContent='Choose continue, change or stop to record your checkpoint decision.';
                    reveal(planFields.outcome);return;
                }
                const progress={status:select.value,notes:notes.value.trim()};
                if (activePlan) progress.experiment=experiment;
                onSave(task.id,progress);
            });
            details.append(form,rationale);card.append(details);return card;
    };
    for(const status of ['in_progress','todo','evidence_recorded']){
        const visible=chosenTasks.filter(task=>task.progress.status===status)
            .sort((a,b)=>Number(b.basis==='combined_suggestion')-Number(a.basis==='combined_suggestion'));
        if(!visible.length)continue;
        const column=element('section',undefined,'preparation-column preparation-'+status);
        column.append(element('h3',statuses[status]+' ('+visible.length+')'));
        visible.forEach(task=>column.append(renderCard(task)));board.append(column);
    }
    const other=otherExercises||element('details',undefined,'section-details other-exercises');
    other.setAttribute('id','other-exercises');other.replaceChildren();other.hidden=!otherTasks.length;
    other.append(element('summary','Other exercises ('+otherTasks.length+')'),element('p','Optional. Open only what is useful to you.','text-muted'));
    otherTasks.forEach(task=>other.append(renderCard(task)));
    if(!otherExercises&&otherTasks.length)board.append(other);
}


function renderPreparationSources(sources,container) {
    const limited=sources.filter(source=>Array.isArray(source.limitations)&&source.limitations.length);
    const limitations=new Map();
    sources.forEach(source=>{
        const line=element('div',undefined,'preparation-source');
        const label=source.data_kind==='fictional'?(source.kind==='investor'?'Fictional investor example':source.kind==='snapshot'?'Fictional startup example':'Fictional profile'):source.kind==='snapshot'?'Historical source':source.kind==='investor'?'Investor interest (not a requirement)':'Source';
        const link=element('a',label+': '+source.name);
        link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';
        line.append(link);
        if (source.snapshot_date) line.append(element('span','Snapshot '+source.snapshot_date+' · '+evidenceLabel(source.evidence_type),'source-date'));
        if (source.published_date) line.append(element('span',source.data_kind==='fictional'?'Scenario authored '+source.published_date:'Published '+source.published_date+' · Retrieved '+source.retrieved_date,'source-date'));
        if (source.statement) line.append(element('span',source.statement,'source-statement'));
        for(const text of Array.isArray(source.limitations)?source.limitations:[]){
            const key=text.trim();
            if(!key)continue;
            if(!limitations.has(key))limitations.set(key,new Set());
            limitations.get(key).add(source);
        }
        container.append(line);
    });
    if(limitations.size){
        const notes=element('div',undefined,'source-limitations');
        notes.append(element('h4','Source limitations'),element('p','Applies to: '+limited.map(source=>source.name).join('; '),'text-muted'));
        const list=element('ul',undefined,'criteria-list');
        limitations.forEach((applicable,text)=>{
            const item=element('li',text);
            if(applicable.size<limited.length)item.append(element('span','For: '+[...applicable].map(source=>source.name).join('; '),'source-date'));
            list.append(item);
        });
        notes.append(list);container.append(notes);
    }
}

export function renderHistoricalSuggestions(suggestions,container,onDecision,loading=false,research=false,onUseLens=null,onEditPlan=null,support=null) {
    container.replaceChildren();
    const section=element('section',undefined,'card historical-suggestions');
    section.append(element('h3','Suggested next moves'));
    if (loading) {
        section.append(element('p','Loading example scenarios…','text-muted'));
        container.append(section);return;
    }
    if (!suggestions.length) {
        if(support?.kind==='investor_only'){
            section.append(element('p','Investor interest only. No matching startup example is encoded for your situation. General exercises are separate from this investor’s interests.'));
            renderPreparationSources(support.interests,section);container.append(section);return;
        }
        const empty=element('details',undefined,'card suggestion-empty');
        empty.append(element('summary','Explore illustrative preparation ideas'));
        empty.append(element('p',research?'Choose an investor lens and a matching context in Home. Connected ideas require publisher-authored lessons and matching investor topics; no match is a library limitation.':'Choose a fictional investor lens and a context in Home to explore connected exercises. The examples cover early marketplace/service experiments; no match is a library limitation.','text-muted'));
        container.append(empty);return;
    }
    const pending=suggestions.filter(suggestion=>suggestion.decision==='pending');
    const reviewed=suggestions.filter(suggestion=>suggestion.decision!=='pending');
    if(!pending.length){section.replaceChildren();section.className='reviewed-examples';}
    else section.append(element('p',suggestions.every(item=>item.supportKind==='snapshot_only')?'Startup examples for your situation. No matching investor interest is documented.':onUseLens?'Library preview. No investor selected. Review the examples, then choose whether to use these profiles.':research?'Connected through your selected investor profiles. Historical cases may have survivorship bias; review the sources and limits.':'Connected through your selected investor. These examples are fictional; outcomes are not demonstrated.','text-muted'));
    const reviewedList=element('details',undefined,'section-details');reviewedList.setAttribute('id','reviewed-suggestions');
    reviewedList.append(element('summary','Reviewed examples ('+reviewed.length+')'));
    [...pending,...reviewed].forEach(suggestion=>{
        const parent=suggestion.decision==='pending'?section:reviewedList;
        const card=element('article',undefined,'historical-idea');
        card.append(element('span',suggestion.decision==='pending'?(suggestion.supportKind==='snapshot_only'?'Startup example only':'Suggested — your choice'):suggestion.decision==='accepted'?'Accepted · experiment plan created':'Dismissed for this context','task-basis'),
            element('h4',suggestion.title));
        const details=element('details');
        details.append(element('summary',suggestion.supportKind==='snapshot_only'?'Startup evidence & limits':'Scenario, investor connection & limits'));
        field(details,'Suggested adaptation',suggestion.reason);
        field(details,'Your situation',suggestion.relevance);
        field(details,'Caution',suggestion.caution);
        listSection(details,'Editorial interpretation',suggestion.interpretations);
        renderPreparationSources(suggestion.sources,details);
        const actions=element('div',undefined,'suggestion-actions');
        if(onUseLens){
            const use=element('button',research?'Use these investor profiles':'Use these fictional investor examples','btn-secondary');use.type='button';
            use.addEventListener('click',()=>onUseLens([...new Set(suggestion.sources.filter(source=>source.kind==='investor').map(source=>source.profile_id))]));
            actions.append(use);card.append(actions,details);parent.append(card);return;
        }
        if(suggestion.decision==='accepted'&&onEditPlan){
            const edit=element('button','Edit plan','btn-primary');edit.type='button';
            edit.addEventListener('click',()=>onEditPlan(suggestion.targetTaskId));actions.append(edit);
        }
        const choices=suggestion.decision==='pending'
            ? [['accepted','Make an experiment plan'],['dismissed','Dismiss']]
            : [['pending','Review again']];
        choices.forEach(([decision,label])=>{
            const button=element('button',label,decision==='accepted'?'btn-primary':'btn-secondary');
            button.type='button';button.addEventListener('click',()=>onDecision(suggestion.id,decision));
            actions.append(button);
        });
        card.append(actions,details);parent.append(card);
    });
    if(reviewed.length)section.append(reviewedList);
    container.append(section);
}

export function renderWorkspaceOverview(model,container,onNavigate,{dirty=false,loading=false,situationContainer=null,editorOpen=false}={}) {
    container.replaceChildren();
    if (dirty) {
        const notice=element('div',undefined,'draft-notice');
        notice.append(element('span','You have unsaved edits. The map reflects your last saved facts.'));
        const save=element('button','Review edits','text-button');save.type='button';
        save.addEventListener('click',()=>onNavigate('setup'));notice.append(save);container.append(notice);
    }
    const hero=element('div',undefined,'overview-hero');
    const situation=element('section',undefined,'situation-card');
    situation.setAttribute('aria-label','Your current context');
    situation.append(element('p',model.situationShort));
    if(model.started){
        const edit=element('button','Edit','text-button');edit.type='button';
        edit.setAttribute('aria-label','Edit your current context');
        edit.setAttribute('id','edit-situation');edit.setAttribute('aria-controls','startup-editor');
        edit.setAttribute('aria-expanded',String(editorOpen));
        edit.addEventListener('click',()=>onNavigate('setup'));situation.append(edit);
    }
    if(situationContainer)situationContainer.replaceChildren(situation);
    else hero.append(situation);
    const action=element('article',undefined,'next-action-card');
    if(model.nextAction.connectionGap){
        const gap=element('div',undefined,'connection-gap');
        gap.append(element('h3',model.nextAction.connectionGap.title));
        action.append(gap);
    }
    if(!model.nextAction.generalExercise||model.nextAction.savedExperiment)action.append(element('p',model.nextAction.heading||'Your next move','eyebrow'));
    action.append(element('h2',model.nextAction.title));
    if(model.nextAction.connectionNote)action.append(element('p',model.nextAction.connectionNote,'connection-note'));
    if(model.nextAction.generalNote)action.append(element('p',model.nextAction.generalNote,'general-exercise-note'));
    const go=element('button',model.nextAction.label+' ↗','btn-primary');
    go.type='button';go.setAttribute('id','overview-next-action');
    go.addEventListener('click',()=>onNavigate(dirty?'setup':model.nextAction.route,model.nextAction.taskId));
    action.append(go);
    action.append(element('h3',model.nextAction.reasonHeading||'Why it fits','why-heading'),element('p',(model.nextAction.connectionGap&&!model.nextAction.savedExperiment?model.nextAction.connectionGap.message+' ':'')+model.nextAction.reason,'next-action-reason'));
    if(model.nextAction.partialSupport){
        const partial=element('details',undefined,'move-basis');
        partial.append(element('summary','Investor interest only · inspect sources'),element('p','The selected investor has a relevant interest, but no matching startup approach is encoded for your situation. The exercise above is general; it is not that investor’s recommendation.'));
        renderPreparationSources(model.nextAction.partialSupport.interests,partial);action.append(partial);
    }
    if(model.nextAction.basis){
        const basis=element('details',undefined,'move-basis');
        basis.append(element('summary',model.nextAction.disclosureLabel||model.nextAction.basisLabel),element('p',model.nextAction.basis));
        if(model.nextAction.sources?.length)renderPreparationSources(model.nextAction.sources,basis);
        action.append(basis);
    }
    const progress=element('article',undefined,'progress-card');
    progress.append(element('p','LEARNING IN MOTION','eyebrow'));
    if (model.started) {
        const count=element('p',undefined,'progress-count');
        count.append(element('strong',String(model.counts.recorded)),element('span',' / '+model.counts.total+' moves'));
        progress.append(count,element('p','with learning recorded','text-muted'));
        const bar=element('progress');
        bar.max=model.counts.total||1;bar.value=model.counts.recorded;
        bar.setAttribute('aria-label','Moves with learning recorded');
        bar.textContent=model.counts.recorded+' of '+model.counts.total+' tasks';
        progress.append(bar);
        const states=element('div',undefined,'progress-states');
        states.append(element('span',(model.counts.total-model.counts.recorded-model.counts.inProgress)+' to explore'),
            element('span',model.counts.inProgress+' being tried'));
        progress.append(states);
    } else {
        progress.append(element('div','—','empty-progress'),
            element('p','Your plan starts with your context.','progress-empty-title'),
            element('p','Three choices. Details can wait.','text-muted'));
    }
    progress.append(element('p','A record of learning and decisions.','progress-footnote'));
    hero.append(action);container.append(hero);
    const extra=element('details',undefined,'section-details overview-extra');
    extra.setAttribute('id','overview-details');
    extra.append(element('summary','Explore the details'),progress);

    const map=element('section',undefined,'evidence-map');
    const heading=element('div',undefined,'section-heading');
    heading.append(element('h2','Your learning map'),element('span',loading?'Updating libraries…':'Select an area to open its actions','text-muted'));
    map.append(heading);
    const tiles=element('div',undefined,'evidence-tiles');
    const statuses={unknown:'Unexplored',review:'Explore next',recorded:'Learning recorded'};
    const symbols={unknown:'?',review:'◔',recorded:'✓'};
    model.domains.forEach(domain=>{
        const tile=element('button',undefined,'evidence-tile evidence-'+domain.status);
        tile.type='button';tile.setAttribute('id','domain-'+domain.id);
        tile.setAttribute('aria-label',domain.label+': '+statuses[domain.status]+'. Open actions.');
        tile.append(element('span',domain.number,'domain-number'),
            element('span',symbols[domain.status],'domain-symbol'),
            element('strong',domain.label),
            element('span',statuses[domain.status],'domain-state'),
            element('span',domain.status==='recorded'?domain.recorded+' task note(s) recorded':domain.description,'domain-description'));
        tile.addEventListener('click',()=>onNavigate(!model.started?'setup':domain.id==='investor'&&!model.lensCount?'lens':'plan',domain.taskId));
        tiles.append(tile);
    });
    map.append(tiles,element('p',model.research?'Learning is self-reported. Research records are publisher-supplied; source accounts and interpretations are not independently verified.':'Learning is self-reported. The bundled scenarios and investor interests are invented for practice.','map-note'));
    extra.append(map);

    const links=element('section',undefined,'research-links');
    const research=[
        [model.research?'IMPORTED RESEARCH':'ILLUSTRATIVE CONTEXT',model.snapshotCount+' snapshots · '+model.companies+' companies','Explore early approaches','Dated cases to consider in your own context.','snapshots']
    ];
    research.forEach(([eyebrow,count,title,description,route])=>{
        const card=element('article',undefined,'research-card');
        card.append(element('p',eyebrow,'eyebrow'),element('p',count,'research-count'),element('h3',title),element('p',description,'text-muted'));
        const button=element('button','Open comparison ↗','text-button');
        button.type='button';button.addEventListener('click',()=>onNavigate(route));
        card.append(button);links.append(card);
    });
    extra.append(links);container.append(extra);
}


export function renderInvestorLens(profiles,selectedIds,container,onSave,{open=false}={}) {
    container.replaceChildren();
    const available=profiles.filter(profile=>profile.comparison_enabled!==false);
    const selected=new Set(selectedIds);
    const details=element('details',undefined,'investor-lens');
    details.open=open;
    details.setAttribute('id','investor-lens-picker');
    const chosen=available.filter(profile=>selected.has(profile.id));
    const summary=element('summary');summary.setAttribute('id','investor-lens-summary');
    const value=chosen.length===1?chosen[0].name:chosen.length?chosen.length+' selected':'None selected';
    summary.append(element('span','Investor lens:','lens-caption'),element('span',value,'lens-value'));
    const action=element('span',open?'Close':chosen.length?'Change':'Choose','lens-action');
    summary.append(action);details.append(summary);
    details.append(element('p','Optional. Choose investors whose interests you want to consider. You can explore examples without choosing.','lens-help'));
    details.append(element('p',profiles.some(profile=>profile.data_kind==='research')?'Choose whose published interests to consider. Inclusion does not establish eligibility, endorsement or interest in your startup.':'Choose fictional investor perspectives to practice exploring next moves. These profiles represent no real investor or funding offer.','text-muted'));
    const form=element('form');
    const list=element('div',undefined,'lens-options');
    const controls=available.map(profile=>{
        const label=element('label',undefined,'lens-option');
        const checkbox=element('input');
        checkbox.type='checkbox';checkbox.value=profile.id;checkbox.checked=selected.has(profile.id);
        checkbox.setAttribute('id','lens-'+encodeURIComponent(profile.id));
        label.append(checkbox,element('span',profile.name));list.append(label);
        return checkbox;
    });
    form.append(list);
    const actions=element('div',undefined,'suggestion-actions');
    const clear=element('button','Clear choices','btn-secondary');clear.type='button';
    clear.addEventListener('click',()=>controls.forEach(control=>{control.checked=false;}));
    actions.append(clear);
    const apply=element('button','Use selected investors','btn-primary');
    apply.type='submit';apply.setAttribute('id','apply-investor-lens');
    actions.append(apply);form.append(actions);
    form.addEventListener('submit',event=>{event.preventDefault();onSave(controls.filter(control=>control.checked).map(control=>control.value));});
    details.addEventListener('toggle',()=>{
        action.textContent=details.open?'Close':chosen.length?'Change':'Choose';
        if(!details.open)controls.forEach(control=>{control.checked=selected.has(control.value);});
    });
    const status=element('p','','sr-only');status.setAttribute('id','investor-lens-status');status.setAttribute('role','status');
    details.append(form);container.append(details,status);
}

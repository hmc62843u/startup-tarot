import { validateInvestorProfile, normalizeProfile, validateStartupSnapshot } from './validator.js';
import { buildComparison, filterProfiles, profileSectors, startupEvidenceKey, buildWorkspaceModel, evaluateMatchingCases, investorLensKey } from './analyzer.js';
import { renderLibrary, renderComparison, renderFilterChips, renderValidationErrors, renderStartupSnapshots, renderSnapshotComparison, renderSnapshotOverview, renderPreparationBoard, renderHistoricalSuggestions, renderWorkspaceOverview, renderInvestorLens, toggleView } from './ui.js';
import { saveState, loadState } from './storage.js';
import { validateResearchPackage, parseResearchPackage, researchWorkspaceKey, researchContentKey, MAX_RESEARCH_BYTES, researchRecords } from './research-library.js';

const saved = loadState();
const bundledResearch=typeof __DEFAULT_RESEARCH__==='undefined'?null:__DEFAULT_RESEARCH__;
const fresh=!saved||!Object.keys(saved).length;
const restoredResearch=validateResearchPackage(saved?.researchLibrary).isValid?saved.researchLibrary:(fresh?bundledResearch:null);
const initialResearch=!!restoredResearch&&(fresh||saved?.activeLibrary==='research');
const initialWork=saved?.activeLibrary==='research'&&!initialResearch?saved?.libraryWorkspaces?.demo:saved;
const state = {
    startup: saved?.startup && typeof saved.startup === 'object' ? saved.startup : {},
    profiles: Array.isArray(saved?.profiles) ? saved.profiles.filter(p => validateInvestorProfile(p).isValid).map(normalizeProfile) : [],
    taskProgress: initialWork?.taskProgress && typeof initialWork.taskProgress === 'object' && !Array.isArray(initialWork.taskProgress) ? initialWork.taskProgress : {},
    selectedInvestorIds: Array.isArray(initialWork?.selectedInvestorIds) ? [...new Set(initialWork.selectedInvestorIds.filter(id=>typeof id==='string'))] : [],
    suggestionChoices: initialWork?.suggestionChoices && typeof initialWork.suggestionChoices === 'object' && !Array.isArray(initialWork.suggestionChoices) ? initialWork.suggestionChoices : {},
    researchLibrary:restoredResearch,
    activeLibrary:initialResearch?'research':'demo',
    libraryWorkspaces:saved?.libraryWorkspaces&&typeof saved.libraryWorkspaces==='object'&&!Array.isArray(saved.libraryWorkspaces)?saved.libraryWorkspaces:{}
};
let bundledProfiles = [];
let libraryLoading = true;
let dirty = false;
let choosingDemo = false;
let startupSnapshots = [];
let demoSnapshots=[];
let pendingResearch=null;
let importAttempt=0;
let snapshotsLoading = true;
let lastPersistFailed = false;

function workspaceModel() {
    return {...buildWorkspaceModel(state.startup,allProfiles(),startupSnapshots,state.taskProgress,state.suggestionChoices,state.selectedInvestorIds),research:usesResearchData()};
}
function selectInvestorLens(ids) {
    // Stamp legacy records only when their saved context and basis still match.
    // This records an observed lens transition without guessing old provenance.
    const currentLens=investorLensKey(state.selectedInvestorIds);
    for(const task of workspaceModel().tasks){
        const record=state.taskProgress[task.id];
        if(record&&typeof record==='object'&&!Array.isArray(record)
            &&record.startupKey===startupEvidenceKey(state.startup)
            &&(record.taskKey??null)===(task.evidenceKey??null)){
            state.taskProgress[task.id]={...record,
                basisLensKey:typeof record.basisLensKey==='string'?record.basisLensKey:currentLens,
                ...(record.experiment&&!record.planTitle?{planTitle:task.title}:{})};
        }
    }
    state.selectedInvestorIds=ids;
}

function usesResearchData(){return state.activeLibrary==='research'&&state.researchLibrary?.dataset_kind!=='fictional';}

function renderOverview() {
    const model=workspaceModel();
    document.getElementById('overview-dashboard').hidden=choosingDemo||!model.started;
    document.getElementById('situation-summary').hidden=choosingDemo||!model.started;
    renderWorkspaceOverview(model,document.getElementById('overview-dashboard'),navigate,{dirty,loading:libraryLoading||snapshotsLoading,situationContainer:document.getElementById('situation-summary'),editorOpen:!document.getElementById('startup-editor').hidden});
    const lensContainer=document.getElementById('investor-lens');
    const open=document.getElementById('investor-lens-picker')?.open||false;
    lensContainer.hidden=choosingDemo||!model.started||libraryLoading;
    renderInvestorLens(allProfiles(),state.selectedInvestorIds,lensContainer,ids=>{
        if(dirty){navigate('setup');return;}
        selectInvestorLens(ids);
        const stored=persist();
        renderPreparation();
        document.getElementById('investor-lens-picker').open=false;
        const status=document.getElementById('investor-lens-status');
        status.textContent=stored?'Investor choice saved. Your next move is updated.':'Choice updated for this session; browser storage could not save it.';
        if(!stored)status.className='lens-save-error';
        document.getElementById('investor-lens-summary').focus();
    },{open});
    document.getElementById('workspace-state').textContent=choosingDemo?'Choose an example':dirty?'Unsaved edits':lastPersistFailed?'Session only · storage unavailable':state.startup.current_stage?'Saved in this browser':'Start with three choices';
}

function setComparison(kind) {
    const historical=kind==='snapshots';
    document.getElementById('compare-investors-panel').hidden=historical;
    document.getElementById('compare-snapshots-panel').hidden=!historical;
    for (const [id,selected] of [['compare-investors',!historical],['compare-snapshots',historical]]) {
        const button=document.getElementById(id);
        button.classList.toggle('active',selected);
        button.setAttribute('aria-pressed',String(selected));
    }
}

function openTaskEditor(taskId,{saved=false}={}) {
    const key=encodeURIComponent(taskId);
    const details=document.getElementById('task-details-'+key);
    if(!details)return;
    const other=document.getElementById('other-exercises');
    if(other&&!other.hidden&&other.contains(details))other.open=true;
    details.open=true;
    const target=document.getElementById(saved?'save-task-'+key:'task-action-'+key)||document.getElementById('task-notes-'+key);
    const anchor=document.getElementById(saved?'save-task-'+key:'task-card-'+key);
    anchor?.scrollIntoView?.({block:saved?'nearest':'start'});
    target?.focus({preventScroll:true});
}

function navigate(route,taskId) {
    if (route==='setup') {
        choosingDemo=false;
        toggleView('overview');
        document.getElementById('startup-editor').hidden=false;
        document.getElementById('edit-situation')?.setAttribute('aria-expanded','true');
        document.getElementById('business-model').focus();
        document.getElementById('startup-editor').scrollIntoView?.({block:'nearest'});
        return;
    }
    if (route==='lens') { route='overview';taskId='investor-lens'; }
    if (route==='investors'||route==='snapshots') {
        setComparison(route);
        route='compare';
    }
    toggleView(route);
    if (route==='overview') {
        renderOverview();
        if(taskId==='investor-lens'){
            const picker=document.getElementById('investor-lens-picker');
            picker.open=true;
            document.getElementById('investor-lens-summary').focus();
            picker.scrollIntoView?.({block:'nearest'});
        }
    }
    if (route==='compare') { renderAnalysis();renderHistoricalContrast(); }
    if (route==='plan') {
        renderPreparation();
        if (taskId) openTaskEditor(taskId);
    }
}

function renderHistoricalContrast() {
    const id = document.getElementById('snapshot-select').value;
    renderSnapshotComparison(state.startup, startupSnapshots.find(snapshot => snapshot.id === id), document.getElementById('snapshot-comparison'), dirty);
}

// The generated classic entry supplies packaged data for direct file opening.
const packagedData = typeof __PACKAGED_DATA__ === 'undefined' ? null : __PACKAGED_DATA__;

async function readLibrary(indexPath, key, validate, localRecords) {
    const checked = (record, label) => {
        if (record?.data_kind!=='fictional' || record?.distribution_basis!=='original_demo' || record?.data_license!=='MIT') throw new Error(label+': this release accepts original fictional examples only.');
        const validation = validate(record);
        if (!validation.isValid) throw new Error(label + ': ' + validation.errors.join(' '));
        return record;
    };
    if (location.protocol === 'file:') {
        if (!Array.isArray(localRecords)) throw new Error('The local demo bundle needs rebuilding.');
        return Promise.allSettled(localRecords.map(record => Promise.resolve().then(() => checked(record, record.id || 'Record'))));
    }
    const url = new URL(indexPath, import.meta.url);
    const response = await fetch(url,{cache:'no-cache'});
    if (!response.ok) throw new Error('Library index could not load: ' + response.status);
    const manifest = await response.json();
    if (!Array.isArray(manifest[key])) throw new Error('Library index must list ' + key + ' paths.');
    return Promise.allSettled(manifest[key].map(async path => {
        const response = await fetch(new URL(path, url),{cache:'no-cache'});
        if (!response.ok) throw new Error(path + ': HTTP ' + response.status);
        return checked(await response.json(), path);
    }));
}

async function loadStartupSnapshots() {
    const errors = [];
    try {
        const loaded = await readLibrary('../data/startup-library.json', 'snapshots', validateStartupSnapshot, packagedData?.snapshots);
        demoSnapshots = loaded.filter(result => result.status === 'fulfilled').map(result => result.value);
        loaded.filter(result => result.status === 'rejected').forEach(result => errors.push(result.reason.message));
    } catch (error) { errors.push(error.message); }
    snapshotsLoading = false;
    if (errors.length) renderValidationErrors(errors,document.getElementById('snapshot-errors'));
    refreshSnapshotLibrary();
    renderPreparation();
}

function refreshSnapshotLibrary() {
    startupSnapshots=state.activeLibrary==='research'?researchRecords(state.researchLibrary).snapshots:demoSnapshots;
    renderStartupSnapshots(startupSnapshots, document.getElementById('snapshot-list'));
    renderSnapshotOverview(startupSnapshots,document.getElementById('snapshot-overview'));
    const select = document.getElementById('snapshot-select');
    const previous=select.value;
    select.replaceChildren();
    startupSnapshots.forEach(snapshot => select.add(new Option(snapshot.company + ' · ' + snapshot.snapshot_date,snapshot.id)));
    if(startupSnapshots.some(snapshot=>snapshot.id===previous))select.value=previous;
    if (startupSnapshots.length && !select.value) select.value=startupSnapshots[0].id;
    document.getElementById('snapshot-status').textContent = startupSnapshots.length +(state.activeLibrary==='research'?(state.researchLibrary.dataset_kind==='fictional'?' imported fictional snapshots. Invented examples only.':' research snapshots. Review their dated sources and limitations.'):' fictional scenarios. Dates and quantities are invented; unknowns remain unknown.');
    renderHistoricalContrast();
}

function allProfiles() {
    // Imports replace the active library; legacy saved profiles are never implicitly activated.
    return state.activeLibrary==='research'?researchRecords(state.researchLibrary).profiles.map(normalizeProfile):bundledProfiles;
}

function persist() {
    try {
        saveState(state);
        lastPersistFailed=false;
        return true;
    } catch {
        lastPersistFailed=true;
        document.getElementById('save-status').textContent = 'Changes are available for this session, but browser storage could not save them.';
        return false;
    }
}

function render() {
    const profiles = allProfiles();
    const comparable = profiles.filter(p => p.comparison_enabled !== false);
    const filters = {
        'filter-funding': profiles.map(p => p.funding_type),
        'filter-stage': profiles.flatMap(p => p.stage_focus),
        'filter-sector': profiles.flatMap(profileSectors),
        'report-filter-funding': comparable.map(p => p.funding_type),
        'report-filter-stage': comparable.flatMap(p => p.stage_focus),
        'report-filter-sector': comparable.flatMap(profileSectors)
    };
    for (const [id, values] of Object.entries(filters)) {
        const control = document.getElementById(id);
        const selectedValue = control.value;
        control.replaceChildren(new Option('All', ''));
        [...new Set(values)].sort().forEach(value => control.add(new Option(value.replaceAll('-', ' ').replaceAll('_', ' '), value)));
        if (values.includes(selectedValue)) control.value = selectedValue;
    }
    renderBrowser();
    document.getElementById('library-status').textContent = libraryLoading
        ? 'Loading the bundled library…'
        : profiles.length + (state.activeLibrary==='research'?(usesResearchData()?' research profiles. Review sources and publisher license notices.':' imported fictional profiles. Invented preferences only.'):' profiles available. These are original fictional examples with invented weights.')+' Reference-only profiles are excluded from comparisons.';

    const select = document.getElementById('analyze-target-select');
    const selected = select.value;
    select.replaceChildren(new Option('All comparable profiles (' + comparable.length + ')', ''));
    comparable.forEach(p => select.add(new Option(p.name, p.id)));
    if (comparable.some(p => p.id === selected)) select.value = selected;
    renderAnalysis();
    renderPreparation();
    renderLibraryManager();
}

function previewField(parent,label,text,url) {
    const line=document.createElement('p');
    const strong=document.createElement('strong');strong.textContent=label+': ';line.append(strong);
    const value=document.createElement(url?'a':'span');value.textContent=text;
    if(url){value.href=url;value.target='_blank';value.rel='noopener noreferrer';}
    line.append(value);parent.append(line);
}

function renderResearchPreview() {
    const container=document.getElementById('research-preview');container.replaceChildren();
    document.getElementById('activate-research').hidden=!pendingResearch;
    document.getElementById('cancel-research').hidden=!pendingResearch;
    if(!pendingResearch&&!state.researchLibrary)return;
    const box=document.createElement('div');box.className='library-preview';
    const p=pendingResearch||state.researchLibrary;
    const records=researchRecords(p);
    if(p.schema_version===2){
        previewField(box,'Provider',p.provider.name+' · '+p.provider.id,p.provider.url||undefined);
        previewField(box,'Dataset',p.dataset_kind==='fictional'?'Fictional Guide Pack · invented records':'Research records · inspect sources and limits');
        previewField(box,'Components',p.components.matching.rules.length+' matching rules · '+p.components.suggestions.length+' suggestion texts');
        previewField(box,'Investor topics',p.components.matching.investor_topics.length+' declared topic connections. Without a matching investor topic, a rule cannot yield an investor-linked move.');
        for(const key of ['research','matching','suggestions'])previewField(box,'Provider-declared '+key+' quality',p.quality[key].status+' · '+(p.quality[key].reviewed_date||'No evaluation date')+' · '+p.quality[key].statement);
        previewField(box,'Review limits','Provider identity and quality declarations are not independently verified. A valid package is compatible, not certified accurate or useful. Rules use app-owned operators; imported code is never run.');
        const cases=p.components.matching.evaluation_cases||[];
        if(cases.length){
            const report=evaluateMatchingCases(cases,records.profiles,records.snapshots);
            previewField(box,'Provider self-tests',report.passed+' of '+report.total+' expectations matched · '+report.failed+' differ. These are provider-authored tests, not independent accuracy ratings. They use supplied examples, not your saved startup.');
            previewField(box,'Test coverage',report.positive+' expect suggestions · '+report.negative+' expect none.'+(!report.positive?' No positive-match cases are included.':''));
            const checks=document.createElement('details');const heading=document.createElement('summary');heading.textContent='Inspect expected and actual results';checks.append(heading);
            const titles=ids=>ids.length?ids.map(id=>p.components.suggestions.find(s=>s.id===id)?.title||id).join('; '):'No investor-linked suggestion';
            for(const result of report.results){
                previewField(checks,result.name,result.passed?'Matches expectation':'Differs from expectation');
                const input=cases.find(item=>item.id===result.id);
                previewField(checks,'Case situation',[input.startup.business_model,input.startup.current_stage,input.startup.validation_focus].map(value=>value||'Unknown').join(' · ')+' · sectors: '+(input.startup.sectors.join(', ')||'Unknown'));
                previewField(checks,'Case investor lens',input.investor_ids.length?input.investor_ids.map(id=>records.profiles.find(profile=>profile.id===id).name).join('; '):'Unselected lens · active-library preview');
                previewField(checks,'Expected',titles(result.expected));previewField(checks,'Actual',titles(result.actual));previewField(checks,'Provider rationale',result.rationale);
            }
            box.append(checks);
            if(report.failed)previewField(box,'Check differences','This package is structurally compatible, but some provider expectations differ from the app. Review the cases before deciding whether to activate it.');
        }else previewField(box,'Provider self-tests','Not supplied. Compatibility is not evidence of matching quality.');
    }else previewField(box,'Provider','Legacy v1 package · provider and quality metadata not supplied');
    previewField(box,pendingResearch?'Preview':p.schema_version===2?'Installed Guide Pack':'Installed legacy Guide Pack',p.name+' · '+p.version+' · updated '+p.updated_date);
    previewField(box,'Contents',records.profiles.length+' investor profiles · '+records.snapshots.length+' startup snapshots');
    previewField(box,'Repository',p.repository_url || 'Local package · no repository URL',p.repository_url || undefined);
    previewField(box,'Declared license',p.license.id,p.license.url);
    previewField(box,'License scope',p.license.scope);
    previewField(box,'Publisher notice',p.license.notice);
    previewField(box,'Publisher-declared rights review',p.rights_review.reviewed_date+' · '+p.rights_review.statement);
    const sources=[...new Set([...records.profiles.flatMap(profile=>[profile.source_url,...(profile.preparation_topics||[]).map(topic=>topic.source_url)]),...records.snapshots.flatMap(snapshot=>snapshot.sources.map(source=>source.url))])];
    const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Review '+sources.length+' source link(s)';details.append(summary);
    sources.forEach(url=>previewField(details,'Source',url,url));box.append(details);
    previewField(box,'Use and limitations','Review the declared terms for your intended use. Validation checks structure, not accuracy or legal clearance. Each library version keeps separate notes and lens selections.');
    container.append(box);
}

function renderLibraryManager() {
    const research=state.activeLibrary==='research';const library=state.researchLibrary;const realResearch=usesResearchData();
    const notice=document.getElementById('active-library-notice');notice.replaceChildren();
    const title=document.createElement('summary');title.textContent=research?(library.schema_version===2?(library.dataset_kind==='fictional'?'Fictional Guide Pack':'Research Guide Pack'):'Imported research'):'Fictional examples';notice.append(title);
    const text=document.createElement('p');text.textContent=research?(library.schema_version===2?library.provider.name+' · ':'')+library.name+' '+library.version+' · publisher-declared license: '+library.license.id+'. Review sources; no endorsement or verified outcome is implied.':'Fictional demo. All bundled investor profiles and startup scenarios are invented for practice. ';notice.append(text);
    if(!research){const link=document.createElement('a');link.href='docs/examples.html';link.textContent='About the examples ↗';text.append(link);}
    document.getElementById('active-library-name').textContent=research?library.name+' · '+library.version:'Fictional demo';
    document.getElementById('use-demo-library').hidden=!research;
    document.getElementById('use-research-library').hidden=!library||research;
    document.getElementById('remove-research').hidden=!library||researchWorkspaceKey(library)===researchWorkspaceKey(bundledResearch);
    document.getElementById('use-bundled-research').hidden=research&&researchWorkspaceKey(library)===researchWorkspaceKey(bundledResearch);
    document.getElementById('demo-scenarios').hidden=research;
    document.getElementById('imported-records-note').hidden=!library;
    document.getElementById('compare-investors').textContent='Investors';
    document.getElementById('compare-snapshots').textContent='Startups';
    document.getElementById('compare-description').textContent=realResearch?'Research investor focus and dated startup accounts. Review the underlying sources.':'Illustrative investor focus. Example approaches. Sources when you need them.';
    document.getElementById('investor-comparison-title').textContent=realResearch?'Investor focus, at a glance':'Illustrative investor focus';
    document.getElementById('investor-library-title').textContent=realResearch?'Research Investor Library':'Fictional Investor Library';
    document.getElementById('snapshot-comparison-title').textContent=realResearch?'A moment in another startup’s journey':'Explore an invented startup situation';
    document.getElementById('snapshot-comparison-description').textContent=realResearch?'Dated sources for reflection; an action does not establish what caused an outcome.':'Fictional scenarios for practice. The next step is yours to choose.';
}

function changeLibrary(mode,library=state.researchLibrary,remove=false) {
    const status=document.getElementById('research-library-status');
    if(mode==='research'&&!library){status.textContent='Choose and preview a Guide Pack first.';return false;}
    if(dirty){status.textContent='Save startup edits before changing libraries.';return false;}
    const previous={...state};
    const currentKey=researchWorkspaceKey(state.activeLibrary==='research'?state.researchLibrary:null);
    const workspaces={...state.libraryWorkspaces,[currentKey]:{taskProgress:state.taskProgress,suggestionChoices:state.suggestionChoices,selectedInvestorIds:state.selectedInvestorIds}};
    const nextKey=researchWorkspaceKey(mode==='research'?library:null);
    const work=workspaces[nextKey]||{};
    Object.assign(state,{activeLibrary:mode,researchLibrary:remove?null:library,libraryWorkspaces:workspaces,
        taskProgress:work.taskProgress||{},suggestionChoices:work.suggestionChoices||{},selectedInvestorIds:work.selectedInvestorIds||[]});
    try {saveState(state);} catch {
        Object.assign(state,previous);status.textContent='Library change was not saved. Browser storage may be full or unavailable. Your active library and notes are unchanged.';return false;
    }
    choosingDemo=false;
    lastPersistFailed=false;pendingResearch=null;importAttempt++;renderResearchPreview();
    document.getElementById('research-file').value='';
    refreshSnapshotLibrary();render();
    status.textContent=remove?'Imported records removed. Saved notes and plans are retained in this browser.':mode==='research'?'Guide Pack activated and saved in this browser.':'Fictional demo restored. Research notes are retained separately.';
    return true;
}

function initResearchImport() {
    const input=document.getElementById('research-file');const status=document.getElementById('research-library-status');
    input.addEventListener('change',async()=>{
        const attempt=++importAttempt;pendingResearch=null;renderResearchPreview();
        const file=input.files?.[0];if(!file)return;
        status.textContent='Checking the Guide Pack…';
        try {
            if(file.size>MAX_RESEARCH_BYTES)throw new Error('Choose a JSON Guide Pack no larger than 5 MB.');
            const candidate=parseResearchPackage(await file.text());
            if(attempt!==importAttempt)return;
            if(state.researchLibrary&&researchWorkspaceKey(candidate)===researchWorkspaceKey(state.researchLibrary)&&researchContentKey(candidate)!==researchContentKey(state.researchLibrary))throw new Error('This library version is already installed with different content. Ask the publisher for a new version.');
            pendingResearch=candidate;renderResearchPreview();status.textContent='Package validated. Review the preview, then choose Use this Guide Pack. Nothing has been activated yet.';
        } catch(error) {if(attempt===importAttempt){pendingResearch=null;renderResearchPreview();status.textContent='Import not accepted: '+error.message;}}
    });
    document.getElementById('activate-research').addEventListener('click',()=>{if(pendingResearch)changeLibrary('research',pendingResearch);});
    document.getElementById('cancel-research').addEventListener('click',()=>{importAttempt++;pendingResearch=null;input.value='';renderResearchPreview();status.textContent='Preview cancelled. Active library unchanged.';});
    document.getElementById('use-demo-library').addEventListener('click',()=>{
        if(!changeLibrary('demo'))return;
        choosingDemo=true;
        document.getElementById('startup-editor').hidden=true;
        document.getElementById('workspace-settings').close();navigate('overview');
        const chooser=document.getElementById('demo-scenarios');chooser.open=true;
        chooser.scrollIntoView?.({block:'start'});
        document.getElementById('demo-complete').focus({preventScroll:true});
    });
    document.getElementById('use-bundled-research').addEventListener('click',()=>changeLibrary('research',bundledResearch));
    for(const [id,model,lens] of [['complete','marketplace','demo_discovery'],['investor','hardware','demo_discovery'],['snapshot','marketplace','demo_formation'],['neither','hardware','demo_formation']]){
        document.getElementById('demo-'+id).addEventListener('click',()=>{
            if(dirty){navigate('setup');return;}
            choosingDemo=false;
            selectInvestorLens([lens]);
            state.startup={...state.startup,business_model:model,current_stage:'idea',validation_focus:'demand',sectors:[model]};
            const form=document.getElementById('startup-form');
            for(const [key,value] of Object.entries(state.startup)){
                const control=form.elements.namedItem(key);
                if(control)control.value=Array.isArray(value)?value.join(', '):value==null?'':String(value);
            }
            const stored=persist();
            document.getElementById('startup-editor').hidden=true;
            document.getElementById('startup-editor-title').textContent='Your situation';
            document.getElementById('save-startup').textContent='Update workspace';
            document.getElementById('save-status').textContent=stored?'Demo scenario saved.':'Scenario applies for this session; browser storage could not save it.';
            document.getElementById('demo-scenarios').open=false;
            render();navigate('overview');
            const result=document.getElementById('overview-next-action');
            result?.parentElement?.scrollIntoView?.({block:'start'});
            result?.focus({preventScroll:true});
        });
    }
    document.getElementById('use-research-library').addEventListener('click',()=>changeLibrary('research'));
    document.getElementById('remove-research').addEventListener('click',()=>changeLibrary('demo',null,true));
    renderResearchPreview();
}

function renderBrowser() {
    const profiles = allProfiles();
    const visible = filterProfiles(profiles, {
        funding: document.getElementById('filter-funding').value,
        stage: document.getElementById('filter-stage').value,
        sector: document.getElementById('filter-sector').value
    });
    renderLibrary(visible, 'profile-list');
    document.getElementById('filter-results').textContent = visible.length + ' of ' + profiles.length + ' profiles shown.';
}

function renderAnalysis() {
    const container = document.getElementById('report-output');
    const overview = document.getElementById('report-overview');
    overview.replaceChildren();
    renderReportFilterChips();
    const count = document.getElementById('report-results');
    count.textContent = '';
    if (dirty) {
        container.textContent = 'Your startup has unsaved changes. Update your workspace in Home to update the comparison.';
        return;
    }
    if (!state.startup.current_stage) {
        container.textContent = 'Complete the three choices in Home to compare them with the investor library.';
        return;
    }
    const profiles = allProfiles().filter(p => p.comparison_enabled !== false);
    if (!profiles.length) {
        container.textContent = libraryLoading ? 'Loading investor profiles…' : 'No comparable investor profiles are available. Check the investor library for loading errors or reference-only entries.';
        return;
    }
    const comparison = buildComparison(state.startup, profiles, {
        profileId: document.getElementById('analyze-target-select').value,
        funding: document.getElementById('report-filter-funding').value,
        stage: document.getElementById('report-filter-stage').value,
        sector: document.getElementById('report-filter-sector').value,
        focus: document.getElementById('report-filter-focus').value
    }, document.getElementById('report-group').value);
    count.textContent = comparison.results.length + ' of ' + comparison.total + ' profiles';
    renderComparison(state.startup, comparison.results, container, comparison.groups, overview);
}

function renderPreparation() {
    const board=document.getElementById('preparation-board');
    const overview=document.getElementById('preparation-overview');
    const status=document.getElementById('preparation-status');
    const suggestionContainer=document.getElementById('preparation-suggestions');
    board.replaceChildren();overview.replaceChildren();suggestionContainer.replaceChildren();
    const otherExercises=document.getElementById('other-exercises');otherExercises.replaceChildren();otherExercises.hidden=true;
    renderOverview();
    if (dirty) { status.textContent='Save startup edits to refresh preparation tasks.';return; }
    if (!state.startup.current_stage) { status.textContent='Complete the three choices in Home to explore your next moves.';return; }
    if (libraryLoading) { status.textContent='Loading source profiles for preparation checks…';return; }
    const model=workspaceModel();
    const suggestions=model.suggestions;
    const preview=!model.lensCount&&model.libraryPreview.length>0;
    suggestionContainer.hidden=!preview&&!suggestions.length&&!snapshotsLoading&&model.support.kind!=='investor_only';
    renderHistoricalSuggestions(preview?model.libraryPreview:suggestions,suggestionContainer,(id,decision)=>{
        const suggestion=suggestions.find(item=>item.id===id);
        state.suggestionChoices[id]={decision,startupKey:startupEvidenceKey(state.startup),evidenceKey:suggestion.evidenceKey};
        const stored=persist();
        renderPreparation();
        document.getElementById('preparation-status').textContent=stored?(decision==='accepted'?'Plan created. Adapt it below.':decision==='dismissed'?'Example dismissed for this situation.':'Example ready to review.'):'Choice applies for this session; browser storage could not save it.';
        if(decision==='accepted'){
            document.getElementById('other-exercises').open=false;
            openTaskEditor(suggestion.targetTaskId);
        }
        else document.getElementById('preparation-status').focus();
    },snapshotsLoading,usesResearchData(),preview?ids=>{
        selectInvestorLens(ids);
        const stored=persist();renderPreparation();
        document.getElementById('preparation-status').textContent=stored?'Investor lens selected. Review the connected move before making an experiment plan.':'Lens selected for this session; browser storage could not save it.';
    }:null,taskId=>navigate('plan',taskId),model.support);
    const tasks=model.tasks;
    status.textContent=model.lensCount
        ? model.lensCount+' investor profile(s) selected.'
        : preview?'Review a matching library example.':'Choose a move and record what you learn.';
    renderPreparationBoard(tasks,board,overview,(id,progress)=>{
        state.taskProgress[id]={...state.taskProgress[id],...progress,startupKey:startupEvidenceKey(state.startup),taskKey:tasks.find(task=>task.id===id).evidenceKey ?? null,basisLensKey:investorLensKey(state.selectedInvestorIds),...(progress.experiment?{planTitle:state.taskProgress[id]?.planTitle||tasks.find(task=>task.id===id).title}:{}),updatedAt:new Date().toISOString()};
        const stored=persist();
        renderPreparation();
        document.getElementById('preparation-status').textContent=stored?'Task progress saved in this browser.':'Task progress is available for this session; browser storage could not save it.';
        openTaskEditor(id,{saved:true});
        document.getElementById('task-save-message-'+encodeURIComponent(id)).textContent=stored?'Progress saved.':'Changes are available for this session, but browser storage could not save them.';
    },{otherExercises});
}

function renderReportFilterChips() {
    const labels = {
        'analyze-target-select': 'Investor', 'report-filter-funding': 'Funding',
        'report-filter-stage': 'Stage', 'report-filter-sector': 'Sector',
        'report-filter-focus': 'Focus', 'report-group': 'Group by'
    };
    const active = Object.entries(labels).flatMap(([id, label]) => {
        const control = document.getElementById(id);
        return control.value ? [{ id, label: label + ': ' + control.options[control.selectedIndex].textContent }] : [];
    });
    renderFilterChips(active, document.getElementById('active-report-filters'), id => {
        document.getElementById(id).value = '';
        renderAnalysis();
        document.getElementById('toggle-report-filters').focus();
    });
    document.getElementById('reset-report-filters').hidden = active.length === 0;
}

async function loadLibrary() {
    const errors = [];
    try {
        const loaded = await readLibrary('../data/library.json', 'profiles', validateInvestorProfile, packagedData?.profiles);
        bundledProfiles = loaded.filter(result => result.status === 'fulfilled').map(result => normalizeProfile(result.value));
        loaded.filter(result => result.status === 'rejected').forEach(result => errors.push(result.reason.message));
    } catch (error) { errors.push(error.message); }
    libraryLoading = false;
    if (errors.length) renderValidationErrors(errors, document.getElementById('library-errors'));
    render();
}

function init() {
    initResearchImport();
    const settings=document.getElementById('workspace-settings');
    const settingsButton=document.getElementById('open-settings');
    let returnPosition=null;
    settingsButton.addEventListener('click',()=>{
        if(settings.open)return;
        returnPosition={x:window.scrollX||0,y:window.scrollY||0};
        settings.showModal();
        document.documentElement?.classList.add('settings-open');
        settingsButton.setAttribute('aria-expanded','true');
        document.getElementById('close-settings').focus();
    });
    document.getElementById('close-settings').addEventListener('click',()=>settings.close());
    settings.addEventListener('close',()=>{
        document.documentElement?.classList.remove('settings-open');
        settingsButton.setAttribute('aria-expanded','false');
        if(choosingDemo){
            document.getElementById('demo-scenarios').scrollIntoView?.({block:'start'});
            document.getElementById('demo-complete').focus({preventScroll:true});returnPosition=null;return;
        }
        settingsButton.focus({preventScroll:true});
        if(returnPosition)window.scrollTo?.(returnPosition.x,returnPosition.y);
    });
    settings.addEventListener('keydown',event=>{
        if(event.key!=='Tab')return;
        const controls=[...settings.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')]
            .filter(control=>!control.disabled&&control.getClientRects().length);
        const first=controls[0],last=controls.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    });
    settings.addEventListener('click',event=>{
        if(event.target!==settings)return;
        const bounds=settings.getBoundingClientRect();
        if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)settings.close();
    });
    document.querySelectorAll('nav button').forEach(button=>{
        button.addEventListener('click',()=>navigate(button.dataset.view));
    });
    document.getElementById('compare-investors').addEventListener('click',()=>setComparison('investors'));
    document.getElementById('compare-snapshots').addEventListener('click',()=>setComparison('snapshots'));
    document.querySelectorAll('.brand').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();navigate('overview');}));
    const form = document.getElementById('startup-form');
    for (const [key, value] of Object.entries(state.startup)) {
        if (form.elements.namedItem(key)) form.elements.namedItem(key).value = Array.isArray(value) ? value.join(', ') : value == null ? '' : String(value);
    }
    const started=!!state.startup.current_stage;
    document.getElementById('startup-editor').hidden=started;
    document.getElementById('startup-editor-title').textContent=started?'Your situation':'Your situation · three choices';
    document.getElementById('save-startup').textContent=started?'Update workspace':'Show my options';
    if (started) {
        for (const key of ['business_model','validation_focus']) if (!state.startup[key]) form.elements.namedItem(key).value='unknown';
    }
    const markDirty=()=>{dirty=true;document.getElementById('workspace-state').textContent='Unsaved edits';};
    form.addEventListener('input',markDirty);
    form.addEventListener('change',markDirty);
    form.addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(form);
        state.startup = {
            current_stage: data.get('current_stage'),
            sectors: String(data.get('sectors') || '').split(',').map(s => s.trim()).filter(Boolean),
            founders_have_domain_expertise: data.get('founders_have_domain_expertise') === 'true' ? true : data.get('founders_have_domain_expertise') === 'false' ? false : null,
            prototype_status: data.get('prototype_status') || null,
            paid_pilots: String(data.get('paid_pilots') || '').trim() === '' ? null : Math.max(0, Number(data.get('paid_pilots')) || 0),
            business_model: data.get('business_model') || '',
            validation_focus: data.get('validation_focus') || ''
        };
        dirty = false;
        if (persist()) document.getElementById('save-status').textContent = 'Startup saved. Your workspace is updated.';
        document.getElementById('startup-editor').hidden=true;
        document.getElementById('startup-editor-title').textContent='Your situation';
        document.getElementById('save-startup').textContent='Update workspace';
        renderAnalysis();
        renderHistoricalContrast();
        renderPreparation();
    });
    document.getElementById('snapshot-select').addEventListener('change', renderHistoricalContrast);
    document.getElementById('analyze-target-select').addEventListener('change', renderAnalysis);
    const reportControls = ['report-filter-funding', 'report-filter-stage', 'report-filter-sector', 'report-filter-focus', 'report-group'];
    reportControls.forEach(id => document.getElementById(id).addEventListener('change', renderAnalysis));
    document.getElementById('reset-report-filters').addEventListener('click', () => {
        [...reportControls, 'analyze-target-select'].forEach(id => { document.getElementById(id).value = ''; });
        renderAnalysis();
        document.getElementById('toggle-report-filters').focus();
    });
    ['filter-funding', 'filter-stage', 'filter-sector'].forEach(id => {
        document.getElementById(id).addEventListener('change', renderBrowser);
    });
    document.getElementById('reset-filters').addEventListener('click', () => {
        ['filter-funding', 'filter-stage', 'filter-sector'].forEach(id => { document.getElementById(id).value = ''; });
        renderBrowser();
    });
    document.getElementById('run-analysis-btn').addEventListener('click', renderAnalysis);
    render();
    loadLibrary();
    loadStartupSnapshots();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    let controlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (controlled && !dirty) location.reload();
        controlled = true;
    });
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' })
            .catch(error => console.warn('Offline support unavailable:', error));
    });
}

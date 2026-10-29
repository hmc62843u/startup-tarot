import {buildWorkspaceModel, startupEvidenceKey, investorLensKey} from './analyzer.js';
import {researchWorkspaceKey, researchContentKey} from './research-library.js';
import {describeNextAction} from './explanations.js';

/** Replacing the configured pack never erases another pack's work. */
export function configuredWorkspace(saved, pack) {
    const key=researchWorkspaceKey(pack);
    const work=saved?.activeLibrary==='research'&&saved.researchLibrary&&researchWorkspaceKey(saved.researchLibrary)===key?saved:(saved?.libraryWorkspaces?.[key]||{});
    return {startup:saved?.startup&&typeof saved.startup==='object'?saved.startup:{},
        taskProgress:work.taskProgress&&typeof work.taskProgress==='object'?work.taskProgress:{},
        suggestionChoices:work.suggestionChoices&&typeof work.suggestionChoices==='object'?work.suggestionChoices:{},
        selectedInvestorIds:Array.isArray(work.selectedInvestorIds)?work.selectedInvestorIds.slice(0,1):[],
        libraryWorkspaces:{...saved?.libraryWorkspaces},researchLibrary:pack,activeLibrary:'research',
        configuredPackChanged:!!saved?.researchLibrary&&researchWorkspaceKey(saved.researchLibrary)===key&&researchContentKey(saved.researchLibrary)!==researchContentKey(pack)};
}
export function workspaceForSave(state, previous) {
    const workspaces={...state.libraryWorkspaces};
    if(previous){
        const oldKey=previous.activeLibrary==='research'?researchWorkspaceKey(previous.researchLibrary):'demo';
        if(!workspaces[oldKey])workspaces[oldKey]={taskProgress:previous.taskProgress||{},suggestionChoices:previous.suggestionChoices||{},selectedInvestorIds:previous.selectedInvestorIds||[]};
    }
    workspaces[researchWorkspaceKey(state.researchLibrary)]={taskProgress:state.taskProgress,suggestionChoices:state.suggestionChoices,selectedInvestorIds:state.selectedInvestorIds};
    return {...state,libraryWorkspaces:workspaces};
}
export function leanModel(state,profiles,snapshots) {
    const m=buildWorkspaceModel(state.startup,profiles,snapshots,state.taskProgress,state.suggestionChoices,state.selectedInvestorIds);
    // The compact app has one current experiment: keep owned work reachable even
    // when a changed situation creates a higher-priority mandate-check task.
    const owned=m.tasks.find(task=>task.progress.experiment&&(task.progress.needsReview||task.progress.status!=='evidence_recorded'));
    if(owned&&!m.nextAction.savedExperiment)m.nextAction=describeNextAction({started:m.started,next:owned,candidate:null,pending:false,lensCount:m.lensCount,libraryDiscovery:[],validationFocus:state.startup.validation_focus,support:m.support});
    const pending=[...m.suggestions,...m.libraryPreview].find(item=>item.decision==='pending');
    const task=m.tasks.find(task=>task.id===m.nextAction.taskId)||m.tasks.find(task=>task.id===pending?.targetTaskId);
    const sourceList=m.nextAction.sources||pending?.sources||[];
    const connectedSnapshots=snapshots.filter(snapshot=>sourceList.some(source=>source.kind==='snapshot'&&source.snapshot_date===snapshot.snapshot_date&&source.name===snapshot.company+' · '+snapshot.snapshot_date));
    return {...m,task,pending,connectedSnapshots,sourceList};
}
export function saveLeanPlan(state, task, fields) {
    const previous=state.taskProgress[task.id]||{};
    return {...previous,...fields,startupKey:startupEvidenceKey(state.startup),taskKey:task.evidenceKey??null,
        basisLensKey:investorLensKey(state.selectedInvestorIds),planTitle:previous.planTitle||task.title,updatedAt:new Date().toISOString()};
}

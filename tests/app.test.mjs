import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {buildEntry} from '../tools/build-demo.mjs';
import {researchFixture} from './research-helpers.mjs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8').replace(/^\uFEFF/,'');
const decode=text=>text.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>');

class Element {
    constructor(tag,attrs={}) {
        this.tag=tag;this.attrs=attrs;this.children=[];this.listeners={};this.parent=null;
        this.hidden='hidden' in attrs;
        this.classList={
            contains:name=>this.className.split(/\s+/).includes(name),
            add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...names])].join(' ');},
            remove:(...names)=>{this.className=this.className.split(/\s+/).filter(name=>!names.includes(name)).join(' ');},
            toggle:(name,force)=>{
                const add=force??!this.classList.contains(name);
                add?this.classList.add(name):this.classList.remove(name);
                return add;
            }
        };
    }
    get parentElement(){return this.parent;}
    get tagName(){return this.tag.toUpperCase();}
    get className(){return this.attrs.class||'';}
    set className(value){this.attrs.class=value;}
    get dataset(){return Object.fromEntries(Object.entries(this.attrs).filter(([key])=>key.startsWith('data-')).map(([key,value])=>[key.slice(5),value]));}
    get textContent(){return this.children.map(child=>typeof child==='string'?child:child.textContent).join('');}
    set textContent(value){this.children=[String(value)];}
    contains(node){return this===node||this.descendants().includes(node);}
    descendants(){return this.children.filter(child=>typeof child!=='string').flatMap(child=>[child,...child.descendants()]);}
    get options(){return this.children.filter(child=>typeof child!=='string'&&child.tag==='option');}
    get selectedIndex(){return this.options.findIndex(option=>option.value===this.value);}
    get value(){
        if(this.tag==='select')return this._value??this.options[0]?.value??'';
        return this._value??this.attrs.value??this.textContent;
    }
    set value(value){
        this._value=this.tag==='select'&&!this.options.some(option=>option.value===String(value))?'':String(value);
    }
    get elements(){return {namedItem:name=>this.descendants().find(node=>node.attrs.name===name)};}
    append(...nodes){for(const node of nodes){if(typeof node!=='string')node.parent=this;this.children.push(node);}}
    appendChild(node){this.append(node);return node;}
    replaceChildren(...nodes){this.children=[];if(this.tag==='select')this._value=undefined;this.append(...nodes);}
    add(node){this.append(node);}
    setAttribute(key,value){this.attrs[key]=String(value);}
    addEventListener(name,handler){(this.listeners[name]??=[]).push(handler);}
    dispatch(type){for(const handler of this.listeners[type]||[])handler({type,target:this,preventDefault(){}});}
    click(){this.dispatch('click');}
    focus(options){this.focusOptions=options;}
    showModal(){this.open=true;}
    close(){this.open=false;this.dispatch('close');}
}

function loadDOM() {
    const document=new Element('#document');
    const stack=[document];
    const html=read('index.html').replace(/<!--[\s\S]*?-->/g,'');
    for(const match of html.matchAll(/<[^>]+>|[^<]+/g)){
        const token=match[0];
        if(/^<!/.test(token))continue;
        if(token.startsWith('</')){stack.pop();continue;}
        if(token.startsWith('<')){
            const tag=/^<([^\s>]+)/.exec(token)[1];
            const attrs={};
            for(const a of token.slice(tag.length+1,-1).matchAll(/([^\s=]+)(?:="([^"]*)")?/g))attrs[a[1]]=decode(a[2]??'');
            const element=new Element(tag,attrs);
            stack.at(-1).append(element);
            if(!['input','link','meta','img','br','hr'].includes(tag))stack.push(element);
        }else stack.at(-1).append(decode(token));
    }
    document.getElementById=id=>document.descendants().find(node=>node.attrs.id===id)||null;
    document.createElement=tag=>new Element(tag);
    document.createTextNode=text=>String(text);
    document.querySelectorAll=selector=>{
        const nodes=document.descendants();
        if(selector==='.brand')return nodes.filter(node=>node.classList.contains('brand'));
        if(selector==='.view')return nodes.filter(node=>node.classList.contains('view'));
        if(selector==='nav button'||selector==='nav button[data-view]')return nodes.filter(node=>node.tag==='button'&&node.parent.tag==='nav'&&(!selector.includes('[data-view]')||node.dataset.view));
        throw new Error('Unhandled selector '+selector);
    };
    return document;
}

async function start({protocol='file:',readyState='loading',saved='{"activeLibrary":"demo"}',responseTransform=record=>record,failStorage=false}={}) {
    const document=loadDOM();
    document.readyState=readyState;
    const base=protocol==='file:'?'file:///demo/':'http://127.0.0.1:8000/';
    const storage=new Map([['founder_gap_data',saved],['disclaimer_accepted','true']]);
    document.currentScript={src:base+'js/app.bundle.js'};
    const requests=[];
    const context=vm.createContext({
        document,location:{protocol,reload(){}},navigator:{},
        window:{addEventListener(){}},URL,console,
        localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>{if(failStorage)throw new Error('Storage unavailable');storage.set(key,value);}},
        Option:class extends Element{constructor(text,value){super('option',{value});this.textContent=text;}},
        FormData:class{constructor(form){this.form=form;}get(name){return this.form.elements.namedItem(name).value;}},
        fetch:async url=>{
            requests.push(String(url));
            if(protocol==='file:')throw new Error('Direct file mode must not fetch JSON or modules');
            return {ok:true,json:async()=>responseTransform(JSON.parse(read(new URL(String(url)).pathname.slice(1))))};
        }
    });
    vm.runInContext(read('js/app.bundle.js'),context,{filename:'app.bundle.js'});
    if(readyState==='loading')document.dispatch('DOMContentLoaded');
    await new Promise(resolve=>setImmediate(resolve));
    return {document,requests,storage};
}

test('generated classic entry and cache key match the editable source modules',async()=>{
    const built=await buildEntry();
    assert.equal(read('js/app.bundle.js'),built.bundle);
    assert.ok(read('index.html').includes('js/app.bundle.js?v='+built.hash));
    assert.ok(read('sw.js').includes('./js/app.bundle.js?v='+built.hash));
    assert.ok(read('index.html').includes('css/style.css?v='+built.hash));
    assert.ok(read('sw.js').includes('./css/style.css?v='+built.hash));
    assert.ok(read('docs/examples.html').includes('css/style.css?v='+built.hash));
    assert.ok(!read('index.html').includes('type="module"'));
});

for(const protocol of ['file:','http:']){
    test('full app initializes and all three sections respond in '+protocol+' mode',async()=>{
        const {document,requests}=await start({protocol});
        const get=id=>document.getElementById(id);
        assert.equal(get('profile-list').children.length,6);
        assert.equal(get('snapshot-list').children.length,3);
        for(const button of document.querySelectorAll('nav button')){
            button.click();
            const active=document.querySelectorAll('.view').filter(view=>view.classList.contains('active'));
            assert.equal(active.length,1);
            assert.equal(active[0].attrs.id,'view-'+button.dataset.view);
            assert.equal(button.attrs['aria-pressed'],'true');
        }
        if(protocol==='file:')assert.equal(requests.length,0);
        else assert.equal(requests.length,11); // Two indexes, six fictional investor files, three snapshots.
    });
}

test('startup save and both comparison modes work after full bundle initialization',async()=>{
    const {document}=await start({readyState:'interactive'});
    const get=id=>document.getElementById(id);
    const form=get('startup-form');
    const values={current_stage:'idea',business_model:'saas',validation_focus:'technical_feasibility',sectors:'AI',founders_have_domain_expertise:'true',prototype_status:'mockup',paid_pilots:'0'};
    for(const [key,value]of Object.entries(values))form.elements.namedItem(key).value=value;
    form.dispatch('input');
    form.dispatch('submit');
    assert.ok(get('save-status').textContent.includes('Startup saved'));
    document.querySelectorAll('nav button').find(button=>button.dataset.view==='compare').click();
    assert.ok(get('report-results').textContent.includes('5 of 5'));
    assert.equal(get('report-output').descendants().filter(node=>node.tag==='article').length,5);
    get('snapshot-select').value='demo_skills_schedule';
    get('snapshot-select').dispatch('change');
    document.querySelectorAll('nav button').find(button=>button.dataset.view==='compare').click();
    get('compare-snapshots').click();
    assert.ok(get('snapshot-comparison').textContent.includes('5 bookings'));
    assert.equal(get('snapshot-comparison').descendants().filter(node=>node.tag==='table').length,1);
    document.querySelectorAll('nav button').find(button=>button.dataset.view==='plan').click();
    assert.equal(get('preparation-board').children.length,0);
    assert.ok(get('other-exercises').textContent.includes('General exercise'));
    assert.notEqual(get('other-exercises').open,true);
});


test('preparation progress saves evidence, survives reload, and needs rechecking after startup edits',async()=>{
    const startup={current_stage:'idea',sectors:['AI'],founders_have_domain_expertise:false,prototype_status:'mockup',paid_pilots:0};
    const first=await start({saved:JSON.stringify({startup,profiles:[]})});
    const board=first.document.getElementById('view-plan');
    const card=board.descendants().find(node=>node.tag==='article'&&node.textContent.includes('Document customer learning'));
    const form=card.descendants().find(node=>node.tag==='form');
    const status=form.descendants().find(node=>node.tag==='label'&&node.textContent.startsWith('Move status')).descendants().find(node=>node.tag==='select');
    const notes=first.document.getElementById('task-notes-'+encodeURIComponent('suggestion:customer-evidence'));
    status.value='evidence_recorded';
    form.dispatch('submit');
    assert.ok(form.textContent.includes('Add an evidence note'));
    notes.value='Interview notes dated 2026-10-25: recorded customer problems and limits.';
    form.dispatch('submit');
    const saved=JSON.parse(first.storage.get('founder_gap_data'));
    assert.equal(saved.taskProgress['suggestion:customer-evidence'].status,'evidence_recorded');
    const reload=await start({saved:JSON.stringify(saved)});
    const columns=reload.document.getElementById('preparation-board').children;
    assert.ok(columns.find(column=>column.textContent.includes('Learning recorded')).textContent.includes('Document customer learning'));
    saved.startup.current_stage='seed';
    const changed=await start({saved:JSON.stringify(saved)});
    const updatedColumns=changed.document.getElementById('preparation-board').children;
    assert.ok(updatedColumns.find(column=>column.textContent.includes('To explore')).textContent.includes('review your saved evidence'));
    assert.ok(updatedColumns.find(column=>column.textContent.includes('To explore')).descendants().some(node=>node.tag==='textarea'&&node.value.includes('Interview notes dated')));
});

test('next moves stay independent of comparison filters and block stale startup edits',async()=>{
    const startup={current_stage:'idea',sectors:['AI'],founders_have_domain_expertise:false,prototype_status:'mockup',paid_pilots:0};
    const {document}=await start({saved:JSON.stringify({startup})});
    const get=id=>document.getElementById(id);
    const count=get('view-plan').descendants().filter(node=>node.classList.contains('preparation-task')).length;
    get('report-filter-funding').value='grant';
    get('report-filter-funding').dispatch('change');
    document.querySelectorAll('nav button').find(button=>button.dataset.view==='plan').click();
    assert.equal(get('view-plan').descendants().filter(node=>node.classList.contains('preparation-task')).length,count);
    get('startup-form').dispatch('input');
    document.querySelectorAll('nav button').find(button=>button.dataset.view==='plan').click();
    assert.equal(get('preparation-board').children.length,0);
    assert.ok(get('preparation-status').textContent.includes('Save startup edits'));
});


test('historical suggestions can be accepted, merged, persisted, dismissed and reconsidered',async()=>{
    const startup={current_stage:'idea',sectors:['marketplace'],prototype_status:'mockup',paid_pilots:0,business_model:'marketplace',validation_focus:'demand'};
    const first=await start({saved:JSON.stringify({startup,selectedInvestorIds:['demo_discovery']})});
    const get=id=>first.document.getElementById(id);
    const count=get('view-plan').descendants().filter(node=>node.classList.contains('preparation-task')).length;
    assert.ok(get('preparation-suggestions').textContent.includes('Example Tool Library'));
    assert.ok(get('preparation-suggestions').textContent.includes('Example Skill Sessions'));
    assert.ok(get('preparation-suggestions').textContent.includes('Fictional Discovery'));
    get('preparation-suggestions').descendants().find(node=>node.tag==='button'&&node.textContent==='Make an experiment plan').click();
    assert.equal(get('view-plan').descendants().filter(node=>node.classList.contains('preparation-task')).length,count);
    assert.ok(get('preparation-board').textContent.includes('Startup example + investor interest'));
    const saved=first.storage.get('founder_gap_data');
    assert.equal(JSON.parse(saved).suggestionChoices['historical:bounded-reservation-test'].decision,'accepted');
    const reload=await start({saved});
    const tray=()=>reload.document.getElementById('preparation-suggestions');
    assert.ok(reload.document.getElementById('preparation-board').textContent.includes('Startup example + investor interest'));
    tray().descendants().find(node=>node.tag==='button'&&node.textContent==='Review again').click();
    tray().descendants().find(node=>node.tag==='button'&&node.textContent==='Dismiss').click();
    assert.ok(tray().textContent.includes('Dismissed for this context'));
    assert.ok(!reload.document.getElementById('preparation-board').textContent.includes('Startup example + investor interest'));
    const dismissed=await start({saved:reload.storage.get('founder_gap_data')});
    assert.ok(dismissed.document.getElementById('preparation-suggestions').textContent.includes('Dismissed for this context'));
    dismissed.document.getElementById('preparation-suggestions').descendants().find(node=>node.tag==='button'&&node.textContent==='Review again').click();
    assert.ok(dismissed.document.getElementById('preparation-suggestions').textContent.includes('Suggested — your choice'));
});


test('first visit opens a three-choice setup and preserves unknown optional facts',async()=>{
    const {document,storage}=await start();
    const get=id=>document.getElementById(id);
    assert.equal(document.querySelectorAll('nav button').length,3);
    assert.equal(get('view-overview').classList.contains('active'),true);
    assert.equal(get('startup-editor').hidden,false);
    assert.equal(get('startup-form').descendants().filter(node=>'required' in node.attrs).length,3);
    assert.equal(get('overview-dashboard').descendants().filter(node=>node.classList.contains('evidence-unknown')).length,5);
    const form=get('startup-form');
    form.elements.namedItem('business_model').value='saas';
    form.elements.namedItem('current_stage').value='idea';
    form.elements.namedItem('validation_focus').value='technical_feasibility';
    form.dispatch('submit');
    const saved=JSON.parse(storage.get('founder_gap_data'));
    assert.deepEqual(saved.startup.sectors,[]);
    assert.equal(saved.startup.paid_pilots,null);
    assert.equal(saved.startup.founders_have_domain_expertise,null);
    assert.equal(saved.startup.prototype_status,null);
    assert.equal(get('startup-editor').hidden,true);
    assert.ok(get('report-output').textContent.includes('Sector · Unknown'));
});

test('overview tiles open task evidence and compare buttons switch panels without leaving Compare',async()=>{
    const {document}=await start({saved:JSON.stringify({startup:{current_stage:'idea',business_model:'saas',validation_focus:'demand'}})});
    const get=id=>document.getElementById(id);
    assert.equal(get('startup-editor').hidden,true);
    get('domain-product').click();
    assert.equal(get('view-plan').classList.contains('active'),true);
    assert.equal(get('task-details-'+encodeURIComponent('suggestion:product-evidence')).open,true);
    document.querySelectorAll('nav button').find(button=>button.dataset.view==='compare').click();
    get('compare-snapshots').click();
    assert.equal(get('compare-investors-panel').hidden,true);
    assert.equal(get('compare-snapshots-panel').hidden,false);
    assert.equal(get('view-compare').classList.contains('active'),true);
    get('compare-investors').click();
    assert.equal(get('compare-investors-panel').hidden,false);
    assert.equal(get('compare-snapshots-panel').hidden,true);
});


test('investor lens starts empty, can be explicitly selected, persists and excludes other sources',async()=>{
    const startup={current_stage:'idea',sectors:['marketplace'],business_model:'marketplace',validation_focus:'demand'};
    const first=await start({saved:JSON.stringify({startup})});
    const get=id=>first.document.getElementById(id);
    assert.ok(get('investor-lens').textContent.includes('None selected'));
    assert.ok(!get('preparation-suggestions').textContent.includes('Make an experiment plan'));
    assert.equal(get('view-plan').descendants().filter(node=>node.classList.contains('preparation-task')).length,4);
    assert.ok(get('overview-dashboard').textContent.includes('Based on fictional examples'));
    assert.ok(get('overview-dashboard').textContent.includes('Fictional Discovery Fund'));
    assert.ok(get('overview-dashboard').textContent.includes('Example Tool Library'));
    const homeBasis=get('overview-dashboard').descendants().find(node=>node.className==='move-basis');
    assert.equal(get('overview-dashboard').textContent.split('Based on fictional examples').length-1,1);
    assert.equal(homeBasis.children.find(child=>child.tag==='summary').textContent,'Based on fictional examples');
    assert.equal(homeBasis.descendants().filter(node=>node.tag==='h4'&&node.textContent==='Source limitations').length,1);
    assert.equal(homeBasis.textContent.split('Entirely invented for demonstration; not an anonymized real company.').length-1,1);
    assert.ok(homeBasis.textContent.includes('Example Skill Sessions'));
    get('overview-next-action').click();
    assert.equal(get('view-plan').classList.contains('active'),true);
    get('preparation-suggestions').descendants().find(node=>node.tag==='button'&&node.textContent==='Use these fictional investor examples').click();
    assert.ok(get('preparation-suggestions').textContent.includes('Make an experiment plan'));
    assert.ok(!get('preparation-board').textContent.includes('Verify eligibility · Fictional Discovery Fund'));
    const saved=JSON.parse(first.storage.get('founder_gap_data'));
    assert.deepEqual(saved.selectedInvestorIds,['demo_discovery']);
    const reload=await start({saved:JSON.stringify(saved)});
    assert.ok(reload.document.getElementById('investor-lens').textContent.includes('Fictional Discovery Fund'));
});

test('accepted move becomes an editable experiment with a recorded learning decision',async()=>{
    const startup={current_stage:'idea',sectors:['marketplace'],business_model:'marketplace',validation_focus:'demand'};
    const first=await start({saved:JSON.stringify({startup,selectedInvestorIds:['demo_discovery']})});
    const get=id=>first.document.getElementById(id);
    get('preparation-suggestions').descendants().find(node=>node.tag==='button'&&node.textContent==='Make an experiment plan').click();
    const card=get('preparation-board').descendants().find(node=>node.tag==='article'&&node.textContent.includes('Explore demand with a bounded reservation test'));
    const form=card.descendants().find(node=>node.tag==='form');
    const labels=form.descendants().filter(node=>node.tag==='label');
    const control=prefix=>labels.find(node=>node.textContent.startsWith(prefix)).descendants().find(node=>['select','textarea','input'].includes(node.tag));
    control('Learning question').value='Will local customers request a manual service?';
    control('What will you try?').value='Offer a bounded manual pilot.';
    control('Continue if').value='Customers request another trial.';
    control('Change the approach').value='Feedback identifies a different need.';
    control('Stop if').value='The test cannot be done safely.';
    control('Review date').value='2026-11-01';
    control('Move status').value='evidence_recorded';
    control('What you learned').value='Dated notes from customer conversations.';
    form.dispatch('submit');
    assert.ok(form.textContent.includes('Choose continue, change or stop'));
    control('At the checkpoint').value='change';
    form.dispatch('submit');
    const saved=JSON.parse(first.storage.get('founder_gap_data'));
    const record=saved.taskProgress['suggestion:next-milestone'];
    assert.equal(record.experiment.outcome,'change');
    assert.equal(record.experiment.reviewDate,'2026-11-01');
    assert.equal(record.status,'evidence_recorded');
    const reload=await start({saved:JSON.stringify(saved)});
    const fields=reload.document.getElementById('preparation-board').descendants();
    assert.ok(fields.some(node=>node.tag==='textarea'&&node.value==='Offer a bounded manual pilot.'));
    assert.ok(fields.some(node=>node.tag==='select'&&node.value==='change'));
});

test('legacy saved research stays local and cannot override fictional examples',async()=>{
    const profile=JSON.parse(read('profiles/demo_discovery.json'));
    delete profile.data_kind;delete profile.distribution_basis;delete profile.data_license;
    profile.source_url='https://example.org/research';profile.name='Private research fixture';
    const saved=JSON.stringify({profiles:[profile],startup:{current_stage:'idea'},taskProgress:{private:{notes:'Keep this note'}}});
    const app=await start({saved});
    const library=app.document.getElementById('profile-list');
    assert.equal(library.children.length,6);
    assert.ok(library.textContent.includes('Fictional Discovery Fund'));
    assert.ok(!library.textContent.includes('Private research fixture'));
    assert.equal(app.storage.get('founder_gap_data'),saved);
    assert.ok(app.document.textContent.includes('Fictional demo.'));
});

test('served mode rejects a non-fictional library response instead of displaying research',async()=>{
    const app=await start({protocol:'http:',responseTransform:record=>{
        if(record.id==='demo_discovery')return {...record,data_kind:'research',name:'Research response fixture'};
        return record;
    }});
    assert.equal(app.document.getElementById('profile-list').children.length,5);
    assert.ok(!app.document.getElementById('profile-list').textContent.includes('Research response fixture'));
    assert.ok(app.document.getElementById('library-errors').textContent.includes('original fictional examples only'));
});

async function previewResearch(app,library=researchFixture(),filename='guide-pack.json') {
    const text=JSON.stringify(library);
    const input=app.document.getElementById('research-file');
    input.files=[{name:filename,size:Buffer.byteLength(text),text:async()=>text}];input.dispatch('change');
    await new Promise(resolve=>setImmediate(resolve));
}

test('v2 provider preview, explicit activation, matching, reload and provider isolation work in the full app',async()=>{
    const startup={current_stage:'idea',business_model:'marketplace',validation_focus:'demand',sectors:['marketplace']};
    const app=await start({saved:JSON.stringify({startup})});const get=id=>app.document.getElementById(id);
    const pkg=JSON.parse(read('packs/demo-guide-pack.json'));
    await previewResearch(app,pkg,'research-library.json');
    assert.ok(get('research-preview').textContent.includes('Guide Pack Demo'));
    assert.ok(get('research-preview').textContent.includes('Provider-declared matching quality'));
    assert.ok(get('research-preview').textContent.includes('7 of 7 expectations matched'));
    assert.ok(get('research-preview').textContent.includes('3 expect suggestions · 4 expect none'));
    assert.ok(get('research-preview').textContent.includes('not independently verified'));
    assert.equal(get('profile-list').children.length,6);
    get('activate-research').click();assert.equal(get('profile-list').children.length,2);
    assert.ok(get('active-library-notice').textContent.includes('Fictional Guide Pack'));
    get('lens-demo_discovery').checked=true;get('investor-lens-picker').descendants().find(node=>node.tag==='form').dispatch('submit');
    assert.ok(get('preparation-suggestions').textContent.includes('bounded reservation test'));
    get('preparation-suggestions').descendants().find(node=>node.tag==='button'&&node.textContent==='Make an experiment plan').click();
    assert.ok(get('preparation-board').textContent.includes('Experiment plan'));
    const saved=app.storage.get('founder_gap_data');
    assert.equal(JSON.parse(saved).researchLibrary.schema_version,2);
    const reload=await start({saved});assert.equal(reload.document.getElementById('profile-list').children.length,2);
    assert.ok(reload.document.getElementById('preparation-board').textContent.includes('Experiment plan'));
    const other=structuredClone(pkg);other.provider.id='another_provider';other.provider.name='Another provider';
    await previewResearch(app,other);get('activate-research').click();
    assert.deepEqual(JSON.parse(app.storage.get('founder_gap_data')).selectedInvestorIds,[]);
    assert.ok(!get('preparation-board').textContent.includes('Experiment plan'));
    const changed=structuredClone(other);changed.components.suggestions[0].title='Changed text without version change';
    await previewResearch(app,changed);assert.ok(get('research-library-status').textContent.includes('new version'));
    assert.equal(get('activate-research').hidden,true);
});

test('provider self-test differences are visible without certifying or automatically rejecting a compatible package',async()=>{
    const app=await start();const get=id=>app.document.getElementById(id);
    const pkg=JSON.parse(read('packs/demo-guide-pack.json'));
    pkg.components.matching.evaluation_cases[0].expected_suggestion_ids=[];
    await previewResearch(app,pkg,'research-library.json');
    assert.ok(get('research-preview').textContent.includes('6 of 7 expectations matched · 1 differ'));
    assert.ok(get('research-preview').textContent.includes('Differs from expectation'));
    assert.ok(get('research-preview').textContent.includes('not independent accuracy ratings'));
    assert.equal(get('activate-research').hidden,false);
    assert.equal(get('profile-list').children.length,6);
    assert.equal(app.requests.length,0);
});

test('research preview requires activation, then switches libraries with separate notes, lens and reload persistence',async()=>{
    const startup={current_stage:'idea',business_model:'marketplace',validation_focus:'demand',sectors:['marketplace']};
    const saved=JSON.stringify({startup,selectedInvestorIds:['demo_discovery'],taskProgress:{'suggestion:customer-evidence':{notes:'Demo notebook entry',status:'todo'}}});
    const app=await start({saved});const get=id=>app.document.getElementById(id);
    const local=researchFixture();local.repository_url=null;
    await previewResearch(app,local);
    assert.ok(get('research-preview').textContent.includes('Local package · no repository URL'));
    assert.ok(get('research-preview').textContent.includes('MIT'));
    assert.ok(get('research-preview').textContent.includes('1 investor profiles · 1 startup snapshots'));
    assert.equal(get('profile-list').children.length,6);
    assert.equal(app.storage.get('founder_gap_data'),saved);
    get('activate-research').click();
    assert.equal(get('profile-list').children.length,1);
    assert.equal(get('snapshot-list').children.length,1);
    assert.ok(get('active-library-notice').textContent.includes('Imported research'));
    assert.ok(get('overview-dashboard').textContent.includes('Based on research sources'));
    assert.ok(!get('overview-dashboard').textContent.includes('invented for practice'));
    assert.ok(!get('snapshot-comparison').textContent.includes('fictional comparison'));
    assert.equal(app.requests.length,0);
    assert.ok(!get('preparation-board').textContent.includes('Demo notebook entry'));
    get('lens-fixture_fund').checked=true;get('investor-lens-picker').descendants().find(node=>node.tag==='form').dispatch('submit');
    assert.ok(get('preparation-suggestions').textContent.includes('Synthetic Research Test Fund'));
    assert.ok(get('preparation-suggestions').textContent.includes('survivorship bias'));
    get('preparation-suggestions').descendants().find(node=>node.tag==='button'&&node.textContent==='Make an experiment plan').click();
    assert.ok(get('preparation-board').textContent.includes('Startup example + investor interest'));
    const card=get('task-card-'+encodeURIComponent('suggestion:customer-evidence'));
    const form=card.descendants().find(node=>node.tag==='form');
    const labels=form.descendants().filter(node=>node.tag==='label');
    labels.find(node=>node.textContent.startsWith('What you learned')).descendants().find(node=>node.tag==='textarea').value='Research notebook entry';form.dispatch('submit');
    get('use-demo-library').click();
    let current=JSON.parse(app.storage.get('founder_gap_data'));
    assert.equal(current.taskProgress['suggestion:customer-evidence'].notes,'Demo notebook entry');
    assert.deepEqual(current.selectedInvestorIds,['demo_discovery']);
    assert.equal(get('profile-list').children.length,6);
    get('use-research-library').click();
    current=JSON.parse(app.storage.get('founder_gap_data'));
    assert.equal(current.taskProgress['suggestion:customer-evidence'].notes,'Research notebook entry');
    assert.deepEqual(current.selectedInvestorIds,['fixture_fund']);
    const reloaded=await start({saved:JSON.stringify(current)});
    assert.equal(reloaded.document.getElementById('profile-list').children.length,1);
    assert.ok(reloaded.document.getElementById('research-preview').textContent.includes('Installed legacy Guide Pack'));
    reloaded.document.getElementById('remove-research').click();
    const removed=JSON.parse(reloaded.storage.get('founder_gap_data'));
    assert.equal(removed.researchLibrary,null);
    assert.equal(removed.activeLibrary,'demo');
    assert.equal(removed.libraryWorkspaces['research:synthetic_test_library@1.0.0'].taskProgress['suggestion:customer-evidence'].notes,'Research notebook entry');
});

test('invalid imports, changed content with the same version and cancelled previews leave the active library unchanged',async()=>{
    const app=await start();const get=id=>app.document.getElementById(id);
    await previewResearch(app);get('cancel-research').click();
    assert.equal(get('activate-research').hidden,true);
    assert.equal(get('profile-list').children.length,6);
    const invalid=researchFixture();invalid.license=null;
    await previewResearch(app,invalid);
    assert.ok(get('research-library-status').textContent.includes('Import not accepted'));
    assert.equal(get('activate-research').hidden,true);
    await previewResearch(app);get('activate-research').click();
    const changed=researchFixture();changed.name='Different content';await previewResearch(app,changed);
    assert.ok(get('research-library-status').textContent.includes('new version'));
    assert.equal(get('profile-list').children.length,1);
    get('research-file').files=[{size:6*1024*1024,text:()=>{throw new Error('Oversized file must not be read');}}];get('research-file').dispatch('change');
    assert.ok(get('research-library-status').textContent.includes('5 MB'));
});

test('unsaved startup edits and storage errors cannot partially activate research',async()=>{
    const app=await start();const get=id=>app.document.getElementById(id);
    await previewResearch(app);get('startup-form').dispatch('input');get('activate-research').click();
    assert.equal(get('profile-list').children.length,6);
    assert.ok(get('research-library-status').textContent.includes('Save startup edits'));
    const unavailable=await start({failStorage:true});await previewResearch(unavailable);
    unavailable.document.getElementById('activate-research').click();
    assert.equal(unavailable.document.getElementById('profile-list').children.length,6);
    assert.ok(unavailable.document.getElementById('research-library-status').textContent.includes('not saved'));
    assert.equal(unavailable.storage.get('founder_gap_data'),'{"activeLibrary":"demo"}');
});

test('home leads with situation, one actionable move and why, while details and settings stay optional',async()=>{
    const startup={current_stage:'idea',business_model:'hardware',validation_focus:'customer_problem'};
    const app=await start({saved:JSON.stringify({startup})});const get=id=>app.document.getElementById(id);
    const home=get('overview-dashboard');
    assert.ok(!get('situation-summary').textContent.includes('Where you are'));
    assert.equal(get('situation-summary').children[0].attrs['aria-label'],'Your current context');
    assert.equal(get('edit-situation').textContent,'Edit');
    assert.ok(get('situation-summary').textContent.includes('Hardware · Idea · Customer problems'));
    assert.ok(!get('view-overview').textContent.includes('Where to go from here.'));
    const provenance=get('active-library-notice');
    assert.equal(provenance.tag,'details');
    assert.notEqual(provenance.open,true);
    assert.equal(provenance.children.find(child=>child.tag==='summary').textContent,'Fictional examples');
    assert.ok(home.textContent.includes('Why it fits'));
    assert.ok(home.textContent.includes('General exercise'));
    assert.ok(home.textContent.includes('No connected example for this situation yet'));
    assert.equal(get('overview-next-action').textContent,'Try this move ↗');
    const action=get('overview-next-action').parent;
    const basis=action.children.find(child=>child.tag==='details');
    assert.ok(action.children.indexOf(get('overview-next-action'))<action.children.indexOf(basis));
    assert.notEqual(basis.open,true);
    const details=get('overview-details');
    assert.notEqual(details.open,true);
    assert.ok(details.descendants().includes(get('domain-product')));
    assert.ok(!details.descendants().includes(get('overview-next-action')));
    assert.equal(get('startup-editor').hidden,true);
    assert.ok(!get('view-overview').textContent.includes('Edit your startup details'));
    get('edit-situation').click();
    assert.equal(get('startup-editor').hidden,false);
    assert.equal(get('edit-situation').attrs['aria-expanded'],'true');
    assert.equal(get('startup-editor').parent,get('situation-summary').parent);
    const siblings=get('startup-editor').parent.children;
    assert.ok(siblings.indexOf(get('situation-summary'))<siblings.indexOf(get('startup-editor')));
    assert.ok(siblings.indexOf(get('startup-editor'))<siblings.indexOf(get('overview-dashboard')));
    get('startup-form').dispatch('submit');
    assert.equal(get('startup-editor').hidden,true);
    assert.equal(get('edit-situation').attrs['aria-expanded'],'false');
    get('overview-next-action').click();
    assert.equal(get('view-plan').classList.contains('active'),true);
    assert.equal(get('task-details-'+encodeURIComponent('suggestion:customer-evidence')).open,true);
    get('open-settings').click();
    assert.equal(get('workspace-settings').open,true);
    assert.equal(get('workspace-settings').tag,'dialog');
    assert.equal(get('library-manager').tag,'section');
    assert.equal(get('imported-records-note').hidden,true);
    assert.equal(get('open-settings').attrs['aria-expanded'],'true');
    get('close-settings').click();
    assert.equal(get('workspace-settings').open,false);
    assert.equal(get('open-settings').attrs['aria-expanded'],'false');
    const lens=get('investor-lens-picker');
    assert.ok(lens.classList.contains('investor-lens'));
    assert.ok(!lens.classList.contains('section-details'));
    assert.equal(get('investor-lens').parent,get('view-overview'));
    assert.ok(!get('view-plan').descendants().includes(lens));
    assert.ok(!lens.classList.contains('card'));
    for(const id of ['investor-library-browser','snapshot-library-browser']){
        assert.ok(get(id).classList.contains('section-details'));
        assert.ok(!get(id).classList.contains('card'));
        assert.notEqual(get(id).open,true);
    }
});

test('Home exposes one optional investor picker beside context, saves names and can return to preview',async()=>{
    const startup={current_stage:'idea',business_model:'marketplace',validation_focus:'demand'};
    const app=await start({saved:JSON.stringify({startup})});const get=id=>app.document.getElementById(id);
    const lens=get('investor-lens');
    assert.equal(lens.parent,get('view-overview'));
    assert.equal(lens.hidden,false);
    const siblings=lens.parent.children;
    assert.ok(siblings.indexOf(lens)>siblings.indexOf(get('situation-summary')));
    assert.ok(siblings.indexOf(lens)<siblings.indexOf(get('overview-dashboard')));
    assert.equal(app.document.descendants().filter(node=>node.attrs.id==='investor-lens-picker').length,1);
    assert.ok(!get('view-plan').descendants().includes(lens));
    assert.ok(get('investor-lens-summary').textContent.includes('None selected'));
    assert.ok(get('investor-lens-summary').textContent.includes('Choose'));
    assert.notEqual(get('investor-lens-picker').open,true);
    get('lens-demo_discovery').checked=true;
    get('investor-lens-picker').descendants().find(node=>node.tag==='form').dispatch('submit');
    assert.equal(get('view-overview').classList.contains('active'),true);
    assert.equal(get('investor-lens-picker').open,false);
    assert.ok(get('investor-lens-summary').textContent.includes('Fictional Discovery Fund'));
    assert.ok(get('investor-lens-summary').textContent.includes('Change'));
    assert.ok(get('preparation-suggestions').textContent.includes('Make an experiment plan'));
    assert.deepEqual(JSON.parse(app.storage.get('founder_gap_data')).selectedInvestorIds,['demo_discovery']);
    const restored=await start({saved:app.storage.get('founder_gap_data')});
    assert.ok(restored.document.getElementById('investor-lens-summary').textContent.includes('Fictional Discovery Fund'));
    const picker=get('investor-lens-picker');
    picker.descendants().find(node=>node.tag==='button'&&node.textContent==='Clear choices').click();
    picker.descendants().find(node=>node.tag==='form').dispatch('submit');
    assert.deepEqual(JSON.parse(app.storage.get('founder_gap_data')).selectedInvestorIds,[]);
    assert.ok(get('investor-lens-summary').textContent.includes('None selected'));
    assert.ok(get('overview-dashboard').textContent.includes('Preview from the active library'));
});

test('investor shortcut opens the Home picker and closing discards unsubmitted choices',async()=>{
    const startup={current_stage:'idea',business_model:'marketplace',validation_focus:'demand'};
    const app=await start({saved:JSON.stringify({startup})});const get=id=>app.document.getElementById(id);
    get('domain-investor').click();
    assert.equal(get('view-overview').classList.contains('active'),true);
    const picker=get('investor-lens-picker');
    assert.equal(picker.open,true);
    get('lens-demo_discovery').checked=true;
    picker.open=false;picker.dispatch('toggle');
    assert.equal(get('lens-demo_discovery').checked,false);
    assert.ok(!JSON.parse(app.storage.get('founder_gap_data')).selectedInvestorIds?.length);
    const fresh=await start();
    assert.equal(fresh.document.getElementById('investor-lens').hidden,true);
});

test('Home investor selection preserves unsaved startup edits and reports storage failures',async()=>{
    const startup={current_stage:'idea',business_model:'marketplace',validation_focus:'demand'};
    const saved=JSON.stringify({startup});
    const app=await start({saved});const get=id=>app.document.getElementById(id);
    get('edit-situation').click();get('startup-form').dispatch('input');
    get('lens-demo_discovery').checked=true;
    get('investor-lens-picker').descendants().find(node=>node.tag==='form').dispatch('submit');
    assert.equal(get('startup-editor').hidden,false);
    assert.equal(app.storage.get('founder_gap_data'),saved);
    const unavailable=await start({saved,failStorage:true});
    const lookup=id=>unavailable.document.getElementById(id);
    lookup('lens-demo_discovery').checked=true;
    lookup('investor-lens-picker').descendants().find(node=>node.tag==='form').dispatch('submit');
    assert.ok(lookup('investor-lens-status').textContent.includes('could not save'));
    assert.equal(lookup('investor-lens-status').className,'lens-save-error');
    assert.ok(lookup('investor-lens-summary').textContent.includes('Fictional Discovery Fund'));
});

test('settings has one entry point, opens independently of every tab and restores focus on close',async()=>{
    const startup={current_stage:'idea',business_model:'marketplace',validation_focus:'demand'};
    const app=await start({saved:JSON.stringify({startup})});const get=id=>app.document.getElementById(id);
    const panel=get('workspace-settings');
    assert.equal(panel.tag,'dialog');
    assert.ok(!get('app').descendants().includes(panel));
    assert.equal(app.document.descendants().filter(node=>node.attrs.id==='open-settings').length,1);
    assert.equal(get('library-manager').tag,'section');
    assert.equal(get('imported-records-note').hidden,true);
    assert.notEqual(panel.open,true);
    for(const button of app.document.querySelectorAll('nav button')){
        button.click();
        const active='view-'+button.dataset.view;
        get('open-settings').click();
        assert.equal(panel.open,true);
        assert.equal(get(active).classList.contains('active'),true);
        assert.equal(get('open-settings').attrs['aria-expanded'],'true');
        get('close-settings').click();
        assert.equal(panel.open,false);
        assert.equal(get(active).classList.contains('active'),true);
        assert.equal(get('open-settings').attrs['aria-expanded'],'false');
        assert.equal(get('open-settings').focusOptions.preventScroll,true);
    }
});

test('closing settings preserves a preview without activating it or changing the current page',async()=>{
    const app=await start();const get=id=>app.document.getElementById(id);
    app.document.querySelectorAll('nav button').find(button=>button.dataset.view==='compare').click();
    get('open-settings').click();
    await previewResearch(app);
    const preview=get('research-preview').textContent;
    get('close-settings').click();
    assert.equal(get('profile-list').children.length,6);
    assert.equal(get('view-compare').classList.contains('active'),true);
    get('open-settings').click();
    assert.equal(get('research-preview').textContent,preview);
    assert.equal(get('activate-research').hidden,false);
    get('activate-research').click();
    assert.equal(get('profile-list').children.length,1);
    assert.equal(get('workspace-settings').open,true);
    get('close-settings').click();
    assert.equal(get('view-compare').classList.contains('active'),true);
});

test('Formation offers startup-only evidence and adaptation, without claiming investor alignment',async()=>{
    const startup={current_stage:'idea',business_model:'marketplace',validation_focus:'demand'};
    const app=await start({saved:JSON.stringify({startup,selectedInvestorIds:['demo_formation']})});const get=id=>app.document.getElementById(id);
    assert.ok(get('overview-dashboard').textContent.includes('A startup example to explore'));
    assert.ok(get('overview-dashboard').textContent.includes('No matching investor interest is documented'));
    assert.ok(!get('overview-dashboard').textContent.includes('Connected through your selected investor.'));
    get('overview-next-action').click();
    const make=get('preparation-suggestions').descendants().find(node=>node.tag==='button'&&node.textContent==='Make an experiment plan');make.click();
    const key=encodeURIComponent('suggestion:next-milestone');
    assert.equal(get('task-details-'+key).open,true);
    assert.ok(get('task-card-'+key).textContent.includes('Startup example only'));
    const saved=JSON.parse(app.storage.get('founder_gap_data'));
    assert.ok(Object.keys(saved.suggestionChoices).some(key=>key.startsWith('snapshot:')));
    assert.ok(!get('task-card-'+key).textContent.includes('Fictional Discovery Fund'));
});

test('Home distinguishes a library preview from a connection through explicitly selected investors',async()=>{
    const startup={current_stage:'idea',business_model:'marketplace',validation_focus:'demand'};
    const app=await start({saved:JSON.stringify({startup})});const get=id=>app.document.getElementById(id);
    let action=get('overview-next-action').parent;
    assert.ok(action.children.some(child=>child.tag==='p'&&child.textContent==='An example to explore'));
    assert.ok(action.children.some(child=>child.tag==='p'&&child.textContent==='Preview from the library. No investor selected.'));
    assert.equal(get('overview-next-action').textContent,'Explore this example ↗');
    assert.ok(!get('investor-lens-summary').textContent.includes('Fictional Discovery Fund'));
    get('lens-demo_discovery').checked=true;
    get('investor-lens-picker').descendants().find(node=>node.tag==='form').dispatch('submit');
    action=get('overview-next-action').parent;
    assert.ok(action.children.some(child=>child.tag==='p'&&child.textContent==='Your next move'));
    assert.ok(action.children.some(child=>child.tag==='p'&&child.textContent==='Connected through your selected investor.'));
    assert.equal(get('overview-next-action').textContent,'Review this move ↗');
});

test('accepting opens the editor first, hides untouched exercises and supports editing again after reload',async()=>{
    const startup={current_stage:'idea',business_model:'marketplace',validation_focus:'demand'};
    const app=await start({saved:JSON.stringify({startup,selectedInvestorIds:['demo_discovery']})});const get=id=>app.document.getElementById(id);
    assert.equal(get('preparation-board').hidden,true);
    assert.notEqual(get('other-exercises').open,true);
    assert.equal(get('other-exercises').descendants().filter(node=>node.classList.contains('preparation-task')).length,4);
    app.document.querySelectorAll('nav button').find(button=>button.dataset.view==='plan').click();
    get('other-exercises').open=true;
    get('preparation-suggestions').descendants().find(node=>node.tag==='button'&&node.textContent==='Make an experiment plan').click();
    const key=encodeURIComponent('suggestion:next-milestone');
    const details=get('task-details-'+key),form=get('task-form-'+key);
    assert.equal(details.open,true);
    assert.equal(get('task-action-'+key).focusOptions.preventScroll,true);
    const why=details.children.find(node=>node.className==='task-rationale');
    assert.notEqual(why.open,true);
    assert.ok(details.children.indexOf(form)<details.children.indexOf(why));
    assert.ok(why.textContent.includes('Fictional Discovery Fund'));
    assert.ok(why.textContent.includes('Example Tool Library'));
    assert.ok(why.textContent.includes('Source limitations'));
    assert.equal(get('preparation-board').descendants().filter(node=>node.classList.contains('preparation-task')).length,1);
    assert.equal(get('other-exercises').descendants().filter(node=>node.classList.contains('preparation-task')).length,3);
    assert.notEqual(get('reviewed-suggestions').open,true);
    const order=get('view-plan').children;
    assert.ok(order.indexOf(get('preparation-board'))<order.indexOf(get('preparation-suggestions')));
    assert.ok(order.indexOf(get('preparation-suggestions'))<order.indexOf(get('other-exercises')));
    get('task-question-'+key).value='Will local customers request a trial?';
    get('task-notes-'+key).value='Two people explained what they would reserve.';
    form.descendants().filter(node=>node.tag==='label').find(node=>node.textContent.startsWith('Move status')).descendants().find(node=>node.tag==='select').value='in_progress';
    form.dispatch('submit');
    assert.equal(get('task-details-'+key).open,true);
    assert.equal(get('task-save-message-'+key).textContent,'Progress saved.');
    assert.equal(get('save-task-'+key).focusOptions.preventScroll,true);
    const saved=app.storage.get('founder_gap_data');
    const record=JSON.parse(saved).taskProgress['suggestion:next-milestone'];
    assert.equal(record.experiment.question,'Will local customers request a trial?');
    assert.equal(record.status,'in_progress');
    const reload=await start({saved});const lookup=id=>reload.document.getElementById(id);
    lookup('reviewed-suggestions').open=true;
    lookup('reviewed-suggestions').descendants().find(node=>node.tag==='button'&&node.textContent==='Edit plan').click();
    assert.equal(lookup('task-details-'+key).open,true);
    assert.equal(lookup('task-question-'+key).value,'Will local customers request a trial?');
    assert.equal(lookup('task-notes-'+key).value,'Two people explained what they would reserve.');
});

test('legacy saved plans remain editable through Discovery to Formation, reload and reconnection',async()=>{
    const startup={current_stage:'idea',business_model:'marketplace',validation_focus:'demand'};
    let app=await start({saved:JSON.stringify({startup,selectedInvestorIds:['demo_discovery']})});
    const get=id=>app.document.getElementById(id),key=encodeURIComponent('suggestion:next-milestone');
    const status=()=>get('task-form-'+key).descendants().find(node=>node.tag==='label'&&node.textContent.startsWith('Move status')).descendants().find(node=>node.tag==='select');
    get('preparation-suggestions').descendants().find(node=>node.tag==='button'&&node.textContent==='Make an experiment plan').click();
    const values={question:'Will local people reserve a trial?',action:'Offer one bounded trial',evidenceNeeded:'Requests, cancellations and obstacles',continueWhen:'People ask to repeat',changeWhen:'A different need emerges',stopWhen:'Delivery is unsafe',reviewDate:'2026-11-20'};
    for(const [field,value] of Object.entries(values))get('task-'+field+'-'+key).value=value;
    get('task-notes-'+key).value='Customer notes remain mine.';status().value='in_progress';get('task-form-'+key).dispatch('submit');
    const legacy=JSON.parse(app.storage.get('founder_gap_data'));
    delete legacy.taskProgress['suggestion:next-milestone'].basisLensKey;
    delete legacy.taskProgress['suggestion:next-milestone'].planTitle;
    app=await start({saved:JSON.stringify(legacy)});
    get('lens-demo_discovery').checked=false;get('lens-demo_formation').checked=true;
    get('investor-lens-picker').descendants().find(node=>node.tag==='form').dispatch('submit');
    assert.ok(get('overview-dashboard').textContent.includes('Continue your saved plan.'));
    assert.ok(get('overview-dashboard').descendants().some(node=>node.tag==='summary'&&node.textContent==='About your saved plan'));
    assert.ok(!get('overview-dashboard').descendants().some(node=>node.tag==='summary'&&node.textContent==='About this exercise'));
    assert.equal(get('overview-next-action').textContent,'Continue editing ↗');
    get('overview-next-action').click();
    const card=get('task-card-'+key);
    assert.ok(card.textContent.includes('Your saved plan · no current library connection'));
    assert.ok(card.textContent.includes('Explore demand with a bounded reservation test'));
    const notice=card.descendants().find(node=>node.className==='task-review-notice');
    assert.ok(notice.textContent.includes('Investor lens changed'));
    assert.ok(!notice.textContent.includes('Your situation changed'));
    for(const [field,value] of Object.entries(values))assert.equal(get('task-'+field+'-'+key).value,value,field);
    assert.equal(get('task-notes-'+key).value,'Customer notes remain mine.');
    assert.equal(status().value,'in_progress');
    assert.ok(!card.descendants().some(node=>node.className==='preparation-source'));
    get('task-form-'+key).dispatch('submit');
    const saved=JSON.parse(app.storage.get('founder_gap_data'));
    assert.equal(saved.taskProgress['suggestion:next-milestone'].taskKey,null);
    assert.equal(saved.taskProgress['suggestion:next-milestone'].basisLensKey,'["demo_formation"]');
    app=await start({saved:JSON.stringify(saved)});
    get('overview-next-action').click();
    for(const [field,value] of Object.entries(values))assert.equal(get('task-'+field+'-'+key).value,value);
    assert.ok(!get('task-card-'+key).descendants().some(node=>node.className==='task-review-notice'));
    get('lens-demo_formation').checked=false;get('lens-demo_discovery').checked=true;
    get('investor-lens-picker').descendants().find(node=>node.tag==='form').dispatch('submit');
    get('overview-next-action').click();
    assert.ok(get('task-card-'+key).textContent.includes('Startup example + investor interest'));
    for(const [field,value] of Object.entries(values))assert.equal(get('task-'+field+'-'+key).value,value);
    assert.equal(get('task-notes-'+key).value,'Customer notes remain mine.');
});

test('a general exercise can hold a user-written plan and checkpoint without inventing a source connection',async()=>{
    const startup={current_stage:'idea',business_model:'hardware',validation_focus:'demand'};
    const app=await start({saved:JSON.stringify({startup,selectedInvestorIds:['demo_formation']})});
    const get=id=>app.document.getElementById(id),key=encodeURIComponent('suggestion:next-milestone');
    get('overview-next-action').click();
    assert.equal(get('task-details-'+key).open,true);
    assert.equal(get('task-question-'+key).value,'');
    assert.equal(get('task-action-'+key).value,'');
    get('task-question-'+key).value='Will anyone request this?';get('task-action-'+key).value='Offer one clearly scoped trial';
    get('task-notes-'+key).value='A dated observation.';
    const controls=()=>get('task-form-'+key).descendants().filter(node=>node.tag==='label');
    const control=prefix=>controls().find(node=>node.textContent.startsWith(prefix)).descendants().find(node=>node.tag==='select');
    control('Move status').value='evidence_recorded';get('task-form-'+key).dispatch('submit');
    assert.ok(get('task-save-message-'+key).textContent.includes('Choose continue, change or stop'));
    control('Move status').value='in_progress';get('task-form-'+key).dispatch('submit');
    let saved=JSON.parse(app.storage.get('founder_gap_data'));
    assert.equal(saved.taskProgress['suggestion:next-milestone'].experiment.question,'Will anyone request this?');
    assert.equal(saved.taskProgress['suggestion:next-milestone'].taskKey,null);
    assert.deepEqual(saved.suggestionChoices,{});
    control('Move status').value='evidence_recorded';control('At the checkpoint').value='change';get('task-form-'+key).dispatch('submit');
    saved=JSON.parse(app.storage.get('founder_gap_data'));
    assert.equal(saved.taskProgress['suggestion:next-milestone'].status,'evidence_recorded');
    assert.equal(saved.taskProgress['suggestion:next-milestone'].experiment.outcome,'change');
    assert.ok(!get('task-card-'+key).descendants().some(node=>node.className==='preparation-source'));
});

test('fresh installs default to included research in file and HTTP modes; existing demo work is preserved',async()=>{
    for(const protocol of ['file:','http:']){
        const fresh=await start({protocol,saved:'{}'});const get=id=>fresh.document.getElementById(id);
        assert.equal(get('profile-list').children.length,9);assert.equal(get('snapshot-list').children.length,3);
        assert.ok(get('active-library-name').textContent.includes('Research'));
        assert.equal(get('demo-scenarios').hidden,true);
        get('use-demo-library').click();assert.equal(get('profile-list').children.length,6);
        assert.equal(get('demo-scenarios').hidden,false);
        for(const id of ['complete','investor','snapshot','neither']){
            get('demo-'+id).click();const text=get('overview-dashboard').textContent;
            assert.equal(get('startup-editor').hidden,true);
            assert.equal(get('business-model').value,id==='investor'||id==='neither'?'hardware':'marketplace');
            assert.ok(text.includes({complete:'Connected through your selected investor',investor:'Investor interest only',snapshot:'Startup example only',neither:'General exercise'}[id]),id);
        }
        get('use-bundled-research').click();assert.equal(get('profile-list').children.length,9);
        const reload=await start({saved:fresh.storage.get('founder_gap_data')});
        assert.equal(reload.document.getElementById('profile-list').children.length,9);
    }
    const legacy=await start({saved:JSON.stringify({startup:{current_stage:'idea'},taskProgress:{keep:{notes:'keep'}}})});
    assert.equal(legacy.document.getElementById('profile-list').children.length,6);
});

test('entering demo opens a focused chooser, hides blank setup and selection leads straight to the result',async()=>{
    const app=await start({saved:'{}'});const get=id=>app.document.getElementById(id);
    get('use-demo-library').click();
    assert.equal(get('startup-editor').hidden,true);
    assert.equal(get('overview-dashboard').hidden,true);
    assert.equal(get('demo-scenarios').open,true);
    get('demo-complete').click();
    assert.equal(get('demo-scenarios').open,false);
    assert.equal(get('overview-dashboard').hidden,false);
    assert.equal(get('overview-next-action').focusOptions.preventScroll,true);
    assert.equal(get('business-model').value,'marketplace');
});

test('compact plans keep hidden values, reveal validation errors and use the saved action on Home',async()=>{
    const startup={business_model:'marketplace',current_stage:'idea',validation_focus:'demand'};
    const app=await start({saved:JSON.stringify({startup,selectedInvestorIds:['demo_discovery']})});const get=id=>app.document.getElementById(id);
    get('preparation-suggestions').descendants().find(node=>node.tag==='button'&&node.textContent==='Make an experiment plan').click();
    const key=encodeURIComponent('suggestion:next-milestone');
    const more=get('task-more-'+key),learning=get('task-learning-'+key);
    assert.notEqual(more.open,true);assert.notEqual(learning.open,true);
    assert.ok(!more.descendants().includes(get('task-action-'+key)));
    assert.ok(more.descendants().includes(get('task-question-'+key)));
    get('task-question-'+key).value='KEPT-HIDDEN-QUESTION';get('task-action-'+key).value='Offer one local trial.';
    const select=learning.descendants().find(node=>node.tag==='select');
    select.value='evidence_recorded';get('task-form-'+key).dispatch('submit');
    assert.equal(learning.open,true);
    get('task-notes-'+key).value='COMPACT-PLAN-01';get('task-form-'+key).dispatch('submit');
    assert.ok(get('task-save-message-'+key).textContent.includes('Choose continue, change or stop'));
    select.value='in_progress';get('task-form-'+key).dispatch('submit');
    const saved=app.storage.get('founder_gap_data');
    assert.equal(JSON.parse(saved).taskProgress['suggestion:next-milestone'].experiment.question,'KEPT-HIDDEN-QUESTION');
    const again=await start({saved});const home=again.document.getElementById('overview-dashboard').textContent;
    assert.ok(home.includes('Your current experiment'));assert.ok(home.includes('What you’ll try'));
    assert.ok(home.includes('Offer one local trial.'));assert.ok(home.includes('Startup example + investor interest'));
    assert.equal(again.document.getElementById('task-notes-'+key).value,'COMPACT-PLAN-01');
});

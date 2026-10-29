import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('offline install, documentation and navigation work under a repository subpath without caching research',async()=>{
    const root=new URL('../',import.meta.url);
    const scope='https://example.org/startup-field-guide/';
    const handlers={};const stores=new Map();let online=true,claimed=false;
    const key=request=>typeof request==='string'?request:request.url||String(request);
    const network=async request=>{
        if(!online)throw new Error('Offline');
        const url=new URL(key(request));
        assert.ok(url.href.startsWith(scope));
        const path=url.pathname.slice(new URL(scope).pathname.length)||'index.html';
        return new Response(await readFile(new URL(path,root),'utf8'));
    };
    const caches={
        open:async name=>{
            if(!stores.has(name))stores.set(name,new Map());
            const store=stores.get(name);
            return {
                addAll:async requests=>{for(const request of requests)store.set(key(request),await network(request));},
                match:async request=>store.get(key(request))?.clone(),
                put:async(request,response)=>store.set(key(request),response.clone())
            };
        },
        keys:async()=>[...stores.keys()],
        delete:async name=>stores.delete(name),
        match:async request=>{for(const store of stores.values()){const response=store.get(key(request));if(response)return response.clone();}}
    };
    const self={registration:{scope},clients:{claim:async()=>{claimed=true;}},skipWaiting:async()=>{},addEventListener:(name,handler)=>{handlers[name]=handler;}};
    vm.runInNewContext(await readFile(new URL('sw.js',root),'utf8'),{self,caches,fetch:network,URL,Response});
    let installed;handlers.install({waitUntil:promise=>{installed=promise;}});await installed;
    stores.set('founder-gap-old',new Map());stores.set('unrelated-app',new Map());
    let activated;handlers.activate({waitUntil:promise=>{activated=promise;}});await activated;
    assert.equal(claimed,true);assert.equal(stores.has('founder-gap-old'),false);assert.equal(stores.has('unrelated-app'),true);
    online=false;
    const offline=async(path,mode='same-origin')=>{
        let response;handlers.fetch({request:{method:'GET',url:new URL(path,scope).href,mode},respondWith:promise=>{response=promise;}});
        return response;
    };
    for(const path of ['index.html','docs/examples.html','docs/guide.html','docs/data-license.html','docs/license.html']){
        const response=await offline(path);assert.equal(response.status,200,path);assert.ok((await response.text()).includes('<html'));
    }
    const index=await (await offline('data/library.json')).json();
    for(const path of index.profiles){
        const record=await (await offline(new URL(path,new URL('data/library.json',scope)).href)).json();
        assert.equal(record.data_kind,'fictional');
    }
    const fallback=await offline('missing-page','navigate');
    assert.ok((await fallback.text()).includes('Startup Guide'));
    assert.equal((await offline('private-research-package.json')).status,503);
});

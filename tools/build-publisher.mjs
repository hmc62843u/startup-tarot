import {readFile,writeFile,mkdir,readdir,mkdtemp,copyFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exportRelease} from './export-release.mjs';

const publisherRoot=new URL('../',import.meta.url);
export async function buildPublisher({output=null,local=true}={}){
 const recipient=await exportRelease({rebuild:false,recipient:true}),files=[];
 async function walk(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){const path=prefix+entry.name;if(entry.isDirectory())await walk(resolve(dir,entry.name),path+'/');else files.push({path,base64:(await readFile(resolve(dir,entry.name))).toString('base64')});}}
 await walk(recipient.output);
 const readJSON=async name=>JSON.parse(await readFile(new URL(name,publisherRoot),'utf8'));
 const template={schema_version:1,files,samples:{openfor:await readJSON('enterprise/fixtures/openfor-research.json'),fictional:await readJSON('enterprise/fixtures/alpha.json')},scenarios:await readJSON('enterprise/fixtures/openfor-illustrative.json')};
 const paths=['js/validator.js','js/research-library.js','js/relationships.js','js/publishing.js','publisher/core.js','publisher/app.js'];
 const bodies=[];for(const path of paths){const source=(await readFile(new URL(path,publisherRoot),'utf8')).replace(/^\uFEFF/,'').replace(/^import \{[^\n]+\} from '[^']+';\r?$/gm,'').replace(/^export /gm,'');if(/^import |^export /m.test(source))throw new Error('Unsupported publisher module: '+path);bodies.push('// '+path+'\n'+source);}
 const bundle='// Generated browser-only Publisher. No runtime Node imports.\n(()=>{\n"use strict";\n'+bodies.join('\n\n')+'\n})();\n';
 const templateScript='globalThis.STARTUP_PUBLISHER_TEMPLATE = '+JSON.stringify(template)+';\n';
 if(local){await writeFile(new URL('publisher/template.js',publisherRoot),templateScript);await writeFile(new URL('publisher/app.bundle.js',publisherRoot),bundle);}
 if(!output){await mkdir(new URL('release/',publisherRoot),{recursive:true});output=await mkdtemp(new URL('release/research-publisher-',publisherRoot));}else{output=resolve(output);await mkdir(output,{recursive:true});}
 for(const file of ['index.html','style.css','README.md'])await copyFile(new URL('publisher/'+file,publisherRoot),resolve(output,file));
 await writeFile(resolve(output,'template.js'),templateScript);await writeFile(resolve(output,'app.bundle.js'),bundle);
 return {output,open:resolve(output,'index.html'),template_files:files.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildPublisher()));

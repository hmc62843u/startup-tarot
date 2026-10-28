import {mkdir,mkdtemp,copyFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {buildFiles} from './build-demo.mjs';

const root=new URL('../',import.meta.url);
export async function exportRelease() {
    const hash=await buildFiles();
    await mkdir(new URL('release/',root),{recursive:true});
    const output=await mkdtemp(fileURLToPath(new URL('release/startup-guide-',root)));
    const files=['index.html','docs/examples.html','docs/guide.html','docs/reference.html','docs/guide-packs.html','docs/data-license.html','docs/license.html','manifest.json','sw.js','README.md','EXAMPLES.md','GUIDE.md','REFERENCE.md','DEVELOPMENT.md','assets/how-it-works.svg','assets/methodology.svg','assets/research-walkthrough.gif','GUIDE_PACKS.md','LICENSE','DATA_LICENSE.md','.gitignore','.gitattributes','.nojekyll','.github/workflows/check.yml',
        'packs/guide-pack.json','packs/README.md','packs/PACK_FORMAT.md','packs/LICENSE.md','packs/SOURCES.md','packs/THIRD_PARTY_NOTICES.md','packs/DATA_NOTICE.md',
        'css/style.css','js/app.js','js/context.js','js/tasks.js','js/matching.js','js/evaluation.js','js/recommendation.js','js/explanations.js','js/analyzer.js','js/ui.js','js/storage.js','js/validator.js','js/research-library.js','js/app.bundle.js',
        'icons/icon-192.png','icons/icon-512.png','icons/mark.svg','data/library.json','data/startup-library.json','data/schema.json','data/guide-pack.schema.json','data/guide-pack-v1.schema.json','data/guide-pack-v2.schema.json',
        'templates/blank_investor.json','packs/demo-guide-pack.json',
        'tools/build-demo.mjs','tools/build-docs.mjs','tools/build-icons.mjs','tools/release-policy.mjs','tools/export-release.mjs',
        'tests/app.test.mjs','tests/library.test.mjs','tests/extensions.test.mjs','tests/snapshots.test.mjs','tests/release.test.mjs','tests/research.test.mjs','tests/provider.test.mjs','tests/research-helpers.mjs','tests/offline.test.mjs'];
    // Only registered records and these explicit public files enter the export.
    for (const [index,key] of [['data/library.json','profiles'],['data/startup-library.json','snapshots']]) {
        const manifest=JSON.parse(await readFile(new URL(index,root),'utf8'));
        files.push(...manifest[key].map(path=>fileURLToPath(new URL(path,new URL(index,root))).slice(fileURLToPath(root).length).replaceAll('\\','/')));
    }
    for (const path of files) {
        const target=resolve(output,path);
        await mkdir(resolve(target,'..'),{recursive:true});
        await copyFile(new URL(path,root),target);
    }
    return {output,hash,files:files.length};
}
if (process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(JSON.stringify(await exportRelease()));

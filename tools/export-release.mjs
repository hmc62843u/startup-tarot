import {mkdir,mkdtemp,copyFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {buildFiles,buildEntry} from './build-demo.mjs';

const root=new URL('../',import.meta.url);
export async function exportRelease({directory=null,rebuild=true,recipient=false}={}) {
    const hash=rebuild?await buildFiles():(await buildEntry()).hash;
    await mkdir(new URL('release/',root),{recursive:true});
    let output;if(directory){output=resolve(directory);await mkdir(output);}else output=await mkdtemp(fileURLToPath(new URL('release/startup-guide-',root)));
    const files=['assets/operator/workspace.jpg','assets/operator/founder-preview.jpg','assets/operator/release-files.jpg','assets/operator/README.md','enterprise/OPERATOR.md','docs/operator-workflow.html','enterprise/LAUNCHER.md','docs/local-services-launcher.html','publisher/README.md','docs/research-publisher.html','js/publishing.js','enterprise/PUBLISHER.md','docs/openfor-publisher.html','CONTEXTUAL_RESEARCH.md','docs/contextual-research.html','tools/incubator-distribution.mjs','tools/distribute-incubator.mjs','enterprise/domain.mjs','enterprise/fixtures/alpha.json','enterprise/fixtures/distribution-review.json','tests/research-context.test.mjs','tests/distribution.test.mjs','DISTRIBUTION_GUIDE.md','docs/distribution-guide.html','ENTERPRISE_REFERENCE.md','enterprise/ACCEPTANCE.md','docs/enterprise-reference.html','docs/enterprise-acceptance.html','index.html','docs/examples.html','docs/guide.html','docs/methodology.html','docs/development.html','docs/release.html','METHODOLOGY.md','RESEARCH_PLAN.md','RESEARCH_SETUP.md','docs/research-setup.html','start-research.cmd','js/relationships.js','js/graph-research.js','tests/graph-research.test.mjs','js/private-relationships.js','js/relationship-ui.js','data/relationships.json','data/relationships-demo.json','packs/relationships.js','tests/relationships.test.mjs','RELATIONSHIPS.md','docs/relationships.html','js/research.js','js/research-context.js','js/research-ui.js','tools/research-server.mjs','tools/research-oauth.mjs','tools/research-model.mjs','tests/research-flow.test.mjs','tests/research-oauth.test.mjs','tests/research-server.test.mjs','docs/research-plan.html','ARCHITECTURE.md','docs/architecture.html','docs/data-license.html','docs/license.html','manifest.json','sw.js','README.md','EXAMPLES.md','GUIDE.md','DEVELOPMENT.md','assets/how-it-works.svg','assets/startup-tarot-intro.mp4','assets/startup-tarot-intro.jpg','assets/startup-tarot-intro.vtt','LICENSE','DATA_LICENSE.md','.gitignore','.gitattributes','.nojekyll','.github/workflows/check.yml',
        'packs/active-pack.js','packs/guide-pack.json','packs/README.md','packs/LICENSE.md','packs/SOURCES.md','packs/THIRD_PARTY_NOTICES.md','packs/DATA_NOTICE.md',
        'js/sectors.js','js/outreach.js','tests/outreach.test.mjs','tests/outreach-ui.test.mjs','tests/fit-benchmark.test.mjs','data/fit-benchmark.json','LOCAL_RELEASE.md','js/investor-fit.js','tests/investor-fit.test.mjs','css/style.css','js/app.js','js/lean.js','js/context.js','js/tasks.js','js/matching.js','js/evaluation.js','js/recommendation.js','js/explanations.js','js/analyzer.js','js/storage.js','js/validator.js','js/research-library.js','js/app.bundle.js',
        'icons/icon-192.png','icons/icon-512.png','icons/mark.svg','data/library.json','data/startup-library.json','data/schema.json','data/guide-pack.schema.json','data/guide-pack-v1.schema.json','data/guide-pack-v2.schema.json',
        'templates/blank_investor.json','packs/demo-guide-pack.json',
        'tools/build-demo.mjs','tools/build-docs.mjs','tools/build-icons.mjs','tools/release-policy.mjs','tools/export-release.mjs',
        'tests/app.test.mjs','tests/library.test.mjs','tests/extensions.test.mjs','tests/snapshots.test.mjs','tests/release.test.mjs','tests/research.test.mjs','tests/provider.test.mjs','tests/research-helpers.mjs','tests/offline.test.mjs'];
    // Only registered records and these explicit public files enter the export.
    for (const [index,key] of [['data/library.json','profiles'],['data/startup-library.json','snapshots']]) {
        const manifest=JSON.parse(await readFile(new URL(index,root),'utf8'));
        files.push(...manifest[key].map(path=>fileURLToPath(new URL(path,new URL(index,root))).slice(fileURLToPath(root).length).replaceAll('\\','/')));
    }
    const selected=recipient?files.filter(path=>!path.startsWith('tests/')&&!path.startsWith('.github/')&&!['.gitignore','.gitattributes','tools/incubator-distribution.mjs','tools/distribute-incubator.mjs','enterprise/domain.mjs','enterprise/fixtures/alpha.json','enterprise/fixtures/distribution-review.json'].includes(path)):files;
    for (const path of selected) {
        const target=resolve(output,path);
        await mkdir(resolve(target,'..'),{recursive:true});
        await copyFile(new URL(path,root),target);
    }
    return {output,hash,files:selected.length};
}
if (process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(JSON.stringify(await exportRelease()));

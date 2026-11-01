import {readFile,mkdir,mkdtemp,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {exportRelease} from '../tools/export-release.mjs';
import {buildPublisher} from '../tools/build-publisher.mjs';
import {buildFiles} from '../tools/build-demo.mjs';

export const REFERENCE_FILES=['enterprise/setup-panel.mjs','enterprise/setup/index.html','enterprise/setup/panel.css','enterprise/setup/panel.js','tests/setup-panel.test.mjs','tools/rehearse-openfor.mjs','enterprise/fixtures/openfor-demo-raw.json','tests/operator-rehearsal.test.mjs','enterprise/operator-service.mjs','.agents/skills/research-operator/SKILL.md','enterprise/operator.mjs','enterprise/OPERATOR.md','tools/distribute-incubator.mjs','tests/operator.test.mjs','start-workspace.cmd','enterprise/launch.mjs','enterprise/launcher/core.mjs','enterprise/launcher/worker.mjs','enterprise/launcher.example.json','enterprise/LAUNCHER.md','tests/launcher.test.mjs','tools/build-publisher.mjs','publisher/core.js','publisher/app.js','js/publishing.js','enterprise/publisher-build.mjs','enterprise/tests/publisher-build.test.mjs','tools/distribution-zip.mjs','tools/incubator-distribution.mjs','enterprise/PUBLISHER.md','enterprise/publisher.mjs','enterprise/tests/publisher.test.mjs','enterprise/fixtures/openfor-research.json','enterprise/fixtures/openfor-illustrative.json','DISTRIBUTION_GUIDE.md','ENTERPRISE_REFERENCE.md','LICENSE','.gitignore',
  'enterprise/domain.mjs','enterprise/neo4j.mjs','enterprise/service.mjs','enterprise/server.mjs','enterprise/model-adapter.mjs','enterprise/manage.mjs','enterprise/export-reference.mjs','enterprise/compose.yaml','enterprise/README.md','enterprise/ACCEPTANCE.md',
  'enterprise/web/index.html','enterprise/web/app.js','enterprise/web/style.css','enterprise/fixtures/distribution-review.json','enterprise/fixtures/alpha.json','enterprise/fixtures/beta.json','enterprise/tests/neo4j.integration.mjs','enterprise/tests/contracts.test.mjs',
  'js/research-library.js','js/relationships.js','js/graph-research.js','js/research.js','js/investor-fit.js','js/sectors.js','js/validator.js','js/private-relationships.js',
  'tools/research-model.mjs'];
export async function exportReference(){
  const root=new URL('../',import.meta.url);await mkdir(new URL('release/',root),{recursive:true});
  const parent=await mkdtemp(fileURLToPath(new URL('release/incubator-reference-',root))),output=resolve(parent,'reference'),manifest=[];
  await exportRelease({directory:output,rebuild:false,recipient:true});
  await buildPublisher({output:resolve(output,'publisher'),local:false});
  for(const path of REFERENCE_FILES){const bytes=await readFile(new URL(path,root));await mkdir(resolve(output,path,'..'),{recursive:true});await copyFile(new URL(path,root),resolve(output,path));manifest.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});}
  const fixture=JSON.parse(await readFile(new URL('enterprise/fixtures/alpha.json',root),'utf8'));
  await writeFile(resolve(output,'packs/guide-pack.json'),JSON.stringify(fixture.pack));await writeFile(resolve(output,'data/relationships.json'),JSON.stringify(fixture.relationships));await buildFiles(pathToFileURL(output+sep));
  manifest.length=0;const {readdir}=await import('node:fs/promises');async function list(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){const path=prefix+entry.name;if(entry.isDirectory())await list(resolve(dir,entry.name),path+'/');else manifest.push({path,sha256:createHash('sha256').update(await readFile(resolve(dir,entry.name))).digest('hex')});}}await list(output);
  await writeFile(resolve(output,'reference-manifest.json'),JSON.stringify({schema_version:1,production_ready:false,files:manifest},null,2));return {output,files:manifest.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await exportReference()));

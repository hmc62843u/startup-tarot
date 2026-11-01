import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {Neo4jStore} from './neo4j.mjs';
import {tokenHash} from './server.mjs';
import {validateBundle} from './domain.mjs';

const command=process.argv[2],directory='.local/enterprise';
if(command==='init'){
  await mkdir(directory,{recursive:true});
  const entries=[['example_alpha','admin','admin'],['example_alpha','founder','researcher'],['example_beta','admin','admin'],['example_beta','founder','researcher']].map(([org,subject,role])=>({org,subject,role,token:randomBytes(32).toString('base64url')}));
  // Refuse overwrites: rerunning init cannot silently revoke existing credentials.
  await writeFile(directory+'/demo-credentials.json',JSON.stringify({credentials:entries},null,2),{flag:'wx',mode:0o600});
  await writeFile(directory+'/access.json',JSON.stringify({credentials:entries.map(({token,...entry})=>({...entry,token_sha256:tokenHash(token)}))},null,2),{flag:'wx',mode:0o600});
  console.log('Created ignored local access.json and demo-credentials.json. Open the credentials file locally; never commit or share it.');
}else if(command==='validate'){
  if(!process.argv[3])throw new Error('Usage: node enterprise/manage.mjs validate path/to/bundle.json');
  validateBundle(JSON.parse(await readFile(process.argv[3],'utf8')));console.log('Bundle valid. No database changes.');
}else if(command==='seed-demo'){
  const store=new Neo4jStore({url:process.env.NEO4J_URL,password:process.env.NEO4J_PASSWORD});await store.init();
  for(const name of ['alpha','beta']){
    const bundle=validateBundle(JSON.parse(await readFile(new URL('fixtures/'+name+'.json',import.meta.url),'utf8'))),org='example_'+name;
    let revision=null;try{revision=(await store.get(org)).revision;}catch(error){if(error.status!==404)throw error;}
    console.log(JSON.stringify({org,...await store.put(org,bundle,{expected_revision:revision})}));
  }
}else throw new Error('Commands: init | validate <bundle.json> | seed-demo. Set NEO4J_URL and NEO4J_PASSWORD for database commands.');

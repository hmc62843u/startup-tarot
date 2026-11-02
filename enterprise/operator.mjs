import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSetupPanel} from './setup-panel.mjs';
import {launchCommand} from './launch.mjs';
import {operatorRoot,readOperatorJSON,checkOperatorInput,inspectOperatorResearch,importOperatorResearch,exportOperatorResearch,prepareOperatorProposal,packageOperatorProposal} from './operator-service.mjs';

// Preserve previous programmatic imports while keeping the command entry point thin.
export {operatorRead,operatorTemplate,prepareOperatorProposal,packageOperatorProposal} from './operator-service.mjs';

const operatorHelp='Operator workflow: setup | start | status | stop | publisher | inspect --connection FILE | check --input FILE | import --connection FILE --input FILE --expected REV|new | export --connection FILE --revision REV | prepare --input FILE [--scenario ID] | package --proposal DIR';
export async function operatorCommand(args=process.argv.slice(2),{root=operatorRoot,print=console.log,fetchImpl=fetch}={}){
 const [action,...rest]=args;if(!action||action==='help'||action==='--help'){print(operatorHelp);return;}
 if(action==='setup'){if(rest.length)throw new Error('Usage: node enterprise/operator.mjs setup');const panel=createSetupPanel();print('Research setup panel: '+await panel.listen());return panel;}
 if(['start','status','stop','publisher'].includes(action))return launchCommand([action,...rest,...(action==='start'&&!rest.includes('--no-open')?['--no-open']:[])],{print});
 const specs={inspect:['connection'],check:['input'],import:['connection','input','expected'],export:['connection','revision'],prepare:['input','scenario'],package:['proposal']};if(!specs[action])throw new Error(operatorHelp);
 const options={};for(let i=0;i<rest.length;i+=2){const key=rest[i]?.slice(2);if(!rest[i]?.startsWith('--')||!specs[action].includes(key)||!rest[i+1]||options[key])throw new Error(operatorHelp);options[key]=rest[i+1];}
 for(const key of specs[action].filter(k=>k!=='scenario'))if(!options[key])throw new Error('Missing --'+key+'. '+operatorHelp);
 const connection=options.connection?await readOperatorJSON(resolve(options.connection),4000):null;
 let result;
 if(action==='check')result=checkOperatorInput(await readOperatorJSON(resolve(options.input)));
 if(action==='inspect')result=await inspectOperatorResearch(connection,{fetchImpl});
 if(action==='import')result=await importOperatorResearch(connection,await readOperatorJSON(resolve(options.input)),options.expected,{fetchImpl});
 if(action==='export')result=await exportOperatorResearch(connection,options.revision,{root,fetchImpl});
 if(action==='prepare')result=await prepareOperatorProposal(await readOperatorJSON(resolve(options.input)),{root,scenarioId:options.scenario||null});
 if(action==='package')result=await packageOperatorProposal(options.proposal,{root});
 print(JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))operatorCommand().catch(error=>{console.error(error instanceof SyntaxError?'Invalid local JSON. Inspect the indicated input privately.':error.message);process.exitCode=1;});

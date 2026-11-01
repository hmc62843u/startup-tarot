import {runOAuthGraphPlan,runOAuthResearch} from '../tools/research-model.mjs';

// Provision one separately authenticated OAuth object per organization/user.
// This factory never imports an active connection from the desktop app/helper.
export function createOAuthModelAdapter(oauth,{fetchImpl=fetch}={}){
  return {
    async plan({packet,dataset,model,signal}){
      const {output,...metadata}=await runOAuthGraphPlan({oauth,packet,dataset,model,signal,fetchImpl});return {...metadata,plan:output};
    },
    async reason({packet,model,signal}){return runOAuthResearch({oauth,packet,model,signal,fetchImpl});}
  };
}

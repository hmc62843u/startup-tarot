import {GRAPH_PLAN_SCHEMA,GRAPH_PLAN_INSTRUCTIONS,graphResearchCatalog,validateGraphPlan} from '../js/graph-research.js';
import {RESEARCH_INSTRUCTIONS,RESEARCH_OUTPUT_SCHEMA,validateResearchOutput,RESEARCH_LIMITS} from '../js/research.js';

export function validateIncomingPacket(packet){
  if(!packet||packet.contract_version!=='1'||typeof packet.packet_id!=='string'||!packet.packet_id||typeof packet.question!=='string'||!packet.question.trim()||packet.question.length>2000
    ||!Array.isArray(packet.records)||packet.records.length>5||!Array.isArray(packet.evidence_items)||packet.evidence_items.length>60||!Array.isArray(packet.source_metadata)
    ||Buffer.byteLength(JSON.stringify(packet))>RESEARCH_LIMITS.bytes)throw new Error('Invalid or oversized evidence packet.');
  const ids=new Set(packet.evidence_items.map(e=>e.evidence_id)),sources=new Set(packet.source_metadata.map(s=>s.source_id));
  if(ids.size!==packet.evidence_items.length||sources.size!==packet.source_metadata.length||packet.evidence_items.some(e=>typeof e.evidence_id!=='string'||!Array.isArray(e.source_ids)||!e.source_ids.length||e.source_ids.some(id=>!sources.has(id))))throw new Error('Packet evidence/source references are invalid.');
}
export async function collectResearchStream(response){
  if(!response.ok){let body={};try{body=await response.json();}catch{}const error=new Error(body.error?.message||body.detail||'OpenAI inference request failed.');error.status=response.status;error.code=body.error?.code;error.request_id=response.headers.get('x-request-id');throw error;}
  if(!response.body)throw new Error('OpenAI returned no response stream.');
  let buffer='',text='',completed=null,refusal=false,bytes=0;
  const decoder=new TextDecoder();
  const consume=frame=>{
    const data=frame.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
    if(!data||data==='[DONE]')return;
    const event=JSON.parse(data);
    if(event.type==='response.output_text.delta')text+=event.delta;
    if(event.type?.includes('refusal'))refusal=true;
    if(['response.failed','response.incomplete','error'].includes(event.type)){const error=new Error(event.response?.error?.message||event.error?.message||'The model did not complete research.');error.code=event.response?.error?.code||event.error?.code||event.type;throw error;}
    if(event.type==='response.completed')completed=event.response;
    if(text.length>60000)throw new Error('Model output exceeded the local size limit.');
  };
  for await(const chunk of response.body){
    bytes+=chunk.byteLength;if(bytes>2*1024*1024)throw new Error('Model stream exceeded the local size limit.');
    buffer=(buffer+decoder.decode(chunk,{stream:true})).replace(/\r\n/g,'\n');let pos;
    while((pos=buffer.indexOf('\n\n'))!==-1){consume(buffer.slice(0,pos));buffer=buffer.slice(pos+2);}
  }
  buffer+=decoder.decode();if(buffer.trim())consume(buffer);
  if(!completed||completed.status&&completed.status!=='completed')throw new Error('Model stream ended without completed inference.');
  const content=(completed.output||[]).flatMap(item=>item.content||[]);
  if(refusal||content.some(c=>c.type==='refusal'))throw new Error('The model declined this request; no research output was saved.');
  const finalText=content.filter(c=>c.type==='output_text').map(c=>c.text).join('')||text;
  if(!finalText||finalText.length>60000)throw new Error('Model output is empty or oversized.');
  return {output:JSON.parse(finalText),usage:completed.usage||null,response_id:completed.id||null};
}
async function requestStructured({oauth,packet,model,signal,fetchImpl=fetch,schema=RESEARCH_OUTPUT_SCHEMA,instructions=RESEARCH_INSTRUCTIONS,input=packet,name='founder_research'}){
  validateIncomingPacket(packet);
  const models=await oauth.models();if(!models.some(m=>m.slug===model))throw new Error('Select a model available to this connected ChatGPT account.');
  const token=await oauth.access(),start=Date.now();
  const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',signal,redirect:'error',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({model,store:false,stream:true,instructions,text:{format:{type:'json_schema',name,strict:true,schema}},
      input:[{role:'user',content:JSON.stringify(input)}]})});
  const result=await collectResearchStream(response);
  return {...result,model,duration_ms:Date.now()-start};
}
export async function runOAuthResearch(options){
  const result=await requestStructured(options),validation=validateResearchOutput(result.output,options.packet);
  if(!validation.isValid)throw new Error('Model output failed validation: '+validation.errors.join(' '));
  return {...result,prompt_version:'research-1',validation};
}

export async function runOAuthGraphPlan(options){
  const catalog=graphResearchCatalog(options.dataset,options.packet);
  const result=await requestStructured({...options,schema:GRAPH_PLAN_SCHEMA,instructions:GRAPH_PLAN_INSTRUCTIONS,input:{packet:options.packet,catalog},name:'public_graph_plan'});
  validateGraphPlan(result.output,catalog);
  return {...result,prompt_version:'graph-plan-1'};
}

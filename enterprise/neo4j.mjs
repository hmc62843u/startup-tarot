import {createHash,randomUUID} from 'node:crypto';
import {requireReference} from './domain.mjs';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const scopeKey=(org,owner=null)=>digest([org,owner===null?'organization':'private',owner]);
export class Neo4jStore{
  constructor({url='http://127.0.0.1:7474',user='neo4j',password,database='neo4j',fetchImpl=fetch}){
    const endpoint=new URL(url);requireReference(['http:','https:'].includes(endpoint.protocol)&&!endpoint.username&&!endpoint.password&&!endpoint.search&&!endpoint.hash&&endpoint.pathname==='/','Invalid Neo4j base URL.');
    requireReference(endpoint.protocol==='https:'||['127.0.0.1','localhost','neo4j'].includes(endpoint.hostname),'Use HTTPS for a remote Neo4j connection.');
    requireReference(password&&/^[a-zA-Z0-9_-]+$/.test(database),'Neo4j password and simple database name required.');
    this.url=endpoint.origin+'/db/'+database+'/query/v2';this.auth='Basic '+Buffer.from(user+':'+password).toString('base64');this.fetchImpl=fetchImpl;
  }
  async query(statement,parameters={},signal){
    const response=await this.fetchImpl(this.url,{method:'POST',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),headers:{Authorization:this.auth,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({statement,parameters,maxExecutionTime:15})});
    const text=await response.text();requireReference(text.length<=12*1024*1024,'Database response limit exceeded.',503);
    let body;try{body=JSON.parse(text);}catch{throw Object.assign(new Error('Invalid database response.'),{status:503});}
    if(!response.ok||body.errors?.length){const error=new Error('Graph database query failed.');error.status=503;error.databaseCode=body.errors?.[0]?.code;throw error;}
    requireReference(Array.isArray(body.data?.values),'Incomplete database response.',503);
    return body.data.values.map(row=>Object.fromEntries(body.data.fields.map((key,index)=>[key,row[index]])));
  }
  async init(){for(const label of ['SGWorkspace','SGRevision','SGNode'])await this.query('CREATE CONSTRAINT '+label.toLowerCase()+'_key IF NOT EXISTS FOR (n:'+label+') REQUIRE n.key IS UNIQUE');}
  async put(org,value,{owner=null,expected_revision=null}={}){
    const scope=scopeKey(org,owner),revision=randomUUID(),graph=owner===null?value.relationships:value;
    const nodes=graph.nodes.map(n=>({key:digest([scope,revision,n.id]),id:n.id,type:n.type,payload:JSON.stringify(n)}));
    const nodeKeys=new Map(nodes.map(n=>[n.id,n.key]));const edges=graph.edges.map(e=>({id:e.id,type:e.type,from:nodeKeys.get(e.from),to:nodeKeys.get(e.to),payload:JSON.stringify(e)}));
    const rows=await this.query('MERGE (w:SGWorkspace {key:$scope, org:$org}) SET w.write_lock=randomUUID() WITH w WHERE (w.revision IS NULL AND $expected IS NULL) OR w.revision=$expected CREATE (v:SGRevision {key:$revisionKey, org:$org, scope:$scope, revision:$revision, payload:$payload}) WITH w,v CALL (v) { UNWIND $nodes AS row CREATE (:SGNode {key:row.key, org:$org, scope:$scope, revision:$revision, id:row.id, type:row.type, payload:row.payload}) } CALL (v) { UNWIND $edges AS row MATCH (a:SGNode {key:row.from,org:$org,scope:$scope,revision:$revision}), (b:SGNode {key:row.to,org:$org,scope:$scope,revision:$revision}) CREATE (a)-[:SG_LINK {org:$org,scope:$scope,revision:$revision,id:row.id,type:row.type,payload:row.payload}]->(b) } SET w.revision=$revision RETURN v.revision AS revision',{scope,org,revision,revisionKey:digest([scope,revision]),expected:expected_revision,payload:JSON.stringify(value),nodes,edges});
    requireReference(rows.length===1,'Revision conflict. Reload the current revision before importing.',409);return {revision};
  }
  async get(org,{owner=null,revision=null}={}){
    const scope=scopeKey(org,owner);
    const rows=await this.query('MATCH (w:SGWorkspace {key:$scope,org:$org}) MATCH (v:SGRevision {scope:$scope,org:$org,revision:coalesce($revision,w.revision)}) RETURN v.revision AS revision,v.payload AS payload',{scope,org,revision});
    requireReference(rows.length===1,'Dataset/revision not found in this authorized workspace.',404);return {revision:rows[0].revision,value:JSON.parse(rows[0].payload)};
  }
  async nativePaths(org,revision,query,eligibleEdges,{owner=null,directed=false}={}){
    const scope=scopeKey(org,owner),hops=query.max_hops;
    requireReference(Number.isInteger(hops)&&hops>=1&&hops<=6,'Invalid path depth.');
    const arrow=directed?'->':'-';
    return this.query('MATCH p=(a:SGNode {org:$org,scope:$scope,revision:$revision,id:$from})-[:SG_LINK*1..'+hops+']'+arrow+'(b:SGNode {org:$org,scope:$scope,revision:$revision,id:$to}) WHERE all(n IN nodes(p) WHERE n.org=$org AND n.scope=$scope AND n.revision=$revision) AND all(e IN relationships(p) WHERE e.org=$org AND e.scope=$scope AND e.revision=$revision AND e.id IN $eligible) AND all(n IN nodes(p) WHERE single(m IN nodes(p) WHERE m=n)) RETURN [n IN nodes(p)|n.id] AS nodes,[e IN relationships(p)|e.id] AS edges ORDER BY size(edges),edges LIMIT 30',{org,scope,revision,from:query.from,to:query.to,eligible:eligibleEdges});
  }
  async nativeNetwork(org,revision,projection,eligibleEdges){
    const params={org,scope:scopeKey(org),revision,eligible:eligibleEdges};
    const guard='all(n IN nodes(p)+nodes(q) WHERE n.org=$org AND n.scope=$scope AND n.revision=$revision) AND all(e IN relationships(p)+relationships(q) WHERE e.org=$org AND e.scope=$scope AND e.revision=$revision AND e.id IN $eligible)';
    const pattern=projection==='same_round'?'MATCH p=(a:SGNode {type:"investor",org:$org,scope:$scope,revision:$revision})-[:SG_LINK]->(r:SGNode {type:"round"})-[:SG_LINK]->(c:SGNode {type:"startup"}) MATCH q=(b:SGNode {type:"investor"})-[:SG_LINK]->(r)-[:SG_LINK]->(c) WHERE a.id<b.id AND relationships(p)[0].type="participated_in" AND relationships(p)[1].type="round_for" AND relationships(q)[0].type="participated_in" AND relationships(q)[1].type="round_for" AND ':'MATCH p=(a:SGNode {type:"investor",org:$org,scope:$scope,revision:$revision})-[:SG_LINK*1..2]->(c:SGNode {type:"startup"}) MATCH q=(b:SGNode {type:"investor"})-[:SG_LINK*1..2]->(c) WHERE a.id<b.id AND all(path IN [p,q] WHERE (size(relationships(path))=1 AND relationships(path)[0].type="invested_in") OR (size(relationships(path))=2 AND relationships(path)[0].type="participated_in" AND relationships(path)[1].type="round_for")) AND ';
    return this.query(pattern+guard+' RETURN DISTINCT a.id AS from,b.id AS to ORDER BY from,to',params);
  }
}

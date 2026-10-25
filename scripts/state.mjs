import assert from 'node:assert/strict';
import {canonical,digest,sha,read,denied} from './check.mjs';
import {cost,decision} from './reference.mjs';
export function contentKey(address,config,hash){return digest({contract:address,policy:'semantic-arrival-policer-v1',configuration_root:digest(config),sha256:hash});}
export async function replay(address,config,items){
 assert.deepEqual(await read(address,'get_policy',[]),config);
 let g=0,last=0;const people=new Map(),pins=new Map();
 for(const {actor,nonce,state:saved} of items){
  const r=await read(address,'get_decision',[actor,nonce]),{root,...body}=r,s=r.report.spec,src=r.report.source;
  assert.equal(canonical(r),canonical(saved));assert.equal(digest(body),root);assert.equal(r.actor,actor);assert.equal(r.nonce,nonce);assert.equal(r.contract,address);
  assert.equal(s.actor,actor);assert.equal(s.nonce,nonce);assert.equal(s.contract,address);assert.equal(s.policy,'semantic-arrival-policer-v1');
  assert.deepEqual(s.configuration,config);assert.equal(s.clock.at,r.clock.at);assert(r.clock.at>=last);last=r.clock.at;
  assert.equal(s.clock.global_tat,g);assert.equal(s.clock.principal_tat,people.get(actor)??0);
  assert.equal(src.url,s.source.url);assert.equal(r.content_root,contentKey(address,config,s.source.sha256));
  if(['OK','HASH_MISMATCH'].includes(src.status)){
   assert.equal(src.http,200);assert(Buffer.byteLength(src.body)>=1&&Buffer.byteLength(src.body)<=4096);assert.equal(sha(src.body),src.hash);
   assert.equal(src.status,src.hash===s.source.sha256?'OK':'HASH_MISMATCH');
  }else{assert(['UNAVAILABLE','HTTP_ERROR','SIZE_ERROR','ENCODING_ERROR'].includes(src.status));assert(!src.body&&!src.hash);}
  let result={status:'HELD',reason:src.status,cost:0,clock:{at:r.clock.at,global_before:g,principal_before:people.get(actor)??0,
   global_after:g,principal_after:people.get(actor)??0,retry_at:0}},pin;
  if(src.status==='OK'){
   assert.equal(r.report.vector.length,3);assert(r.report.vector.every(x=>['YES','NO','UNKNOWN'].includes(x)));
   if(r.report.vector.includes('UNKNOWN'))result={...result,status:'UNCERTAIN',reason:'UNRESOLVED_PREDICATE'};
   else{
    const c=cost(r.report.vector),b={content_root:r.content_root,configuration_root:digest(config),sha256:s.source.sha256,vector:r.report.vector,cost:c};
    b.root=digest(b);pin=pins.get(r.content_root);
    if(pin&&canonical(pin.vector)!==canonical(r.report.vector))result={...result,status:'DRIFT_HELD',reason:'PINNED_VECTOR_CHANGED',cost:c};
    else{pin??=b;pins.set(r.content_root,pin);result=decision(config,r.clock.at,g,people.get(actor)??0,c);}
   }
  }else assert.deepEqual(r.report.vector,[]);
  for(const key of ['status','reason','cost','clock'])assert.equal(canonical(r[key]),canonical(result[key]));
  assert.equal(r.basis_root,pin?.root??'');
  if(r.status==='ADMITTED'){g=r.clock.global_after;people.set(actor,r.clock.principal_after);}
 }
 for(const [actor,tat] of people){const m=await read(address,'get_meter',[actor]);assert.equal(m.global_tat,g);assert.equal(m.principal_tat,tat);
  assert.equal(m.global_debt_seconds,Math.max(0,g-m.at));assert.equal(m.principal_debt_seconds,Math.max(0,tat-m.at));}
 for(const pin of pins.values()){
  assert.deepEqual(await read(address,'get_basis',[pin.sha256]),pin);
  const actor=items[0].actor,q=await read(address,'quote',[actor,pin.sha256]);
  const expected=decision(config,q.clock.at,g,people.get(actor)??0,pin.cost);
  assert.deepEqual(q,{...expected,basis_root:pin.root,binding:'PREVIEW_ONLY'});
 }
 return {global_tat:g,principal_tats:Object.fromEntries(people),bases:pins.size,records:items.length};
}

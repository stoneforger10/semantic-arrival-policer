// Read-only chain verification. No signing or broadcast import/path.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {canonical,rpc,receipt,source,denied} from './check.mjs';
import {replay} from './state.mjs';
const p=JSON.parse(fs.readFileSync('PROOFS.json','utf8'));
assert(p.final_readback_verified&&p.contract_history_matched&&p.live_refill_verified);assert.equal(p.transactions.length,15);assert.equal(await rpc('eth_chainId',[]),'0xf22f');
for(const t of p.transactions){assert(t.verified&&!t.broadcast_unknown);const actual=await receipt(t.hash,t.expected,t.expected_message);
 for(const key of ['status','execution','consensus','leader_only','initial_validators','agree_votes','idle_votes','disagree_votes','validator_execution_seen'])assert.equal(actual[key],t[key]);}
for(const [name,i] of Object.entries(p.instances)){
 assert.equal(canonical(await source(i.address)),canonical(i.source));assert.equal(canonical(await replay(i.address,i.policy,p.records.filter(r=>r.instance===name))),canonical(i.replay));
 const history=await rpc('sim_getTransactionsForAddress',[i.address]),known=p.transactions.filter(t=>t.address===i.address);assert.deepEqual(history.map(t=>t.hash).sort(),known.map(t=>t.hash).sort());
 for(const t of history){const intent=known.find(x=>x.hash===t.hash);assert.equal(t.from_address.toLowerCase(),intent.signer.toLowerCase());assert.equal(BigInt(t.nonce),BigInt(intent.nonce_before));assert.equal(BigInt(t.value),0n);}
}
for(const nonce of ['unsafe','bad nonce'])assert(await denied(p.instances.bounded.address,'get_decision',[p.accounts[0].address,nonce]));
assert(await denied(p.instances.bounded.address,'get_basis',['f'.repeat(64)]));
console.log(JSON.stringify({verified:true,transactions:15,records:10,instances:2,source_match:true,live_refill:true}));

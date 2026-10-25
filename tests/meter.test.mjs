import test from 'node:test';
import assert from 'node:assert/strict';
import {decision,cost} from '../scripts/reference.mjs';
const config={global:{period:5,burst:4},principal:{period:7,burst:3}};
test('all eight feature costs are distinct and exact',()=>{
 const values=[];for(let mask=0;mask<8;mask++)values.push(cost([0,1,2].map(i=>mask&(1<<i)?'YES':'NO')));assert.deepEqual(values,[1,2,3,4,5,6,7,8]);
});
test('time boundaries, atomic refusal and idle saturation',()=>{
 const first=decision(config,100,0,0,2);assert.equal(first.status,'ADMITTED');assert.equal(first.clock.global_after,110);assert.equal(first.clock.principal_after,114);
 const second=decision(config,100,110,114,2);assert.equal(second.status,'DENIED');assert.equal(second.clock.retry_at,107);assert.equal(second.clock.global_after,110);
 assert.equal(decision(config,106,110,114,2).status,'DENIED');assert.equal(decision(config,107,110,114,2).status,'ADMITTED');
 assert.equal(decision(config,200,110,114,2).clock.principal_after,214);
});
test('both failures and permanent oversize are not finite retry promises',()=>{
 assert.equal(decision(config,100,120,121,2).reason,'BOTH');
 const r=decision(config,100,0,0,8);assert.equal(r.status,'OVERSIZE');assert.equal(r.clock.retry_at,0);assert.equal(r.clock.global_after,0);
});

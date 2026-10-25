// Independent credit-space oracle: no production Python or TAT plan imported.
import assert from 'node:assert/strict';
export function decision(config,at,g,p,weight){
 const rows=[['GLOBAL',config.global,g],['PRINCIPAL',config.principal,p]],credits=rows.map(([,rule,tat])=>rule.burst*rule.period-Math.max(0,tat-at));
 const oversized=rows.filter(([,rule])=>weight>rule.burst).map(([name])=>name);
 const times={at,global_before:g,principal_before:p,global_after:g,principal_after:p,retry_at:0};
 if(oversized.length)return {status:'OVERSIZE',reason:oversized.join('_AND_'),cost:weight,clock:times};
 const deficits=rows.map(([,rule],i)=>Math.max(0,weight*rule.period-credits[i]));
 times.retry_at=at+Math.max(...deficits);
 if(deficits.some(x=>x>0))return {status:'DENIED',reason:deficits.every(x=>x>0)?'BOTH':deficits[0]>0?'GLOBAL':'PRINCIPAL',cost:weight,clock:times};
 const debt=rows.map(([,rule],i)=>rule.burst*rule.period-(credits[i]-weight*rule.period));
 times.global_after=at+debt[0];times.principal_after=at+debt[1];
 return {status:'ADMITTED',reason:'WITHIN_LIMITS',cost:weight,clock:times};
}
export function cost(labels){assert.equal(labels.length,3);assert(labels.every(x=>['YES','NO'].includes(x)));return 1+labels.reduce((v,x,i)=>v+(x==='YES'?2**i:0),0);}

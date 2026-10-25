import fs from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {getAddress} from 'viem';
import {rpc,receipt,source,read,denied,sha,canonical} from './check.mjs';
import {replay} from './state.mjs';
const accounts=[{name:'studio-proof-deployer',address:getAddress('0x7a413bb4ab62e31d62d4cd9efc8c8a8dae37fb42')},
 {name:'fairresolve-demo',address:getAddress('0x34346773a22564cbcc5f1d67d1c1f9f196daea35')}];
const criteria=['The notice requires a database schema migration.','The notice requires rotating authentication credentials.','The notice announces a planned customer-facing service outage.'];
const policy=period=>({criteria,weights:[1,2,4],global:{period,burst:4},principal:{period,burst:3}});
const file='PROOFS.json',commit=process.argv[2];if(!/^[0-9a-f]{40}$/.test(commit??''))throw Error('Supply published fixture commit');
let p=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{network:'studionet',chain_id:61999,fixture_commit:commit,accounts,transactions:[],instances:{},records:[]};
assert.equal(p.fixture_commit,commit);const save=()=>fs.writeFileSync(file,JSON.stringify(p,null,2)+'\n');p.final_readback_verified=false;save();let phase='preflight';
function broadcast(args,account,onHash){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['scripts/run-cli.cjs',...args],{windowsHide:true,env:{...process.env,SAP_TEST_ACCOUNT:account.name},stdio:['ignore','pipe','pipe']});
 let carry='';child.stderr.resume();child.stdout.on('data',data=>{carry+=data.toString();const lines=carry.split(/\r?\n/);carry=lines.pop();
  for(const line of lines)if(/^BROADCAST_HASH 0x[0-9a-fA-F]{64}$/.test(line))onHash(line.split(' ')[1]);});
 child.on('error',()=>reject(Error('CLI launch failed')));child.on('close',resolve);
});}
async function tx(step,args,who=0,expected='SUCCESS',message){
 phase=step;let t=p.transactions.find(x=>x.step===step),account=accounts[who];
 if(!t){
  const latest=await rpc('eth_getTransactionCount',[account.address,'latest']),pending=await rpc('eth_getTransactionCount',[account.address,'pending']);assert.equal(latest,pending,'Pending signer transaction');
  t={step,signer:account.address,expected,cli_arguments:args,nonce_before:latest,verified:false,broadcast_unknown:true,...(message?{expected_message:message}:{})};p.transactions.push(t);save();
  t.cli_exit=await broadcast(args,account,hash=>{t.hash=hash;delete t.broadcast_unknown;save();console.log(step+' '+hash);});save();
 }
 assert.equal(t.signer,account.address);assert.equal(canonical(t.cli_arguments),canonical(args));
 if(!t.hash)throw Error('Unknown broadcast outcome: audit history before retry');
 Object.assign(t,await receipt(t.hash,expected,message),{verified:true});save();console.log(JSON.stringify({step,status:t.status,execution:t.execution,consensus:t.consensus}));
 if(expected==='SUCCESS'&&!t.committed)throw Error('No committed state');return t;
}
const write=(step,instance,args,who=0,expected='SUCCESS',message)=>tx(step,['write',p.instances[instance].address,'police','--args',...args.map(String)],who,expected,message);
function request(nonce,fixture='plain',bad=false){return [nonce,'stoneforger10/semantic-arrival-policer/'+commit+'/examples/'+fixture+'.txt',bad?'f'.repeat(64):sha(fs.readFileSync('examples/'+fixture+'.txt'))];}
async function deploy(instance,period){
 const t=await tx('deploy-'+instance,['deploy','--contract','contracts/SemanticArrivalPolicer.py','--args',...criteria,...[period,4,period,3].map(String)]);
 p.instances[instance]={address:t.address,policy:policy(period),source:await source(t.address)};save();
}
async function police(step,instance,nonce,fixture,status,reason,weight,who=0,bad=false){
 await write(step,instance,request(nonce,fixture,bad),who);
 const state=await read(p.instances[instance].address,'get_decision',[accounts[who].address,nonce]);
 assert.equal(state.status,status);if(reason)assert.equal(state.reason,reason);assert.equal(state.cost,weight);
 p.records=p.records.filter(x=>!(x.instance===instance&&x.actor===accounts[who].address&&x.nonce===nonce));
 p.records.push({step,instance,actor:accounts[who].address,nonce,state});save();return state;
}
try{
 assert.equal(await rpc('eth_chainId',[]),'0xf22f');
 for(const fixture of ['plain','migration','heavy','uncertain']){
  const path='examples/'+fixture+'.txt',url='https://raw.githubusercontent.com/stoneforger10/semantic-arrival-policer/'+commit+'/'+path;
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});assert(response.ok);assert.equal(sha(Buffer.from(await response.arrayBuffer())),sha(fs.readFileSync(path)));
 }
 await deploy('bounded',3600);
 await police('light','bounded','light','plain','ADMITTED','WITHIN_LIMITS',1);
 await police('migration','bounded','migration','migration','ADMITTED','WITHIN_LIMITS',2);
 await police('principal-limit','bounded','personal-full','plain','DENIED','PRINCIPAL',1);
 await police('peer-admission','bounded','peer','plain','ADMITTED','WITHIN_LIMITS',1,1);
 await police('shared-limit','bounded','shared-full','migration','DENIED','GLOBAL',2,1);
 await police('oversize','bounded','oversize','heavy','OVERSIZE','GLOBAL_AND_PRINCIPAL',8);
 await police('uncertain','bounded','uncertain','uncertain','UNCERTAIN','UNRESOLVED_PREDICATE',0);
 await police('hash-mismatch','bounded','hash-mismatch','plain','HELD','HASH_MISMATCH',0,0,true);
 await write('nonce-replay','bounded',request('light','migration'),0,'ERROR','Nonce already used');
 await write('unsafe-url','bounded',['unsafe','https://evil.invalid/x','a'.repeat(64)],0,'ERROR','Invalid source');
 await write('invalid-nonce','bounded',request('bad nonce'),0,'ERROR','Invalid nonce');
 await deploy('refill',1);
 const first=await police('refill-first','refill','first','migration','ADMITTED','WITHIN_LIMITS',2);
 const second=await police('refill-second','refill','second','migration','ADMITTED','WITHIN_LIMITS',2);
 assert(second.clock.at>=first.clock.at+2,'Live refill not yet established');assert(first.cost+second.cost>p.instances.refill.policy.principal.burst);
 assert.equal(second.clock.principal_after,second.clock.at+2);p.live_refill_verified=true;
 for(const [name,i] of Object.entries(p.instances)){
  i.replay=await replay(i.address,i.policy,p.records.filter(r=>r.instance===name));i.source=await source(i.address);
  const history=await rpc('sim_getTransactionsForAddress',[i.address]),known=p.transactions.filter(t=>t.address===i.address);
  assert.deepEqual(history.map(t=>t.hash).sort(),known.map(t=>t.hash).sort());
  for(const t of history){const intent=known.find(x=>x.hash===t.hash);assert.equal(t.from_address.toLowerCase(),intent.signer.toLowerCase());assert.equal(BigInt(t.nonce),BigInt(intent.nonce_before));assert.equal(BigInt(t.value),0n);}
 }
 assert(await denied(p.instances.bounded.address,'get_decision',[accounts[0].address,'unsafe']));
 assert(await denied(p.instances.bounded.address,'get_decision',[accounts[0].address,'bad nonce']));
 assert(await denied(p.instances.bounded.address,'get_basis',['f'.repeat(64)]));
 assert(p.transactions.length===15&&p.records.length===10&&p.transactions.every(t=>t.verified&&t.hash&&!t.broadcast_unknown));
 p.contract_history_matched=true;p.final_readback_verified=true;save();console.log(JSON.stringify({complete:true,instances:p.instances,transactions:15,records:10}));
}catch(e){console.error('Workflow stopped at '+phase+' ('+(e instanceof assert.AssertionError?'assertion':'network/receipt check')+'); inspect journal before retry');process.exitCode=1;}

import assert from 'node:assert/strict';
import {abi} from 'genlayer-js';
const sha='a'.repeat(64),actor='0x'+'1'.repeat(40),coord='stoneforger10/semantic-arrival-policer/'+'b'.repeat(40)+'/examples/plain.txt';
for(const [method,args] of [['get_policy',[]],['police',['demo',coord,sha]],['get_decision',[actor,'demo']],['get_basis',[sha]],['get_meter',[actor]],['quote',[actor,sha]]]){
 const bytes=abi.calldata.encode(abi.calldata.makeCalldataObject(method,args,{}));assert.deepEqual(abi.calldata.encode(abi.calldata.decode(bytes)),bytes);
}console.log('6 SDK calldata roundtrips passed');

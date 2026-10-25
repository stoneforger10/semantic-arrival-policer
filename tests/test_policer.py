import ast
import copy
import hashlib
import itertools
import json
from pathlib import Path
import re
from datetime import datetime, timezone
from types import SimpleNamespace
import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'contracts/SemanticArrivalPolicer.py'
HELPERS = [x for x in ast.parse(SOURCE.read_text()).body if isinstance(x, (ast.Assign, ast.FunctionDef))]
CRITERIA = ['The notice requires a database schema migration.', 'The notice requires rotating authentication credentials.',
            'The notice announces a planned customer-facing service outage.']
ARGS = CRITERIA + [3600, 4, 3600, 3]
COORD = 'stoneforger10/semantic-arrival-policer/' + 'a'*40 + '/examples/'
LABELS = {'plain': ['NO','NO','NO'], 'migration': ['YES','NO','NO'], 'heavy': ['YES','YES','YES'],
          'uncertain': ['UNKNOWN','NO','NO']}


def namespace(gl=None):
    ns = dict(hashlib=hashlib, json=json, re=re, datetime=datetime, gl=gl)
    exec(compile(ast.Module(body=HELPERS, type_ignores=[]), str(SOURCE), 'exec'), ns)
    return ns


NS = namespace()


def address(value):
    return '0x' + bytes(value).hex()


def send(c, vm, actor, nonce, fixture='plain', bad=False, labels=None, alias=False):
    data = (ROOT / 'examples' / (fixture + '.txt')).read_bytes()
    vm.sender = actor
    vm.clear_mocks()
    vm.mock_web(r'.*raw\.githubusercontent\.com.*', {'response': {'status': 200, 'headers': {}, 'body': data}, 'method': 'GET'})
    vm.mock_llm('.*SEMANTIC_ARRIVAL_V1.*', json.dumps({'vector': labels if labels is not None else LABELS[fixture]}))
    sha = 'f'*64 if bad else hashlib.sha256(data).hexdigest()
    coord = COORD + ('alias.txt' if alias else fixture + '.txt')
    key = c.police(nonce, coord, sha)
    record = c.get_decision(address(actor), nonce)
    assert key == NS['digest']({k: record[k] for k in ('contract','actor','nonce')})
    assert record['root'] == NS['digest']({k: v for k,v in record.items() if k != 'root'})
    return record


def deploy(vm, factory):
    vm.warp('2026-10-24T00:00:00Z')
    return factory(str(SOURCE), *ARGS)


def warp(vm, when):
    # This pinned direct runner updates vm time but caches SDK message_raw.
    # Refresh the same native message field; production receives a fresh message per call.
    from genlayer import gl
    vm.warp(when)
    gl.message_raw['datetime'] = when


def test_live_clock_atomic_shared_and_principal_admission(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy)
    a = send(c, direct_vm, direct_alice, 'light')
    b = send(c, direct_vm, direct_alice, 'migration', 'migration')
    assert a['status'] == b['status'] == 'ADMITTED' and [a['cost'],b['cost']] == [1,2]
    g = c.get_meter(address(direct_alice))['global_tat']
    denied = send(c, direct_vm, direct_alice, 'personal-full')
    assert (denied['status'],denied['reason']) == ('DENIED','PRINCIPAL')
    assert c.get_meter(address(direct_alice))['global_tat'] == g
    peer = send(c, direct_vm, direct_bob, 'peer')
    assert peer['status'] == 'ADMITTED'
    blocked = send(c, direct_vm, direct_bob, 'shared-full', 'migration')
    assert (blocked['status'],blocked['reason']) == ('DENIED','GLOBAL')
    assert blocked['clock']['global_before'] == blocked['clock']['global_after']
    assert blocked['clock']['principal_before'] == blocked['clock']['principal_after']
    assert c.get_meter(address(direct_bob))['principal_tat'] != c.get_meter(address(direct_alice))['principal_tat']


def test_exact_retry_boundary_and_denials_do_not_push_the_clock(direct_vm, direct_deploy, direct_alice):
    c = deploy(direct_vm, direct_deploy)
    send(c, direct_vm, direct_alice, 'a', 'migration')
    r = send(c, direct_vm, direct_alice, 'denied', 'migration')
    assert r['status'] == 'DENIED' and r['reason'] == 'PRINCIPAL'
    retry = r['clock']['retry_at']
    warp(direct_vm, datetime.fromtimestamp(retry-1,timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))
    r2 = send(c, direct_vm, direct_alice, 'too-early', 'migration')
    assert r2['status'] == 'DENIED' and r2['clock']['retry_at'] == retry
    warp(direct_vm, datetime.fromtimestamp(retry,timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))
    assert send(c, direct_vm, direct_alice, 'at-boundary', 'migration')['status'] == 'ADMITTED'


def test_idle_refill_saturates_and_backward_time_cannot_mint_credit(direct_vm, direct_deploy, direct_alice):
    c = deploy(direct_vm, direct_deploy)
    r = send(c, direct_vm, direct_alice, 'a', 'migration')
    warp(direct_vm,'2026-10-25T00:00:00Z')
    later = send(c, direct_vm, direct_alice, 'later', 'migration')
    assert later['status'] == 'ADMITTED'
    assert later['clock']['principal_after'] == later['clock']['at'] + 7200
    warp(direct_vm,'2026-10-24T00:00:00Z')
    assert send(c, direct_vm, direct_alice, 'backwards')['status'] == 'DENIED'


@pytest.mark.parametrize('fixture,bad,status', [('heavy',False,'OVERSIZE'),('uncertain',False,'UNCERTAIN'),('plain',True,'HELD')])
def test_fail_closed_does_not_debit_any_clock(fixture,bad,status,direct_vm,direct_deploy,direct_alice):
    c = deploy(direct_vm, direct_deploy)
    r = send(c,direct_vm,direct_alice,'case',fixture,bad)
    assert r['status'] == status and r['clock']['retry_at'] == 0
    assert c.get_meter(address(direct_alice))['global_tat'] == 0
    assert c.get_meter(address(direct_alice))['principal_tat'] == 0
    if status == 'OVERSIZE':
        assert r['cost'] == 8 and c.get_basis(r['report']['spec']['source']['sha256'])['cost'] == 8
    else:
        with direct_vm.expect_revert('Unknown basis'):
            c.get_basis(r['report']['spec']['source']['sha256'])


def test_content_aliases_share_immutable_pin_and_drift_cannot_become_cheaper(direct_vm,direct_deploy,direct_alice,direct_bob):
    c = deploy(direct_vm,direct_deploy)
    original = send(c,direct_vm,direct_alice,'original','migration')
    sha = original['report']['spec']['source']['sha256']
    pin = c.get_basis(sha)
    drift = send(c,direct_vm,direct_bob,'drift','migration',labels=['NO','NO','NO'],alias=True)
    assert drift['status'] == 'DRIFT_HELD' and drift['basis_root'] == pin['root']
    assert drift['content_root'] == original['content_root']
    assert drift['clock']['global_after'] == original['clock']['global_after']
    assert c.get_meter(address(direct_bob))['principal_tat'] == 0
    assert c.get_basis(sha) == pin


def test_denied_first_encounter_still_pins_cost(direct_vm,direct_deploy,direct_alice):
    c = deploy(direct_vm,direct_deploy)
    send(c,direct_vm,direct_alice,'a','migration')
    send(c,direct_vm,direct_alice,'b')
    # A new content identity with the same known cost must be pinned even if denied.
    r = send(c,direct_vm,direct_alice,'new','heavy')
    assert r['status'] == 'OVERSIZE'
    assert c.get_basis(r['report']['spec']['source']['sha256'])['root'] == r['basis_root']


def test_native_principal_nonces_are_isolated(direct_vm,direct_deploy,direct_alice,direct_bob):
    c = deploy(direct_vm,direct_deploy)
    first = send(c,direct_vm,direct_alice,'same')
    with direct_vm.expect_revert('Nonce already used'):
        send(c,direct_vm,direct_alice,'same')
    second = send(c,direct_vm,direct_bob,'same')
    assert first['actor'] != second['actor']
    assert first['clock']['principal_before'] == second['clock']['principal_before'] == 0
    with direct_vm.expect_revert('Invalid actor address'):
        c.get_decision('not-an-address','same')


def test_quote_is_preview_only_and_never_consumes_or_refetches(direct_vm,direct_deploy,direct_alice):
    c = deploy(direct_vm,direct_deploy)
    r = send(c,direct_vm,direct_alice,'a')
    sha = r['report']['spec']['source']['sha256']
    before = c.get_meter(address(direct_alice))
    q = c.quote(address(direct_alice),sha)
    assert q['binding'] == 'PREVIEW_ONLY' and q['status'] == 'ADMITTED'
    assert c.get_meter(address(direct_alice)) == before
    assert c.get_decision(address(direct_alice),'a') == r


@pytest.mark.parametrize('labels', [['YES'], ['YES','NO','PASS'], [True,'NO','NO'], ['NO','NO',1], [], ['YES']*4])
def test_malformed_vectors_reject(labels):
    with pytest.raises(ValueError): NS['vector']({'vector':labels})


def test_json_duplicate_keys_and_fixed_weights():
    with pytest.raises(ValueError): NS['vector']('{"vector":[],"vector":[]}')
    for bits in itertools.product(['NO','YES'],repeat=3):
        assert NS['cost'](list(bits)) == 1 + sum((1<<i) for i,x in enumerate(bits) if x=='YES')
    with pytest.raises(ValueError): NS['cost'](['UNKNOWN','NO','NO'])


@pytest.mark.parametrize('args', [CRITERIA+[0,4,1,3],CRITERIA+[1,17,1,3],CRITERIA+[True,4,1,3],['same']*3+[1,4,1,3],[' x']+CRITERIA[1:]+[1,4,1,3]])
def test_configuration_bounds(args):
    with pytest.raises(ValueError): NS['configuration'](args[:3],*args[3:])


@pytest.mark.parametrize('coord', ['https://evil.invalid/x',COORD.replace('a'*40,'main')+'plain.txt',COORD+'../secret.txt',COORD+'plain.txt?x=1'])
def test_source_allowlist(coord):
    with pytest.raises(ValueError): NS['source_spec'](coord,'a'*64)


@pytest.mark.parametrize('nonce', ['', 'x'*49, 'bad nonce'])
def test_nonce_bounds(nonce,direct_vm,direct_deploy,direct_alice):
    c = deploy(direct_vm,direct_deploy)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert('Invalid nonce'): c.police(nonce,COORD+'plain.txt','a'*64)


def test_exhaustive_dual_bucket_equivalence_to_independent_credit_simulator():
    # 16 choices per event = 65,536 four-event traces. Oracle stores refilling
    # credits and last-update times, not theoretical arrival clocks.
    cfg = NS['configuration'](CRITERIA,5,4,7,3)
    events = list(itertools.product([0,1],[1,2,3,4],[0,3]))
    for trace in itertools.product(events,repeat=4):
        now,g,ps = 100,0,{0:0,1:0}
        credits={'g':20,0:21,1:21};last={'g':100,0:100,1:100}
        for actor,weight,delta in trace:
            now += delta
            for key,cap in [('g',20),(actor,21)]:
                credits[key] = min(cap,credits[key]+now-last[key]);last[key]=now
            expected = 'OVERSIZE' if weight>3 else ('ADMITTED' if credits['g']>=weight*5 and credits[actor]>=weight*7 else 'DENIED')
            result = NS['plan'](cfg,now,g,ps[actor],weight)
            assert result['status'] == expected
            if expected == 'ADMITTED':
                credits['g'] -= weight*5;credits[actor] -= weight*7
                g,ps[actor] = result['clock']['global_after'],result['clock']['principal_after']
            elif expected == 'DENIED':
                assert result['clock']['retry_at'] == now+max(0,weight*5-credits['g'],weight*7-credits[actor])
            assert 20-max(0,g-now) == credits['g']
            assert 21-max(0,ps[actor]-now) == credits[actor]


def test_real_validator_refetches_and_reasons_independently():
    data = (ROOT/'examples/migration.txt').read_bytes()
    cfg = NS['configuration'](CRITERIA,3600,4,3600,3)
    spec = dict(contract='x',actor='y',nonce='n',policy=NS['POLICY'],configuration=cfg,
                clock=dict(at=100,global_tat=0,principal_tat=0),source=NS['source_spec'](COORD+'migration.txt',hashlib.sha256(data).hexdigest()))
    calls={'web':0,'model':0}
    class Return:
        def __init__(self,value): self.calldata=value
    def web(url):
        calls['web']+=1
        return SimpleNamespace(status=200,body=data)
    def model(*a,**k):
        calls['model']+=1
        return {'vector':LABELS['migration']}
    def run(leader,validator):
        r=leader();assert validator(Return(r))
        wrong=copy.deepcopy(r);wrong['vector']=['NO','NO','NO']
        assert not validator(Return(wrong))  # Valid shape and lower cost, wrong substance.
        foreign=copy.deepcopy(r);foreign['spec']['actor']='other'
        assert not validator(Return(foreign)) and not validator(object())
        return r
    gl=SimpleNamespace(nondet=SimpleNamespace(web=SimpleNamespace(get=web),exec_prompt=model),
                       vm=SimpleNamespace(Return=Return,run_nondet_unsafe=run,UserError=ValueError))
    assert namespace(gl)['classify'](spec)['vector']==LABELS['migration']
    assert calls=={'web':3,'model':3}


@pytest.mark.parametrize('change',['body','hash','http','url'])
def test_source_integrity_fields(change):
    body='Explicit instructions.';sha=hashlib.sha256(body.encode()).hexdigest()
    source=NS['source_spec'](COORD+'plain.txt',sha)
    row=dict(url=source['url'],status='OK',http=200,body=body,hash=sha)
    row[change]={'body':'forged','hash':'f'*64,'http':True,'url':'https://evil.invalid/'}[change]
    with pytest.raises(ValueError): NS['source_ok'](source,row)


@pytest.mark.parametrize('body,http,status',[(b'',200,'SIZE_ERROR'),(b'x'*4097,200,'SIZE_ERROR'),(b'\xff',200,'ENCODING_ERROR'),(b'error',404,'HTTP_ERROR')])
def test_acquisition_failures(body,http,status):
    gl=SimpleNamespace(nondet=SimpleNamespace(web=SimpleNamespace(get=lambda _:SimpleNamespace(body=body,status=http))))
    ns=namespace(gl);source=ns['source_spec'](COORD+'plain.txt','a'*64)
    r=ns['fetch_source'](source);assert r['status']==status and not ns['source_ok'](source,r)


def test_post_consensus_context_guard_rejects_foreign_report():
    gl=SimpleNamespace(vm=SimpleNamespace(run_nondet_unsafe=lambda l,v:{'spec':{},'source':{},'vector':[]},UserError=ValueError))
    with pytest.raises(ValueError,match='LLM_ERROR'): namespace(gl)['classify']({'contract':'real'})


def test_malformed_model_does_not_pin_debit_or_spend_nonce(direct_vm,direct_deploy,direct_alice):
    c=deploy(direct_vm,direct_deploy);direct_vm.sender=direct_alice
    data=(ROOT/'examples/plain.txt').read_bytes();sha=hashlib.sha256(data).hexdigest()
    direct_vm.mock_web(r'.*raw\.githubusercontent\.com.*',{'response':{'status':200,'headers':{},'body':data},'method':'GET'})
    direct_vm.mock_llm('.*SEMANTIC_ARRIVAL_V1.*',json.dumps({'vector':['NO']}))
    with direct_vm.expect_revert('LLM_ERROR'):c.police('retry',COORD+'plain.txt',sha)
    assert c.get_meter(address(direct_alice))['global_tat']==0
    with direct_vm.expect_revert('Unknown decision'):c.get_decision(address(direct_alice),'retry')
    with direct_vm.expect_revert('Unknown basis'):c.get_basis(sha)
    assert send(c,direct_vm,direct_alice,'retry')['status']=='ADMITTED'


def test_global_only_oversize_and_unavailable_network():
    cfg=NS['configuration'](CRITERIA,1,1,1,3)
    assert NS['plan'](cfg,100,0,0,2)['reason']=='GLOBAL'
    def unavailable(_):raise OSError('network unavailable')
    ns=namespace(SimpleNamespace(nondet=SimpleNamespace(web=SimpleNamespace(get=unavailable))))
    source=ns['source_spec'](COORD+'plain.txt','a'*64)
    r=ns['fetch_source'](source);assert r['status']=='UNAVAILABLE' and not ns['source_ok'](source,r)


def test_denial_history_does_not_permanently_disable_a_principal(direct_vm,direct_deploy,direct_alice):
    c=deploy(direct_vm,direct_deploy)
    for i in range(70):
        r=send(c,direct_vm,direct_alice,'attempt-'+str(i))
        assert r['status']==('ADMITTED' if i<3 else 'DENIED')
    warp(direct_vm,'2026-10-25T00:00:00Z')
    assert send(c,direct_vm,direct_alice,'recovered')['status']=='ADMITTED'

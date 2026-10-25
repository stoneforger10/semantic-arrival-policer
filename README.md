# SemanticArrivalPolicer

An experimental GenLayer **weighted, dual-rate admission policer**. Independently fetched and interpreted prose determines request weight; two persistent virtual arrival clocks atomically govern admission. One global clock limits aggregate intake; one native-sender clock limits that principal. There is no mutable graph, owner-controlled transition, certificate, consumption API, token custody or payment.

This is an admission rule over **authored documents**, not verification of actual work, resource usage, service delivery, sensor readings or agent alignment. Hashes bind bytes, not truth. Logical admission units are not money and are not measured CPU cost. Demo notices are fictional.

## Why GenLayer matters

The immutable constructor defines three natural-language predicates. For every `police` call, the leader and validators independently fetch the complete commit-pinned source, verify HTTP/UTF-8/size/SHA-256, and independently classify every predicate as YES / NO / UNKNOWN. They compare the entire normalized report exactly, including native principal, nonce, policy, before-clocks, native time, acquired body, status, hash and vector. A valid JSON shape or public hash cannot establish a label.

Only three definite decisions produce a weight: `1 + 1*YES[0] + 2*YES[1] + 4*YES[2]`, an integer from one to eight. That consequential semantic output determines whether the request fits both clocks and how far each advances. Malformed model output or disagreement writes nothing. Source failure is HELD; any UNKNOWN is UNCERTAIN; neither debits a clock.

Each exact content hash is pinned to its first definite consensus vector, even if that request is denied or oversized. A later call **still re-fetches and reclassifies**. A different definite vector yields DRIFT_HELD, not a cheaper request or pin overwrite. Identical bytes at another source URL share the pin, scoped to this contract and policy. New bytes remain a new content identity; no paraphrase-level identity guarantee exists.

## The admission kernel

For a bucket with unit interval `period`, burst `B`, stored theoretical-arrival time `TAT`, request weight `c`, and native time `t`:

```text
proposed_TAT = max(TAT, t) + c*period
eligible     = c <= B AND proposed_TAT <= t + B*period
earliest     = max(t, TAT - (B-c)*period)       # when c <= B
```

Apply this to both global and principal buckets. ADMITTED advances **both** clocks. DENIED advances **neither**, with reason GLOBAL / PRINCIPAL / BOTH and a snapshot retry time. OVERSIZE means weight exceeds at least one burst; its `retry_at=0` is **not** a finite recovery promise. Idle time replenishes capacity automatically; saturation never banks more than the configured burst. A quote is a non-binding preview, not a reservation or authorization.

This is established weighted GCRA/token-bucket mathematics, not an invention. The contribution is its independently acquired semantic metering boundary, immutable content-weight pinning and auditable two-level atomic admission on GenLayer.

## Architecture comparison

| Previous mechanism | Structural distinction |
| --- | --- |
| Owner-controlled graph variants | No nodes, edges, parent versions, proposal resolution, head advancement, owner or freeze/finalize lifecycle. |
| TemporalPossibilityAtlas / DimensionalTermKernel | Not an immutable solver artifact. Every attempt changes or preserves shared, time-replenished runtime debt affecting other addresses and future requests. No interval-model or quantity-algebra query engine. |
| SourceTariffVM | No source-to-opcode compilation, price schedule, duration quote, USD amount or reusable executable tariff. |
| MeaningCache2Q | No residents, hit promotion, replacement queues or eviction; content pins never confer admission without a new semantic evaluation. |
| SemanticFanoutBuffer | No subscribers, physical slots, outstanding delivery obligations, ACKs or returned credits. Recovery derives from native time, not recipient cooperation. |
| SemanticWorkQueue | No FIFO, workers, lease acquisition, redelivery or dead-letter processing. |
| SourceBoundBookingClock | No calendar installation, occupancy bitmap, reservation interval or cancellation. |

Shared transport, evidence-integrity and native-signing helpers are intentionally reused. No global-novelty or steward-acceptance guarantee is made. This project is **one representative mechanism**, not parallel domain submissions. Two live configurations exercise exactly the same contract source: a long-period denial scenario and a short-period refill scenario.

## State and API

- Constructor: three distinct 1–240-byte predicates; global/per-principal periods 1–3600 seconds; bursts 1–16. Weights `[1,2,4]` and base one are fixed. Configuration is immutable; there is no admin setter or pause.
- State: `global_tat`, `principal_tats`, immutable content `bases`, immutable native-sender/nonce `decisions`, and immutable `policy_data`.
- `police(nonce, coordinate, expected_sha)` is the only public write. Nonces are 1–48 ASCII identifier characters. It accepts **no caller-supplied label, cost, outcome, actor, clock or summary**.
- Source coordinates are `OWNER/REPO/FULL_40_HEX_COMMIT/PATH.txt`. Only contract-constructed raw GitHub HTTPS URLs; no mutable branches, arbitrary hosts, queries or path traversal. Complete bodies must be 1–4096 bytes, strictly decoded and never truncated.
- `get_policy()`, `get_meter(actor)`, `get_basis(sha256)`, `get_decision(actor,nonce)` and `quote(actor,sha256)` are views. Meter debt is measured in seconds, not currency. Quote output is explicitly PREVIEW_ONLY.
- Every completed request has a root binding the exact native principal, nonce, source report, content pin, semantic cost, decision and before/after clocks. Duplicate nonces reject before acquisition. Different native senders have separate nonce spaces and principal clocks, but always share the global clock.
- Definite classifications pin even on DENIED/OVERSIZE. UNCERTAIN/HELD do not invent a pin; DRIFT_HELD preserves the existing one. Rejected admissions are auditable successful executions, not failed transactions. Invalid input/replay attempts revert and create no decision.
- No lifetime attempt cap silently disables a principal after repeated denials. Logical quota recovers with native time. Historical decisions and content pins grow without bound; per-call work does not scan history.

## Safety and liveness boundaries

The returned retry time is exact **for that state snapshot**, assuming no intervening admitted requests and the same determinate cost. Other admitted traffic may move the shared clock; a quote does not promise future capacity. A source outage, UNKNOWN, semantic drift or validator disagreement can still block admission after time has replenished quota. OVERSIZE cannot recover through time alone. No funds become locked.

This is not Sybil resistance, authentication of humans, fair scheduling, network DDoS prevention or a bound on inference cost. Anyone can consume aggregate capacity under the public policy. DENIED/HELD calls still require acquisition/consensus and may append history; the policer does not prevent transaction storage or model workload. Integrators must define their own participation and resource limits.

An ADMITTED record only records admission at that native transaction time. It is not a one-time capability for later execution and does not prove downstream processing occurred. Consumers must not turn old records or read-only previews into fresh permits. No backend execution, delivery or external asset transfer is represented.

Content publishers can lie; the policer meters the document itself, not the real cost of the work it describes. Exact model agreement can still be wrong. Hash aliases share pins, but semantically equivalent changed bytes do not. Github availability, model behavior and hosted Studio operations remain dependencies. Large source responses are rejected after acquisition; this does not bound upstream download cost. Experimental, unaudited; not production-readiness assurance.

## Validation

```powershell
genvm-lint check contracts/SemanticArrivalPolicer.py --json
python -m pytest tests -q
npm ci --ignore-scripts
node --test tests/meter.test.mjs
node scripts/sdk-check.mjs
```

43 Python direct/helper/callback tests, 3 independent JavaScript tests and 6 SDK calldata roundtrips. Includes all 65,536 four-event traces (262,144 requests) against a separate refilling-credit simulator, exact retry boundaries, idle saturation, distinct periods, atomic refusal, sender isolation, nonce replay, more than 64 requests followed by recovery, content alias drift, failed acquisition and genuine validator callback execution against a well-shaped cheaper forged answer.

Direct tests are not distributed consensus. The Windows fixture narrowly defers only the direct runner's open-message-file WinError 32 cleanup. Time-warp tests refresh its cached `gl.message_raw['datetime']` after updating VM time; production receives a fresh native message per transaction. Neither workaround changes the contract or suppresses VM execution errors.

## Deploy and reproduce

Use only gasless StudioNet (chain 61999), no value transfer and dedicated unlocked encrypted CLI test accounts. The live runner uses `studio-proof-deployer` and `fairresolve-demo`. It never exports keys or passwords and configures account/network only inside child processes. A separately installed GenLayer CLI 0.39.2 is required; for a fresh checkout, set `SAP_CLI_PATH` to its absolute `genlayer/dist/index.js` path. The workspace fallback in `run-cli.cjs` is optional, not a required sibling checkout.

Publish fixtures first, then:

```powershell
$env:SAP_NATIVE_HTTP='1' # Windows HTTPS fallback, not a credential
node --require ./scripts/native-http.cjs scripts/complete-proofs.mjs FULL_FIXTURE_COMMIT
node --require ./scripts/native-http.cjs scripts/verify-live.mjs
node scripts/render-proofs.mjs
```

The runner journals intent and signer nonce before sending, captures hashes immediately, and checks known hashes rather than rebroadcasting. An unknown broadcast outcome stops for an explicit history audit. Every proof must have FINALIZED execution plus MAJORITY_AGREE, non-leader-only voting and explicit agree votes. Expected ERROR receipts remain rejections, not business successes. The independent verifier reconstructs every clock transition using a separate credit-space oracle, checks content pins and complete roots, both deployed sources, native sender/nonces, zero values and exact contract histories. Readbacks are not extra transactions. No simulated outcome is labeled live proof.

Live StudioNet deployments of the same source: [bounded-limit configuration](https://explorer-studio.genlayer.com/address/0x325eD32798766120aE5d6385bc8f284923b90388) and [short-period refill configuration](https://explorer-studio.genlayer.com/address/0xED5D4ea22aA0F00894187088b2E3AF8b18041A57). See [the proof matrix](LIVE_PROOFS.md), [full journal](PROOFS.json) and [submission text](SUBMISSION.md). Fifteen finalized transactions comprise twelve successful executions and three expected execution errors. The ten completed policing decisions demonstrate five admissions, two rate denials, oversize, uncertainty and hash-mismatch holding. The live refill requests were 63 native seconds apart and had combined weight four against a personal burst of three. Both deployed sources match this repository. These are two test configurations of one mechanism, not two separate submissions.

See [security](SECURITY.md), [architecture](docs/architecture.md) and the [official nondeterminism boundary](https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism).

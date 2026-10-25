# Contract boundary and invariants

Public document identity → per-node full fetch → independent three-predicate interpretation → exact report agreement → immutable content-weight consistency guard → dual GCRA admission → atomic virtual-clock changes and immutable request record.

UI/backend owns presentation, indexing, authenticated participation if required and downstream processing. The contract owns document acquisition, classification consensus, immutable metering basis, native-clock quota enforcement and audit records. The publisher owns the text, not authoritative facts. No backend outcome or measured physical/compute usage is certified.

## Equivalent credit model

For a bucket of burst B and period P, define integer credit ticks at native time t as `B*P - max(0,TAT-t)`. A weight c request requires c*P ticks. Time refills one tick per second, saturating at B*P. Accepting decreases credit by c*P; translating back gives `TAT'=max(TAT,t)+c*P`. The gate `TAT'<=t+B*P` is exactly sufficient credit. When c<=B, deficit ticks equal seconds until eligibility. A denied request changes neither TAT, so polling denials does not postpone recovery.

Both independent bucket gates must pass before either stored clock changes. Their earliest admissible times combine with max, not min. A new principal starts with a full personal burst but cannot reset the shared clock. Native time—not a caller timestamp or source date—governs refill. Clocks store debt, not spendable assets. The tests use an independent balance/last-update model across 65,536 traces; the live verifier uses a separately implemented JavaScript credit-space oracle.

## Consequential AI boundary

Three semantic bits select costs one through eight. An incorrect NO in place of YES can turn a denied request into an admitted one and changes future global/principal debt. A validator must independently read and interpret the source, not validate an enum or hash. Callback tests execute this path with a well-shaped cheaper forged vector and reject it after new web/model calls.

All predicate decisions must be definite. UNKNOWN never contributes a zero-cost assumption. Malformed model output is an error, never a fabricated UNKNOWN. The complete report binds the contract policy, immediate native sender, nonce, native time, before-clocks, source URL/body/status/hash and entire vector. There is no tolerance or confidence threshold.

The first definite classification pins the exact content SHA to a vector, even when rate-denied or permanently oversized. Subsequent attempts always acquire and evaluate again. Matching labels use the pin; changed labels produce DRIFT_HELD without debit or overwrite. This prevents cheaper resampling of identical bytes across URL aliases, not manipulation by rewriting the document. Unknown or missing-source attempts do not create a pin. Each contract's immutable policy scopes its own pins and clocks.

## State transitions

There is one write, police, not an owner proposal lifecycle. It always creates an immutable completed decision unless invalid input, replay, malformed model or consensus failure aborts execution. ADMITTED alone advances both clocks. DENIED, OVERSIZE, HELD, UNCERTAIN and DRIFT_HELD preserve both clocks. Definite vectors may create the separate immutable pin on ADMITTED, DENIED or OVERSIZE. No owner can replace it. Duplicate nonces create nothing; distinct nonces allow later retry. Views cannot reserve or consume anything.

## Reviewer question

Could a reviewer say this only verifies caller-supplied information? No caller classification, outcome, clock or cost is accepted; every admission attempt acquires and independently interprets the complete source. However, a caller may publish that source. Therefore the claim is explicitly about the authored document under an immutable metering rule, not actual service delivery, agent alignment, truthful notices or actual resource expense. Hashes establish integrity only. These limits are not hidden behind a renamed certification mechanism.

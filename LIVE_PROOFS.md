# Live proof matrix

Gasless StudioNet, chain 61999. One mechanism in two configurations of identical source; no value transfer. Experimental, not production assurance.

- bounded: [0x325eD32798766120aE5d6385bc8f284923b90388](https://explorer-studio.genlayer.com/address/0x325eD32798766120aE5d6385bc8f284923b90388); periods 3600/3600s, bursts 4/3. Source SHA-256: `8115fa3b1f1b950e95ead0d00d3ecabdf1e28420fda0a3f16f2f769c3d8ab5a5`.
- refill: [0xED5D4ea22aA0F00894187088b2E3AF8b18041A57](https://explorer-studio.genlayer.com/address/0xED5D4ea22aA0F00894187088b2E3AF8b18041A57); periods 1/1s, bursts 4/3. Source SHA-256: `8115fa3b1f1b950e95ead0d00d3ecabdf1e28420fda0a3f16f2f769c3d8ab5a5`.

Fixture commit: `46d754afb27a7ba2a3af853e18f1dc4dc47ec3cf`. [Machine-readable ledger](PROOFS.json).

| Case | Execution | Consensus | Proof |
| --- | --- | --- | --- |
| deploy-bounded | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x78b46fd0158d66162c346b87cbcf4a8513e98654754e6df36bfeec4110643947) |
| light | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x440b2da9d5c07bf6b2d78eca8402b679af6b73333231d7dd0cc311a4b9c35fd0) |
| migration | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x65ce66759a9c6d9422b68a08037209b53e46efd6549a704ff17b8864e9c98871) |
| principal-limit | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x9b65409439269ce9b1028abbc04ea4010b57d597c276d0b36f0cb32b0557da07) |
| peer-admission | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0xd4a827da6de98ce3055f1a70467c64d4253a5f7c2d78931daf3151d06d1afb57) |
| shared-limit | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x4fa766d6015667ea1fc1978d7eec6e823c2a425b5d4a9a2465d98a1fdd8ec24c) |
| oversize | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x5f539557074dde75cbe42fb00d7ca88cc0395e52d28e7d34fcef8bec149033f1) |
| uncertain | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0xb7f96a83d60d68223c46902ac70d3b6c9aaaaa26c03d2d36506d823961895d1b) |
| hash-mismatch | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x3e8f31b039ea5a26bbfa1207a093a9e1c75c11ff30fad98c2f88f57678acedb3) |
| nonce-replay | ERROR — expected Nonce already used | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0xd0c71c7b9b429e5c8d07e322663863f3beff619918ea0da0fe803fbd78f1faf5) |
| unsafe-url | ERROR — expected Invalid source | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x19dbbad6ea86346830c7a0fdc0c793d509aac74cdfad050a77fae384ac086c01) |
| invalid-nonce | ERROR — expected Invalid nonce | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x88d6e8472a576499dd6405cb20a055e1cfd9a6be0c024ad684a3ccb15086180d) |
| deploy-refill | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x509e1bb71e51648672163efe14f2862bcf6f0c0a3d9cba14a3b0f3cf679ba19c) |
| refill-first | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x11044a5d83bd7195cd6b1480ef998ded115bc50ea9251a393f6f76c55c1fc9a2) |
| refill-second | SUCCESS | MAJORITY_AGREE | [receipt](https://explorer-studio.genlayer.com/tx/0x23693c7b05ca68f76b1c8992cfd3f413cdb50d41d152e3618e14ff57f4b7e477) |

Twelve successful executions include two deployments and ten policing decisions. Three expected ERROR transactions are rejection evidence, not business successes. Each receipt records five or more initial validators and explicit agree votes; MAJORITY_AGREE is not claimed as unanimity.

## Reconstructed decisions

| Case | Instance | Status / reason | Cost | Native time | Global TAT before → after | Principal TAT before → after | Retry at |
| --- | --- | --- | --- | --- | --- | --- | --- |
| light | bounded | ADMITTED / WITHIN_LIMITS | 1 | 1792911607 | 0 → 1792915207 | 0 → 1792915207 | 1792911607 |
| migration | bounded | ADMITTED / WITHIN_LIMITS | 2 | 1792911668 | 1792915207 → 1792922407 | 1792915207 → 1792922407 | 1792911668 |
| principal-limit | bounded | DENIED / PRINCIPAL | 1 | 1792911730 | 1792922407 → 1792922407 | 1792922407 → 1792922407 | 1792915207 |
| peer-admission | bounded | ADMITTED / WITHIN_LIMITS | 1 | 1792911788 | 1792922407 → 1792926007 | 0 → 1792915388 | 1792911788 |
| shared-limit | bounded | DENIED / GLOBAL | 2 | 1792911849 | 1792926007 → 1792926007 | 1792915388 → 1792915388 | 1792918807 |
| oversize | bounded | OVERSIZE / GLOBAL_AND_PRINCIPAL | 8 | 1792911916 | 1792926007 → 1792926007 | 1792922407 → 1792922407 | 0 |
| uncertain | bounded | UNCERTAIN / UNRESOLVED_PREDICATE | 0 | 1792911983 | 1792926007 → 1792926007 | 1792922407 → 1792922407 | 0 |
| hash-mismatch | bounded | HELD / HASH_MISMATCH | 0 | 1792912042 | 1792926007 → 1792926007 | 1792922407 → 1792922407 | 0 |
| refill-first | refill | ADMITTED / WITHIN_LIMITS | 2 | 1792912337 | 0 → 1792912339 | 0 → 1792912339 | 1792912337 |
| refill-second | refill | ADMITTED / WITHIN_LIMITS | 2 | 1792912400 | 1792912339 → 1792912402 | 1792912339 → 1792912402 | 1792912400 |

Times are native UTC epoch seconds. Retry_at=0 on OVERSIZE/HELD/UNCERTAIN is not an immediate retry promise. Denied clocks remain unchanged. The short-period configuration admitted two weight-two requests whose combined weight exceeds the principal burst of three; native elapsed time and the second clock reset establish live refill, not a mocked clock.

## Verification scope

The separate read-only verifier checked all 15 receipts, native signers/nonces and zero value, both deployed source bodies, immutable policies, all ten decision roots/evidence reports, global and per-sender clocks, content pins, previews, absence of failed request records and exact contract histories. A separately implemented JavaScript credit-space oracle reconstructs every transition; it does not import the contract kernel. There are two dedicated test signers, not a claim of two distinct humans. Readbacks are not extra transactions.

43 Python direct/helper/callback tests, 3 JavaScript tests, 6 SDK roundtrips, GenVM lint and SDK validation passed. The local credit simulator covers 65,536 four-request traces. Local tests exercise malformed output, cheaper forged validator reports, alias drift and more than 64 requests followed by recovery. Live semantic disagreement or DRIFT_HELD was not induced; those are local tests only.

Demo notices are fictional. The mechanism meters authored documents under its fixed rule; neither hashes nor consensus prove actual work, truthful notices, real resource expense or delivery. No global-novelty, audited-production or acceptance guarantee.

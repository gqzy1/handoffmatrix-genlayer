# HandoffMatrix

HandoffMatrix gives operations teams a wallet-bound handoff record. It checks whether a note describes what to do, how to verify the result, and how to roll back. The designated recipient can acknowledge the reviewed revision.

[Stable Studionet deployment](https://explorer-studio.genlayer.com/address/0x39Cf0ae4Ee56C9C7E1d5456462528952Ab58Fb66) · [Finalized transaction evidence](evidence/studionet-v2.json)

## Protocol

1. The operator calls `create(ticket, recipient)` to bind a distinct recipient wallet. The task starts at `NEEDS_WORK`, version 0.
2. The operator calls `evaluate(ticket, revision, note)` with the next consecutive revision. The leader extracts verbatim evidence for the action and target, an observable verification with an expected result, and a rollback action and target.
3. Validators extract independently from the same note. They compare the missing-field decisions and the evidence spans. A quote must appear in the note and one span must contain the other. Inconsistent evidence is rejected. A complete matrix advances the task to `READY` and freezes the reviewed revision.
4. The recipient calls `acknowledge(operator, ticket, expected_revision)` to acknowledge the exact ready revision. That moves the task to `ACKNOWLEDGED`. Early, unauthorized, stale and repeat acknowledgements are rejected. Historical revisions remain immutable.

Use `task(operator, ticket)` to read the recipient, latest version and current status. Use `revision(operator, ticket, number)` for the immutable note, evidence and assessment from that revision. Missing records return an empty string. [Exact SDK calls](scenario.mjs)

## Meaning and limits

`READY` means the three documentation requirements were found by consensus. `ACKNOWLEDGED` records acknowledgement by the designated wallet. Operational execution and safety must be checked outside the contract. Notes and excerpts are public. Consensus can disagree, and a model can misinterpret ambiguous or adversarial prose. The validator checks independent semantic agreement and verbatim spans, while the acknowledgement is a deterministic wallet authorization. Tickets permit up to 20 revisions and have no recipient reassignment or reopen path.

## Reproduce

```sh
npm ci
npm test
python3 -m pip install -r requirements-lint.txt
genvm-lint check contracts/handoffmatrix.py --json
sha256sum -c evidence/source-v2.sha256
npm run verify
```

Verification targets Stable Studionet 61999. It checks byte-for-byte source parity, finalized receipts and signers, expected rejections, immutable revisions and the current acknowledged state. Intermediate task states are snapshots from the original run. [Official lint output](evidence/genvm-lint-v2.json)

To record a fresh run, use a clean checkout without the published v2 evidence file and run `node run.mjs --write /tmp/your-test.keys.json`. The runner generates two independent test wallets. Keep that checkpoint private and outside the repository.

## Deployment history

The [original contract](https://explorer-studio.genlayer.com/address/0x1A4e879B6a97D51937403f0c460e6156D58A7e20) stopped at document readiness. Its source and verifier are available at [the pinned first release](https://github.com/gqzy1/handoffmatrix-genlayer/tree/19e20d8e2a83304b2391b94d5779f22dd14f50d1). [Original receipts and evidence](evidence/studionet.json)

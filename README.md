# HandoffMatrix

[Stable Studionet contract](https://explorer-studio.genlayer.com/address/0x1A4e879B6a97D51937403f0c460e6156D58A7e20)

A revision ledger for operations teams that need handoffs to state what to do, how to confirm it worked, and how to roll back. It turns a textual note into a three-column evidence matrix and gives the next operator a stable record to inspect.

## Protocol

1. The submitting wallet calls `evaluate(ticket, 1, note)`. The leader supplies verbatim evidence for an action and target, an observable verification with an expected result, and a rollback action and target.
2. A validator independently extracts evidence from the identical note. It checks agreement on missing fields and requires each proposed quote to match the same evidence span by containment. Differences in quote boundaries can pass, while a conflicting span or missing classification is rejected. This is an application equivalence rule over meaning-bearing evidence, with deterministic storage.
3. The contract records `NEEDS_WORK` and names each missing field, or records `READY` and closes the ticket to revisions. A correction must follow the previous revision, which remains immutable. `revision(operator, ticket, number)` returns JSON or an empty string.

Use fictional or publishable notes. Notes and excerpts are public. READY describes documented coverage, and the record does not establish that the work occurred or that the operations are appropriate for a particular environment.

## Example

The Studionet scenario submits a label-printer change with neither a verification procedure nor rollback, rejects a skipped revision, and then accepts a correction with both. See [scenario.mjs](scenario.mjs) for exact SDK calls.

## Reproduce

```sh
npm ci
npm test
python3 -m pip install -r requirements-lint.txt
genvm-lint check contracts/handoffmatrix.py --json
sha256sum -c evidence/source.sha256
npm run verify
```

The verifier targets Stable Studionet 61999 only. It checks source parity, transaction finality and execution, expected rejections, and latest-final readbacks. [Official lint output](evidence/genvm-lint.json) · [Studionet evidence](evidence/studionet.json)

To record a fresh run, run `node run.mjs --write /tmp/your-test.keys.json` from a clean checkout without the published Studionet evidence file. Use a dedicated test signer. The checkpoint is private and must stay outside the repository.

import assert from 'node:assert/strict';

export const sourceFile = 'contracts/handoffmatrix.py';
export async function exercise({ signer, call, read }) {
  const ticket = 'label-printer';
  const initial = 'Switch the packing station label printer to Printer B.';
  const complete = initial + ' Print a test label and verify that its barcode scans as TEST-001. To roll back, switch the packing station label printer back to Printer A.';
  await call('first_revision', 'evaluate', [ticket, 1, initial]);
  const first = await read('revision_one', 'revision', [signer, ticket, 1]);
  assert.equal(first.status, 'NEEDS_WORK');
  assert.deepEqual(first.missing, ['verification', 'rollback']);
  await call('skip_revision', 'evaluate', [ticket, 3, complete], 'NO_OPEN_REVISION');
  await call('corrected_revision', 'evaluate', [ticket, 2, complete]);
  const second = await read('revision_two', 'revision', [signer, ticket, 2]);
  assert.equal(second.status, 'READY');
  assert.deepEqual(second.missing, []);
  for (const quote of Object.values(second.evidence)) assert.ok(quote && complete.includes(quote));
  await call('duplicate', 'evaluate', [ticket, 2, complete], 'REVISION_EXISTS');
  assert.equal(await read('no_revision_three', 'revision', [signer, ticket, 3]), null);
}

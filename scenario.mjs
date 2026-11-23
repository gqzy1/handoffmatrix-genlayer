import assert from 'node:assert/strict';

export const sourceFile = 'contracts/handoffmatrix.py';
export async function exercise({ operator, recipient, call, read }) {
  const ticket = 'label-printer';
  const taskKey = [operator, ticket];
  const initial = 'Switch the packing station label printer to Printer B.';
  const complete = initial + ' Print a test label and verify that its barcode scans as TEST-001. To roll back, switch the packing station label printer back to Printer A.';
  const first = [ticket, 1, initial];
  const second = [ticket, 2, complete];
  async function checkTask(label, version, status) {
    assert.deepEqual(await read(label, 'task', taskKey, status !== 'ACKNOWLEDGED'), { recipient: recipient.toLowerCase(), version, status });
  }

  await call('create', 'create', [ticket, recipient]);
  await call('first_revision', 'evaluate', first);
  const history = await read('revision_one', 'revision', [...taskKey, 1]);
  assert.equal(history.status, 'NEEDS_WORK');
  assert.deepEqual(history.missing, ['verification', 'rollback']);
  await checkTask('needs_work', 1, 'NEEDS_WORK');
  await call('early_ack', 'acknowledge', [...taskKey, 1], 'NOT_READY', 'recipient');
  await call('skip_revision', 'evaluate', [ticket, 3, complete], 'INVALID_SEQUENCE');
  await call('overwrite', 'evaluate', [ticket, 1, complete], 'REVISION_EXISTS');
  await call('corrected_revision', 'evaluate', second);
  const ready = await read('revision_two', 'revision', [...taskKey, 2]);
  assert.equal(ready.status, 'READY');
  assert.deepEqual(ready.missing, []);
  for (const quote of Object.values(ready.evidence)) assert.ok(quote && complete.includes(quote));
  await checkTask('ready', 2, 'READY');
  await call('unauthorized_ack', 'acknowledge', [...taskKey, 2], 'NOT_RECIPIENT');
  await call('acknowledge', 'acknowledge', [...taskKey, 2], null, 'recipient');
  await call('duplicate_ack', 'acknowledge', [...taskKey, 2], 'ALREADY_ACKNOWLEDGED', 'recipient');
  await call('modify_closed', 'evaluate', [ticket, 3, complete], 'NO_OPEN_REVISION');
  await checkTask('acknowledged', 2, 'ACKNOWLEDGED');
  assert.deepEqual(await read('retained_revision_one', 'revision', [...taskKey, 1]), history);
  assert.deepEqual(await read('retained_revision_two', 'revision', [...taskKey, 2]), ready);
  assert.equal(await read('no_revision_three', 'revision', [...taskKey, 3]), null);
}

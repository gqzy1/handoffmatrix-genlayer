import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createAccount, createClient, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { sourceFile, exercise } from './scenario.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const chain = { ...studionet, rpcUrls: { default: { http: ['https://studio.genlayer.com/api'] } } };
const reader = createClient({ chain });
const source = fs.readFileSync(sourceFile, 'utf8');
const file = 'evidence/studionet.json';
const write = process.argv[2] === '--write';
const keyFile = process.argv[3];
const digest = sha256(source);
const log = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) :
  { chainId: 61999, rpc: chain.rpcUrls.default.http[0], sourceSha256: digest, transactions: {}, state: {} };
assert.equal(log.sourceSha256, digest);
assert.equal(await reader.getChainId(), 61999);
const save = () => fs.writeFileSync(file, JSON.stringify(log, null, 2) + '\n');
let client;
if (write) {
  assert.ok(keyFile && keyFile.startsWith('/tmp/') && keyFile.endsWith('.keys.json'), 'use an absolute /tmp/*.keys.json checkpoint');
  if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, generatePrivateKey(), { mode: 0o600, flag: 'wx' });
  const account = createAccount(fs.readFileSync(keyFile, 'utf8'));
  client = createClient({ chain, account });
  log.signer ??= account.address;
  assert.equal(log.signer, account.address);
}
async function transaction(label, expectedError, send) {
  let entry = log.transactions[label];
  if (!entry) {
    assert.ok(write, 'missing transaction ' + label);
    entry = log.transactions[label] = { hash: await send() };
    save();
    console.log(label, entry.hash);
  }
  const tx = await reader.waitForTransactionReceipt({
    hash: entry.hash, status: 'FINALIZED', interval: 4500, retries: 120, fullTransaction: true,
  });
  let leader = tx.consensus_data?.leader_receipt;
  if (Array.isArray(leader)) leader = leader.find((row) => row.mode === 'leader');
  assert.ok([7, 'FINALIZED'].includes(tx.status));
  assert.ok([6, 'MAJORITY_AGREE'].includes(tx.result));
  const payload = JSON.stringify(leader) + (typeof leader?.result?.raw === 'string' ? Buffer.from(leader.result.raw, 'base64').toString() : '');
  assert.equal(leader?.execution_result, expectedError ? 'ERROR' : 'SUCCESS', payload.slice(-500));
  if (expectedError) assert.ok(payload.includes(expectedError), payload.slice(-500));
  const result = { status: 'FINALIZED', consensus: 'MAJORITY_AGREE', execution: leader.execution_result, expectedError };
  if (write) {
    entry.receipt = result;
    save();
  } else assert.deepEqual(entry.receipt, result);
  console.log(label, result.execution, expectedError ?? '');
  return tx;
}

const deployment = await transaction('deploy', null, () => client.deployContract({ code: source, args: [], value: 0n, leaderOnly: false }));
const address = deployment.data?.contract_address ?? deployment.contract_address;
assert.ok(/^0x[0-9a-f]{40}$/i.test(address));
if (write) { log.address = address; save(); }
else assert.equal(log.address, address);
assert.equal(await reader.getContractCode(address), source);
const call = (label, method, args, error = null) => transaction(label, error, async () => {
  await delay(3500);
  return client.writeContract({ address, functionName: method, args, value: 0n, leaderOnly: false });
});
async function read(label, functionName, args) {
  const raw = await reader.readContract({ address, functionName, args, transactionHashVariant: 'latest-final' });
  const value = raw ? JSON.parse(raw) : null;
  if (write) { log.state[label] = value; save(); }
  else assert.deepEqual(log.state[label], value);
  return value;
}
await exercise({ signer: log.signer, call, read });
console.log('Verified source parity, finalized receipts and finalized readbacks for', address);

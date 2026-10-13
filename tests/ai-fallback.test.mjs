import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { runChain, extractJSON, nextPacificMidnight } from '../src/lib/ai/provider.ts';

const err = (status, message) => Object.assign(new Error(message), { status });
// Fake model: fails with the queued error for ids in `bad`, else returns its id.
const caller = (bad) => async (id) => {
  if (bad[id]) throw bad[id];
  return id;
};

describe('AI model fallback chain', () => {
  it('(a) per-day 429 marks model until next PT midnight and uses the next model', async () => {
    const st = new Map();
    const t0 = Date.UTC(2026, 9, 13, 20, 0, 0); // 13:00 PDT
    const r = await runChain(['m1', 'm2'], caller({ m1: err(429, 'Quota exceeded ... PerDay ...') }), st, () => t0);
    assert.equal(r, 'm2');
    assert.equal(st.get('m1'), nextPacificMidnight(t0));
    assert.equal(st.get('m1'), Date.UTC(2026, 9, 14, 7, 0, 0)); // 00:00 PDT = 07:00 UTC
  });

  it('(b) per-minute 429 recovers after 65s', async () => {
    const st = new Map();
    let now = 1_000_000;
    const bad = { m1: err(429, 'RESOURCE_EXHAUSTED per minute') };
    assert.equal(await runChain(['m1', 'm2'], caller(bad), st, () => now), 'm2');
    now += 30_000;
    assert.equal(await runChain(['m1', 'm2'], caller({}), st, () => now), 'm2'); // still skipped
    now += 36_000;
    assert.equal(await runChain(['m1', 'm2'], caller({}), st, () => now), 'm1'); // 66s later
  });

  it('(c) 404 skips the model for an hour', async () => {
    const st = new Map();
    await runChain(['m1', 'm2'], caller({ m1: err(404, 'model not found') }), st, () => 0);
    assert.equal(st.get('m1'), 3_600_000);
  });

  it('(d) all exhausted throws the last error; other errors are not marked', async () => {
    const st = new Map();
    const bad = { m1: err(429, 'PerDay'), m2: new Error('network down') };
    await assert.rejects(runChain(['m1', 'm2'], caller(bad), st, () => 0), /network down/);
    assert.ok(st.has('m1') && !st.has('m2'));
    st.set('m2', 5);
    await assert.rejects(runChain(['m1', 'm2'], caller({}), st, () => 0), /all exhausted/);
  });

  it('(e) extracts JSON from fenced or chatty text', () => {
    assert.deepEqual(extractJSON('```json\n{"a":1}\n```'), { a: 1 });
    assert.deepEqual(extractJSON('Sure! Here: [1,2,3] hope it helps'), [1, 2, 3]);
    assert.throws(() => extractJSON('no json here'));
  });
});

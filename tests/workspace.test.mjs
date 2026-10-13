import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImageDataUrl, buildHistory, MAX_IMAGE_BYTES } from '../src/lib/workspace/evidence.ts';
import { nextPhase, isLast } from '../src/lib/workspace/five-e.ts';

const b64 = 'iVBORw0KGgo='; // 8 bytes

test('parseImageDataUrl accepts png/jpeg/webp', () => {
  for (const [m, ext] of [['png', 'png'], ['jpeg', 'jpg'], ['webp', 'webp']]) {
    const r = parseImageDataUrl(`data:image/${m};base64,${b64}`);
    assert.equal(r.mimeType, `image/${m}`);
    assert.equal(r.ext, ext);
    assert.equal(r.bytes, 8);
    assert.equal(r.base64, b64);
  }
});

test('parseImageDataUrl rejects svg, text, malformed, oversize', () => {
  assert.equal(parseImageDataUrl(`data:image/svg+xml;base64,${b64}`), null);
  assert.equal(parseImageDataUrl(`data:text/plain;base64,${b64}`), null);
  assert.equal(parseImageDataUrl('data:image/png;base64,@@@'), null);
  assert.equal(parseImageDataUrl('data:image/png;base64,'), null);
  assert.equal(parseImageDataUrl('hello'), null);
  assert.equal(parseImageDataUrl(null), null);
  const big = 'A'.repeat(Math.ceil((MAX_IMAGE_BYTES + 3) / 3) * 4);
  assert.equal(parseImageDataUrl(`data:image/png;base64,${big}`), null);
  const ok = 'A'.repeat(Math.floor(MAX_IMAGE_BYTES / 3) * 4 - 4);
  assert.ok(parseImageDataUrl(`data:image/png;base64,${ok}`));
});

test('buildHistory limits, maps roles, skips phase events, starts with user', () => {
  const ev = [
    { kind: 'chat', role: 'assistant', content: 'a0' },
    { kind: 'phase', role: 'assistant', content: 'explore' },
    ...Array.from({ length: 20 }, (_, i) => ({ kind: 'chat', role: i % 2 ? 'assistant' : 'user', content: `m${i}` })),
  ];
  const h = buildHistory(ev, 12);
  assert.ok(h.length <= 12);
  assert.equal(h[0].role, 'user');
  assert.equal(h.at(-1).content, 'm19');
  assert.deepEqual(buildHistory([{ kind: 'phase', role: 'assistant', content: 'x' }]), []);
});

test('phase advance never passes evaluate', () => {
  let p = 'engage';
  for (let i = 0; i < 10; i++) p = nextPhase(p);
  assert.equal(p, 'evaluate');
  assert.ok(isLast(p));
});

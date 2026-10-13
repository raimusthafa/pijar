import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitSize, nearBottom, errKey, midpoint, phaseIndex } from '../src/components/workspace/logic.ts';

test('fitSize downscales the long edge and never upscales', () => {
  assert.deepEqual(fitSize(4000, 2000, 1024), { width: 1024, height: 512 });
  assert.deepEqual(fitSize(800, 600, 1024), { width: 800, height: 600 });
});
test('nearBottom', () => {
  assert.equal(nearBottom({ scrollHeight: 1000, scrollTop: 520, clientHeight: 400 }), true);
  assert.equal(nearBottom({ scrollHeight: 1000, scrollTop: 100, clientHeight: 400 }), false);
});
test('errKey and midpoint and phaseIndex', () => {
  assert.equal(errKey('invalid_image'), 'invalid_image');
  assert.equal(errKey('boom'), 'generic');
  assert.deepEqual(midpoint({ x: 0, y: 0 }, { x: 2, y: 4 }), { x: 1, y: 2 });
  assert.equal(phaseIndex('evaluate'), 4);
});

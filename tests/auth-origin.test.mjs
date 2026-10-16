import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicOrigin } from '../src/lib/auth/origin.ts';

test('behind nginx the public origin comes from Host and X-Forwarded-Proto, not the internal URL', () => {
  const req = new Request('http://localhost:3200/auth/logout', {
    headers: { host: 'pijar.syahranfd.site', 'x-forwarded-proto': 'https' },
  });
  assert.equal(publicOrigin(req), 'https://pijar.syahranfd.site');
});

test('without proxy headers it falls back to the request URL origin', () => {
  assert.equal(publicOrigin(new Request('http://localhost:3000/auth/logout')), 'http://localhost:3000');
});

test('X-Forwarded-Host wins and only the first value is used', () => {
  const req = new Request('http://localhost:3200/x', {
    headers: { 'x-forwarded-host': 'pijar.syahranfd.site, other.example', 'x-forwarded-proto': 'https, http' },
  });
  assert.equal(publicOrigin(req), 'https://pijar.syahranfd.site');
});

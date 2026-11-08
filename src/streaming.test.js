import { test } from 'node:test';
import assert from 'node:assert';
import { matchProviders, onOurServices } from './streaming.js';

test('on our services', () => {
  assert.strictEqual(onOurServices({ service: 'Netflix' }, []), true);
  assert.strictEqual(onOurServices({ service: 'Netflix' }, ['Netflix', 'Max']), true);
  assert.strictEqual(onOurServices({ service: 'Hulu' }, ['Netflix']), false);
  assert.strictEqual(onOurServices({ service: 'Other' }, ['Netflix']), false);
});

test('match providers prefers our subscription services', () => {
  const providers = [
    { name: 'Hulu', kind: 'flatrate' },
    { name: 'Netflix', kind: 'flatrate' },
    { name: 'Apple TV', kind: 'rent' }
  ];
  const r = matchProviders(providers, ['Netflix']);
  assert.deepStrictEqual(r.mine.map((p) => p.name), ['Netflix']);
  assert.strictEqual(r.best, 'Netflix');
  assert.strictEqual(matchProviders(providers, []).best, 'Hulu');
  assert.strictEqual(matchProviders([{ name: 'X', kind: 'buy' }], []).best, null);
});

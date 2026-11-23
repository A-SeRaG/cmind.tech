import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

test('health, security headers, 404', async () => {
  const server = createApp(loadConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).listen(0);
  const { port } = server.address() as AddressInfo;
  try {
    const ok = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('x-powered-by'), null);
    assert.ok(ok.headers.get('x-content-type-options'));
    assert.equal((await fetch(`http://127.0.0.1:${port}/nope`)).status, 404);
  } finally { server.close(); }
});

test('production config requires Supabase vars', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' } as NodeJS.ProcessEnv));
});

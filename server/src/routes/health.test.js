import assert from 'node:assert/strict';
import test from 'node:test';

import { toPrivateHealthResponse } from './health.js';

test('toPrivateHealthResponse keeps operational details for authenticated diagnostics', () => {
  const response = toPrivateHealthResponse({
    status: 'ok',
    database: 'connected',
    backup: {
      status: 'ok',
      lastBackupAt: '2026-09-05T03:30:18.666Z',
      file: 'utm_builder-20260905-033018.dump'
    }
  });

  assert.deepEqual(response, {
    status: 'ok',
    service: 'adrock-utm-builder-api',
    database: 'connected',
    backup: {
      status: 'ok',
      lastBackupAt: '2026-09-05T03:30:18.666Z',
      file: 'utm_builder-20260905-033018.dump'
    }
  });
});

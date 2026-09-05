import assert from 'node:assert/strict';
import test from 'node:test';

import { toPrivateHealthResponse, toPublicHealthResponse } from './health.js';

test('toPublicHealthResponse hides database, backup, and error details', () => {
  const response = toPublicHealthResponse({
    status: 'error',
    database: 'disconnected',
    backup: {
      status: 'ok',
      lastBackupAt: '2026-09-05T03:30:18.666Z',
      file: 'utm_builder-20260905-033018.dump'
    },
    details: 'connect ECONNREFUSED 127.0.0.1:5432'
  });

  assert.deepEqual(response, {
    status: 'error',
    service: 'adrock-utm-builder-api'
  });
});

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

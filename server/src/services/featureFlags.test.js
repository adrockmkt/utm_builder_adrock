import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATURE_FLAGS, isFeatureEnabled } from './featureFlags.js';

test('slack integration flag is false when unset', async () => {
  const pool = { query: async () => ({ rows: [] }) };

  assert.equal(await isFeatureEnabled(pool, FEATURE_FLAGS.slackIntegration), false);
});

test('feature flag accepts true string only', async () => {
  const enabledPool = { query: async () => ({ rows: [{ value: 'true' }] }) };
  const disabledPool = { query: async () => ({ rows: [{ value: 'false' }] }) };

  assert.equal(await isFeatureEnabled(enabledPool, FEATURE_FLAGS.slackIntegration), true);
  assert.equal(await isFeatureEnabled(disabledPool, FEATURE_FLAGS.slackIntegration), false);
});

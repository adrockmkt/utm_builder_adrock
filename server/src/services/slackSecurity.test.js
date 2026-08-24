import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySlackRequest } from './slackSecurity.js';

function signature(secret, timestamp, body) {
  return `v0=${crypto.createHmac('sha256', secret).update(`v0:${timestamp}:${body}`).digest('hex')}`;
}

test('accepts a valid Slack signature', () => {
  const body = 'token=x&team_id=T1&user_id=U1&command=%2Futm';
  const timestamp = '1700000000';

  assert.equal(
    verifySlackRequest({
      signingSecret: 'secret',
      timestamp,
      signature: signature('secret', timestamp, body),
      rawBody: body,
      nowMs: 1700000000 * 1000
    }),
    true
  );
});

test('rejects stale or mismatched Slack signatures', () => {
  assert.equal(
    verifySlackRequest({
      signingSecret: 'secret',
      timestamp: '1700000000',
      signature: 'v0=bad',
      rawBody: 'team_id=T1',
      nowMs: 1700000601 * 1000
    }),
    false
  );
});

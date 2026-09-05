import assert from 'node:assert/strict';
import test from 'node:test';

import { isSetupRequestAllowed, loginRateLimitKey } from './auth.js';

test('isSetupRequestAllowed requires the configured setup token', () => {
  assert.equal(isSetupRequestAllowed({ configuredToken: 'secret', providedToken: undefined }), false);
  assert.equal(isSetupRequestAllowed({ configuredToken: 'secret', providedToken: 'wrong' }), false);
  assert.equal(isSetupRequestAllowed({ configuredToken: 'secret', providedToken: 'secret' }), true);
});

test('isSetupRequestAllowed preserves local setup behavior when no token is configured outside production', () => {
  assert.equal(isSetupRequestAllowed({ configuredToken: '', providedToken: undefined, nodeEnv: 'development' }), true);
});

test('isSetupRequestAllowed blocks production setup when no setup token is configured', () => {
  assert.equal(isSetupRequestAllowed({ configuredToken: '', providedToken: undefined, nodeEnv: 'production' }), false);
});

test('loginRateLimitKey combines IP and normalized email', () => {
  assert.equal(
    loginRateLimitKey({
      ip: '203.0.113.10',
      body: { email: '  USER@Example.COM  ' }
    }),
    '203.0.113.10:user@example.com'
  );
});

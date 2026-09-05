import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApiInfo,
  buildPublicHealth,
  buildSetupStatus,
  canRunInitialSetup,
  loginRateLimitOptions
} from './publicSurface.js';

test('public health does not disclose database or backup details', () => {
  const health = buildPublicHealth('ok');

  assert.deepEqual(health, {
    status: 'ok',
    service: 'adrock-utm-builder-api'
  });
  assert.equal(Object.hasOwn(health, 'database'), false);
  assert.equal(Object.hasOwn(health, 'backup'), false);
  assert.equal(Object.hasOwn(health, 'details'), false);
});

test('root API metadata does not expose hosting provider flags', () => {
  const info = buildApiInfo();

  assert.deepEqual(info, {
    name: 'Ad Rock UTM Builder API',
    mode: 'single-tenant'
  });
  assert.equal(Object.hasOwn(info, 'awsReady'), false);
});

test('production setup status stays closed without the setup token', () => {
  const status = buildSetupStatus({
    nodeEnv: 'production',
    userCount: 0,
    setupTokenConfigured: true,
    setupTokenProvided: false
  });

  assert.deepEqual(status, { setupRequired: false });
});

test('production initial setup requires the configured setup token', () => {
  assert.deepEqual(
    canRunInitialSetup({
      nodeEnv: 'production',
      userCount: 0,
      setupToken: 'setup-secret',
      providedSetupToken: ''
    }),
    { allowed: false, status: 403, error: 'Setup inicial restrito.' }
  );

  assert.deepEqual(
    canRunInitialSetup({
      nodeEnv: 'production',
      userCount: 0,
      setupToken: 'setup-secret',
      providedSetupToken: 'setup-secret'
    }),
    { allowed: true }
  );
});

test('development initial setup keeps the first-run flow open', () => {
  assert.deepEqual(
    buildSetupStatus({
      nodeEnv: 'development',
      userCount: 0,
      setupTokenConfigured: false,
      setupTokenProvided: false
    }),
    { setupRequired: true }
  );
  assert.deepEqual(
    canRunInitialSetup({
      nodeEnv: 'development',
      userCount: 0,
      setupToken: '',
      providedSetupToken: ''
    }),
    { allowed: true }
  );
});

test('login has a focused stricter rate limit than the global API limit', () => {
  assert.equal(loginRateLimitOptions.windowMs, 15 * 60 * 1000);
  assert.equal(loginRateLimitOptions.max, 20);
  assert.equal(loginRateLimitOptions.standardHeaders, true);
  assert.equal(loginRateLimitOptions.legacyHeaders, false);
});

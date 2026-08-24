# Slack Operational Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first safe Slack integration layer for Ad Rock UTM Builder: canonical backend UTM generation, feature-flag gating, Slack request verification, and an initial `/utm` slash-command response.

**Architecture:** Add backend-only services first so the existing web UI keeps working unchanged. Slack endpoints stay disabled by default, require a valid Slack signature and authorized workspace, and use the canonical UTM engine instead of duplicating URL rules.

**Tech Stack:** Node.js ESM, Express, PostgreSQL via `pg`, Node built-in `node:test`, `crypto`, `URLSearchParams`.

**Spec:** `docs/SLACK_INTEGRATION_UTM_BUILDER_REVIEW.md`

## Global Constraints

- Slack integration must be disabled by default through `slack_integration_enabled`.
- Disabled Slack endpoints must not operate.
- Validate Slack Signing Secret with raw request body and `X-Slack-Signature`.
- Keep Slack tokens and secrets outside the repository.
- Register Slack-created links with `created_via = slack` and Slack user id when saving is introduced.
- First rollout is Ad Rock/DigitalOcean only; Porvir remains out of the initial test.
- Do not replace the existing web builder flow in this phase.

---

### Task 1: Canonical Backend UTM Engine

**Files:**
- Create: `server/src/services/utmEngine.js`
- Test: `server/src/services/utmEngine.test.js`

**Interfaces:**
- Produces: `normalizeUtmValue(value: string): string`
- Produces: `buildUtmUrl(input: { baseUrl, utmSource, utmMedium, utmCampaign, utmTerm?, utmContent?, utmId? }): { finalUrl, normalized, warnings }`
- Produces: `validateUtmInput(input, options?: { requireCampaignContext?: boolean }): { isValid, errors, warnings, normalized }`

- [x] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUtmUrl, normalizeUtmValue, validateUtmInput } from './utmEngine.js';

test('normalizes UTM values like the web builder', () => {
  assert.equal(normalizeUtmValue(' Banner Home 01! '), 'banner_home_01');
});

test('builds final URL while preserving existing params and hash', () => {
  const result = buildUtmUrl({
    baseUrl: 'https://example.com/lp?ref=abc#form',
    utmSource: 'Instagram',
    utmMedium: 'Paid Social',
    utmCampaign: 'Campanha Agosto',
    utmTerm: 'Grupo A',
    utmContent: 'Banner Home',
    utmId: 'Criativo 01'
  });

  assert.equal(
    result.finalUrl,
    'https://example.com/lp?ref=abc&utm_source=instagram&utm_medium=paid_social&utm_campaign=campanha_agosto&utm_term=grupo_a&utm_content=banner_home&utm_id=criativo_01#form'
  );
});

test('requires campaign context fields only when requested', () => {
  const pontual = validateUtmInput({ baseUrl: 'https://example.com', utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'teste' });
  const campaign = validateUtmInput({ baseUrl: 'https://example.com', utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'teste' }, { requireCampaignContext: true });

  assert.equal(pontual.isValid, true);
  assert.equal(campaign.isValid, false);
  assert.match(campaign.errors.join(' '), /utm_term/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test server/src/services/utmEngine.test.js`
Expected: FAIL with module not found for `utmEngine.js`.

- [x] **Step 3: Implement engine**

Create pure functions mirroring `src/utils/utm.ts` for normalization, required fields, URL construction, and invalid URL errors.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test server/src/services/utmEngine.test.js`
Expected: PASS.

### Task 2: Feature Flags Service

**Files:**
- Modify: `server/src/db/schema.sql`
- Create: `server/src/services/featureFlags.js`
- Test: `server/src/services/featureFlags.test.js`

**Interfaces:**
- Produces: `FEATURE_FLAGS.slackIntegration`
- Produces: `isFeatureEnabled(poolLike, flagKey): Promise<boolean>`
- Produces: `requireFeatureFlag(flagKey): Express middleware`

- [x] **Step 1: Write failing tests**

```js
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
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test server/src/services/featureFlags.test.js`
Expected: FAIL with module not found.

- [x] **Step 3: Implement service and schema default**

Add `slack_integration_enabled = false` to `app_settings`, read from `app_settings`, and return 403 when disabled.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test server/src/services/featureFlags.test.js`
Expected: PASS.

### Task 3: Slack Security Service

**Files:**
- Modify: `server/src/config/env.js`
- Create: `server/src/services/slackSecurity.js`
- Test: `server/src/services/slackSecurity.test.js`

**Interfaces:**
- Produces: `verifySlackRequest({ signingSecret, timestamp, signature, rawBody, nowMs? }): boolean`
- Produces: `requireSlackRequest(req, res, next)` middleware.

- [x] **Step 1: Write failing tests**

```js
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
  assert.equal(verifySlackRequest({
    signingSecret: 'secret',
    timestamp,
    signature: signature('secret', timestamp, body),
    rawBody: body,
    nowMs: 1700000000 * 1000
  }), true);
});

test('rejects stale or mismatched Slack signatures', () => {
  assert.equal(verifySlackRequest({
    signingSecret: 'secret',
    timestamp: '1700000000',
    signature: 'v0=bad',
    rawBody: 'team_id=T1',
    nowMs: 1700000601 * 1000
  }), false);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test server/src/services/slackSecurity.test.js`
Expected: FAIL with module not found.

- [x] **Step 3: Implement signature verification**

Use Slack's `v0:${timestamp}:${rawBody}` HMAC SHA-256 format and reject requests older than 5 minutes.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test server/src/services/slackSecurity.test.js`
Expected: PASS.

### Task 4: Initial Slack Slash Command Endpoint

**Files:**
- Modify: `server/src/app.js`
- Create: `server/src/routes/slack.js`
- Test: `server/src/routes/slack.test.js`
- Modify: `server/.env.example`
- Modify: `server/.env.production.example`

**Interfaces:**
- Consumes: `buildUtmUrl`, `isFeatureEnabled`, `verifySlackRequest`
- Produces: `POST /api/slack/commands`

- [x] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSlashCommandText, buildHelpResponse, buildPreviewResponse } from './slack.js';

test('slash command parser reads key=value pairs', () => {
  assert.deepEqual(parseSlashCommandText('url=https://example.com source=Google medium=CPC campaign=Teste'), {
    url: 'https://example.com',
    source: 'Google',
    medium: 'CPC',
    campaign: 'Teste'
  });
});

test('help response starts with the link type question', () => {
  assert.match(buildHelpResponse().text, /Que tipo de link voce quer criar/);
});

test('preview response uses canonical engine', () => {
  const response = buildPreviewResponse({
    url: 'https://example.com',
    source: 'Google',
    medium: 'CPC',
    campaign: 'Campanha Teste'
  });

  assert.equal(response.response_type, 'ephemeral');
  assert.match(response.text, /utm_source=google/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test server/src/routes/slack.test.js`
Expected: FAIL with module not found.

- [x] **Step 3: Implement route and pure helpers**

Return an ephemeral help response for empty text. Return an ephemeral preview for key/value text. Gate the HTTP endpoint by feature flag, Slack signature, and `SLACK_ALLOWED_TEAM_ID` when configured.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test server/src/routes/slack.test.js`
Expected: PASS.

### Task 5: Verification

**Files:**
- No production files beyond previous tasks.

**Interfaces:**
- Consumes all previous tasks.

- [x] **Step 1: Run all backend tests**

Run: `node --test server/src/**/*.test.js`
Expected: PASS.

- [x] **Step 2: Run frontend build**

Run: `npm run build`
Expected: PASS.

- [x] **Step 3: Check working tree**

Run: `git status -sb`
Expected: only intended Slack integration files changed.

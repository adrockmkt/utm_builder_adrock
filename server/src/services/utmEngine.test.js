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
  const pontual = validateUtmInput({
    baseUrl: 'https://example.com',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'teste'
  });
  const campaign = validateUtmInput(
    {
      baseUrl: 'https://example.com',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'teste'
    },
    { requireCampaignContext: true }
  );

  assert.equal(pontual.isValid, true);
  assert.equal(campaign.isValid, false);
  assert.match(campaign.errors.join(' '), /utm_term/);
});

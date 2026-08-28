import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUrlString, validateUtmParams } from '../src/utils/utm.ts';

test('validateUrlString warns when source conflicts with another social network named in UTM fields', () => {
  const result = validateUrlString('https://porvir.org/gestao-escolar-ia-reload-2026/?utm_source=instagram&utm_medium=social_media&utm_campaign=reload-2026-linkedin&utm_term=site_porvir&utm_content=linkedin&utm_id=feed');

  assert.equal(result.isValid, true);
  assert.equal(result.warnings.some((warning) => warning.field === 'source' && warning.message.includes('linkedin')), true);
});

test('validateUtmParams does not warn when social network mentions match the selected source', () => {
  const result = validateUtmParams({
    url: 'https://porvir.org/gestao-escolar-ia-reload-2026/',
    source: 'linkedin',
    medium: 'social_media',
    campaign: 'reload_2026_linkedin',
    term: 'site_porvir',
    content: 'linkedin',
    id: 'feed'
  });

  assert.equal(result.warnings.some((warning) => warning.field === 'source' && warning.message.includes('linkedin')), false);
});

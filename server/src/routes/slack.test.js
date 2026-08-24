import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHelpResponse, buildPreviewResponse, parseSlashCommandText } from './slack.js';

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

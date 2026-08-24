import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHelpResponse, buildPreviewResponse, buildModalPreviewView, buildUtmBuilderModal, parseSlashCommandText } from './slack.js';

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

test('utm builder modal asks for the same core web builder fields', () => {
  const modal = buildUtmBuilderModal('T123').view;
  const blockIds = modal.blocks.map((block) => block.block_id).filter(Boolean);

  assert.equal(modal.type, 'modal');
  assert.equal(modal.callback_id, 'utm_builder_modal');
  assert.deepEqual(blockIds, [
    'context_type',
    'base_url',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'utm_id',
    'internal_name',
    'notes'
  ]);
});

test('modal submission builds preview from entered answers', () => {
  const view = buildModalPreviewView({
    state: {
      values: {
        context_type: { value: { selected_option: { value: 'pontual' } } },
        base_url: { value: { value: 'https://example.com/lp' } },
        utm_source: { value: { value: 'Google' } },
        utm_medium: { value: { value: 'CPC' } },
        utm_campaign: { value: { value: 'Campanha Teste' } },
        utm_term: { value: { value: '' } },
        utm_content: { value: { value: 'Banner Home' } },
        utm_id: { value: { value: 'Criativo 01' } },
        internal_name: { value: { value: 'link_teste' } },
        notes: { value: { value: '' } }
      }
    }
  });

  assert.equal(view.type, 'modal');
  assert.equal(view.callback_id, 'utm_builder_preview');
  assert.match(view.blocks[0].text.text, /Preview de URL UTM/);
  assert.match(view.blocks[1].text.text, /utm_source=google/);
  assert.match(view.blocks[1].text.text, /utm_content=banner_home/);
});

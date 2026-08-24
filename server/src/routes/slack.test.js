import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHelpResponse, buildPreviewResponse, buildModalPreviewView, buildUtmBuilderModal, loadSlackFormCatalog, parseSlashCommandText } from './slack.js';

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
  const modal = buildUtmBuilderModal('T123', {
    sources: [{ label: 'Google', value: 'google' }],
    mediums: [{ label: 'CPC', value: 'cpc' }],
    campaigns: [{ label: 'Cliente - Campanha Teste', value: 'campanha_teste' }],
    optionsByCategory: {
      action_type: [{ label: 'Newsletter', value: 'newsletter' }],
      destination_type: [{ label: 'Landing page', value: 'landing_page' }],
      ad_type: [{ label: 'Banner', value: 'banner' }],
      utm_term: [{ label: 'Remarketing', value: 'remarketing' }],
      utm_content: [{ label: 'Banner Home', value: 'banner_home' }],
      utm_id: [{ label: 'Criativo 01', value: 'criativo_01' }]
    }
  }).view;
  const blockIds = modal.blocks.map((block) => block.block_id).filter(Boolean);

  assert.equal(modal.type, 'modal');
  assert.equal(modal.callback_id, 'utm_builder_modal');
  assert.deepEqual(blockIds, [
    'context_type',
    'campaign_select',
    'base_url',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'utm_id',
    'internal_name',
    'action_type',
    'ad_type',
    'destination_type',
    'notes'
  ]);
  assert.equal(modal.blocks.find((block) => block.block_id === 'utm_source').element.type, 'static_select');
  assert.equal(modal.blocks.find((block) => block.block_id === 'action_type').element.type, 'static_select');
});

test('modal submission builds preview from entered answers', () => {
  const view = buildModalPreviewView({
    state: {
      values: {
        context_type: { value: { selected_option: { value: 'pontual' } } },
        campaign_select: { value: { selected_option: null } },
        base_url: { value: { value: 'https://example.com/lp' } },
        utm_source: { value: { selected_option: { value: 'Google' } } },
        utm_medium: { value: { selected_option: { value: 'CPC' } } },
        utm_campaign: { value: { value: 'Campanha Teste' } },
        utm_term: { value: { value: '' } },
        utm_content: { value: { selected_option: { value: 'Banner Home' } } },
        utm_id: { value: { selected_option: { value: 'Criativo 01' } } },
        internal_name: { value: { value: 'link_teste' } },
        action_type: { value: { selected_option: { value: 'newsletter' } } },
        ad_type: { value: { selected_option: { value: 'banner' } } },
        destination_type: { value: { selected_option: { value: 'landing_page' } } },
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

test('selected campaign fills utm_campaign like the web campaign flow', () => {
  const view = buildModalPreviewView({
    state: {
      values: {
        context_type: { value: { selected_option: { value: 'campanha' } } },
        campaign_select: { value: { selected_option: { value: 'campanha_cadastrada' } } },
        base_url: { value: { value: 'https://example.com/lp' } },
        utm_source: { value: { selected_option: { value: 'instagram' } } },
        utm_medium: { value: { selected_option: { value: 'paid_social' } } },
        utm_campaign: { value: { value: '' } },
        utm_term: { value: { selected_option: { value: 'grupo_a' } } },
        utm_content: { value: { selected_option: { value: 'story1' } } },
        utm_id: { value: { selected_option: { value: 'img_01' } } },
        internal_name: { value: { value: 'link_teste' } },
        notes: { value: { value: '' } }
      }
    }
  });

  assert.match(view.blocks[1].text.text, /utm_campaign=campanha_cadastrada/);
});

test('catalog uses web builder fallback options when database options are empty', async () => {
  const queries = [
    { rows: [] },
    { rows: [{ sources: ['google'], mediums: ['cpc'] }] },
    { rows: [] }
  ];
  const catalog = await loadSlackFormCatalog({
    query: async () => queries.shift()
  });

  assert.ok(catalog.optionsByCategory.action_type.some((option) => option.value === 'post_patrocinado'));
  assert.ok(catalog.optionsByCategory.destination_type.some((option) => option.value === 'landing_page'));
  assert.ok(catalog.optionsByCategory.ad_type.some((option) => option.value === 'image_ad'));
  assert.ok(catalog.optionsByCategory.utm_term.some((option) => option.value === 'ec_canal'));
  assert.ok(catalog.optionsByCategory.utm_content.some((option) => option.value === 'banner1'));
  assert.ok(catalog.optionsByCategory.utm_id.some((option) => option.value === 'texto_01'));
});

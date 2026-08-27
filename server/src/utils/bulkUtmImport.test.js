import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBulkTemplateRows, normalizeWorksheetRows, validateBulkUtmRows } from './bulkUtmImport.js';

const campaign = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Curso PBL 2026',
  slug: 'curso_pbl_2026'
};

test('validateBulkUtmRows accepts client spreadsheet headers and derives campaign from selected campaign', () => {
  const result = validateBulkUtmRows({
    campaign,
    rows: [{
      'Link original': ' https://example.com/aula ',
      Source: 'WhatsApp',
      Medium: 'social media',
      Campaign: 'valor_da_planilha_ignorado',
      Term: 'Português',
      Content: 'M1 Msg1',
      ID: 'Tutorial Padlet',
      'Nome interno': 'Mensagem 1',
      'Tipo de ação': 'post_patrocinado',
      Destino: 'lp',
      'Tipo de anúncio/formato': 'whatsapp_canal'
    }]
  });

  assert.equal(result.summary.totalRows, 1);
  assert.equal(result.summary.errorRows, 0);
  assert.equal(result.rows[0].status, 'warning');
  assert.equal(result.rows[0].normalized.utmCampaign, 'curso_pbl_2026');
  assert.equal(result.rows[0].normalized.utmSource, 'whatsapp');
  assert.equal(result.rows[0].normalized.utmMedium, 'social_media');
  assert.match(result.rows[0].normalized.finalUrl, /utm_campaign=curso_pbl_2026/);
  assert.match(result.rows[0].warnings.join(' '), /utm_campaign da planilha foi ignorado/);
});

test('validateBulkUtmRows blocks rows missing required system fields', () => {
  const result = validateBulkUtmRows({
    campaign,
    rows: [{
      'Link original': 'https://example.com/aula',
      Source: 'whatsapp',
      Medium: 'social_media',
      Term: 'portugues',
      Content: 'm1_msg1',
      ID: 'tutorial_padlet'
    }]
  });

  assert.equal(result.summary.errorRows, 1);
  assert.equal(result.canSave, false);
  assert.deepEqual(result.rows[0].errors, [
    'Nome interno é obrigatório.',
    'Tipo de ação é obrigatório.',
    'Destino é obrigatório.',
    'Tipo de anúncio/formato é obrigatório.'
  ]);
});

test('validateBulkUtmRows blocks bulk import without selected campaign', () => {
  const result = validateBulkUtmRows({
    campaign: null,
    rows: [{
      'Link original': 'https://example.com/aula',
      Source: 'whatsapp',
      Medium: 'social_media',
      'Nome interno': 'Mensagem 1',
      'Tipo de ação': 'post_patrocinado',
      Destino: 'lp',
      'Tipo de anúncio/formato': 'whatsapp_canal'
    }]
  });

  assert.equal(result.summary.errorRows, 1);
  assert.equal(result.rows[0].errors[0], 'Selecione uma campanha cadastrada antes de validar o lote.');
});

test('validateBulkUtmRows detects duplicate generated URLs inside the spreadsheet', () => {
  const rows = [1, 2].map((number) => ({
    'Link original': 'https://example.com/aula',
    Source: 'whatsapp',
    Medium: 'social_media',
    Term: 'portugues',
    Content: 'm1_msg1',
    ID: 'tutorial_padlet',
    'Nome interno': `Mensagem ${number}`,
    'Tipo de ação': 'post_patrocinado',
    Destino: 'lp',
    'Tipo de anúncio/formato': 'whatsapp_canal'
  }));

  const result = validateBulkUtmRows({ campaign, rows });

  assert.equal(result.summary.errorRows, 2);
  assert.equal(result.canSave, false);
  assert.equal(result.rows[0].errors.includes('URL final duplicada dentro da planilha.'), true);
  assert.equal(result.rows[1].errors.includes('URL final duplicada dentro da planilha.'), true);
});

test('buildBulkTemplateRows exposes the official system columns before optional legacy columns', () => {
  const rows = buildBulkTemplateRows();

  assert.deepEqual(Object.keys(rows[0]).slice(0, 12), [
    'Nome interno',
    'Link original',
    'Source',
    'Medium',
    'Term',
    'Content',
    'ID',
    'Tipo de ação',
    'Destino',
    'Grupo de anúncio',
    'Tipo de anúncio/formato',
    'Observações'
  ]);
});

test('normalizeWorksheetRows maps header rows and skips empty rows', () => {
  const rows = [
    ['Nome interno', 'Link original', 'Source'],
    ['Mensagem 1', 'https://example.com', 'whatsapp'],
    ['', '', '']
  ];

  assert.deepEqual(normalizeWorksheetRows(rows), [{
    'Nome interno': 'Mensagem 1',
    'Link original': 'https://example.com',
    Source: 'whatsapp'
  }]);
});

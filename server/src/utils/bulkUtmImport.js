const FIELD_ALIASES = {
  internalName: ['nome interno', 'internal_name', 'internal name', 'nome'],
  baseUrl: ['link original', 'base_url', 'base url', 'url base', 'url original', 'url'],
  utmSource: ['source', 'utm_source'],
  utmMedium: ['medium', 'utm_medium'],
  spreadsheetCampaign: ['campaign', 'utm_campaign'],
  utmTerm: ['term', 'utm_term'],
  utmContent: ['content', 'utm_content'],
  utmId: ['id', 'utm_id'],
  actionType: ['tipo de ação', 'tipo de acao', 'action_type', 'tipo de ação/formato'],
  destinationType: ['destino', 'destination_type', 'tipo de destino'],
  adGroupName: ['grupo de anúncio', 'grupo de anuncio', 'ad_group_name'],
  adType: ['tipo de anúncio/formato', 'tipo de anuncio/formato', 'ad_type', 'tipo de anúncio', 'tipo de anuncio'],
  notes: ['observações', 'observacoes', 'notes', 'obs']
};

const TEMPLATE_COLUMNS = [
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
  'Observações',
  'Campaign'
];

export function normalizeWorksheetRows(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((header) => String(header || '').trim());
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = row[index] ?? '';
    });
    return record;
  }).filter((record) => Object.values(record).some((value) => String(value || '').trim()));
}

export function buildBulkTemplateRows() {
  return [
    {
      'Nome interno': 'Modulo 1 - mensagem 1 portugues',
      'Link original': 'https://example.com/pagina-de-destino',
      Source: 'whatsapp',
      Medium: 'social_media',
      Term: 'portugues',
      Content: 'm1_msg1',
      ID: 'tutorial_padlet',
      'Tipo de ação': 'post_patrocinado',
      Destino: 'lp',
      'Grupo de anúncio': 'modulo_1',
      'Tipo de anúncio/formato': 'whatsapp_canal',
      'Observações': 'Preencha uma linha por link. O utm_campaign será preenchido pela campanha selecionada no sistema.',
      Campaign: 'Opcional/ignorado pelo sistema'
    }
  ];
}

export function getBulkTemplateColumns() {
  return TEMPLATE_COLUMNS;
}

export function validateBulkUtmRows({ campaign, rows, existingFinalUrls = [] }) {
  const parsedRows = rows.map((rawRow, index) => validateRow({
    campaign,
    rawRow,
    rowNumber: index + 2,
    existingFinalUrls
  }));

  const counts = new Map();
  parsedRows.forEach((row) => {
    if (!row.normalized.finalUrl) return;
    counts.set(row.normalized.finalUrl, (counts.get(row.normalized.finalUrl) || 0) + 1);
  });

  const validatedRows = parsedRows.map((row) => {
    const errors = [...row.errors];
    if (row.normalized.finalUrl && counts.get(row.normalized.finalUrl) > 1) {
      errors.push('URL final duplicada dentro da planilha.');
    }
    return {
      ...row,
      errors,
      status: errors.length > 0 ? 'error' : row.warnings.length > 0 ? 'warning' : 'ok'
    };
  });

  const summary = {
    totalRows: validatedRows.length,
    okRows: validatedRows.filter((row) => row.status === 'ok').length,
    warningRows: validatedRows.filter((row) => row.status === 'warning').length,
    errorRows: validatedRows.filter((row) => row.status === 'error').length
  };

  return {
    canSave: summary.totalRows > 0 && summary.errorRows === 0,
    summary,
    rows: validatedRows
  };
}

function validateRow({ campaign, rawRow, rowNumber, existingFinalUrls }) {
  const extracted = extractKnownFields(rawRow);
  const normalized = {
    campaignId: campaign?.id || null,
    baseUrl: normalizeUrl(extracted.baseUrl),
    utmSource: normalizeUtmValue(extracted.utmSource),
    utmMedium: normalizeUtmValue(extracted.utmMedium),
    utmCampaign: normalizeUtmValue(campaign?.slug || ''),
    utmTerm: normalizeUtmValue(extracted.utmTerm),
    utmContent: normalizeUtmValue(extracted.utmContent),
    utmId: normalizeUtmValue(extracted.utmId),
    internalName: String(extracted.internalName || '').trim(),
    actionType: normalizeUtmValue(extracted.actionType),
    destinationType: normalizeUtmValue(extracted.destinationType),
    adGroupName: normalizeUtmValue(extracted.adGroupName),
    adType: normalizeUtmValue(extracted.adType),
    notes: String(extracted.notes || '').trim(),
    finalUrl: ''
  };

  const errors = [];
  const warnings = [];

  if (!campaign) errors.push('Selecione uma campanha cadastrada antes de validar o lote.');
  if (!normalized.internalName) errors.push('Nome interno é obrigatório.');
  if (!normalized.baseUrl) errors.push('Link original é obrigatório.');
  if (!normalized.utmSource) errors.push('utm_source é obrigatório.');
  if (!normalized.utmMedium) errors.push('utm_medium é obrigatório.');
  if (!normalized.utmCampaign) errors.push('utm_campaign da campanha selecionada é obrigatório.');
  if (!normalized.actionType) errors.push('Tipo de ação é obrigatório.');
  if (!normalized.destinationType) errors.push('Destino é obrigatório.');
  if (!normalized.adType) errors.push('Tipo de anúncio/formato é obrigatório.');

  if (normalized.baseUrl && !isValidHttpUrl(normalized.baseUrl)) {
    errors.push('Link original deve ser uma URL http ou https válida.');
  }

  const normalizationWarnings = [
    ['Source', extracted.utmSource, normalized.utmSource],
    ['Medium', extracted.utmMedium, normalized.utmMedium],
    ['Term', extracted.utmTerm, normalized.utmTerm],
    ['Content', extracted.utmContent, normalized.utmContent],
    ['ID', extracted.utmId, normalized.utmId],
    ['Tipo de ação', extracted.actionType, normalized.actionType],
    ['Destino', extracted.destinationType, normalized.destinationType],
    ['Tipo de anúncio/formato', extracted.adType, normalized.adType]
  ];

  normalizationWarnings.forEach(([label, original, next]) => {
    if (String(original || '').trim() && String(original).trim() !== next) {
      warnings.push(`${label} será normalizado para "${next}".`);
    }
  });

  if (String(extracted.spreadsheetCampaign || '').trim()) {
    warnings.push('utm_campaign da planilha foi ignorado; o sistema usará a campanha selecionada.');
  }

  if (normalized.baseUrl && isValidHttpUrl(normalized.baseUrl)) {
    const parsed = new URL(normalized.baseUrl);
    if ([...parsed.searchParams.keys()].some((key) => key.startsWith('utm_'))) {
      warnings.push('Link original já contém parâmetros UTM; eles serão substituídos pela validação do lote.');
    }
    normalized.finalUrl = buildFinalUrl(normalized);
    if (existingFinalUrls.includes(normalized.finalUrl)) {
      warnings.push('URL final possivelmente já existe no catálogo.');
    }
  }

  return {
    rowNumber,
    raw: rawRow,
    normalized,
    errors,
    warnings,
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  };
}

function extractKnownFields(row) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]);
  return Object.fromEntries(Object.entries(FIELD_ALIASES).map(([field, aliases]) => {
    const entry = normalizedEntries.find(([header]) => aliases.includes(header));
    return [field, entry ? entry[1] : ''];
  }));
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeUrl(value) {
  return String(value || '').trim();
}

export function normalizeUtmValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function buildFinalUrl(params) {
  const url = new URL(params.baseUrl);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'].forEach((key) => {
    url.searchParams.delete(key);
  });
  url.searchParams.set('utm_source', params.utmSource);
  url.searchParams.set('utm_medium', params.utmMedium);
  url.searchParams.set('utm_campaign', params.utmCampaign);
  if (params.utmTerm) url.searchParams.set('utm_term', params.utmTerm);
  if (params.utmContent) url.searchParams.set('utm_content', params.utmContent);
  if (params.utmId) url.searchParams.set('utm_id', params.utmId);
  return url.toString();
}

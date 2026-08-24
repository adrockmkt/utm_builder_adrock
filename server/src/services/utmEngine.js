const ALLOWED_VALUE_REGEX = /^[a-z0-9_-]+$/;
const RECOMMENDED_MAX_LENGTHS = {
  utmSource: 40,
  utmMedium: 30,
  utmCampaign: 80,
  utmTerm: 60,
  utmContent: 60,
  utmId: 50
};

export function normalizeUtmValue(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function validateUtmInput(input = {}, options = {}) {
  const normalized = normalizeInput(input);
  const errors = [];
  const warnings = [];

  if (!isValidUrl(input.baseUrl)) {
    errors.push('URL base inválida.');
  }
  if (!normalized.utmSource) {
    errors.push('utm_source é obrigatório.');
  }
  if (!normalized.utmMedium) {
    errors.push('utm_medium é obrigatório.');
  }
  if (!normalized.utmCampaign) {
    errors.push('utm_campaign é obrigatório.');
  }
  if (options.requireCampaignContext && !normalized.utmTerm) {
    errors.push('utm_term é obrigatório para link de campanha.');
  }

  for (const [field, maxLength] of Object.entries(RECOMMENDED_MAX_LENGTHS)) {
    const value = normalized[field];
    if (!value) continue;

    if (!ALLOWED_VALUE_REGEX.test(value)) {
      warnings.push(`${field} contém caracteres fora do padrão recomendado.`);
    }
    if (value.length > maxLength) {
      warnings.push(`${field} passou do tamanho recomendado (${maxLength}).`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalized
  };
}

export function buildUtmUrl(input = {}) {
  const validation = validateUtmInput(input);

  if (!validation.isValid) {
    const error = new Error(validation.errors.join(' '));
    error.validation = validation;
    throw error;
  }

  const url = new URL(String(input.baseUrl).trim());
  const searchParams = new URLSearchParams(url.search);
  const { normalized } = validation;

  searchParams.set('utm_source', normalized.utmSource);
  searchParams.set('utm_medium', normalized.utmMedium);
  searchParams.set('utm_campaign', normalized.utmCampaign);
  setOptionalParam(searchParams, 'utm_term', normalized.utmTerm);
  setOptionalParam(searchParams, 'utm_content', normalized.utmContent);
  setOptionalParam(searchParams, 'utm_id', normalized.utmId);

  const query = searchParams.toString();
  return {
    finalUrl: `${url.origin}${url.pathname}${query ? `?${query}` : ''}${url.hash}`,
    normalized,
    warnings: validation.warnings
  };
}

function normalizeInput(input) {
  return {
    baseUrl: String(input.baseUrl || '').trim(),
    utmSource: normalizeUtmValue(input.utmSource),
    utmMedium: normalizeUtmValue(input.utmMedium),
    utmCampaign: normalizeUtmValue(input.utmCampaign),
    utmTerm: normalizeUtmValue(input.utmTerm),
    utmContent: normalizeUtmValue(input.utmContent),
    utmId: normalizeUtmValue(input.utmId)
  };
}

function setOptionalParam(searchParams, key, value) {
  if (value) {
    searchParams.set(key, value);
  }
}

function isValidUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return Boolean(url.protocol && url.hostname);
  } catch {
    return false;
  }
}

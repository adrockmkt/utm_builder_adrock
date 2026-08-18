import { env } from '../config/env.js';

export function normalizeBackHalf(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export async function createBitlyLink({ longUrl, customBackHalf, title }) {
  if (!env.bitlyEnabled) {
    throw createBitlyError('Bitly não está habilitado nesta instalação.', 503);
  }

  if (!env.bitlyAccessToken || !env.bitlyGroupGuid) {
    throw createBitlyError('Bitly não está configurado no servidor.', 503);
  }

  if (!longUrl) {
    throw createBitlyError('URL final não encontrada para encurtar.', 400);
  }

  const keyword = normalizeBackHalf(customBackHalf);
  if (!keyword) {
    throw createBitlyError('Informe um nome curto válido para o bit.ly.', 400);
  }

  const response = await fetch('https://api-ssl.bitly.com/v4/bitlinks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.bitlyAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      long_url: longUrl,
      domain: env.bitlyDomain,
      group_guid: env.bitlyGroupGuid,
      keyword,
      title: title || keyword
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw mapBitlyError(response.status, body);
  }

  return {
    bitlyUrl: body.link || `https://${env.bitlyDomain}/${keyword}`,
    bitlyId: body.id || `${env.bitlyDomain}/${keyword}`,
    customBackHalf: keyword,
    domain: env.bitlyDomain,
    createdAt: body.created_at || new Date().toISOString()
  };
}

export async function updateBitlyDestination({ bitlyId, bitlyUrl, longUrl, title }) {
  if (!env.bitlyEnabled) {
    throw createBitlyError('Bitly não está habilitado nesta instalação.', 503);
  }

  if (!env.bitlyAccessToken || !env.bitlyGroupGuid) {
    throw createBitlyError('Bitly não está configurado no servidor.', 503);
  }

  if (!longUrl) {
    throw createBitlyError('URL final não encontrada para atualizar o Bitly.', 400);
  }

  const normalizedBitlinkId = normalizeBitlinkId(bitlyId || bitlyUrl);
  if (!normalizedBitlinkId) {
    throw createBitlyError('Bitly não encontrado para atualizar.', 400);
  }

  const directUpdate = await patchBitlyLink(normalizedBitlinkId, { long_url: longUrl, title });
  if (directUpdate.ok) {
    return directUpdate.value;
  }

  const replacement = await createReplacementBitlink(longUrl, title);
  const customUpdate = await patchCustomBitlink(normalizedBitlinkId, replacement.id);
  if (!customUpdate.ok) {
    throw customUpdate.error || directUpdate.error || createBitlyError('Não foi possível atualizar o destino do Bitly.', 502);
  }

  return {
    bitlyUrl: customUpdate.value.bitlyUrl || `https://${normalizedBitlinkId}`,
    bitlyId: normalizedBitlinkId,
    longUrl,
    updatedAt: new Date().toISOString()
  };
}

async function patchBitlyLink(bitlinkId, body) {
  const response = await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${bitlinkId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${env.bitlyAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: mapBitlyError(response.status, responseBody) };
  }

  return {
    ok: true,
    value: {
      bitlyUrl: responseBody.link || `https://${bitlinkId}`,
      bitlyId: responseBody.id || bitlinkId,
      longUrl: responseBody.long_url || body.long_url,
      updatedAt: new Date().toISOString()
    }
  };
}

async function createReplacementBitlink(longUrl, title) {
  const response = await fetch('https://api-ssl.bitly.com/v4/shorten', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.bitlyAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      long_url: longUrl,
      domain: env.bitlyDomain,
      group_guid: env.bitlyGroupGuid,
      title: title || undefined,
      force_new_link: true
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw mapBitlyError(response.status, body);
  }

  return {
    id: body.id,
    link: body.link,
    longUrl: body.long_url || longUrl
  };
}

async function patchCustomBitlink(customBitlink, bitlinkId) {
  const response = await fetch(`https://api-ssl.bitly.com/v4/custom_bitlinks/${customBitlink}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${env.bitlyAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bitlink_id: bitlinkId })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: mapBitlyError(response.status, body) };
  }

  return {
    ok: true,
    value: {
      bitlyUrl: body.custom_bitlink ? `https://${body.custom_bitlink}` : undefined,
      bitlyId: body.custom_bitlink,
      longUrl: body.bitlink?.long_url,
      updatedAt: new Date().toISOString()
    }
  };
}

function normalizeBitlinkId(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '';

  return rawValue
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/g, '');
}

function mapBitlyError(statusCode, body) {
  const bitlyMessage = body?.message || body?.description || body?.resource || '';
  const normalizedMessage = String(bitlyMessage).toLowerCase();

  if (
    [409, 417, 422].includes(statusCode) ||
    normalizedMessage.includes('already') ||
    normalizedMessage.includes('exists') ||
    normalizedMessage.includes('keyword') ||
    normalizedMessage.includes('custom')
  ) {
    return createBitlyError('Este nome curto já está em uso ou não é permitido no Bitly. Tente outro.', statusCode, bitlyMessage);
  }

  if (statusCode === 402) {
    return createBitlyError('O plano Bitly atual não permite criar esse tipo de link curto.', statusCode, bitlyMessage);
  }

  if (statusCode === 403) {
    return createBitlyError('Token Bitly sem permissão para criar links.', statusCode, bitlyMessage);
  }

  if (statusCode === 429) {
    return createBitlyError('Limite da conta Bitly atingido. Tente novamente mais tarde.', statusCode, bitlyMessage);
  }

  return createBitlyError('Não foi possível concluir a operação no Bitly agora.', statusCode || 502, bitlyMessage);
}

function createBitlyError(message, statusCode, details = '') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

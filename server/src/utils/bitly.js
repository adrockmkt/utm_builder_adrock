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

  return createBitlyError('Não foi possível criar o Bitly agora.', statusCode || 502, bitlyMessage);
}

function createBitlyError(message, statusCode, details = '') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

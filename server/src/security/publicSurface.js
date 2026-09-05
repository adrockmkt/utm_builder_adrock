import crypto from 'node:crypto';

export const loginRateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }
};

export function buildApiInfo() {
  return {
    name: 'Ad Rock UTM Builder API',
    mode: 'single-tenant'
  };
}

export function buildPublicHealth(status) {
  return {
    status,
    service: 'adrock-utm-builder-api'
  };
}

export function buildDetailedHealth({ status, database, backup, details }) {
  return {
    status,
    service: 'adrock-utm-builder-api',
    database,
    backup,
    ...(details ? { details } : {})
  };
}

export function buildSetupStatus({ nodeEnv, userCount, setupTokenConfigured, setupTokenProvided }) {
  if (userCount > 0) {
    return { setupRequired: false };
  }

  if (nodeEnv === 'production') {
    return { setupRequired: setupTokenConfigured && setupTokenProvided };
  }

  return { setupRequired: true };
}

export function canRunInitialSetup({ nodeEnv, userCount, setupToken, providedSetupToken }) {
  if (userCount > 0) {
    return { allowed: false, status: 409, error: 'Setup inicial já foi concluído.' };
  }

  if (nodeEnv !== 'production') {
    return { allowed: true };
  }

  if (!setupToken || !safeEqual(setupToken, providedSetupToken || '')) {
    return { allowed: false, status: 403, error: 'Setup inicial restrito.' };
  }

  return { allowed: true };
}

function safeEqual(expected, actual) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

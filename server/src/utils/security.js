import crypto from 'crypto';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function generateId() {
  return crypto.randomUUID();
}

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }

  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const storedKey = Buffer.from(key, 'hex');

  if (derivedKey.length !== storedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedKey, storedKey);
}

export function createSessionExpiry() {
  return new Date(Date.now() + SESSION_DURATION_MS).toISOString();
}

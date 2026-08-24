import crypto from 'node:crypto';
import { env } from '../config/env.js';

const MAX_TIMESTAMP_SKEW_SECONDS = 60 * 5;

export function verifySlackRequest({ signingSecret, timestamp, signature, rawBody, nowMs = Date.now() }) {
  if (!signingSecret || !timestamp || !signature || typeof rawBody !== 'string') {
    return false;
  }

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  const ageSeconds = Math.abs(Math.floor(nowMs / 1000) - timestampNumber);
  if (ageSeconds > MAX_TIMESTAMP_SKEW_SECONDS) {
    return false;
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${crypto.createHmac('sha256', signingSecret).update(base).digest('hex')}`;

  return timingSafeStringEqual(expected, signature);
}

export function requireSlackRequest(req, res, next) {
  if (!env.slackSigningSecret) {
    return res.status(503).json({ error: 'Slack Signing Secret não configurado.' });
  }

  const ok = verifySlackRequest({
    signingSecret: env.slackSigningSecret,
    timestamp: req.headers['x-slack-request-timestamp'],
    signature: req.headers['x-slack-signature'],
    rawBody: req.rawBody || ''
  });

  if (!ok) {
    return res.status(401).json({ error: 'Assinatura Slack inválida.' });
  }

  next();
}

function timingSafeStringEqual(expected, actual) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(String(actual || ''));

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

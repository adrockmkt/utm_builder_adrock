import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5101),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5174',
  corsOrigin: process.env.CORS_ORIGIN || process.env.APP_BASE_URL || 'http://localhost:5174',
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/adrock_utm_builder',
  databaseAllowLocal: process.env.DATABASE_ALLOW_LOCAL === 'true',
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 300),
  backupDir: process.env.BACKUP_DIR || '/var/backups/utm_builder',
  bitlyEnabled: process.env.BITLY_ENABLED === 'true',
  bitlyAccessToken: process.env.BITLY_ACCESS_TOKEN || '',
  bitlyGroupGuid: process.env.BITLY_GROUP_GUID || '',
  bitlyDomain: process.env.BITLY_DOMAIN || 'bit.ly',
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET || '',
  slackBotToken: process.env.SLACK_BOT_TOKEN || '',
  slackAllowedTeamId: process.env.SLACK_ALLOWED_TEAM_ID || ''
};

if (env.nodeEnv === 'production') {
  const weakSecret = !env.jwtSecret || env.jwtSecret === 'change-me' || env.jwtSecret.length < 32;
  const localDatabase = env.databaseUrl.includes('localhost') || env.databaseUrl.includes('127.0.0.1');

  if (weakSecret) {
    throw new Error('JWT_SECRET must be set to a strong value in production.');
  }

  if (localDatabase && !env.databaseAllowLocal) {
    throw new Error('DATABASE_URL must point to the production PostgreSQL database or DATABASE_ALLOW_LOCAL must be true.');
  }

  if (env.bitlyEnabled && (!env.bitlyAccessToken || !env.bitlyGroupGuid)) {
    throw new Error('BITLY_ACCESS_TOKEN and BITLY_GROUP_GUID must be set when BITLY_ENABLED=true.');
  }
}

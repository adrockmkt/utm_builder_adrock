import { pool } from '../db/pool.js';

export const FEATURE_FLAGS = {
  slackIntegration: 'slack_integration_enabled'
};

export async function isFeatureEnabled(poolLike, flagKey) {
  const result = await poolLike.query(
    `select value
     from app_settings
     where key = $1`,
    [flagKey]
  );

  return result.rows[0]?.value === 'true';
}

export function requireFeatureFlag(flagKey) {
  return async (_req, res, next) => {
    if (!(await isFeatureEnabled(pool, flagKey))) {
      return res.status(403).json({ error: 'Feature indisponível nesta instalação.' });
    }

    next();
  };
}

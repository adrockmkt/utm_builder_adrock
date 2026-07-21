import { pool } from '../db/pool.js';
import { generateId } from './security.js';

export async function logAudit({ req, actorUserId, action, entityType, entityId = null, metadata = {} }) {
  await pool.query(
    `insert into audit_logs
      (id, actor_user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
     values
      ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      generateId(),
      actorUserId || req?.auth?.user?.id || null,
      action,
      entityType,
      entityId,
      JSON.stringify(metadata),
      req?.ip || null,
      req?.headers?.['user-agent'] || null
    ]
  );
}

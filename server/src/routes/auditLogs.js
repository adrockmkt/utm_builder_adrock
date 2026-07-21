import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', async (_req, res) => {
  const result = await pool.query(
    `select a.id,
            a.action,
            a.entity_type,
            a.entity_id,
            a.metadata,
            a.ip_address,
            a.user_agent,
            a.created_at,
            u.name as actor_name,
            u.email as actor_email
     from audit_logs a
     left join users u on u.id = a.actor_user_id
     order by a.created_at desc
     limit 500`
  );

  res.json(result.rows);
});

export default router;

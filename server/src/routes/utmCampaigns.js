import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { generateId } from '../utils/security.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const result = await pool.query(
    `select c.*,
            count(l.id)::int as links_count
     from utm_campaigns c
     left join utm_links l on l.campaign_id = c.id
     group by c.id
     order by c.created_at desc`
  );

  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name, type, mainChannel, defaultSource, defaultMedium, startsAt, endsAt, status, description } = req.body;
  if (!name || !type || !status) {
    return res.status(400).json({ error: 'Nome, tipo e status são obrigatórios.' });
  }

  const id = generateId();
  const slug = String(name).trim().toLowerCase().replace(/\s+/g, '_');

  await pool.query(
    `insert into utm_campaigns
      (id, name, slug, tenant_label, type, main_channel, default_source, default_medium, starts_at, ends_at, status, description, created_by)
     values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [id, name.trim(), slug, 'single-tenant', type, mainChannel || 'Multicanal', defaultSource || null, defaultMedium || null, startsAt || null, endsAt || null, status, description || null, req.auth.user.id]
  );
  await logAudit({
    req,
    action: 'campaign_created',
    entityType: 'utm_campaign',
    entityId: id,
    metadata: { name: name.trim(), slug, type, status }
  });

  res.status(201).json({ id });
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, mainChannel, defaultSource, defaultMedium, startsAt, endsAt, status, description } = req.body;

  await pool.query(
    `update utm_campaigns
     set name = coalesce($2, name),
         type = coalesce($3, type),
         main_channel = coalesce($4, main_channel),
         default_source = coalesce($5, default_source),
         default_medium = coalesce($6, default_medium),
         starts_at = coalesce($7, starts_at),
         ends_at = coalesce($8, ends_at),
         status = coalesce($9, status),
         description = coalesce($10, description),
         updated_at = now()
     where id = $1`,
    [id, name?.trim(), type, mainChannel, defaultSource, defaultMedium, startsAt, endsAt, status, description]
  );
  await logAudit({
    req,
    action: 'campaign_updated',
    entityType: 'utm_campaign',
    entityId: id,
    metadata: { name: name?.trim(), type, mainChannel, status }
  });

  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  await pool.query('delete from utm_campaigns where id = $1', [req.params.id]);
  await logAudit({
    req,
    action: 'campaign_deleted',
    entityType: 'utm_campaign',
    entityId: req.params.id
  });
  res.json({ success: true });
});

export default router;

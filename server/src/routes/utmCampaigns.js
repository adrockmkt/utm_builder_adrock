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
  const { name, clientName, type, mainChannel, defaultSource, defaultMedium, startsAt, endsAt, status, description } = req.body;
  if (!name || !type || !status) {
    return res.status(400).json({ error: 'Nome da campanha, tipo e status são obrigatórios.' });
  }

  const id = generateId();
  const slug = String(name).trim().toLowerCase().replace(/\s+/g, '_');

  await pool.query(
    `insert into utm_campaigns
      (id, name, slug, tenant_label, client_name, type, main_channel, default_source, default_medium, starts_at, ends_at, status, description, created_by)
     values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [id, name.trim(), slug, 'single-tenant', clientName?.trim() || null, type, mainChannel || 'Multicanal', defaultSource || null, defaultMedium || null, startsAt || null, endsAt || null, status, description || null, req.auth.user.id]
  );
  await logAudit({
    req,
    action: 'campaign_created',
    entityType: 'utm_campaign',
    entityId: id,
    metadata: { name: name.trim(), slug, clientName: clientName?.trim() || null, type, status }
  });

  res.status(201).json({ id });
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const { name, clientName, type, mainChannel, defaultSource, defaultMedium, startsAt, endsAt, status, description } = body;

  const existingResult = await pool.query('select * from utm_campaigns where id = $1', [id]);
  const existing = existingResult.rows[0];

  if (!existing) {
    return res.status(404).json({ error: 'Campanha não encontrada.' });
  }

  const nextName = hasOwn(body, 'name') ? name?.trim() : existing.name;
  if (!nextName) {
    return res.status(400).json({ error: 'Nome da campanha é obrigatório.' });
  }

  const nextSlug = hasOwn(body, 'name') ? String(nextName).trim().toLowerCase().replace(/\s+/g, '_') : existing.slug;
  const next = {
    name: nextName,
    slug: nextSlug,
    clientName: hasOwn(body, 'clientName') ? clientName?.trim() || null : existing.client_name,
    type: hasOwn(body, 'type') ? type : existing.type,
    mainChannel: hasOwn(body, 'mainChannel') ? mainChannel || 'Multicanal' : existing.main_channel,
    defaultSource: hasOwn(body, 'defaultSource') ? defaultSource || null : existing.default_source,
    defaultMedium: hasOwn(body, 'defaultMedium') ? defaultMedium || null : existing.default_medium,
    startsAt: hasOwn(body, 'startsAt') ? startsAt || null : existing.starts_at,
    endsAt: hasOwn(body, 'endsAt') ? endsAt || null : existing.ends_at,
    status: hasOwn(body, 'status') ? status : existing.status,
    description: hasOwn(body, 'description') ? description || null : existing.description
  };

  await pool.query(
    `update utm_campaigns
     set name = $2,
         slug = $3,
         client_name = $4,
         type = $5,
         main_channel = $6,
         default_source = $7,
         default_medium = $8,
         starts_at = $9,
         ends_at = $10,
         status = $11,
         description = $12,
         updated_at = now()
     where id = $1`,
    [id, next.name, next.slug, next.clientName, next.type, next.mainChannel, next.defaultSource, next.defaultMedium, next.startsAt, next.endsAt, next.status, next.description]
  );
  await logAudit({
    req,
    action: 'campaign_updated',
    entityType: 'utm_campaign',
    entityId: id,
    metadata: { name: next.name, slug: next.slug, clientName: next.clientName, type: next.type, mainChannel: next.mainChannel, status: next.status }
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

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export default router;

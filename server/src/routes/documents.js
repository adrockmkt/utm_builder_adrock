import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { generateId } from '../utils/security.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const result = await pool.query(
    `select d.*, u.name as created_by_name
     from document_links d
     left join users u on u.id = d.created_by
     order by d.created_at desc`
  );

  res.json(result.rows);
});

router.post('/', requireEditor, async (req, res) => {
  const title = String(req.body.title || '').trim();
  const url = String(req.body.url || '').trim();
  const description = String(req.body.description || '').trim();
  const category = String(req.body.category || '').trim();

  const validationError = validateDocument({ title, url });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const id = generateId();
  await pool.query(
    `insert into document_links (id, title, url, description, category, created_by)
     values ($1, $2, $3, $4, $5, $6)`,
    [id, title, url, description || null, category || null, req.auth.user.id]
  );
  await logAudit({
    req,
    action: 'document_link_created',
    entityType: 'document_link',
    entityId: id,
    metadata: { title, url, category: category || null }
  });

  res.status(201).json({ id });
});

router.patch('/:id', requireEditor, async (req, res) => {
  const { id } = req.params;
  const title = req.body.title === undefined ? undefined : String(req.body.title || '').trim();
  const url = req.body.url === undefined ? undefined : String(req.body.url || '').trim();
  const description = req.body.description === undefined ? undefined : String(req.body.description || '').trim();
  const category = req.body.category === undefined ? undefined : String(req.body.category || '').trim();

  const validationError = validateDocument({
    title: title === undefined ? 'ok' : title,
    url: url === undefined ? 'https://example.com' : url
  });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  await pool.query(
    `update document_links
     set title = coalesce($2, title),
         url = coalesce($3, url),
         description = coalesce($4, description),
         category = coalesce($5, category),
         updated_at = now()
     where id = $1`,
    [id, title, url, description, category]
  );
  await logAudit({
    req,
    action: 'document_link_updated',
    entityType: 'document_link',
    entityId: id,
    metadata: { title, url, category }
  });

  res.json({ success: true });
});

router.delete('/:id', requireEditor, async (req, res) => {
  await pool.query('delete from document_links where id = $1', [req.params.id]);
  await logAudit({
    req,
    action: 'document_link_deleted',
    entityType: 'document_link',
    entityId: req.params.id
  });

  res.json({ success: true });
});

function requireEditor(req, res, next) {
  if (!['admin', 'editor'].includes(req.auth?.user?.role)) {
    return res.status(403).json({ error: 'Acesso restrito a admin ou editor.' });
  }
  next();
}

function validateDocument({ title, url }) {
  if (!title || title.length > 120) {
    return 'Informe um nome entre 1 e 120 caracteres.';
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'Informe uma URL http ou https.';
    }
  } catch {
    return 'Informe uma URL válida.';
  }

  return null;
}

export default router;

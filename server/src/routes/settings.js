import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { generateId } from '../utils/security.js';

const router = Router();

router.get('/public-brand', async (_req, res) => {
  const appSettings = await loadBrandSettings();
  res.json(toBrandSettings(appSettings));
});

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const [optionsResult, presetsResult, appSettingsResult] = await Promise.all([
    pool.query(
      `select id, category, value, label, sort_order, is_active
       from select_options
       order by category, sort_order, label`
    ),
    pool.query(
      `select id, label, description, mediums, sources, default_source, default_medium, sort_order, is_active
       from utm_channel_presets
       order by sort_order, label`
    ),
    loadBrandSettings()
  ]);

  res.json({
    options: optionsResult.rows.map(toOptionRecord),
    channelPresets: presetsResult.rows.map(toChannelPresetRecord),
    brand: toBrandSettings(appSettingsResult)
  });
});

router.put('/brand', requireAdmin, async (req, res) => {
  const appName = String(req.body.appName || '').trim();

  if (!appName || appName.length > 80) {
    return res.status(400).json({ error: 'O nome do sistema deve ter entre 1 e 80 caracteres.' });
  }

  await pool.query(
    `insert into app_settings (key, value, updated_by, updated_at)
     values ('app_name', $1, $2, now())
     on conflict (key) do update
     set value = excluded.value,
         updated_by = excluded.updated_by,
         updated_at = now()`,
    [appName, req.auth.user.id]
  );
  await logAudit({
    req,
    action: 'brand_name_updated',
    entityType: 'app_setting',
    entityId: 'app_name'
  });

  res.json({ success: true });
});

router.put('/brand-logo', requireAdmin, async (req, res) => {
  const { dataUrl } = req.body;

  if (!dataUrl || !/^data:image\/(png|jpeg|webp);base64,/i.test(dataUrl)) {
    return res.status(400).json({ error: 'Envie uma imagem PNG, JPG ou WebP válida.' });
  }

  if (dataUrl.length > 1_500_000) {
    return res.status(400).json({ error: 'A logo deve ter até 1.5 MB.' });
  }

  await pool.query(
    `insert into app_settings (key, value, updated_by, updated_at)
     values ('top_logo_url', $1, $2, now())
     on conflict (key) do update
     set value = excluded.value,
         updated_by = excluded.updated_by,
         updated_at = now()`,
    [dataUrl, req.auth.user.id]
  );
  await logAudit({
    req,
    action: 'brand_logo_updated',
    entityType: 'app_setting',
    entityId: 'top_logo_url'
  });

  res.json({ success: true });
});

router.delete('/brand-logo', requireAdmin, async (req, res) => {
  await pool.query(
    `update app_settings
     set value = $1,
         updated_by = $2,
         updated_at = now()
     where key = 'top_logo_url'`,
    ['/utm-builder/adrock-logo.png', req.auth.user.id]
  );
  await logAudit({
    req,
    action: 'brand_logo_reset',
    entityType: 'app_setting',
    entityId: 'top_logo_url'
  });

  res.json({ success: true });
});

router.post('/options', requireAdmin, async (req, res) => {
  const { category, value, label, sortOrder = 0, isActive = true } = req.body;

  if (!category || !value || !label) {
    return res.status(400).json({ error: 'Categoria, valor e rótulo são obrigatórios.' });
  }

  const id = generateId();
  await pool.query(
    `insert into select_options (id, category, value, label, sort_order, is_active)
     values ($1, $2, $3, $4, $5, $6)`,
    [id, category, normalizeValue(value), label.trim(), Number(sortOrder) || 0, Boolean(isActive)]
  );
  await logAudit({
    req,
    action: 'select_option_created',
    entityType: 'select_option',
    entityId: id,
    metadata: { category, value: normalizeValue(value), label: label.trim() }
  });

  res.status(201).json({ id });
});

router.patch('/options/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { value, label, sortOrder, isActive } = req.body;

  await pool.query(
    `update select_options
     set value = coalesce($2, value),
         label = coalesce($3, label),
         sort_order = coalesce($4, sort_order),
         is_active = coalesce($5, is_active),
         updated_at = now()
     where id = $1`,
    [
      id,
      value ? normalizeValue(value) : null,
      label?.trim(),
      sortOrder === undefined ? null : Number(sortOrder) || 0,
      isActive === undefined ? null : Boolean(isActive)
    ]
  );
  await logAudit({
    req,
    action: 'select_option_updated',
    entityType: 'select_option',
    entityId: id,
    metadata: { value, label, sortOrder, isActive }
  });

  res.json({ success: true });
});

router.delete('/options/:id', requireAdmin, async (req, res) => {
  await pool.query('delete from select_options where id = $1', [req.params.id]);
  await logAudit({
    req,
    action: 'select_option_deleted',
    entityType: 'select_option',
    entityId: req.params.id
  });
  res.json({ success: true });
});

router.post('/channel-presets', requireAdmin, async (req, res) => {
  res.status(403).json({ error: 'Os canais GA4 seguem a lista oficial do Google Analytics e nao podem ser criados manualmente.' });
});

router.patch('/channel-presets/:id', requireAdmin, async (req, res) => {
  res.status(403).json({ error: 'Os canais GA4 seguem a lista oficial do Google Analytics e nao podem ser editados manualmente.' });
});

router.delete('/channel-presets/:id', requireAdmin, async (req, res) => {
  res.status(403).json({ error: 'Os canais GA4 seguem a lista oficial do Google Analytics e nao podem ser excluidos manualmente.' });
});

function toOptionRecord(row) {
  return {
    id: row.id,
    category: row.category,
    value: row.value,
    label: row.label,
    sortOrder: row.sort_order,
    isActive: row.is_active
  };
}

function toChannelPresetRecord(row) {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    mediums: row.mediums,
    sources: row.sources,
    defaultSource: row.default_source,
    defaultMedium: row.default_medium,
    sortOrder: row.sort_order,
    isActive: row.is_active
  };
}

async function loadBrandSettings() {
  const result = await pool.query(
    `select key, value
     from app_settings
     where key in ('top_logo_url', 'app_name')`
  );
  return Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
}

function toBrandSettings(appSettings) {
  return {
    appName: appSettings.app_name || 'Ad Rock UTM Builder',
    topLogoUrl: appSettings.top_logo_url || '/utm-builder/adrock-logo.png',
    topLogoSize: 56
  };
}

function normalizeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default router;

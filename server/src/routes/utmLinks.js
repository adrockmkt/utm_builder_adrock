import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { createBitlyLink, normalizeBackHalf } from '../utils/bitly.js';
import { generateId } from '../utils/security.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const result = await pool.query(
    `select l.*,
            c.name as campaign_name
     from utm_links l
     left join utm_campaigns c on c.id = l.campaign_id
     order by l.created_at desc`
  );

  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const {
    campaignId,
    baseUrl,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    utmId,
    finalUrl,
    internalName,
    actionType,
    destinationType,
    adGroupName,
    adType,
    notes
  } = req.body;

  if (!baseUrl || !utmSource || !utmMedium || !utmCampaign || !finalUrl) {
    return res.status(400).json({ error: 'Base URL, source, medium, campaign e final URL são obrigatórios.' });
  }

  const id = generateId();
  await pool.query(
    `insert into utm_links
      (id, campaign_id, base_url, utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_id, final_url, internal_name, action_type, destination_type, ad_group_name, ad_type, notes, created_by, last_validated_at)
     values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, now())`,
    [id, campaignId || null, baseUrl, utmSource, utmMedium, utmCampaign, utmTerm || null, utmContent || null, utmId || null, finalUrl, internalName || null, actionType || null, destinationType || null, adGroupName || null, adType || null, notes || null, req.auth.user.id]
  );
  await logAudit({
    req,
    action: 'link_created',
    entityType: 'utm_link',
    entityId: id,
    metadata: { campaignId: campaignId || null, finalUrl, utmSource, utmMedium, utmCampaign, adGroupName, adType }
  });

  res.status(201).json({ id });
});

router.post('/:id/bitly', async (req, res) => {
  const { id } = req.params;
  const customBackHalf = normalizeBackHalf(req.body?.customBackHalf);

  if (!customBackHalf) {
    return res.status(400).json({ error: 'Informe um nome curto válido para o bit.ly.' });
  }

  const result = await pool.query(
    `select id, final_url, internal_name, utm_campaign, bitly_url
     from utm_links
     where id = $1`,
    [id]
  );
  const link = result.rows[0];

  if (!link) {
    return res.status(404).json({ error: 'Link não encontrado.' });
  }

  if (link.bitly_url) {
    return res.status(409).json({ error: 'Este link já tem um Bitly gerado.' });
  }

  try {
    const bitly = await createBitlyLink({
      longUrl: link.final_url,
      customBackHalf,
      title: link.internal_name || link.utm_campaign || customBackHalf
    });

    await pool.query(
      `update utm_links
       set bitly_url = $2,
           bitly_id = $3,
           bitly_custom_back_half = $4,
           bitly_domain = $5,
           bitly_created_at = $6,
           bitly_error = null,
           updated_at = now()
       where id = $1`,
      [id, bitly.bitlyUrl, bitly.bitlyId, bitly.customBackHalf, bitly.domain, bitly.createdAt]
    );

    await logAudit({
      req,
      action: 'bitly_link_created',
      entityType: 'utm_link',
      entityId: id,
      metadata: { bitlyUrl: bitly.bitlyUrl, customBackHalf: bitly.customBackHalf }
    });

    return res.status(201).json({ success: true, ...bitly });
  } catch (error) {
    await pool.query(
      `update utm_links
       set bitly_error = $2,
           updated_at = now()
       where id = $1`,
      [id, error.message || 'Erro ao criar Bitly.']
    );

    await logAudit({
      req,
      action: 'bitly_link_failed',
      entityType: 'utm_link',
      entityId: id,
      metadata: { customBackHalf, error: error.message, details: error.details || null }
    });

    return res.status(error.statusCode || 502).json({ error: error.message || 'Erro ao criar Bitly.' });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { internalName, actionType, destinationType, adGroupName, adType, notes, campaignId } = req.body;

  await pool.query(
    `update utm_links
     set internal_name = coalesce($2, internal_name),
         action_type = coalesce($3, action_type),
         destination_type = coalesce($4, destination_type),
         ad_group_name = coalesce($5, ad_group_name),
         ad_type = coalesce($6, ad_type),
         notes = coalesce($7, notes),
         campaign_id = coalesce($8, campaign_id),
         updated_at = now()
     where id = $1`,
    [id, internalName, actionType, destinationType, adGroupName, adType, notes, campaignId]
  );
  await logAudit({
    req,
    action: 'link_updated',
    entityType: 'utm_link',
    entityId: id,
    metadata: { internalName, actionType, destinationType, adGroupName, adType, campaignId }
  });

  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  await pool.query('delete from utm_links where id = $1', [req.params.id]);
  await logAudit({
    req,
    action: 'link_deleted',
    entityType: 'utm_link',
    entityId: req.params.id
  });
  res.json({ success: true });
});

export default router;

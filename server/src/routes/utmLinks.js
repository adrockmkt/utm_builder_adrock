import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { createBitlyLink, normalizeBackHalf, updateBitlyDestination } from '../utils/bitly.js';
import { generateId } from '../utils/security.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const result = await pool.query(
    `select l.*,
            c.name as campaign_name,
            c.client_name as campaign_client_name
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
  const body = req.body || {};
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
    notes,
    syncBitlyDestination
  } = body;

  const existingResult = await pool.query('select * from utm_links where id = $1', [id]);
  const existing = existingResult.rows[0];

  if (!existing) {
    return res.status(404).json({ error: 'Link não encontrado.' });
  }

  const next = {
    campaignId: hasOwn(body, 'campaignId') ? campaignId || null : existing.campaign_id,
    baseUrl: hasOwn(body, 'baseUrl') ? baseUrl : existing.base_url,
    utmSource: hasOwn(body, 'utmSource') ? utmSource : existing.utm_source,
    utmMedium: hasOwn(body, 'utmMedium') ? utmMedium : existing.utm_medium,
    utmCampaign: hasOwn(body, 'utmCampaign') ? utmCampaign : existing.utm_campaign,
    utmTerm: hasOwn(body, 'utmTerm') ? utmTerm || null : existing.utm_term,
    utmContent: hasOwn(body, 'utmContent') ? utmContent || null : existing.utm_content,
    utmId: hasOwn(body, 'utmId') ? utmId || null : existing.utm_id,
    finalUrl: hasOwn(body, 'finalUrl') ? finalUrl : existing.final_url,
    internalName: hasOwn(body, 'internalName') ? internalName || null : existing.internal_name,
    actionType: hasOwn(body, 'actionType') ? actionType || null : existing.action_type,
    destinationType: hasOwn(body, 'destinationType') ? destinationType || null : existing.destination_type,
    adGroupName: hasOwn(body, 'adGroupName') ? adGroupName || null : existing.ad_group_name,
    adType: hasOwn(body, 'adType') ? adType || null : existing.ad_type,
    notes: hasOwn(body, 'notes') ? notes || null : existing.notes
  };

  if (!next.baseUrl || !next.utmSource || !next.utmMedium || !next.utmCampaign || !next.finalUrl) {
    return res.status(400).json({ error: 'Base URL, source, medium, campaign e final URL são obrigatórios.' });
  }

  const finalUrlChanged = next.finalUrl !== existing.final_url;

  await pool.query(
    `update utm_links
     set campaign_id = $2,
         base_url = $3,
         utm_source = $4,
         utm_medium = $5,
         utm_campaign = $6,
         utm_term = $7,
         utm_content = $8,
         utm_id = $9,
         final_url = $10,
         internal_name = $11,
         action_type = $12,
         destination_type = $13,
         ad_group_name = $14,
         ad_type = $15,
         notes = $16,
         bitly_error = case when $17::boolean then bitly_error else null end,
         updated_at = now()
     where id = $1`,
    [
      id,
      next.campaignId,
      next.baseUrl,
      next.utmSource,
      next.utmMedium,
      next.utmCampaign,
      next.utmTerm,
      next.utmContent,
      next.utmId,
      next.finalUrl,
      next.internalName,
      next.actionType,
      next.destinationType,
      next.adGroupName,
      next.adType,
      next.notes,
      Boolean(syncBitlyDestination && finalUrlChanged && existing.bitly_id)
    ]
  );

  let bitlyUpdate = null;
  if (syncBitlyDestination && finalUrlChanged && existing.bitly_id) {
    try {
      bitlyUpdate = await updateBitlyDestination({
        bitlyId: existing.bitly_id,
        bitlyUrl: existing.bitly_url,
        longUrl: next.finalUrl,
        title: next.internalName || next.utmCampaign
      });

      await pool.query(
        `update utm_links
         set bitly_url = coalesce($2, bitly_url),
             bitly_id = coalesce($3, bitly_id),
             bitly_error = null,
             updated_at = now()
         where id = $1`,
        [id, bitlyUpdate.bitlyUrl, bitlyUpdate.bitlyId]
      );
    } catch (error) {
      await pool.query(
        `update utm_links
         set bitly_error = $2,
             updated_at = now()
         where id = $1`,
        [id, error.message || 'Link salvo, mas não foi possível atualizar o destino do Bitly.']
      );

      await logAudit({
        req,
        action: 'bitly_destination_update_failed',
        entityType: 'utm_link',
        entityId: id,
        metadata: { error: error.message, details: error.details || null }
      });

      return res.status(error.statusCode || 502).json({
        error: error.message || 'Link salvo, mas não foi possível atualizar o destino do Bitly.'
      });
    }
  }

  await logAudit({
    req,
    action: 'link_updated',
    entityType: 'utm_link',
    entityId: id,
    metadata: {
      campaignId: next.campaignId,
      finalUrl: next.finalUrl,
      finalUrlChanged,
      bitlyDestinationUpdated: Boolean(bitlyUpdate),
      internalName: next.internalName,
      actionType: next.actionType,
      destinationType: next.destinationType,
      adGroupName: next.adGroupName,
      adType: next.adType
    }
  });

  res.json({ success: true, bitlyUpdated: Boolean(bitlyUpdate) });
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

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

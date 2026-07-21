import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { toCsv } from '../utils/csv.js';

const router = Router();

router.use(requireAuth);

router.get('/utm-links.csv', async (_req, res) => {
  const result = await pool.query(
    `select l.created_at,
            l.internal_name,
            c.name as campaign_name,
            l.base_url,
            l.utm_source,
            l.utm_medium,
            l.utm_campaign,
            l.utm_term,
            l.utm_content,
            l.utm_id,
            l.final_url,
            l.action_type,
            l.destination_type,
            l.ad_group_name,
            l.ad_type,
            l.notes
     from utm_links l
     left join utm_campaigns c on c.id = l.campaign_id
     order by l.created_at desc`
  );

  const csv = toCsv(result.rows, [
    { key: 'created_at', label: 'Criado em' },
    { key: 'internal_name', label: 'Nome interno' },
    { key: 'campaign_name', label: 'Campanha' },
    { key: 'base_url', label: 'URL base' },
    { key: 'utm_source', label: 'utm_source' },
    { key: 'utm_medium', label: 'utm_medium' },
    { key: 'utm_campaign', label: 'utm_campaign' },
    { key: 'utm_term', label: 'utm_term' },
    { key: 'utm_content', label: 'utm_content' },
    { key: 'utm_id', label: 'utm_id' },
    { key: 'final_url', label: 'URL final' },
    { key: 'action_type', label: 'Tipo de acao' },
    { key: 'destination_type', label: 'Destino' },
    { key: 'ad_group_name', label: 'Grupo de anuncio' },
    { key: 'ad_type', label: 'Tipo de anuncio' },
    { key: 'notes', label: 'Observacoes' }
  ]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="utm-links.csv"');
  res.send(csv);
});

router.get('/utm-campaigns.csv', async (_req, res) => {
  const result = await pool.query(
    `select c.created_at,
            c.name,
            c.slug,
            c.type,
            c.main_channel,
            c.default_source,
            c.default_medium,
            c.starts_at,
            c.ends_at,
            c.status,
            c.description,
            count(l.id)::int as links_count
     from utm_campaigns c
     left join utm_links l on l.campaign_id = c.id
     group by c.id
     order by c.created_at desc`
  );

  const csv = toCsv(result.rows, [
    { key: 'created_at', label: 'Criado em' },
    { key: 'name', label: 'Nome' },
    { key: 'slug', label: 'Slug' },
    { key: 'type', label: 'Tipo' },
    { key: 'main_channel', label: 'Canal principal' },
    { key: 'default_source', label: 'Source padrao' },
    { key: 'default_medium', label: 'Medium padrao' },
    { key: 'starts_at', label: 'Inicio' },
    { key: 'ends_at', label: 'Fim' },
    { key: 'status', label: 'Status' },
    { key: 'description', label: 'Descricao' },
    { key: 'links_count', label: 'Links' }
  ]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="utm-campaigns.csv"');
  res.send(csv);
});

export default router;

import { Router, urlencoded } from 'express';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { FEATURE_FLAGS, requireFeatureFlag } from '../services/featureFlags.js';
import { requireSlackRequest } from '../services/slackSecurity.js';
import { buildUtmUrl } from '../services/utmEngine.js';

const router = Router();
const rawUrlEncodedParser = urlencoded({
  extended: false,
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
});

const FALLBACK_OPTIONS = {
  action_type: choiceList(['post_patrocinado', 'banner_portal', 'newsletter', 'email_fluxo', 'paid_social', 'paid_search', 'parceria']),
  destination_type: choiceList(['lp', 'landing_page', 'site', 'blog', 'whatsapp']),
  ad_type: choiceList([
    'whatsapp_canal',
    'whatsapp_comunidade_socioemocional',
    'whatsapp_comunidade_antirracista',
    'whatsapp_comunidade_tecnologia',
    'whatsapp_comunidade_metodologias_ativas',
    'newsletter_semanal',
    'newsletter_gestao',
    'newsletter_comercial',
    'instagram',
    'facebook',
    'linkedin',
    'video',
    'landing_page',
    'infografico',
    'materia',
    'ebook',
    'webstory',
    'podcast',
    'jogo',
    'webinario',
    'text_ad',
    'image_ad',
    'story_ad',
    'lead_ad',
    'video_ad',
    'display_ad',
    'shopping_ad'
  ]),
  utm_term: choiceList([
    'ec_canal',
    'ec_relacionamento',
    'ec_grupo_ea',
    'ec_facebook',
    'ec_grupo_es',
    'ec_grupo_crm',
    'newsletter_premio',
    'ec_aquisicao',
    'email_58_trap_texto_d1',
    'email_58_trap_texto_d2',
    'coluna_debora_garofalo',
    'abertura_inscricoes',
    'agosto_datas',
    'alfabetizacao_algoritmica',
    'atualidades_curriculo',
    'banner_premio_site',
    'bncc_computacao1',
    'dicas_escola',
    'entrevista_gustavo_estanislau',
    'formulario_premio',
    'site_efemerides_agosto',
    'site_porvir',
    'stories_premio'
  ]),
  utm_content: choiceList([
    'blog',
    'materia',
    'reportagem',
    'artigo',
    'agenda',
    'gestao',
    'biblioteca',
    'glossario',
    'festival',
    'premio',
    'video',
    'link_bio',
    'stories',
    'reels',
    'manychat',
    'timeline',
    'botao',
    'feed',
    'texto_abertura',
    'destaque1',
    'destaque2',
    'miniatura1',
    'miniatura2',
    'miniatura3',
    'aspas',
    'dica_leitura1',
    'dica_leitura2',
    'story1',
    'story2',
    'story3',
    'banner1',
    'banner2',
    'banner3',
    'banner_parceiro',
    'banner_abertura',
    'botao1',
    'botao2',
    'canal',
    'comunidade_socioemocional',
    'comunidade_antirracista',
    'comunidade_tecnologia',
    'comunidade_metodologias_ativas'
  ]),
  utm_id: choiceList([
    'curso_ed_antirracista_fundamentos',
    'curso_ed_antirracista_praticas',
    'material_rap_feminino',
    'curso_comp_digitais_lp_em',
    'lp_ebook_enem',
    'texto_01',
    'texto_02',
    'img_01',
    'img_02',
    'botao_01',
    'botao_02',
    'banner_01',
    'banner_02',
    'catalogo',
    'canal'
  ])
};

router.post(
  '/commands',
  rawUrlEncodedParser,
  requireFeatureFlag(FEATURE_FLAGS.slackIntegration),
  requireSlackRequest,
  requireAllowedTeam,
  async (req, res) => {
    const values = parseSlashCommandText(req.body?.text || '');

    if (Object.keys(values).length === 0) {
      if (env.slackBotToken && req.body?.trigger_id) {
        try {
          await openSlackModal(buildUtmBuilderModal(req.body.trigger_id, await loadSlackFormCatalog()));
          return res.status(200).send();
        } catch (error) {
          console.error('Failed to open Slack UTM modal', error);
        }
      }

      return res.json(buildHelpResponse());
    }

    return res.json(buildPreviewResponse(values));
  }
);

router.post(
  '/interactions',
  rawUrlEncodedParser,
  requireFeatureFlag(FEATURE_FLAGS.slackIntegration),
  requireSlackRequest,
  (req, res) => {
    const payload = parseInteractionPayload(req.body?.payload);

    if (!payload) {
      return res.status(400).json({ error: 'Payload Slack inválido.' });
    }

    if (payload.type === 'view_submission' && payload.view?.callback_id === 'utm_builder_modal') {
      return res.json({
        response_action: 'update',
        view: buildModalPreviewView(payload.view)
      });
    }

    return res.status(200).send();
  }
);

export function parseSlashCommandText(text = '') {
  const values = {};
  const pattern = /(\w+)=("([^"]*)"|'([^']*)'|(\S+))/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const key = match[1];
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    values[key] = value;
  }

  return values;
}

export async function loadSlackFormCatalog(poolLike = pool) {
  const [optionsResult, presetsResult, campaignsResult] = await Promise.all([
    poolLike.query(
      `select category, value, label
       from select_options
       where is_active = true
         and category in ('action_type', 'destination_type', 'ad_type', 'utm_term', 'utm_content', 'utm_id')
       order by category, sort_order, label`
    ),
    poolLike.query(
      `select sources, mediums
       from utm_channel_presets
       where is_active = true
       order by sort_order, label`
    ),
    poolLike.query(
      `select name, slug, client_name
       from utm_campaigns
       where type = 'campanha'
       order by created_at desc
       limit 100`
    )
  ]);

  const optionsByCategory = {};
  for (const row of optionsResult.rows) {
    optionsByCategory[row.category] ||= [];
    optionsByCategory[row.category].push(toSlackChoice(row));
  }
  for (const [category, fallbackOptions] of Object.entries(FALLBACK_OPTIONS)) {
    if (!optionsByCategory[category] || optionsByCategory[category].length === 0) {
      optionsByCategory[category] = fallbackOptions;
    }
  }

  return {
    sources: uniqueChoices(presetsResult.rows.flatMap((row) => row.sources || [])),
    mediums: uniqueChoices(presetsResult.rows.flatMap((row) => row.mediums || [])),
    campaigns: campaignsResult.rows.map((row) => ({
      label: row.client_name ? `${row.client_name} - ${row.name}` : row.name,
      value: row.slug
    })),
    optionsByCategory
  };
}

export function buildUtmBuilderModal(triggerId, catalog = {}) {
  const optionsByCategory = catalog.optionsByCategory || {};
  return {
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'utm_builder_modal',
      title: plainText('UTM Builder'),
      submit: plainText('Gerar preview'),
      close: plainText('Cancelar'),
      blocks: [
        staticSelectBlock('context_type', 'Contexto do link', [
          { label: 'Link pontual', value: 'pontual' },
          { label: 'Campanha', value: 'campanha' }
        ]),
        optionalStaticSelectBlock('campaign_select', 'Campanha cadastrada', catalog.campaigns || []),
        textInputBlock('base_url', 'URL Base', 'https://cliente.com/produto'),
        selectOrTextBlock('utm_source', 'Campaign Source (utm_source)', catalog.sources, 'google'),
        selectOrTextBlock('utm_medium', 'Campaign Medium (utm_medium)', catalog.mediums, 'cpc'),
        textInputBlock('utm_campaign', 'utm_campaign', 'campanha_teste'),
        selectOrTextBlock('utm_term', 'utm_term / grupo de anúncio', optionsByCategory.utm_term, 'remarketing_30d', true),
        selectOrTextBlock('utm_content', 'utm_content / peça', optionsByCategory.utm_content, 'banner_home', true),
        selectOrTextBlock('utm_id', 'utm_id / identificador', optionsByCategory.utm_id, 'criativo_01', true),
        textInputBlock('internal_name', 'Nome interno do link', 'post_patrocinado_cliente', true),
        optionalStaticSelectBlock('action_type', 'Tipo de ação', optionsByCategory.action_type || []),
        optionalStaticSelectBlock('ad_type', 'Tipo de anúncio/formato', optionsByCategory.ad_type || []),
        optionalStaticSelectBlock('destination_type', 'Destino', optionsByCategory.destination_type || []),
        textInputBlock('notes', 'Observações', 'Contexto operacional, placement, restrição...', true, true)
      ].filter(Boolean)
    }
  };
}

export function buildModalPreviewView(view) {
  const values = extractModalValues(view);
  const preview = buildPreviewResponse({
    url: values.baseUrl,
    source: values.utmSource,
    medium: values.utmMedium,
    campaign: values.selectedCampaignSlug || values.utmCampaign,
    term: values.utmTerm,
    content: values.utmContent,
    id: values.utmId
  });

  return {
    type: 'modal',
    callback_id: 'utm_builder_preview',
    title: plainText('Preview UTM'),
    close: plainText('Fechar'),
    blocks: [
      markdownSection('*Preview de URL UTM:*'),
      markdownSection(preview.text.replace('Preview de URL UTM:\n', '')),
      markdownSection([
        '*Campos recebidos:*',
        `Tipo: ${values.contextType === 'campanha' ? 'Campanha' : 'Link pontual'}`,
        `Campanha cadastrada: ${values.selectedCampaignSlug || 'não selecionada'}`,
        `Nome interno: ${values.internalName || 'não informado'}`,
        `Tipo de ação: ${values.actionType || 'não selecionado'}`,
        `Formato: ${values.adType || 'não selecionado'}`,
        `Destino: ${values.destinationType || 'não selecionado'}`,
        `Observações: ${values.notes || 'sem observações'}`
      ].join('\n'))
    ]
  };
}

export function buildHelpResponse() {
  return {
    response_type: 'ephemeral',
    text: [
      'Que tipo de link voce quer criar?',
      '',
      '1. Link pontual',
      '2. Link de campanha',
      '',
      'MVP de homologacao: envie um preview com:',
      '`/utm url=https://exemplo.com source=google medium=cpc campaign=campanha_teste content=banner_home id=criativo_01`'
    ].join('\n')
  };
}

export function buildPreviewResponse(values) {
  try {
    const result = buildUtmUrl({
      baseUrl: values.url,
      utmSource: values.source,
      utmMedium: values.medium,
      utmCampaign: values.campaign,
      utmTerm: values.term,
      utmContent: values.content,
      utmId: values.id
    });

    return {
      response_type: 'ephemeral',
      text: [
        'Preview de URL UTM:',
        result.finalUrl,
        '',
        'Este MVP ainda nao salva o link. A proxima etapa liga este preview ao cadastro com auditoria Slack.'
      ].join('\n')
    };
  } catch (error) {
    return {
      response_type: 'ephemeral',
      text: `Nao consegui gerar o preview: ${error.message}`
    };
  }
}

function parseInteractionPayload(payload) {
  try {
    return JSON.parse(payload || '');
  } catch {
    return null;
  }
}

async function openSlackModal(modal) {
  const response = await fetch('https://slack.com/api/views.open', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.slackBotToken}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(modal)
  });
  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body.error || `Slack views.open falhou com status ${response.status}`);
  }
}

function extractModalValues(view) {
  return {
    contextType: readModalValue(view, 'context_type') || 'pontual',
    selectedCampaignSlug: readModalValue(view, 'campaign_select'),
    baseUrl: readModalValue(view, 'base_url'),
    utmSource: readModalValue(view, 'utm_source'),
    utmMedium: readModalValue(view, 'utm_medium'),
    utmCampaign: readModalValue(view, 'utm_campaign'),
    utmTerm: readModalValue(view, 'utm_term'),
    utmContent: readModalValue(view, 'utm_content'),
    utmId: readModalValue(view, 'utm_id'),
    internalName: readModalValue(view, 'internal_name'),
    actionType: readModalValue(view, 'action_type'),
    adType: readModalValue(view, 'ad_type'),
    destinationType: readModalValue(view, 'destination_type'),
    notes: readModalValue(view, 'notes')
  };
}

function readModalValue(view, blockId) {
  const block = view?.state?.values?.[blockId];
  const action = block ? Object.values(block)[0] : null;

  return action?.selected_option?.value ?? action?.value ?? '';
}

function textInputBlock(blockId, label, placeholder, optional = false, multiline = false) {
  return {
    type: 'input',
    block_id: blockId,
    optional,
    label: plainText(label),
    element: {
      type: 'plain_text_input',
      action_id: 'value',
      multiline,
      placeholder: plainText(placeholder)
    }
  };
}

function selectOrTextBlock(blockId, label, choices = [], placeholder, optional = false) {
  if (!choices || choices.length === 0) {
    return textInputBlock(blockId, label, placeholder, optional);
  }

  return staticSelectBlock(blockId, label, choices, optional);
}

function optionalStaticSelectBlock(blockId, label, choices = []) {
  if (!choices || choices.length === 0) {
    return null;
  }

  return staticSelectBlock(blockId, label, choices, true);
}

function staticSelectBlock(blockId, label, choices, optional = false) {
  const normalizedOptions = choices.slice(0, 100).map((choice) => option(choice.label, choice.value));

  return {
    type: 'input',
    block_id: blockId,
    optional,
    label: plainText(label),
    element: {
      type: 'static_select',
      action_id: 'value',
      placeholder: plainText('Selecione'),
      options: normalizedOptions,
      ...(optional ? {} : { initial_option: normalizedOptions[0] })
    }
  };
}

function option(text, value) {
  return {
    text: plainText(truncateSlackText(text, 75)),
    value: truncateSlackText(value, 75)
  };
}

function plainText(text) {
  return {
    type: 'plain_text',
    text
  };
}

function markdownSection(text) {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text
    }
  };
}

function uniqueChoices(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 100)
    .map((value) => ({ label: value, value }));
}

function choiceList(values) {
  return values.map((value) => ({ label: value, value }));
}

function toSlackChoice(row) {
  return {
    label: row.label || row.value,
    value: row.value
  };
}

function truncateSlackText(value, maxLength) {
  const text = String(value || '');
  return text.length <= maxLength ? text : text.slice(0, maxLength);
}

function requireAllowedTeam(req, res, next) {
  if (env.slackAllowedTeamId && req.body?.team_id !== env.slackAllowedTeamId) {
    return res.status(403).json({ error: 'Workspace Slack não autorizado.' });
  }

  next();
}

export default router;

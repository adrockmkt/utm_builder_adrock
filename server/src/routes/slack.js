import { Router, urlencoded } from 'express';
import { env } from '../config/env.js';
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
          await openSlackModal(buildUtmBuilderModal(req.body.trigger_id));
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

export function buildUtmBuilderModal(triggerId) {
  return {
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'utm_builder_modal',
      title: plainText('UTM Builder'),
      submit: plainText('Gerar preview'),
      close: plainText('Cancelar'),
      blocks: [
        {
          type: 'input',
          block_id: 'context_type',
          label: plainText('Contexto do link'),
          element: {
            type: 'static_select',
            action_id: 'value',
            initial_option: option('Link pontual', 'pontual'),
            options: [
              option('Link pontual', 'pontual'),
              option('Campanha', 'campanha')
            ]
          }
        },
        textInputBlock('base_url', 'URL Base', 'https://cliente.com/produto'),
        textInputBlock('utm_source', 'Campaign Source (utm_source)', 'google'),
        textInputBlock('utm_medium', 'Campaign Medium (utm_medium)', 'cpc'),
        textInputBlock('utm_campaign', 'utm_campaign', 'campanha_teste'),
        textInputBlock('utm_term', 'utm_term / grupo de anúncio', 'remarketing_30d', true),
        textInputBlock('utm_content', 'utm_content / peça', 'banner_home', true),
        textInputBlock('utm_id', 'utm_id / identificador', 'criativo_01', true),
        textInputBlock('internal_name', 'Nome interno do link', 'post_patrocinado_cliente', true),
        textInputBlock('notes', 'Observações', 'Contexto operacional, placement, restrição...', true, true)
      ]
    }
  };
}

export function buildModalPreviewView(view) {
  const values = extractModalValues(view);
  const preview = buildPreviewResponse({
    url: values.baseUrl,
    source: values.utmSource,
    medium: values.utmMedium,
    campaign: values.utmCampaign,
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
        `Nome interno: ${values.internalName || 'não informado'}`,
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
    baseUrl: readModalValue(view, 'base_url'),
    utmSource: readModalValue(view, 'utm_source'),
    utmMedium: readModalValue(view, 'utm_medium'),
    utmCampaign: readModalValue(view, 'utm_campaign'),
    utmTerm: readModalValue(view, 'utm_term'),
    utmContent: readModalValue(view, 'utm_content'),
    utmId: readModalValue(view, 'utm_id'),
    internalName: readModalValue(view, 'internal_name'),
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

function option(text, value) {
  return {
    text: plainText(text),
    value
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

function requireAllowedTeam(req, res, next) {
  if (env.slackAllowedTeamId && req.body?.team_id !== env.slackAllowedTeamId) {
    return res.status(403).json({ error: 'Workspace Slack não autorizado.' });
  }

  next();
}

export default router;

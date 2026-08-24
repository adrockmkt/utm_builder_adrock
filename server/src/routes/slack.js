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
  (req, res) => {
    const values = parseSlashCommandText(req.body?.text || '');

    if (Object.keys(values).length === 0) {
      return res.json(buildHelpResponse());
    }

    return res.json(buildPreviewResponse(values));
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

function requireAllowedTeam(req, res, next) {
  if (env.slackAllowedTeamId && req.body?.team_id !== env.slackAllowedTeamId) {
    return res.status(403).json({ error: 'Workspace Slack não autorizado.' });
  }

  next();
}

export default router;

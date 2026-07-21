export interface UTMParams {
  url: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  id: string;
}

export interface UTMFieldGuide {
  key: keyof UTMParams;
  label: string;
  required?: boolean;
  example: string;
  helper: string;
  recommendedMax: number;
}

export interface UTMValidationIssue {
  field: keyof UTMParams | 'url';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: UTMValidationIssue[];
  warnings: UTMValidationIssue[];
  channelGrouping: string;
  matchedPresetId: string | null;
  matchedPresetLabel: string | null;
  normalizedValues: Partial<UTMParams>;
}

export interface ChannelPreset {
  id: string;
  label: string;
  description: string;
  mediums: string[];
  sources: string[];
  defaultSource: string;
  defaultMedium: string;
}

export const CHANNEL_PRESETS: ChannelPreset[] = [
  {
    id: 'affiliates',
    label: 'Affiliates',
    description: 'Canal oficial do GA4 para tráfego por links em sites de afiliados.',
    mediums: ['affiliate'],
    sources: ['affiliate', 'affiliate_network', 'partner'],
    defaultSource: 'affiliate',
    defaultMedium: 'affiliate'
  },
  {
    id: 'ai-assistants',
    label: 'AI Assistants',
    description: 'Canal oficial do GA4 para tráfego vindo de assistentes de IA, usando medium ai-assistant.',
    mediums: ['ai-assistant'],
    sources: ['chatgpt', 'gemini', 'deepseek', 'copilot', 'grok'],
    defaultSource: 'chatgpt',
    defaultMedium: 'ai-assistant'
  },
  {
    id: 'audio',
    label: 'Audio',
    description: 'Canal oficial do GA4 para anúncios em plataformas de áudio, como podcasts.',
    mediums: ['audio'],
    sources: ['spotify', 'podcast', 'audio'],
    defaultSource: 'spotify',
    defaultMedium: 'audio'
  },
  {
    id: 'cross-network',
    label: 'Cross-network',
    description: 'Canal oficial do GA4 para campanhas que rodam em várias redes, como Performance Max e Demand Gen.',
    mediums: ['cross-network'],
    sources: ['google'],
    defaultSource: 'google',
    defaultMedium: 'cross-network'
  },
  {
    id: 'direct',
    label: 'Direct',
    description: 'Canal oficial do GA4 para acesso direto. Em links UTM, normalmente não deve ser marcado manualmente.',
    mediums: ['none', 'not_set'],
    sources: ['direct'],
    defaultSource: 'direct',
    defaultMedium: 'none'
  },
  {
    id: 'display',
    label: 'Display',
    description: 'Canal oficial do GA4 para display ads, banners, interstitials e CPM.',
    mediums: ['display', 'banner', 'expandable', 'interstitial', 'cpm'],
    sources: ['google', 'dv360', 'programmatic'],
    defaultSource: 'google',
    defaultMedium: 'display'
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Canal oficial do GA4 para tráfego identificado por source ou medium de email.',
    mediums: ['email', 'e-mail', 'e_mail'],
    sources: ['email', 'e-mail', 'e_mail', 'newsletter'],
    defaultSource: 'email',
    defaultMedium: 'email'
  },
  {
    id: 'mobile-push-notifications',
    label: 'Mobile Push Notifications',
    description: 'Canal oficial do GA4 para links de notificações push/mobile.',
    mediums: ['push', 'mobile_push', 'notification'],
    sources: ['firebase', 'push', 'mobile'],
    defaultSource: 'firebase',
    defaultMedium: 'push'
  },
  {
    id: 'organic-search',
    label: 'Organic Search',
    description: 'Canal oficial do GA4 para tráfego de busca orgânica.',
    mediums: ['organic'],
    sources: ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu', 'yandex'],
    defaultSource: 'google',
    defaultMedium: 'organic'
  },
  {
    id: 'organic-shopping',
    label: 'Organic Shopping',
    description: 'Canal oficial do GA4 para tráfego orgânico vindo de sites de shopping ou campanhas com shopping no nome.',
    mediums: ['organic'],
    sources: ['shopping', 'google_shopping', 'amazon', 'ebay'],
    defaultSource: 'google_shopping',
    defaultMedium: 'organic'
  },
  {
    id: 'organic-social',
    label: 'Organic Social',
    description: 'Canal oficial do GA4 para tráfego orgânico de redes sociais.',
    mediums: ['social_media'],
    sources: ['facebook', 'instagram', 'linkedin', 'tiktok', 'pinterest', 'x', 'twitter', 'reddit', 'whatsapp'],
    defaultSource: 'instagram',
    defaultMedium: 'social_media'
  },
  {
    id: 'organic-video',
    label: 'Organic Video',
    description: 'Canal oficial do GA4 para tráfego orgânico vindo de sites de vídeo.',
    mediums: ['video', 'organic_video'],
    sources: ['youtube', 'tiktok', 'vimeo'],
    defaultSource: 'youtube',
    defaultMedium: 'video'
  },
  {
    id: 'paid-other',
    label: 'Paid Other',
    description: 'Canal oficial do GA4 para tráfego pago que não se encaixa em Search, Social, Shopping ou Video.',
    mediums: ['cp', 'cpc', 'ppc', 'retargeting', 'paid'],
    sources: ['paid', 'programmatic', 'partner'],
    defaultSource: 'paid',
    defaultMedium: 'paid'
  },
  {
    id: 'paid-search',
    label: 'Paid Search',
    description: 'Canal oficial do GA4 para anúncios em mecanismos de busca.',
    mediums: ['cpc', 'ppc', 'paidsearch', 'paid_search', 'retargeting'],
    sources: ['google', 'bing', 'yahoo', 'baidu', 'yandex'],
    defaultSource: 'google',
    defaultMedium: 'cpc'
  },
  {
    id: 'paid-shopping',
    label: 'Paid Shopping',
    description: 'Canal oficial do GA4 para anúncios pagos em sites de shopping ou campanhas de shopping.',
    mediums: ['cpc', 'ppc', 'paidshopping', 'paid_shopping', 'retargeting'],
    sources: ['google_shopping', 'amazon', 'ebay', 'shopping'],
    defaultSource: 'google_shopping',
    defaultMedium: 'cpc'
  },
  {
    id: 'paid-social',
    label: 'Paid Social',
    description: 'Canal oficial do GA4 para anúncios em redes sociais.',
    mediums: ['cpc', 'ppc', 'paid_social', 'paidsocial', 'retargeting', 'paid'],
    sources: ['facebook', 'instagram', 'linkedin', 'tiktok', 'pinterest', 'x', 'twitter', 'reddit', 'whatsapp'],
    defaultSource: 'facebook',
    defaultMedium: 'cpc'
  },
  {
    id: 'paid-video',
    label: 'Paid Video',
    description: 'Canal oficial do GA4 para anúncios pagos em sites de vídeo.',
    mediums: ['cpc', 'ppc', 'paidvideo', 'paid_video', 'retargeting', 'paid'],
    sources: ['youtube', 'tiktok', 'vimeo'],
    defaultSource: 'youtube',
    defaultMedium: 'cpc'
  },
  {
    id: 'referral',
    label: 'Referral',
    description: 'Canal oficial do GA4 para links não pagos em outros sites ou apps.',
    mediums: ['referral', 'app', 'link'],
    sources: ['partner_site', 'portal', 'blog'],
    defaultSource: 'partner_site',
    defaultMedium: 'referral'
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Canal oficial do GA4 para links enviados por SMS.',
    mediums: ['sms'],
    sources: ['sms'],
    defaultSource: 'sms',
    defaultMedium: 'sms'
  }
];

export const CHANNEL_RULES = [
  {
    channel: 'Direct',
    rule: 'Source = (direct) AND Medium = (none) OR (not set)',
    description: 'Tráfego direto sem parâmetros de origem'
  },
  {
    channel: 'Cross-network',
    rule: 'Campaign Name contains cross-network',
    description: 'Campanhas Google Ads/Demand Gen/Performance Max em múltiplas redes'
  },
  {
    channel: 'Paid Shopping',
    rule: 'Source shopping ou Campaign contém shop/shopping AND Medium pago',
    description: 'Campanhas pagas em sites de shopping'
  },
  {
    channel: 'Organic Search',
    rule: 'Medium = organic',
    description: 'Resultados de busca orgânica'
  },
  {
    channel: 'Paid Search',
    rule: 'Medium = cpc OR ppc OR paidsearch',
    description: 'Cliques pagos em mecanismos de busca'
  },
  {
    channel: 'Paid Social',
    rule: 'Source social conhecido AND Medium pago',
    description: 'Anúncios em redes sociais'
  },
  {
    channel: 'Paid Video',
    rule: 'Source de vídeo conhecido AND Medium pago',
    description: 'Anúncios em sites de vídeo'
  },
  {
    channel: 'Paid Other',
    rule: 'Medium pago sem correspondência com Search, Social, Shopping ou Video',
    description: 'Tráfego pago que não se encaixa nos canais pagos específicos'
  },
  {
    channel: 'Organic Shopping',
    rule: 'Source shopping ou Campaign contém shop/shopping sem medium pago',
    description: 'Tráfego orgânico vindo de sites de shopping'
  },
  {
    channel: 'Organic Social',
    rule: 'Medium = social_media ou Source social conhecido sem mídia paga',
    description: 'Tráfego orgânico de redes sociais'
  },
  {
    channel: 'Organic Video',
    rule: 'Source de vídeo conhecido OR Medium contém video',
    description: 'Tráfego orgânico vindo de sites de vídeo'
  },
  {
    channel: 'Display',
    rule: 'Medium = display OR banner OR expandable OR interstitial OR cpm',
    description: 'Anúncios de display'
  },
  {
    channel: 'Email',
    rule: 'Source ou Medium = email, e-mail, e_mail ou e mail',
    description: 'Campanhas de email marketing'
  },
  {
    channel: 'Affiliates',
    rule: 'Medium = affiliate',
    description: 'Tráfego de afiliados'
  },
  {
    channel: 'Audio',
    rule: 'Medium = audio',
    description: 'Anúncios em plataformas de áudio'
  },
  {
    channel: 'Referral',
    rule: 'Medium = referral OR app OR link',
    description: 'Tráfego de referência'
  },
  {
    channel: 'SMS',
    rule: 'Source = sms OR Medium = sms',
    description: 'Campanhas via SMS'
  },
  {
    channel: 'Mobile Push Notifications',
    rule: 'Medium ends with push OR contains mobile/notification OR Source = firebase',
    description: 'Notificações push/mobile'
  },
  {
    channel: 'AI Assistants',
    rule: 'Medium = ai-assistant',
    description: 'Tráfego vindo de assistentes de IA'
  },
  {
    channel: 'Unassigned',
    rule: 'Nenhuma regra acima foi atendida',
    description: 'Tráfego não categorizado'
  }
] as const;

export const UTM_FIELD_GUIDES: UTMFieldGuide[] = [
  {
    key: 'source',
    label: 'utm_source',
    required: true,
    example: 'google, instagram, newsletter, secretaria_mg',
    helper: 'Origem do tráfego. Use nomes curtos e consistentes.',
    recommendedMax: 40
  },
  {
    key: 'medium',
    label: 'utm_medium',
    required: true,
    example: 'cpc, paid_social, email',
    helper: 'Tipo de mídia. Deve seguir a regra do canal escolhido.',
    recommendedMax: 30
  },
  {
    key: 'campaign',
    label: 'utm_campaign',
    required: true,
    example: 'black_friday_2026',
    helper: 'Nome padronizado da campanha. Evite variações desnecessárias.',
    recommendedMax: 80
  },
  {
    key: 'term',
    label: 'utm_term',
    example: 'tenis_corrida',
    helper: 'Use para termo/keyword ou segmentação paga quando fizer sentido.',
    recommendedMax: 60
  },
  {
    key: 'content',
    label: 'utm_content',
    example: 'video_a, botao_hero, post_patrocinado',
    helper: 'Diferencie criativos, botões, placements ou variações do link.',
    recommendedMax: 60
  },
  {
    key: 'id',
    label: 'utm_id',
    example: 'meta-abril-2026-01',
    helper: 'ID interno da campanha, se houver integração ou controle adicional.',
    recommendedMax: 50
  }
];

const SEARCH_SOURCES = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu', 'yandex'];
const SHOPPING_SOURCES = ['shopping', 'google_shopping', 'amazon', 'ebay', 'etsy', 'mercadolivre'];
const SOCIAL_SOURCES = ['facebook', 'instagram', 'linkedin', 'tiktok', 'pinterest', 'x', 'twitter', 'reddit', 'whatsapp'];
const VIDEO_SOURCES = ['youtube', 'tiktok', 'vimeo'];
const PAID_MEDIUMS = ['cpc', 'ppc', 'paidsearch', 'paid_search', 'paidshopping', 'paid_shopping', 'paidvideo', 'paid_video', 'retargeting', 'paid'];
const EMAIL_VALUES = ['email', 'e-mail', 'e_mail', 'e mail'];
const ALLOWED_VALUE_REGEX = /^[a-z0-9_-]+$/;

export function normalizeUtmValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeParams(params: UTMParams): UTMParams {
  return {
    url: params.url.trim(),
    source: normalizeUtmValue(params.source),
    medium: normalizeUtmValue(params.medium),
    campaign: normalizeUtmValue(params.campaign),
    term: normalizeUtmValue(params.term),
    content: normalizeUtmValue(params.content),
    id: normalizeUtmValue(params.id)
  };
}

export function buildGeneratedUrl(params: UTMParams) {
  const normalized = normalizeParams(params);

  if (!normalized.url || !normalized.source || !normalized.medium || !normalized.campaign) {
    return '';
  }

  const url = new URL(normalized.url);
  const searchParams = new URLSearchParams(url.search);

  searchParams.set('utm_source', normalized.source);
  searchParams.set('utm_medium', normalized.medium);
  searchParams.set('utm_campaign', normalized.campaign);
  if (normalized.term) searchParams.set('utm_term', normalized.term);
  if (normalized.content) searchParams.set('utm_content', normalized.content);
  if (normalized.id) searchParams.set('utm_id', normalized.id);

  const query = searchParams.toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
}

export function inferPresetFromValues(source: string, medium: string, presets: ChannelPreset[] = CHANNEL_PRESETS) {
  const normalizedSource = normalizeUtmValue(source);
  const normalizedMedium = normalizeUtmValue(medium);

  const exactSourceMatch = presets.find(
    (preset) => preset.mediums.includes(normalizedMedium) && preset.sources.includes(normalizedSource)
  );

  if (exactSourceMatch) return exactSourceMatch;

  return (
    presets.find(
      (preset) =>
        preset.mediums.includes(normalizedMedium) &&
        (preset.sources.includes(normalizedSource) || !normalizedSource)
    ) || null
  );
}

export function detectChannelGrouping(source: string, medium: string) {
  const normalizedSource = normalizeUtmValue(source);
  const normalizedMedium = normalizeUtmValue(medium);

  if (normalizedSource === 'direct' && ['none', 'not_set'].includes(normalizedMedium)) return 'Direct';
  if (normalizedMedium === 'ai-assistant') return 'AI Assistants';
  if (normalizedMedium === 'audio') return 'Audio';
  if (normalizedMedium.endsWith('push') || normalizedMedium.includes('mobile') || normalizedMedium.includes('notification') || normalizedSource === 'firebase') return 'Mobile Push Notifications';
  if (normalizedSource === 'sms' || normalizedMedium === 'sms') return 'SMS';
  if (EMAIL_VALUES.includes(normalizedSource) || EMAIL_VALUES.includes(normalizedMedium)) return 'Email';
  if (normalizedMedium === 'affiliate') return 'Affiliates';
  if (['display', 'banner', 'expandable', 'interstitial', 'cpm'].includes(normalizedMedium)) return 'Display';
  if (normalizedMedium === 'cross-network') return 'Cross-network';
  if (PAID_MEDIUMS.includes(normalizedMedium)) {
    if (SHOPPING_SOURCES.includes(normalizedSource)) return 'Paid Shopping';
    if (SEARCH_SOURCES.includes(normalizedSource)) return 'Paid Search';
    if (SOCIAL_SOURCES.includes(normalizedSource)) return 'Paid Social';
    if (VIDEO_SOURCES.includes(normalizedSource)) return 'Paid Video';
    return 'Paid Other';
  }
  if (normalizedMedium === 'organic' && SHOPPING_SOURCES.includes(normalizedSource)) return 'Organic Shopping';
  if (normalizedMedium === 'organic' || SEARCH_SOURCES.includes(normalizedSource)) return 'Organic Search';
  if (normalizedMedium === 'social_media' || SOCIAL_SOURCES.includes(normalizedSource)) return 'Organic Social';
  if (normalizedMedium.includes('video') || VIDEO_SOURCES.includes(normalizedSource)) return 'Organic Video';
  if (['referral', 'app', 'link'].includes(normalizedMedium)) return 'Referral';
  return 'Unassigned';
}

export function validateUtmParams(params: Partial<UTMParams>, expectedPresetId?: string | null, presets: ChannelPreset[] = CHANNEL_PRESETS): ValidationResult {
  const normalizedValues = {
    source: normalizeUtmValue(params.source || ''),
    medium: normalizeUtmValue(params.medium || ''),
    campaign: normalizeUtmValue(params.campaign || ''),
    term: normalizeUtmValue(params.term || ''),
    content: normalizeUtmValue(params.content || ''),
    id: normalizeUtmValue(params.id || '')
  };

  const errors: UTMValidationIssue[] = [];
  const warnings: UTMValidationIssue[] = [];

  if (!normalizedValues.source) errors.push({ field: 'source', message: 'utm_source é obrigatório.' });
  if (!normalizedValues.medium) errors.push({ field: 'medium', message: 'utm_medium é obrigatório.' });
  if (!normalizedValues.campaign) errors.push({ field: 'campaign', message: 'utm_campaign é obrigatório.' });

  UTM_FIELD_GUIDES.forEach((guide) => {
    const value = normalizedValues[guide.key];
    if (!value) return;

    if (!ALLOWED_VALUE_REGEX.test(value)) {
      warnings.push({ field: guide.key, message: `${guide.label} contém caracteres fora do padrão recomendado.` });
    }

    if (value.length > guide.recommendedMax) {
      warnings.push({ field: guide.key, message: `${guide.label} passou do tamanho recomendado (${guide.recommendedMax}).` });
    }
  });

  if (params.source && params.source !== normalizedValues.source) warnings.push({ field: 'source', message: 'utm_source será normalizado para minúsculas e sem espaços.' });
  if (params.medium && params.medium !== normalizedValues.medium) warnings.push({ field: 'medium', message: 'utm_medium será normalizado para minúsculas e sem espaços.' });
  if (params.campaign && params.campaign !== normalizedValues.campaign) warnings.push({ field: 'campaign', message: 'utm_campaign será normalizado para minúsculas e sem espaços.' });

  const detectedPreset = inferPresetFromValues(normalizedValues.source, normalizedValues.medium, presets);
  if (expectedPresetId) {
    const preset = presets.find((item) => item.id === expectedPresetId);
    if (preset) {
      if (!preset.mediums.includes(normalizedValues.medium)) {
        errors.push({ field: 'medium', message: `Para o canal ${preset.label}, use um dos mediums permitidos: ${preset.mediums.join(', ')}.` });
      }
      if (normalizedValues.source && !preset.sources.includes(normalizedValues.source)) {
        warnings.push({ field: 'source', message: `A source informada foge das sugestões para ${preset.label}: ${preset.sources.join(', ')}.` });
      }
    }
  } else if (!detectedPreset && normalizedValues.medium) {
    warnings.push({ field: 'medium', message: 'utm_medium não se encaixa claramente em um canal padrão do GA4 definido nesta ferramenta.' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    channelGrouping: detectChannelGrouping(normalizedValues.source, normalizedValues.medium),
    matchedPresetId: detectedPreset?.id || null,
    matchedPresetLabel: detectedPreset?.label || null,
    normalizedValues
  };
}

export function validateUrlString(urlToValidate: string): ValidationResult {
  try {
    const url = new URL(urlToValidate.trim());
    const params = new URLSearchParams(url.search);
    const parsed: Partial<UTMParams> = {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || '',
      term: params.get('utm_term') || '',
      content: params.get('utm_content') || '',
      id: params.get('utm_id') || ''
    };
    const result = validateUtmParams(parsed);
    if (!params.get('utm_source') && !params.get('utm_medium') && !params.get('utm_campaign')) {
      result.errors.push({ field: 'url', message: 'A URL não possui os parâmetros UTM obrigatórios.' });
      result.isValid = false;
    }
    return result;
  } catch {
    return {
      isValid: false,
      errors: [{ field: 'url', message: 'URL inválida.' }],
      warnings: [],
      channelGrouping: 'Invalid',
      matchedPresetId: null,
      matchedPresetLabel: null,
      normalizedValues: {}
    };
  }
}

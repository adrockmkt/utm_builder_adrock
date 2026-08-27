import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, Copy, Download, Info, Link2, Save, Search, Sparkles, Upload, XCircle } from 'lucide-react';
import { sortAlphabeticallyByLabel, sortSuggestionGroups } from '../utils/alphabeticalOptions.js';
import { getBulkImportTutorialSteps } from '../utils/bulkImportUi.js';
import { buildGeneratedUrl, CHANNEL_PRESETS, CHANNEL_RULES, type ChannelPreset, type UTMParams, UTM_FIELD_GUIDES, inferPresetFromValues, normalizeUtmDraftValue, normalizeUtmValue, validateUrlString, validateUtmParams } from '../utils/utm';
import type { BulkLinkValidationResult, CampaignRecord, ChannelPresetRecord, SaveLinkPayload, SelectOptionRecord } from '../types';

const emptyParams: UTMParams = {
  url: '',
  source: '',
  medium: '',
  campaign: '',
  term: '',
  content: '',
  id: ''
};

const ga4UtmDimensions = [
  {
    parameter: 'utm_source',
    dimensionPt: 'Origem da sessão ou Origem manual da sessão',
    dimensionEn: 'Session source / Session manual source'
  },
  {
    parameter: 'utm_medium',
    dimensionPt: 'Mídia da sessão ou Mídia manual da sessão',
    dimensionEn: 'Session medium / Session manual medium'
  },
  {
    parameter: 'utm_campaign',
    dimensionPt: 'Campanha manual da sessão',
    dimensionEn: 'Session manual campaign'
  },
  {
    parameter: 'utm_id',
    dimensionPt: 'ID manual da campanha da sessão',
    dimensionEn: 'Session manual campaign ID'
  },
  {
    parameter: 'utm_content',
    dimensionPt: 'Conteúdo manual do anúncio da sessão',
    dimensionEn: 'Session manual ad content'
  },
  {
    parameter: 'utm_term',
    dimensionPt: 'Termo manual da sessão',
    dimensionEn: 'Session manual term'
  },
  {
    parameter: 'utm_source_platform',
    dimensionPt: 'Plataforma de origem manual da sessão',
    dimensionEn: 'Session manual source platform'
  },
  {
    parameter: 'utm_creative_format',
    dimensionPt: 'Formato criativo manual da sessão',
    dimensionEn: 'Session manual creative format'
  },
  {
    parameter: 'utm_marketing_tactic',
    dimensionPt: 'Tática de marketing manual da sessão',
    dimensionEn: 'Session manual marketing tactic'
  }
];

interface UTMBuilderProps {
  campaigns?: CampaignRecord[];
  channelPresets?: ChannelPresetRecord[];
  actionTypeOptions?: SelectOptionRecord[];
  destinationTypeOptions?: SelectOptionRecord[];
  adTypeOptions?: SelectOptionRecord[];
  utmContentOptions?: SelectOptionRecord[];
  utmTermOptions?: SelectOptionRecord[];
  utmIdOptions?: SelectOptionRecord[];
  onCreateCampaignRequest?: () => void;
  onCreateCampaignInline?: (payload: BulkCampaignForm) => Promise<CampaignRecord>;
  onSaveLink?: (payload: SaveLinkPayload) => Promise<void>;
  onDownloadBulkTemplate?: () => Promise<void>;
  onValidateBulkLinks?: (payload: { campaignId: string; file: File }) => Promise<BulkLinkValidationResult>;
  onSaveBulkLinks?: (payload: { campaignId: string; file: File }) => Promise<{ createdCount: number; validation: BulkLinkValidationResult }>;
  isSaving?: boolean;
}

type BulkCampaignForm = {
  clientName: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status: CampaignRecord['status'];
  description: string;
};

const emptyBulkCampaignForm: BulkCampaignForm = {
  clientName: '',
  name: '',
  startsAt: '',
  endsAt: '',
  status: 'rascunho',
  description: ''
};

const fallbackActionTypeOptions = [
  'post_patrocinado',
  'banner_portal',
  'newsletter',
  'email_fluxo',
  'paid_social',
  'paid_search',
  'parceria'
];

const fallbackDestinationTypeOptions = ['lp', 'landing_page', 'site', 'blog', 'whatsapp'];
const fallbackAdTypeOptions = [
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
];
const fallbackUtmIdOptions = [
  'curso_ed_antirracista_fundamentos',
  'curso_ed_antirracista_praticas',
  'material_rap_feminino',
  'curso_comp_digitais_lp_em',
  'lp_ebook_enem'
];
const fallbackUtmTermOptions = [
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
];

type SuggestionGroup = {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
};

const generalContentGroup: SuggestionGroup = {
  id: 'padroes_gerais',
  label: 'Padrões gerais',
  options: [
    ['text_ad', 'Anúncio de texto'],
    ['image_ad', 'Image ad'],
    ['story_ad', 'Story ad'],
    ['lead_ad', 'Lead ad'],
    ['video_ad', 'Video ad'],
    ['display_ad', 'Display ad'],
    ['shopping_ad', 'Shopping ad'],
    ['infografico', 'Infográfico'],
    ['materia', 'Matéria'],
    ['ebook', 'E-book'],
    ['webstory', 'WebStory'],
    ['podcast', 'Podcast'],
    ['jogo', 'Jogo'],
    ['webinario', 'Webinário'],
    ['landing_page', 'Landing page'],
    ['whatsapp_canal', 'Whatsapp canal'],
    ['whatsapp_comunidade_socioemocional', 'Whatsapp comunidade socioemocional'],
    ['whatsapp_comunidade_antirracista', 'Whatsapp comunidade antirracista'],
    ['whatsapp_comunidade_tecnologia', 'Whatsapp comunidade tecnologia'],
    ['whatsapp_comunidade_metodologias_ativas', 'Whatsapp comunidade metodologias ativas'],
    ['newsletter_semanal', 'Newsletter semanal'],
    ['newsletter_gestao', 'Newsletter gestão'],
    ['newsletter_comercial', 'Newsletter comercial'],
    ['instagram', 'Instagram'],
    ['facebook', 'Facebook'],
    ['linkedin', 'LinkedIn'],
    ['video', 'Vídeo']
  ].map(([value, label]) => ({ value, label }))
};

const porvirContentGroups: SuggestionGroup[] = [
  {
    id: 'wordpress',
    label: 'WordPress',
    options: [
      ['blog', 'Blog'],
      ['materia', 'Matéria'],
      ['reportagem', 'Reportagem'],
      ['artigo', 'Artigo'],
      ['agenda', 'Agenda'],
      ['gestao', 'Gestão'],
      ['biblioteca', 'Biblioteca'],
      ['glossario', 'Glossário'],
      ['festival', 'Festival'],
      ['premio', 'Prêmio'],
      ['video', 'Vídeo']
    ].map(([value, label]) => ({ value, label }))
  },
  {
    id: 'instagram',
    label: 'Instagram',
    options: [
      ['link_bio', 'Link da bio'],
      ['stories', 'Stories'],
      ['reels', 'Reels'],
      ['manychat', 'Manychat'],
      ['timeline', 'Timeline'],
      ['botao', 'Botão']
    ].map(([value, label]) => ({ value, label }))
  },
  {
    id: 'facebook',
    label: 'Facebook',
    options: [['feed', 'Feed']].map(([value, label]) => ({ value, label }))
  },
  {
    id: 'newsletter_semanal',
    label: 'Newsletter semanal',
    options: [
      ['texto_abertura', 'Texto abertura'],
      ['destaque1', 'Destaque 1'],
      ['destaque2', 'Destaque 2'],
      ['miniatura1', 'Miniatura 1'],
      ['miniatura2', 'Miniatura 2'],
      ['miniatura3', 'Miniatura 3'],
      ['aspas', 'Aspas'],
      ['dica_leitura1', 'Dica leitura 1'],
      ['dica_leitura2', 'Dica leitura 2'],
      ['story1', 'Story 1'],
      ['story2', 'Story 2'],
      ['story3', 'Story 3'],
      ['agenda', 'Agenda'],
      ['banner1', 'Banner 1'],
      ['banner2', 'Banner 2'],
      ['banner3', 'Banner 3']
    ].map(([value, label]) => ({ value, label }))
  },
  {
    id: 'newsletter_gestao',
    label: 'Newsletter gestão',
    options: [
      ['texto_abertura', 'Texto abertura'],
      ['destaque1', 'Destaque 1'],
      ['miniatura1', 'Miniatura 1'],
      ['miniatura2', 'Miniatura 2'],
      ['banner_parceiro', 'Banner parceiro'],
      ['banner2', 'Banner 2'],
      ['agenda', 'Agenda']
    ].map(([value, label]) => ({ value, label }))
  },
  {
    id: 'newsletter_premio',
    label: 'Newsletter prêmio',
    options: [
      ['texto_abertura', 'Texto abertura'],
      ['banner_abertura', 'Banner abertura'],
      ['botao1', 'Botão 1'],
      ['botao2', 'Botão 2']
    ].map(([value, label]) => ({ value, label }))
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    options: [
      ['canal', 'Canal'],
      ['comunidade_socioemocional', 'Comunidade socioemocional'],
      ['comunidade_antirracista', 'Comunidade antirracista'],
      ['comunidade_tecnologia', 'Comunidade tecnologia'],
      ['comunidade_metodologias_ativas', 'Comunidade metodologias ativas']
    ].map(([value, label]) => ({ value, label }))
  }
];

const porvirUtmIdGroups: SuggestionGroup[] = [
  {
    id: 'elementos',
    label: 'Elementos do link',
    options: [
      ['texto_01', 'Texto 01'],
      ['texto_02', 'Texto 02'],
      ['img_01', 'Imagem 01'],
      ['img_02', 'Imagem 02'],
      ['botao_01', 'Botão 01'],
      ['botao_02', 'Botão 02'],
      ['banner_01', 'Banner 01'],
      ['banner_02', 'Banner 02'],
      ['catalogo', 'Catálogo'],
      ['canal', 'Canal']
    ].map(([value, label]) => ({ value, label }))
  }
];

const UTMBuilder: React.FC<UTMBuilderProps> = ({
  campaigns = [],
  channelPresets = CHANNEL_PRESETS,
  actionTypeOptions = [],
  destinationTypeOptions = [],
  adTypeOptions = [],
  utmContentOptions = [],
  utmTermOptions = [],
  utmIdOptions = [],
  onCreateCampaignRequest,
  onCreateCampaignInline,
  onSaveLink,
  onDownloadBulkTemplate,
  onValidateBulkLinks,
  onSaveBulkLinks,
  isSaving = false
}) => {
  const activeChannelPresets = channelPresets.filter((preset) => preset.isActive !== false);
  const resolvedChannelPresets = activeChannelPresets.length > 0 ? activeChannelPresets : CHANNEL_PRESETS;
  const resolvedActionTypeOptions = actionTypeOptions.filter((option) => option.isActive).length > 0
    ? actionTypeOptions.filter((option) => option.isActive)
    : fallbackActionTypeOptions.map((value) => ({ id: value, category: 'action_type' as const, value, label: value, sortOrder: 0, isActive: true }));
  const resolvedDestinationTypeOptions = destinationTypeOptions.filter((option) => option.isActive).length > 0
    ? destinationTypeOptions.filter((option) => option.isActive)
    : fallbackDestinationTypeOptions.map((value) => ({ id: value, category: 'destination_type' as const, value, label: value, sortOrder: 0, isActive: true }));
  const resolvedAdTypeOptions = adTypeOptions.filter((option) => option.isActive).length > 0
    ? adTypeOptions.filter((option) => option.isActive)
    : fallbackAdTypeOptions.map((value) => ({ id: value, category: 'ad_type' as const, value, label: value, sortOrder: 0, isActive: true }));
  const customContentGroup = buildCustomSuggestionGroup('cadastrados_content', 'Cadastrados', utmContentOptions);
  const contentSuggestionGroups = customContentGroup
    ? [generalContentGroup, ...porvirContentGroups, customContentGroup]
    : [generalContentGroup, ...porvirContentGroups];
  const resolvedUtmTermOptions = utmTermOptions.filter((option) => option.isActive).length > 0
    ? utmTermOptions.filter((option) => option.isActive)
    : fallbackUtmTermOptions.map((value) => ({ id: value, category: 'utm_term' as const, value, label: value, sortOrder: 0, isActive: true }));
  const customUtmTermGroup = buildCustomSuggestionGroup('cadastrados_term', 'Valores comuns', resolvedUtmTermOptions);
  const utmTermSuggestionGroups = customUtmTermGroup ? [customUtmTermGroup] : [];
  const resolvedUtmIdOptions = utmIdOptions.filter((option) => option.isActive).length > 0
    ? utmIdOptions.filter((option) => option.isActive)
    : fallbackUtmIdOptions.map((value) => ({ id: value, category: 'utm_id' as const, value, label: value, sortOrder: 0, isActive: true }));
  const customUtmIdGroup = buildCustomSuggestionGroup('cadastrados_id', 'Cadastrados', resolvedUtmIdOptions);
  const utmIdSuggestionGroups = customUtmIdGroup
    ? [...porvirUtmIdGroups, customUtmIdGroup]
    : porvirUtmIdGroups;
  const [showInstructions, setShowInstructions] = useState(false);
  const [activeTab, setActiveTab] = useState<'builder' | 'validator' | 'rules'>('builder');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(resolvedChannelPresets[0].id);
  const [utmParams, setUtmParams] = useState<UTMParams>({
    ...emptyParams,
    source: resolvedChannelPresets[0].defaultSource,
    medium: resolvedChannelPresets[0].defaultMedium
  });
  const [preloadUrl, setPreloadUrl] = useState('');
  const [generatedURL, setGeneratedURL] = useState('');
  const [urlToValidate, setUrlToValidate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [contextType, setContextType] = useState<'pontual' | 'campanha' | 'lote'>('pontual');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkValidation, setBulkValidation] = useState<BulkLinkValidationResult | null>(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showBulkCampaignForm, setShowBulkCampaignForm] = useState(false);
  const [bulkCampaignForm, setBulkCampaignForm] = useState<BulkCampaignForm>(emptyBulkCampaignForm);
  const [bulkCampaignStatus, setBulkCampaignStatus] = useState('');
  const [isCreatingBulkCampaign, setIsCreatingBulkCampaign] = useState(false);
  const [adGroupName, setAdGroupName] = useState('');
  const [adType, setAdType] = useState(resolvedAdTypeOptions[0].value);
  const [internalName, setInternalName] = useState('');
  const [actionType, setActionType] = useState(resolvedActionTypeOptions[0].value);
  const [destinationType, setDestinationType] = useState(resolvedDestinationTypeOptions[0].value);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const preset = resolvedChannelPresets.find((item) => item.id === selectedPresetId) || resolvedChannelPresets[0];
    setSelectedPresetId(preset.id);
    setUtmParams((current) => ({
      ...current,
      source: preset.sources.includes(current.source) ? current.source : preset.defaultSource,
      medium: preset.mediums.includes(current.medium) ? current.medium : preset.defaultMedium
    }));
  }, [channelPresets]);

  useEffect(() => {
    if (!resolvedActionTypeOptions.some((option) => option.value === actionType)) {
      setActionType(resolvedActionTypeOptions[0].value);
    }
    if (!resolvedDestinationTypeOptions.some((option) => option.value === destinationType)) {
      setDestinationType(resolvedDestinationTypeOptions[0].value);
    }
    if (!resolvedAdTypeOptions.some((option) => option.value === adType)) {
      setAdType(resolvedAdTypeOptions[0].value);
    }
  }, [actionTypeOptions, destinationTypeOptions, adTypeOptions]);

  const selectedPreset = useMemo<ChannelPreset | undefined>(() => resolvedChannelPresets.find((preset) => preset.id === selectedPresetId), [resolvedChannelPresets, selectedPresetId]);
  const builderValidation = useMemo(() => validateUtmParams(utmParams, selectedPresetId, resolvedChannelPresets), [utmParams, selectedPresetId, resolvedChannelPresets]);
  const validatorResult = useMemo(() => (urlToValidate.trim() ? validateUrlString(urlToValidate) : null), [urlToValidate]);
  const filteredRules = CHANNEL_RULES.filter((rule) =>
    rule.channel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.rule.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const livePreview = useMemo(() => buildLivePreviewUrl(utmParams), [utmParams]);
  const isWhatsAppDestination = useMemo(() => isWhatsAppUrl(utmParams.url), [utmParams.url]);
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);
  const resetBuilderForm = () => {
    const preset = resolvedChannelPresets[0];
    setSelectedPresetId(preset.id);
    setUtmParams({
      ...emptyParams,
      source: preset.defaultSource,
      medium: preset.defaultMedium
    });
    setGeneratedURL('');
    setContextType('pontual');
    setSelectedCampaignId('');
    setBulkFile(null);
    setBulkValidation(null);
    setBulkStatus('');
    setShowBulkCampaignForm(false);
    setBulkCampaignForm(emptyBulkCampaignForm);
    setBulkCampaignStatus('');
    setAdGroupName('');
    setAdType(resolvedAdTypeOptions[0].value);
    setInternalName('');
    setActionType(resolvedActionTypeOptions[0].value);
    setDestinationType(resolvedDestinationTypeOptions[0].value);
    setNotes('');
    setPreloadUrl('');
  };

  const handlePresetChange = (presetId: string) => {
    const preset = resolvedChannelPresets.find((item) => item.id === presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    setUtmParams((current) => ({
      ...current,
      source: preset.sources.includes(current.source) ? current.source : preset.defaultSource,
      medium: preset.mediums.includes(current.medium) ? current.medium : preset.defaultMedium
    }));
  };

  const handleParamChange = (field: keyof UTMParams, value: string) => {
    setUtmParams((current) => ({
      ...current,
      [field]: value
    }));
  };

  const preloadParametrizedUrl = () => {
    try {
      const parsed = parseParametrizedUrl(preloadUrl);
      const inferredPreset = inferPresetFromValues(parsed.source, parsed.medium, resolvedChannelPresets);

      if (inferredPreset) {
        setSelectedPresetId(inferredPreset.id);
      }

      setUtmParams(parsed);
      setGeneratedURL('');
    } catch {
      alert('Cole uma URL parametrizada válida para carregar os campos.');
    }
  };

  const generateURL = () => {
    if (!livePreview || !isLiveValid) {
      alert('Revise os campos obrigatórios e os erros do padrão antes de gerar a URL.');
      return;
    }

    setGeneratedURL(livePreview);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('URL copiada!');
    } catch {
      alert('Erro ao copiar URL');
    }
  };

  const handleSaveLink = async () => {
    if (!onSaveLink) return;
    if (!generatedURL) {
      alert('Gere a URL antes de salvar.');
      return;
    }
    if (!internalName.trim()) {
      alert('Defina um nome interno para o link.');
      return;
    }
    if (contextType !== 'pontual' && !selectedCampaignId) {
      alert('Selecione a campanha relacionada.');
      return;
    }
    if (contextType !== 'pontual' && !utmParams.term.trim()) {
      alert('Informe ou selecione o utm_term para este link de campanha.');
      return;
    }

    await onSaveLink({
      campaignId: contextType === 'pontual' ? null : selectedCampaignId,
      baseUrl: utmParams.url,
      utmSource: utmParams.source,
      utmMedium: utmParams.medium,
      utmCampaign: utmParams.campaign,
      utmTerm: utmParams.term,
      utmContent: utmParams.content,
      utmId: utmParams.id,
      finalUrl: generatedURL,
      internalName: internalName.trim(),
      actionType,
      destinationType,
      adGroupName: adGroupName.trim(),
      adType,
      notes: notes.trim()
    });

    resetBuilderForm();
  };

  const handleBulkFileChange = async (file: File | null) => {
    setBulkFile(file);
    setBulkValidation(null);
    setBulkStatus('');

    if (!file || !onValidateBulkLinks) return;
    if (!selectedCampaignId) {
      setBulkStatus('Selecione uma campanha cadastrada antes de validar a planilha.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setBulkStatus('Envie uma planilha no formato .xlsx.');
      return;
    }

    setIsBulkProcessing(true);
    try {
      const validation = await onValidateBulkLinks({ campaignId: selectedCampaignId, file });
      setBulkValidation(validation);
      setBulkStatus(validation.canSave ? 'Planilha validada. Revise a prévia e salve o lote.' : 'Corrija os erros na planilha e suba novamente.');
    } catch (error) {
      setBulkStatus(error instanceof Error ? error.message : 'Não foi possível validar a planilha.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleSaveBulkLinks = async () => {
    if (!bulkFile || !selectedCampaignId || !onSaveBulkLinks) return;
    if (!bulkValidation?.canSave) {
      alert('Corrija os erros antes de salvar o lote.');
      return;
    }

    setIsBulkProcessing(true);
    try {
      const result = await onSaveBulkLinks({ campaignId: selectedCampaignId, file: bulkFile });
      setBulkValidation(result.validation);
      setBulkStatus(`${result.createdCount} links salvos com sucesso.`);
      setBulkFile(null);
    } catch (error) {
      setBulkStatus(error instanceof Error ? error.message : 'Não foi possível salvar o lote.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleCreateBulkCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onCreateCampaignInline || isCreatingBulkCampaign) return;
    if (!bulkCampaignForm.name.trim()) {
      setBulkCampaignStatus('Informe o nome da campanha.');
      return;
    }

    setIsCreatingBulkCampaign(true);
    setBulkCampaignStatus('');
    try {
      const campaign = await onCreateCampaignInline({
        ...bulkCampaignForm,
        clientName: bulkCampaignForm.clientName.trim(),
        name: bulkCampaignForm.name.trim(),
        description: bulkCampaignForm.description.trim()
      });
      setSelectedCampaignId(campaign.id);
      handleParamChange('campaign', campaign.slug);
      setBulkCampaignForm(emptyBulkCampaignForm);
      setShowBulkCampaignForm(false);
      setBulkCampaignStatus('Campanha cadastrada e selecionada para o lote.');
      setBulkFile(null);
      setBulkValidation(null);
      setBulkStatus('');
    } catch (error) {
      setBulkCampaignStatus(error instanceof Error ? error.message : 'Não foi possível cadastrar a campanha.');
    } finally {
      setIsCreatingBulkCampaign(false);
    }
  };

  const isExternalActionsPreset = selectedPresetId === 'external-actions';
  const relatedCampaignType = contextType === 'lote' ? 'campanha' : contextType;
  const relatedCampaignOptions = sortAlphabeticallyByLabel(campaigns.filter((campaign) => campaign.type === relatedCampaignType)) as CampaignRecord[];
  const liveChecks = [
    {
      label: 'URL base',
      ok: Boolean(utmParams.url.trim()),
      message: utmParams.url.trim() ? 'Informada.' : 'Informe a página de destino.'
    },
    {
      label: 'utm_source',
      ok: Boolean(utmParams.source.trim()),
      message: utmParams.source.trim() ? 'Origem preenchida.' : 'Preencha a origem do tráfego.'
    },
    {
      label: 'utm_medium',
      ok: Boolean(utmParams.medium.trim()),
      message: utmParams.medium.trim() ? 'Medium preenchido.' : 'Selecione ou preencha o medium.'
    },
    {
      label: 'utm_campaign',
      ok: Boolean(utmParams.campaign.trim()),
      message: utmParams.campaign.trim() ? 'Campanha preenchida.' : 'Preencha ou selecione uma campanha.'
    },
    ...(contextType === 'campanha' ? [
      {
        label: 'Campanha cadastrada',
        ok: Boolean(selectedCampaignId),
        message: selectedCampaignId ? 'Link vinculado a uma campanha.' : 'Selecione uma campanha já criada.'
      },
      {
        label: 'utm_term',
        ok: Boolean(utmParams.term.trim()),
        message: utmParams.term.trim() ? 'Termo preenchido.' : 'Selecione ou escreva o utm_term.'
      },
      {
        label: 'utm_content',
        ok: Boolean(utmParams.content.trim()),
        message: utmParams.content.trim() ? 'Conteúdo/peça preenchido.' : 'Selecione ou escreva o conteúdo/peça.'
      }
    ] : [])
  ];
  const campaignContextErrors = contextType === 'campanha'
    ? [
      ...(!selectedCampaignId ? ['Selecione uma campanha cadastrada.'] : []),
      ...(!utmParams.term.trim() ? ['Informe ou selecione o utm_term.'] : [])
    ]
    : [];
  const liveBlockingErrors = [
    ...builderValidation.errors.map((error) => error.message),
    ...campaignContextErrors
  ];
  const isLiveValid = Boolean(livePreview) && builderValidation.isValid && campaignContextErrors.length === 0;
  const statusTone = isLiveValid
    ? builderValidation.warnings.length > 0
      ? 'border-yellow-200 bg-yellow-50 text-yellow-900'
      : 'border-green-200 bg-green-50 text-green-900'
    : 'border-red-200 bg-red-50 text-red-900';

  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setBulkValidation(null);
    setBulkStatus('');
    setBulkCampaignStatus('');
    if (campaignId) {
      setShowBulkCampaignForm(false);
    }
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (campaign) {
      handleParamChange('campaign', campaign.slug);
    }
  };

  const handleAdGroupChange = (value: string) => {
    setAdGroupName(value);
    handleParamChange('term', normalizeUtmDraftValue(value));
  };

  const handleTermValueChange = (value: string) => {
    handleParamChange('term', normalizeUtmDraftValue(value));
  };

  const syncContentNotes = (value: string) => {
    const normalizedValue = normalizeUtmValue(value);
    setNotes((current) => {
      const keptLines = current
        .split('\n')
        .filter((line) => !line.toLowerCase().startsWith('utm_content:'));

      if (!normalizedValue) {
        return keptLines.join('\n').trim();
      }

      return [...keptLines, `utm_content: ${normalizedValue}`].join('\n').trim();
    });
  };

  const handleContentValueChange = (value: string) => {
    const normalizedValue = normalizeUtmDraftValue(value);
    handleParamChange('content', normalizedValue);
    syncContentNotes(value);
  };

  const handleUtmIdValueChange = (value: string) => {
    handleParamChange('id', normalizeUtmDraftValue(value));
  };

  return (
    <div className="adrock-form-shell space-y-6">
      <div className="rounded-[1.5rem] border border-[#c1d6e9] bg-[#f4f8fc]">
        <button onClick={() => setShowInstructions(!showInstructions)} className="flex w-full items-center justify-between p-4 text-left">
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-[#ff940e]" />
            <span className="font-medium text-gray-900">UTM Builder para Google Analytics 4</span>
          </div>
          {showInstructions ? <ChevronUp className="h-5 w-5 text-[#ff940e]" /> : <ChevronDown className="h-5 w-5 text-[#ff940e]" />}
        </button>
        {showInstructions && (
          <div className="space-y-3 px-4 pb-4 text-sm text-gray-800">
            <div>
              <h4 className="font-semibold">Criar URLs com padrão operacional</h4>
              <p>Escolha um canal GA4, use mediums controlados e siga exemplos curtos para manter a leitura das campanhas consistente.</p>
            </div>
            <div>
              <h4 className="font-semibold">Validar UTMs existentes</h4>
              <p>Cole uma URL e veja erros, avisos, valores normalizados e o agrupamento de canal esperado no GA4.</p>
            </div>
            <div>
              <h4 className="font-semibold">Governança do produto</h4>
              <p>Nesta versão standalone, o link já pode nascer como item pontual ou vinculado a campanha e grupo de ações para não perder contexto depois.</p>
            </div>
            <div className="rounded-2xl border border-[#c1d6e9] bg-white/80 p-3">
              <h4 className="font-semibold">Dimensões UTM no GA4</h4>
              <p className="mt-1 text-xs text-gray-600">No GA4, os parâmetros UTM aparecem nas dimensões abaixo.</p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#c1d6e9] text-gray-700">
                      <th className="px-3 py-2 font-semibold">Parâmetro UTM</th>
                      <th className="px-3 py-2 font-semibold">Nome da dimensão em português (GA4)</th>
                      <th className="px-3 py-2 font-semibold">Nome da dimensão em inglês</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ga4UtmDimensions.map((item) => (
                      <tr key={item.parameter} className="border-b border-[#e5eef7] last:border-b-0">
                        <td className="px-3 py-2 font-mono font-semibold text-gray-900">{item.parameter}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{item.dimensionPt}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{item.dimensionEn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-adrock-surface rounded-[1.75rem] border border-black/5">
        <div className="border-b border-black/10">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'builder' as const, name: 'Criar URLs para GA4', icon: Link2 },
              { id: 'validator' as const, name: 'Validar UTMs', icon: CheckCircle },
              { id: 'rules' as const, name: 'Regras de Canal GA4', icon: Search }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium ${
                    activeTab === tab.id ? 'border-[#ff940e] text-[#ff940e]' : 'border-transparent text-gray-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'builder' && (
            <div className={`grid items-start gap-6 ${contextType === 'lote' ? '' : 'xl:grid-cols-[minmax(0,1fr)_380px]'}`}>
              <div className="space-y-6">
                {isExternalActionsPreset && (
                  <div className="rounded-2xl border border-[#ffcf92] bg-[#fff5e8] p-4">
                    <h4 className="font-semibold text-gray-900">Quando usar este preset</h4>
                    <p className="mt-2 text-sm text-gray-700">Use em ações patrocinadas publicadas em sites de terceiros, veículos, órgãos, blogs parceiros ou portais institucionais que mandam o clique para uma LP, site ou página da campanha.</p>
                  </div>
                )}

                <div className="rounded-2xl border border-[#c1d6e9] bg-[#f8fbff] p-4">
                  <h3 className="text-lg font-medium text-gray-900">Contexto do link</h3>
                  <p className="mt-1 text-sm text-gray-600">Escolha se este link é pontual ou se deve nascer ligado a uma governança de campanha.</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {[
                      { value: 'pontual', label: 'Link pontual' },
                      { value: 'campanha', label: 'Campanha' },
                      { value: 'lote', label: 'Lote de campanha' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setContextType(option.value as typeof contextType);
                          setSelectedCampaignId('');
                          setAdGroupName('');
                          setBulkFile(null);
                          setBulkValidation(null);
                          setBulkStatus('');
                          setShowBulkCampaignForm(false);
                          setBulkCampaignStatus('');
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                          contextType === option.value
                            ? 'border-[#ff940e] bg-[#fff1db] text-[#9a4a00]'
                            : 'border-[#c1d6e9] bg-white text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {contextType !== 'pontual' && (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-[#ffcf92] bg-[#fff8ef] p-4">
                        <h4 className="font-semibold text-gray-900">Você já criou a campanha?</h4>
                        <p className="mt-1 text-sm text-gray-700">
                          {contextType === 'lote'
                            ? 'Para gerar links em lote, selecione uma campanha já cadastrada. O sistema usará o slug dela como utm_campaign em todas as linhas.'
                            : 'Para link por campanha, primeiro selecione uma campanha já cadastrada. Se ela ainda não existe, cadastre na aba Campanhas e volte para gerar os UTMs.'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {onCreateCampaignRequest && (
                            <button
                              type="button"
                              onClick={() => {
                                if (contextType === 'lote') {
                                  setShowBulkCampaignForm(true);
                                  setSelectedCampaignId('');
                                  setBulkFile(null);
                                  setBulkValidation(null);
                                  setBulkStatus('');
                                  setBulkCampaignStatus('');
                                  return;
                                }
                                onCreateCampaignRequest();
                              }}
                              className="rounded-xl border border-[#ff940e] bg-white px-3 py-2 text-sm font-medium text-[#9a4a00]"
                            >
                              Não, cadastrar campanha
                            </button>
                          )}
                          <span className="rounded-xl bg-white px-3 py-2 text-sm text-gray-600">
                            Sim, selecione abaixo
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="adrock-field-label mb-1 block text-sm font-medium">Campanha selecionada</label>
                        <select value={selectedCampaignId} onChange={(e) => handleCampaignChange(e.target.value)} className="w-full px-3 py-2">
                          <option value="">Selecione uma campanha cadastrada</option>
                          {relatedCampaignOptions.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                              {campaign.client_name ? `${campaign.client_name} - ${campaign.name}` : campaign.name}
                            </option>
                          ))}
                        </select>
                        {relatedCampaignOptions.length === 0 && (
                          <p className="mt-2 text-xs text-[#9a4a00]">Nenhuma campanha cadastrada ainda. Cadastre uma campanha antes de vincular este link.</p>
                        )}
                        {selectedCampaign && (
                          <p className="mt-2 text-xs text-gray-600">
                            {selectedCampaign.client_name && <>Cliente: <strong>{selectedCampaign.client_name}</strong>. </>}
                            Este link usará <strong>{selectedCampaign.slug}</strong> no utm_campaign.
                          </p>
                        )}
                        {contextType === 'lote' && bulkCampaignStatus && !showBulkCampaignForm && (
                          <p className="mt-2 text-xs font-medium text-emerald-700">{bulkCampaignStatus}</p>
                        )}
                      </div>
                      {contextType === 'lote' && showBulkCampaignForm && (
                        <BulkCampaignInlineForm
                          form={bulkCampaignForm}
                          status={bulkCampaignStatus}
                          isSaving={isCreatingBulkCampaign}
                          onChange={(field, value) => setBulkCampaignForm((current) => ({ ...current, [field]: value }))}
                          onSubmit={handleCreateBulkCampaign}
                          onCancel={() => {
                            setShowBulkCampaignForm(false);
                            setBulkCampaignStatus('');
                          }}
                        />
                      )}
                      {contextType !== 'lote' && (
                        <div>
                          <label className="adrock-field-label mb-1 block text-sm font-medium">Grupo de anúncio</label>
                          <input type="text" value={adGroupName} onChange={(e) => handleAdGroupChange(e.target.value)} className="w-full px-3 py-2" placeholder="ex: remarketing_30d" />
                          <p className="mt-2 text-xs text-gray-600">Preenche o utm_term.</p>
                        </div>
                      )}
                      {contextType === 'lote' && (
                        <BulkImportPanel
                          selectedCampaignId={selectedCampaignId}
                          file={bulkFile}
                          validation={bulkValidation}
                          status={bulkStatus}
                          isProcessing={isBulkProcessing}
                          onDownloadTemplate={onDownloadBulkTemplate}
                          onFileChange={handleBulkFileChange}
                          onSave={handleSaveBulkLinks}
                        />
                      )}
                    </div>
                  )}
                </div>

              {contextType !== 'lote' && (
                <>
              <div className="rounded-2xl border border-[#c1d6e9] bg-white p-4">
                <h3 className="text-lg font-medium text-gray-900">Carregar URL já parametrizada</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Cole uma URL pronta para reaproveitar os mesmos parâmetros e alterar apenas os campos necessários no próximo link.
                </p>
                <textarea
                  value={preloadUrl}
                  onChange={(event) => setPreloadUrl(event.target.value)}
                  rows={3}
                  className="mt-4 w-full px-3 py-2"
                  placeholder="https://cliente.com/pagina?utm_source=newsletter&utm_medium=email&utm_campaign=ec_2026_junho&utm_term=email_58_trap_texto_d1&utm_content=curso_comp_digital_lp_em&utm_id=texto_01"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={preloadParametrizedUrl}
                    className="rounded-xl border border-[#ff940e] bg-[#fff8ef] px-3 py-2 text-sm font-medium text-[#9a4a00]"
                  >
                    Carregar campos
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreloadUrl('')}
                    className="rounded-xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm font-medium text-gray-700"
                  >
                    Limpar URL colada
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-900">Criar URL com parâmetros UTM</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="adrock-field-label mb-1 block text-sm font-medium">URL Base *</label>
                  <input type="url" value={utmParams.url} onChange={(e) => handleParamChange('url', e.target.value)} className="w-full px-3 py-2" placeholder="https://cliente.com/produto" />
                  <p className="mt-1 text-xs text-gray-500">Exemplo: `https://cliente.com/landing-page`</p>
                  {isWhatsAppDestination && (
                    <div className="mt-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                      <strong>Atenção:</strong> links para WhatsApp normalmente não precisam de UTM. Quando a pessoa sai do site e cai no WhatsApp, os parâmetros não são enviados para o GA4 como navegação da página de destino.
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-[#c1d6e9] bg-[#f4f8fc] p-4">
                  <label className="adrock-field-label mb-2 block text-sm font-medium">Canal GA4 guiado</label>
                  <select value={selectedPresetId} onChange={(e) => handlePresetChange(e.target.value)} className="w-full px-3 py-2">
                    {resolvedChannelPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>{preset.label}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-600">{selectedPreset?.description}</p>
                </div>
                <div className="rounded-2xl border border-[#c1d6e9] bg-[#f4f8fc] p-4">
                  <p className="adrock-field-label text-sm font-medium">Padrão sugerido</p>
                  <p className="mt-2 text-sm text-gray-800"><strong>Sources recomendadas:</strong> {selectedPreset?.sources.join(', ')}</p>
                  <p className="mt-1 text-sm text-gray-800"><strong>Mediums permitidos:</strong> {selectedPreset?.mediums.join(', ')}</p>
                </div>
                <div>
                  <label className="adrock-field-label mb-1 block text-sm font-medium">Campaign Source (utm_source) *</label>
                  <input list="utm-source-suggestions" type="text" value={utmParams.source} onChange={(e) => handleParamChange('source', e.target.value)} className="w-full px-3 py-2" placeholder={selectedPreset?.defaultSource || 'google'} />
                  <datalist id="utm-source-suggestions">
                    {(selectedPreset?.sources || []).map((source) => <option key={source} value={source} />)}
                  </datalist>
                  <p className="mt-1 text-xs text-gray-500">{UTM_FIELD_GUIDES.find((guide) => guide.key === 'source')?.helper}</p>
                  <p className="mt-1 text-xs text-gray-500">Exemplo: {UTM_FIELD_GUIDES.find((guide) => guide.key === 'source')?.example}</p>
                </div>
                <div>
                  <label className="adrock-field-label mb-1 block text-sm font-medium">Campaign Medium (utm_medium) *</label>
                  <select value={utmParams.medium} onChange={(e) => handleParamChange('medium', e.target.value)} className="w-full px-3 py-2">
                    {(selectedPreset?.mediums || []).map((medium) => <option key={medium} value={medium}>{medium}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">{UTM_FIELD_GUIDES.find((guide) => guide.key === 'medium')?.helper}</p>
                </div>
                {UTM_FIELD_GUIDES.filter((guide) => !['source', 'medium'].includes(guide.key)).map((guide) => (
                  <div key={guide.key}>
                    <label className="adrock-field-label mb-1 block text-sm font-medium">{guide.label}{guide.required ? ' *' : ''}</label>
                    {guide.key === 'content' ? (
                      <SuggestionBox
                        groups={contentSuggestionGroups}
                        value={utmParams.content}
                        onChange={handleContentValueChange}
                        placeholder="Ou escreva um utm_content próprio"
                      />
                    ) : guide.key === 'term' ? (
                      <SuggestionBox
                        groups={utmTermSuggestionGroups}
                        value={utmParams.term}
                        onChange={handleTermValueChange}
                        placeholder="Ou escreva um utm_term próprio"
                      />
                    ) : guide.key === 'id' ? (
                      <SuggestionBox
                        groups={utmIdSuggestionGroups}
                        value={utmParams.id}
                        onChange={handleUtmIdValueChange}
                        placeholder="Ou escreva um utm_id próprio"
                      />
                    ) : (
                      <input type="text" value={utmParams[guide.key]} onChange={(e) => handleParamChange(guide.key, e.target.value)} className="w-full px-3 py-2" placeholder={guide.example} />
                    )}
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                      <span>{guide.helper} Exemplo: {guide.example}</span>
                      <span>{utmParams[guide.key].length}/{guide.recommendedMax}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="adrock-field-label mb-1 block text-sm font-medium">Nome interno do link *</label>
                  <input type="text" value={internalName} onChange={(e) => setInternalName(e.target.value)} className="w-full px-3 py-2" placeholder="post_patrocinado_secretaria_mg" />
                </div>
                <div>
                  <label className="adrock-field-label mb-1 block text-sm font-medium">Tipo de ação</label>
                  <select value={actionType} onChange={(e) => setActionType(e.target.value)} className="w-full px-3 py-2">
                    {resolvedActionTypeOptions.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="adrock-field-label mb-1 block text-sm font-medium">Tipo de anúncio/formato</label>
                  <select value={adType} onChange={(e) => setAdType(e.target.value)} className="w-full px-3 py-2">
                    {resolvedAdTypeOptions.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="adrock-field-label mb-1 block text-sm font-medium">Destino</label>
                  <select value={destinationType} onChange={(e) => setDestinationType(e.target.value)} className="w-full px-3 py-2">
                    {resolvedDestinationTypeOptions.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="adrock-field-label mb-1 block text-sm font-medium">Observações</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2" placeholder="Contexto operacional, placement, restrição do parceiro..." />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={generateURL} className="rounded-2xl bg-[linear-gradient(135deg,#ff940e_0%,#ff0e03_100%)] px-6 py-3 text-white shadow-[0_18px_38px_rgba(255,14,3,0.18)]">Gerar URL</button>
                {onSaveLink && (
                  <button
                    onClick={handleSaveLink}
                    disabled={isSaving || !generatedURL}
                    className="inline-flex items-center rounded-2xl border border-[#ff940e] px-6 py-3 text-[#ff940e] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Salvando...' : 'Salvar link'}
                  </button>
                )}
              </div>

              {generatedURL && (
                <div className="rounded-2xl border border-[#ff940e]/30 bg-[#fff6e9] p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">URL gerada</h4>
                      <p className="mt-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                        Confira o link parametrizado abaixo se estiver ok clique no botão Salvar link
                      </p>
                    </div>
                    <button onClick={() => copyToClipboard(generatedURL)} className="text-[#ff940e] hover:text-[#ff6a00]"><Copy className="h-5 w-5" /></button>
                  </div>
                  <p className="break-all text-sm leading-relaxed text-gray-800">{generatedURL}</p>
                </div>
              )}
                </>
              )}
              </div>

              {contextType !== 'lote' && (
              <aside className="space-y-4 xl:sticky xl:top-6">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <h4 className="font-semibold text-red-900">Erros</h4>
                  {liveBlockingErrors.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-red-800">
                      {liveBlockingErrors.map((error, index) => <li key={`${error}-${index}`}>• {error}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-red-700">Nenhum erro bloqueante.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                  <h4 className="font-semibold text-yellow-900">Avisos</h4>
                  {builderValidation.warnings.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-yellow-800">
                      {builderValidation.warnings.map((warning, index) => <li key={`${warning.field}-${index}`}>• {warning.message}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-yellow-700">Sem avisos no padrão atual.</p>
                  )}
                </div>

                <div className={`rounded-2xl border p-4 ${statusTone}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Validador em tempo real</p>
                      <h3 className="mt-2 text-lg font-bold">{builderValidation.isValid ? (builderValidation.warnings.length > 0 ? 'Quase pronto' : 'Tudo certo') : 'Faltam ajustes'}</h3>
                      <p className="mt-2 text-sm">Canal estimado no GA4: <strong>{builderValidation.channelGrouping}</strong></p>
                    </div>
                    <Sparkles className="mt-1 h-5 w-5 flex-shrink-0" />
                  </div>
                  <div className="mt-4 space-y-2">
                    {liveChecks.map((check) => (
                      <div key={check.label} className="flex gap-2 rounded-xl bg-white/70 p-2 text-sm">
                        {check.ok ? <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" /> : <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />}
                        <div>
                          <p className="font-semibold text-gray-900">{check.label}</p>
                          <p className="text-xs text-gray-600">{check.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl bg-white/70 p-3 text-sm text-gray-800">
                    <p className="break-all leading-relaxed">{livePreview || 'A URL final aparecerá aqui enquanto você preenche os campos.'}</p>
                  </div>
                </div>
              </aside>
              )}
            </div>
          )}

          {activeTab === 'validator' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Validar parâmetros UTM</h3>
              <div>
                <label className="adrock-field-label mb-1 block text-sm font-medium">Cole a URL para validar</label>
                <textarea value={urlToValidate} onChange={(e) => setUrlToValidate(e.target.value)} className="w-full px-3 py-2" rows={3} placeholder="https://cliente.com/oferta?utm_source=google&utm_medium=cpc&utm_campaign=black_friday_2026" />
              </div>
              {validatorResult && (
                <div className="space-y-4">
                  <div className={`rounded-2xl border p-4 ${validatorResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="mb-2 flex items-center space-x-2">
                      {validatorResult.isValid ? <><CheckCircle className="h-5 w-5 text-green-600" /><h4 className="font-medium text-green-900">URL válida</h4></> : <><XCircle className="h-5 w-5 text-red-600" /><h4 className="font-medium text-red-900">URL inválida</h4></>}
                    </div>
                    <p className="text-sm text-gray-700">Agrupamento previsto no GA4: <strong>{validatorResult.channelGrouping}</strong></p>
                    {validatorResult.matchedPresetLabel && <p className="mt-2 text-sm text-gray-700">Cenário reconhecido pela ferramenta: <strong>{validatorResult.matchedPresetLabel}</strong></p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-lg font-medium text-gray-900">Regras de agrupamento de canais do GA4</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full py-2 pl-10 pr-4" placeholder="Buscar por canal, regra ou descrição..." />
                </div>
              </div>
              <div className="space-y-4">
                {filteredRules.map((rule, index) => (
                  <div key={index} className="adrock-list-card rounded-2xl p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h4 className="font-semibold text-gray-900">{rule.channel}</h4>
                      <span className="rounded-full bg-[#fff1db] px-2 py-1 text-xs text-[#ff940e]">GA4</span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600">{rule.description}</p>
                    <div className="rounded-2xl border border-[#c1d6e9] bg-white/80 p-3">
                      <p className="text-xs font-mono text-gray-700">{rule.rule}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function BulkCampaignInlineForm({
  form,
  status,
  isSaving,
  onChange,
  onSubmit,
  onCancel
}: {
  form: BulkCampaignForm;
  status: string;
  isSaving: boolean;
  onChange: (field: keyof BulkCampaignForm, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[#ffcf92] bg-white p-4">
      <div>
        <h4 className="font-semibold text-gray-900">Cadastrar campanha para o lote</h4>
        <p className="mt-1 text-sm text-gray-700">Crie a campanha aqui e ela já ficará selecionada para o upload da planilha.</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="adrock-field-label mb-1 block text-sm font-medium">Nome do cliente</span>
          <input
            type="text"
            value={form.clientName}
            onChange={(event) => onChange('clientName', event.target.value)}
            className="w-full px-3 py-2"
            placeholder="ex: Porvir.org"
          />
        </label>
        <label className="block">
          <span className="adrock-field-label mb-1 block text-sm font-medium">Nome da campanha</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) => onChange('name', event.target.value)}
            className="w-full px-3 py-2"
            placeholder="ex: Módulo 1"
            required
          />
        </label>
        <label className="block">
          <span className="adrock-field-label mb-1 block text-sm font-medium">Início</span>
          <input type="date" value={form.startsAt} onChange={(event) => onChange('startsAt', event.target.value)} className="w-full px-3 py-2" />
        </label>
        <label className="block">
          <span className="adrock-field-label mb-1 block text-sm font-medium">Fim</span>
          <input type="date" value={form.endsAt} onChange={(event) => onChange('endsAt', event.target.value)} className="w-full px-3 py-2" />
        </label>
        <label className="block">
          <span className="adrock-field-label mb-1 block text-sm font-medium">Status</span>
          <select value={form.status} onChange={(event) => onChange('status', event.target.value)} className="w-full px-3 py-2">
            <option value="rascunho">Rascunho</option>
            <option value="ativo">Ativo</option>
            <option value="encerrado">Encerrado</option>
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="adrock-field-label mb-1 block text-sm font-medium">Descrição</span>
          <textarea
            value={form.description}
            onChange={(event) => onChange('description', event.target.value)}
            className="min-h-24 w-full px-3 py-2"
            placeholder="Contexto da campanha, módulo, etapa ou observações."
          />
        </label>
      </div>

      {status && (
        <p className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">{status}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={isSaving} className="rounded-xl bg-gradient-to-r from-[#ff8a00] to-[#ff1f12] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {isSaving ? 'Cadastrando...' : 'Cadastrar campanha'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-[#c1d6e9] bg-white px-4 py-2 text-sm font-medium text-gray-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function BulkImportPanel({
  selectedCampaignId,
  file,
  validation,
  status,
  isProcessing,
  onDownloadTemplate,
  onFileChange,
  onSave
}: {
  selectedCampaignId: string;
  file: File | null;
  validation: BulkLinkValidationResult | null;
  status: string;
  isProcessing: boolean;
  onDownloadTemplate?: () => Promise<void>;
  onFileChange: (file: File | null) => void;
  onSave: () => void;
}) {
  const previewRows = validation?.rows.slice(0, 12) || [];
  const tutorialSteps = getBulkImportTutorialSteps({ hasSelectedCampaign: Boolean(selectedCampaignId) });
  const uploadStep = tutorialSteps[1];

  return (
    <div className="space-y-4 rounded-2xl border border-[#c1d6e9] bg-white p-4">
      <div>
        <h4 className="font-semibold text-gray-900">Tracking em lote</h4>
        <p className="mt-1 text-sm text-gray-700">
          Baixe o modelo oficial, preencha uma linha por link e suba o XLSX. Se aparecer erro, corrija a planilha e envie novamente. Avisos podem ser aceitos.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#d9e7f4] bg-[#f8fbff] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{tutorialSteps[0].title}</p>
          <p className="mt-2 text-sm text-gray-700">{tutorialSteps[0].description}</p>
          <button type="button" onClick={onDownloadTemplate} disabled={!onDownloadTemplate} className="mt-3 inline-flex items-center rounded-xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">
            <Download className="mr-2 h-4 w-4" />
            Baixar XLSX
          </button>
        </div>
        <div className={`rounded-2xl border p-3 ${uploadStep.highlight ? 'border-[#ff940e] bg-[#fff1db]' : 'border-[#d9e7f4] bg-[#f8fbff]'}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${uploadStep.highlight ? 'text-[#9a4a00]' : 'text-gray-500'}`}>{uploadStep.title}</p>
          <p className="mt-2 text-sm text-gray-700">{uploadStep.description}</p>
          {uploadStep.readyMessage && (
            <p className="mt-2 text-sm font-semibold text-[#9a4a00]">{uploadStep.readyMessage}</p>
          )}
          <label className={`mt-3 inline-flex cursor-pointer items-center rounded-xl border px-3 py-2 text-sm font-semibold ${selectedCampaignId ? 'border-[#ff940e] bg-[#ff940e] text-white shadow-sm shadow-orange-200' : 'border-gray-200 bg-gray-100 text-gray-400'}`}>
            <Upload className="mr-2 h-4 w-4" />
            Subir XLSX
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={!selectedCampaignId || isProcessing}
              onChange={(event) => {
                onFileChange(event.target.files?.[0] || null);
                event.currentTarget.value = '';
              }}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {file && (
        <p className="text-sm text-gray-600">Arquivo selecionado: <strong>{file.name}</strong></p>
      )}
      {status && (
        <p className={`rounded-xl border px-3 py-2 text-sm ${validation?.canSave ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-yellow-200 bg-yellow-50 text-yellow-900'}`}>
          {isProcessing ? 'Processando planilha...' : status}
        </p>
      )}
      {validation && (
        <div className="space-y-3">
          <div className="grid gap-2 text-sm md:grid-cols-4">
            <span className="rounded-xl bg-gray-100 px-3 py-2">Linhas: <strong>{validation.summary.totalRows}</strong></span>
            <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800">OK: <strong>{validation.summary.okRows}</strong></span>
            <span className="rounded-xl bg-yellow-50 px-3 py-2 text-yellow-900">Avisos: <strong>{validation.summary.warningRows}</strong></span>
            <span className="rounded-xl bg-red-50 px-3 py-2 text-red-800">Erros: <strong>{validation.summary.errorRows}</strong></span>
          </div>
          <div className="max-h-72 overflow-auto rounded-2xl border border-[#d9e7f4]">
            <table className="min-w-full divide-y divide-[#d9e7f4] text-left text-xs">
              <thead className="bg-[#f4f8fc] text-gray-600">
                <tr>
                  <th className="px-3 py-2">Linha</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Nome interno</th>
                  <th className="px-3 py-2">URL final</th>
                  <th className="px-3 py-2">Mensagens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3f9] bg-white">
                {previewRows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-2 font-mono">{row.rowNumber}</td>
                    <td className="px-3 py-2 font-semibold">{row.status}</td>
                    <td className="px-3 py-2">{row.normalized.internalName || '-'}</td>
                    <td className="max-w-[20rem] break-all px-3 py-2">{row.normalized.finalUrl || '-'}</td>
                    <td className="min-w-[16rem] px-3 py-2">
                      {[...row.errors, ...row.warnings].join(' | ') || 'Sem mensagens.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {validation.rows.length > previewRows.length && (
            <p className="text-xs text-gray-500">Prévia exibindo as primeiras {previewRows.length} linhas de {validation.rows.length}.</p>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!validation.canSave || isProcessing}
            className="inline-flex items-center rounded-2xl border border-[#ff940e] px-6 py-3 font-semibold text-[#ff940e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="mr-2 h-4 w-4" />
            {isProcessing ? 'Salvando lote...' : 'Salvar lote'}
          </button>
        </div>
      )}
    </div>
  );
}

function SuggestionBox({
  groups,
  value,
  onChange,
  placeholder
}: {
  groups: SuggestionGroup[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const allGroupsId = '__all__';
  const [activeGroupId, setActiveGroupId] = useState(allGroupsId);
  const [suggestionSearch, setSuggestionSearch] = useState('');
  const allOptions = useMemo(() => {
    const seen = new Set<string>();
    return groups.flatMap((group) => group.options).filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }, [groups]);
  const activeOptions = activeGroupId === allGroupsId
    ? allOptions
    : groups.find((group) => group.id === activeGroupId)?.options || [];
  const filteredOptions = activeOptions.filter((option) => {
    const query = suggestionSearch.trim().toLowerCase();
    if (!query) return true;
    return option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query);
  });

  useEffect(() => {
    if (activeGroupId !== allGroupsId && !groups.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(allGroupsId);
    }
  }, [activeGroupId, groups]);

  return (
    <div className="rounded-2xl border border-[#c1d6e9] bg-[#f8fbff] p-3">
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-gray-600">Contexto das sugestões</label>
        <select
          value={activeGroupId}
          onChange={(event) => setActiveGroupId(event.target.value)}
          className="w-full rounded-xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff940e]"
        >
          <option value={allGroupsId}>Todos</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>{group.label}</option>
          ))}
        </select>
        <input
          type="search"
          value={suggestionSearch}
          onChange={(event) => setSuggestionSearch(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff940e]"
          placeholder="Buscar sugestão..."
        />
      </div>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[#d9e7f4] bg-white p-2">
        {filteredOptions.length === 0 && (
          <p className="px-3 py-2 text-sm text-gray-500">Nenhuma sugestão encontrada.</p>
        )}
        {filteredOptions.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={`${activeGroupId}-${option.value}`}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                selected
                  ? 'bg-[#fff1db] font-semibold text-[#9a4a00]'
                  : 'text-gray-700 hover:bg-[#f4f8fc]'
              }`}
            >
              <span>{option.label}</span>
              <span className="shrink-0 font-mono text-xs text-gray-500">{option.value}</span>
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full px-3 py-2"
        placeholder={placeholder}
      />
    </div>
  );
}

function buildCustomSuggestionGroup(id: string, label: string, options: SelectOptionRecord[]): SuggestionGroup | null {
  const activeOptions = options
    .filter((option) => option.isActive)
    .map((option) => ({ value: option.value, label: option.label }));

  if (activeOptions.length === 0) return null;

  return { id, label, options: activeOptions };
}

function parseParametrizedUrl(urlToParse: string): UTMParams {
  const url = new URL(urlToParse.trim());
  const searchParams = new URLSearchParams(url.search);
  const parsed: UTMParams = {
    url: '',
    source: searchParams.get('utm_source') || '',
    medium: searchParams.get('utm_medium') || '',
    campaign: searchParams.get('utm_campaign') || '',
    term: searchParams.get('utm_term') || '',
    content: searchParams.get('utm_content') || '',
    id: searchParams.get('utm_id') || ''
  };

  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'].forEach((key) => {
    searchParams.delete(key);
  });

  const query = searchParams.toString();
  parsed.url = `${url.origin}${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
  return parsed;
}

function isWhatsAppUrl(value: string) {
  if (!value.trim()) return false;

  try {
    const hostname = new URL(value.trim()).hostname.replace(/^www\./, '').toLowerCase();
    return hostname === 'wa.me' || hostname.endsWith('whatsapp.com');
  } catch {
    return false;
  }
}

function buildLivePreviewUrl(params: UTMParams) {
  try {
    return buildGeneratedUrl(params);
  } catch {
    return '';
  }
}

export default UTMBuilder;

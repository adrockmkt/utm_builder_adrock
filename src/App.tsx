import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Download, ExternalLink, FileClock, FileText, Link2, LogOut, Plus, Settings, ShieldCheck, Users } from 'lucide-react';
import UTMBuilder from './components/UTMBuilder';
import { api, setStoredToken } from './utils/api';
import type { AuditLogRecord, AuthUser, CampaignRecord, DocumentLinkRecord, LinkRecord, SaveLinkPayload, SelectOptionCategory, SelectOptionRecord, SettingsRecord, UserRecord } from './types';

type Section = 'builder' | 'campaigns' | 'links' | 'documents' | 'users' | 'settings' | 'audit';
const DEFAULT_TOP_LOGO_URL = `${import.meta.env.BASE_URL}adrock-logo.png`;
const DEFAULT_BRAND: SettingsRecord['brand'] = {
  appName: 'Ad Rock UTM Builder',
  topLogoUrl: DEFAULT_TOP_LOGO_URL,
  topLogoSize: 56
};

function App() {
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('builder');
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentLinkRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [settings, setSettings] = useState<SettingsRecord>({
    options: [],
    channelPresets: [],
    brand: DEFAULT_BRAND
  });
  const [brandForm, setBrandForm] = useState({ appName: DEFAULT_BRAND.appName });
  const [health, setHealth] = useState<{ status: string; database: string } | null>(null);
  const [savingLink, setSavingLink] = useState(false);
  const [creatingBitlyId, setCreatingBitlyId] = useState<string | null>(null);
  const [bitlyForms, setBitlyForms] = useState<Record<string, string>>({});
  const [linkFilters, setLinkFilters] = useState({
    search: '',
    campaign: '',
    content: '',
    utmId: '',
    channel: '',
    dateFrom: '',
    dateTo: '',
    bitly: ''
  });
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    type: 'campanha' as CampaignRecord['type'],
    mainChannel: 'Multicanal',
    defaultSource: '',
    defaultMedium: '',
    startsAt: '',
    endsAt: '',
    status: 'rascunho' as CampaignRecord['status'],
    description: ''
  });
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor' as UserRecord['role']
  });
  const [documentForm, setDocumentForm] = useState({
    title: '',
    url: '',
    category: '',
    description: ''
  });
  const [optionForm, setOptionForm] = useState({
    category: 'action_type' as SelectOptionCategory,
    value: '',
    label: ''
  });
  const [optionEdits, setOptionEdits] = useState<Record<string, SelectOptionRecord>>({});

  useEffect(() => {
    void initialize();
  }, []);

  const totalLinks = links.length;
  const totalCampaigns = campaigns.length;
  const totalUsers = users.length;
  const optionCategories: Array<{ value: SelectOptionCategory; label: string }> = [
    { value: 'action_type', label: 'Tipo de ação' },
    { value: 'destination_type', label: 'Destino' },
    { value: 'ad_type', label: 'Tipo de anúncio' },
    { value: 'utm_id', label: 'utm_id' },
    { value: 'campaign_type', label: 'Tipo de campanha' },
    { value: 'campaign_status', label: 'Status de campanha' }
  ];
  const optionsByCategory = (category: SelectOptionCategory) =>
    settings.options
      .filter((option) => option.category === category && option.isActive)
      .map((option) => ({ value: option.value, label: option.label }));
  const campaignTypeOptions = optionsByCategory('campaign_type');
  const campaignStatusOptions = optionsByCategory('campaign_status');
  const nextOptionSortOrder = (category: SelectOptionCategory) => {
    const categoryOptions = settings.options.filter((option) => option.category === category);
    return (Math.max(0, ...categoryOptions.map((option) => option.sortOrder)) || 0) + 10;
  };
  const topLogoUrl = settings.brand.topLogoUrl === '/utm-builder/adrock-logo.png'
    ? DEFAULT_TOP_LOGO_URL
    : settings.brand.topLogoUrl;
  const appName = settings.brand.appName || DEFAULT_BRAND.appName;
  const canManageDocuments = user ? ['admin', 'editor'].includes(user.role) : false;
  const getLinkChannelLabel = (link: LinkRecord) => {
    const source = link.utm_source.toLowerCase();
    const medium = link.utm_medium.toLowerCase();
    const preset = settings.channelPresets.find((channelPreset) => {
      const sources = channelPreset.sources.map((value) => value.toLowerCase());
      const mediums = channelPreset.mediums.map((value) => value.toLowerCase());
      return sources.includes(source) && mediums.includes(medium);
    });

    return preset?.label || `${link.utm_source} / ${link.utm_medium}`;
  };
  const uniqueLinkValues = (getValue: (link: LinkRecord) => string | null | undefined) =>
    Array.from(new Set(links.map((link) => getValue(link)?.trim()).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const linkCampaignOptions = useMemo(() => uniqueLinkValues((link) => link.utm_campaign), [links]);
  const linkContentOptions = useMemo(() => uniqueLinkValues((link) => link.utm_content), [links]);
  const linkUtmIdOptions = useMemo(() => uniqueLinkValues((link) => link.utm_id), [links]);
  const linkChannelOptions = useMemo(() => uniqueLinkValues((link) => getLinkChannelLabel(link)), [links, settings.channelPresets]);
  const filteredLinks = useMemo(() => {
    const search = linkFilters.search.trim().toLowerCase();
    const fromDate = linkFilters.dateFrom ? new Date(`${linkFilters.dateFrom}T00:00:00`) : null;
    const toDate = linkFilters.dateTo ? new Date(`${linkFilters.dateTo}T23:59:59`) : null;

    return links.filter((link) => {
      const searchable = [
        link.internal_name,
        link.base_url,
        link.final_url,
        link.utm_campaign,
        link.utm_content,
        link.utm_id,
        link.utm_source,
        link.utm_medium,
        link.bitly_url
      ].filter(Boolean).join(' ').toLowerCase();
      const createdAt = new Date(link.created_at);

      if (search && !searchable.includes(search)) return false;
      if (linkFilters.campaign && link.utm_campaign !== linkFilters.campaign) return false;
      if (linkFilters.content && link.utm_content !== linkFilters.content) return false;
      if (linkFilters.utmId && link.utm_id !== linkFilters.utmId) return false;
      if (linkFilters.channel && getLinkChannelLabel(link) !== linkFilters.channel) return false;
      if (linkFilters.bitly === 'with' && !link.bitly_url) return false;
      if (linkFilters.bitly === 'without' && link.bitly_url) return false;
      if (fromDate && createdAt < fromDate) return false;
      if (toDate && createdAt > toDate) return false;
      return true;
    });
  }, [links, linkFilters, settings.channelPresets]);
  const hasLinkFilters = Object.values(linkFilters).some(Boolean);

  async function initialize() {
    setLoading(true);
    try {
      const [setup, publicBrand] = await Promise.all([
        api.getSetupStatus(),
        api.getPublicBrand().catch(() => null)
      ]);
      if (publicBrand) {
        setSettings((current) => ({ ...current, brand: normalizeBrand(publicBrand) }));
        setBrandForm({ appName: publicBrand.appName || DEFAULT_BRAND.appName });
      }
      setSetupRequired(setup.setupRequired);

      if (!setup.setupRequired) {
        try {
          const me = await api.me();
          setUser(me.user);
          await loadAppData(me.user);
        } catch {
          setStoredToken(null);
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadAppData(currentUser: AuthUser) {
    const [healthResult, campaignsResult, linksResult, documentsResult, usersResult, auditLogsResult, settingsResult] = await Promise.all([
      api.health().catch(() => null),
      api.listCampaigns(),
      api.listLinks(),
      api.listDocuments(),
      currentUser.isAdmin ? api.listUsers() : Promise.resolve([]),
      currentUser.isAdmin ? api.listAuditLogs() : Promise.resolve([]),
      api.getSettings()
    ]);

    setHealth(healthResult);
    setCampaigns(campaignsResult);
    setLinks(linksResult);
    setDocuments(documentsResult);
    setUsers(usersResult);
    setAuditLogs(auditLogsResult);
    setSettings({ ...settingsResult, brand: normalizeBrand(settingsResult.brand) });
    setBrandForm({ appName: settingsResult.brand.appName || DEFAULT_BRAND.appName });
  }

  async function handleSetupSubmit(event: React.FormEvent) {
    event.preventDefault();
    await api.setupAdmin(authForm);
    setSetupRequired(false);
    setAuthForm({ name: '', email: '', password: '' });
    alert('Administrador inicial criado. Faça login para continuar.');
  }

  async function handleLoginSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = await api.login(loginForm);
    setStoredToken(result.token);
    setUser(result.user);
    setLoginForm({ email: '', password: '' });
    await loadAppData(result.user);
  }

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      setStoredToken(null);
      setUser(null);
      setCampaigns([]);
      setLinks([]);
      setDocuments([]);
      setUsers([]);
      setAuditLogs([]);
      setSettings({ options: [], channelPresets: [], brand: DEFAULT_BRAND });
      setBrandForm({ appName: DEFAULT_BRAND.appName });
    }
  }

  async function handleDownloadCsv(kind: 'links' | 'campaigns') {
    const blob = kind === 'links' ? await api.downloadLinksCsv() : await api.downloadCampaignsCsv();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = kind === 'links' ? 'utm-links.csv' : 'utm-campaigns.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleCreateCampaign(event: React.FormEvent) {
    event.preventDefault();
    await api.createCampaign(campaignForm);
    setCampaignForm({
      name: '',
      type: 'campanha',
      mainChannel: 'Multicanal',
      defaultSource: '',
      defaultMedium: '',
      startsAt: '',
      endsAt: '',
      status: 'rascunho',
      description: ''
    });
    if (user) await loadAppData(user);
  }

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    await api.createUser(userForm);
    setUserForm({ name: '', email: '', password: '', role: 'editor' });
    if (user) await loadAppData(user);
  }

  async function handleCreateDocument(event: React.FormEvent) {
    event.preventDefault();
    await api.createDocument(documentForm);
    setDocumentForm({ title: '', url: '', category: '', description: '' });
    if (user) await loadAppData(user);
  }

  async function handleSaveLink(payload: SaveLinkPayload) {
    setSavingLink(true);
    try {
      await api.createLink(payload);
      if (user) await loadAppData(user);
      alert('Link salvo com sucesso.');
    } finally {
      setSavingLink(false);
    }
  }

  async function handleDeleteCampaign(id: string) {
    await api.deleteCampaign(id);
    if (user) await loadAppData(user);
  }

  async function handleDeleteLink(id: string) {
    await api.deleteLink(id);
    if (user) await loadAppData(user);
  }

  async function handleDeleteDocument(id: string) {
    await api.deleteDocument(id);
    if (user) await loadAppData(user);
  }

  async function handleCreateBitly(link: LinkRecord) {
    const customBackHalf = (bitlyForms[link.id] ?? suggestBitlyBackHalf(link)).trim();
    if (!customBackHalf) {
      alert('Informe o nome do bit.ly.');
      return;
    }

    setCreatingBitlyId(link.id);
    try {
      await api.createBitlyLink(link.id, customBackHalf);
      setBitlyForms((current) => {
        const next = { ...current };
        delete next[link.id];
        return next;
      });
      if (user) await loadAppData(user);
      alert('Bitly criado com sucesso.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao criar Bitly.');
    } finally {
      setCreatingBitlyId(null);
    }
  }

  async function handleToggleUserStatus(item: UserRecord) {
    await api.updateUser(item.id, {
      status: item.status === 'active' ? 'inactive' : 'active'
    });
    if (user) await loadAppData(user);
  }

  async function handleCreateOption(event: React.FormEvent) {
    event.preventDefault();
    const technicalValue = normalizeSelectOptionValue(optionForm.value || optionForm.label);

    if (!technicalValue) {
      alert('Informe o nome exibido para gerar o valor técnico.');
      return;
    }

    await api.createSelectOption({
      category: optionForm.category,
      value: technicalValue,
      label: optionForm.label,
      sortOrder: nextOptionSortOrder(optionForm.category),
      isActive: true
    });
    setOptionForm((current) => ({ ...current, value: '', label: '' }));
    if (user) await loadAppData(user);
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Envie uma imagem PNG, JPG ou WebP.');
      return;
    }
    if (file.size > 1_500_000) {
      alert('A logo deve ter até 1.5 MB.');
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    await api.updateBrandLogo(dataUrl);
    if (user) await loadAppData(user);
  }

  async function handleResetLogo() {
    await api.resetBrandLogo();
    if (user) await loadAppData(user);
  }

  async function handleUpdateBrand(event: React.FormEvent) {
    event.preventDefault();
    await api.updateBrand({ appName: brandForm.appName });
    if (user) await loadAppData(user);
  }

  async function handleUpdateOption(option: SelectOptionRecord) {
    await api.updateSelectOption(option.id, {
      value: option.value,
      label: option.label,
      sortOrder: option.sortOrder,
      isActive: option.isActive
    });
    if (user) await loadAppData(user);
  }

  async function handleDeleteOption(id: string) {
    await api.deleteSelectOption(id);
    if (user) await loadAppData(user);
  }

  const sections = useMemo(
    () => [
      { id: 'builder' as Section, label: 'UTM Builder', icon: Link2 },
      { id: 'campaigns' as Section, label: 'Campanhas', icon: BarChart3 },
      { id: 'links' as Section, label: 'Links', icon: Activity },
      { id: 'documents' as Section, label: 'Documentos', icon: FileText },
      ...(user?.isAdmin ? [
        { id: 'users' as Section, label: 'Usuários', icon: Users },
        { id: 'settings' as Section, label: 'Cadastros', icon: Settings },
        { id: 'audit' as Section, label: 'Auditoria', icon: FileClock }
      ] : [])
    ],
    [user]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#ff940e]"></div>
          <p className="text-gray-600">Carregando UTM Builder...</p>
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <AuthShell appName={appName} topLogoUrl={topLogoUrl} title="Configuração inicial" subtitle="Crie o administrador da instalação single-tenant do cliente.">
        <form onSubmit={handleSetupSubmit} className="space-y-4">
          <Input label="Nome" value={authForm.name} onChange={(value) => setAuthForm((current) => ({ ...current, name: value }))} />
          <Input label="Email" type="email" value={authForm.email} onChange={(value) => setAuthForm((current) => ({ ...current, email: value }))} />
          <Input label="Senha" type="password" value={authForm.password} onChange={(value) => setAuthForm((current) => ({ ...current, password: value }))} />
          <button className="w-full rounded-2xl bg-[linear-gradient(135deg,#ff940e_0%,#ff0e03_100%)] px-5 py-3 font-semibold text-white">
            Criar administrador inicial
          </button>
        </form>
      </AuthShell>
    );
  }

  if (!user) {
    return (
      <AuthShell appName={appName} topLogoUrl={topLogoUrl} title={`Entrar no ${appName}`} subtitle="Produto standalone para gestão de UTMs, campanhas e histórico governado.">
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <Input label="Email" type="email" value={loginForm.email} onChange={(value) => setLoginForm((current) => ({ ...current, email: value }))} />
          <Input label="Senha" type="password" value={loginForm.password} onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))} />
          <button className="w-full rounded-2xl bg-[linear-gradient(135deg,#ff940e_0%,#ff0e03_100%)] px-5 py-3 font-semibold text-white">
            Entrar
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-[#c1d6e9] bg-adrock-surface">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.7fr_1fr] lg:px-10">
            <div>
              <div className="flex items-center gap-3">
                <img
                  src={topLogoUrl}
                  alt={appName}
                  className="h-14 w-14 rounded-2xl object-contain"
                />
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ff940e]">{appName}</p>
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-gray-950 sm:text-5xl">
                Gerenciamento de UTMs
              </h1>
              <p className="mt-4 max-w-3xl text-base text-gray-600 sm:text-lg">
                Vincule campanhas aos UTMs para gestão de dados.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <InfoCard icon={Link2} title="Links governados" value={String(totalLinks)} />
              <InfoCard icon={BarChart3} title="Campanhas" value={String(totalCampaigns)} />
              <InfoCard icon={ShieldCheck} title="Banco" value={health?.database || 'indisponível'} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-[1.75rem] border border-black/5 bg-adrock-surface p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-600">{user.email} · {user.role}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`inline-flex items-center rounded-2xl px-4 py-2 text-sm font-medium ${
                    activeSection === section.id
                      ? 'bg-[#fff1db] text-[#9a4a00]'
                      : 'border border-[#c1d6e9] bg-white text-gray-700'
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
            <button onClick={handleLogout} className="inline-flex items-center rounded-2xl border border-[#ffd1ce] bg-white px-4 py-2 text-sm font-medium text-[#b42318]">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </button>
          </div>
        </section>

        {activeSection === 'builder' && (
          <UTMBuilder
            campaigns={campaigns}
            channelPresets={settings.channelPresets}
            actionTypeOptions={settings.options.filter((option) => option.category === 'action_type')}
            destinationTypeOptions={settings.options.filter((option) => option.category === 'destination_type')}
            adTypeOptions={settings.options.filter((option) => option.category === 'ad_type')}
            utmIdOptions={settings.options.filter((option) => option.category === 'utm_id')}
            onCreateCampaignRequest={() => setActiveSection('campaigns')}
            onSaveLink={handleSaveLink}
            isSaving={savingLink}
          />
        )}

        {activeSection === 'campaigns' && (
          <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
            <Panel title="Nova campanha ou grupo de ações" subtitle="Base de governança para o catálogo de links.">
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <Input label="Nome" value={campaignForm.name} onChange={(value) => setCampaignForm((current) => ({ ...current, name: value }))} />
                <Select
                  label="Tipo"
                  value={campaignForm.type}
                  onChange={(value) => setCampaignForm((current) => ({ ...current, type: value as CampaignRecord['type'] }))}
                  options={campaignTypeOptions.length > 0 ? campaignTypeOptions : [
                    { value: 'campanha', label: 'Campanha' },
                    { value: 'pontual', label: 'Pontual' }
                  ]}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="Início" type="date" value={campaignForm.startsAt} onChange={(value) => setCampaignForm((current) => ({ ...current, startsAt: value }))} />
                  <Input label="Fim" type="date" value={campaignForm.endsAt} onChange={(value) => setCampaignForm((current) => ({ ...current, endsAt: value }))} />
                </div>
                <Select
                  label="Status"
                  value={campaignForm.status}
                  onChange={(value) => setCampaignForm((current) => ({ ...current, status: value as CampaignRecord['status'] }))}
                  options={campaignStatusOptions.length > 0 ? campaignStatusOptions : [
                    { value: 'rascunho', label: 'Rascunho' },
                    { value: 'ativo', label: 'Ativo' },
                    { value: 'encerrado', label: 'Encerrado' }
                  ]}
                />
                <TextArea label="Descrição" value={campaignForm.description} onChange={(value) => setCampaignForm((current) => ({ ...current, description: value }))} />
                <button className="inline-flex items-center rounded-2xl bg-[linear-gradient(135deg,#ff940e_0%,#ff0e03_100%)] px-5 py-3 font-semibold text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar campanha
                </button>
              </form>
            </Panel>

            <Panel title="Campanhas cadastradas" subtitle="Governança de links agrupados por contexto operacional.">
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => handleDownloadCsv('campaigns')}
                  className="inline-flex items-center rounded-2xl border border-[#c1d6e9] bg-white px-4 py-2 text-sm font-medium text-gray-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </button>
              </div>
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-2xl border border-[#c1d6e9] bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">{campaign.name}</p>
                        <p className="text-sm text-gray-600">{campaign.type} · {campaign.status}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-500">
                          {campaign.starts_at ? new Date(campaign.starts_at).toLocaleDateString('pt-BR') : 'sem início'} / {campaign.ends_at ? new Date(campaign.ends_at).toLocaleDateString('pt-BR') : 'sem fim'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{campaign.links_count || 0} links</p>
                        <button onClick={() => handleDeleteCampaign(campaign.id)} className="mt-3 text-sm text-[#b42318]">
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {activeSection === 'links' && (
          <Panel title="Catálogo de links" subtitle="Links persistidos com contexto de campanha e leitura posterior no GA4.">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{filteredLinks.length} de {links.length} links</p>
                <p className="text-sm text-gray-600">Filtre por campanha, peça, identificador e canal para comparar depois no GA4.</p>
              </div>
              <button
                onClick={() => handleDownloadCsv('links')}
                className="inline-flex items-center rounded-2xl border border-[#c1d6e9] bg-white px-4 py-2 text-sm font-medium text-gray-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </button>
            </div>
            <div className="mb-5 rounded-2xl border border-[#c1d6e9] bg-[#f6f9fc] p-4">
              <div className="grid gap-3 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Buscar</label>
                  <input
                    value={linkFilters.search}
                    onChange={(event) => setLinkFilters((current) => ({ ...current, search: event.target.value }))}
                    className="w-full rounded-2xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff940e]"
                    placeholder="Nome, URL, campanha, peça, utm_id..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">utm_campaign</label>
                  <select
                    value={linkFilters.campaign}
                    onChange={(event) => setLinkFilters((current) => ({ ...current, campaign: event.target.value }))}
                    className="w-full rounded-2xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff940e]"
                  >
                    <option value="">Todas</option>
                    {linkCampaignOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">utm_content</label>
                  <select
                    value={linkFilters.content}
                    onChange={(event) => setLinkFilters((current) => ({ ...current, content: event.target.value }))}
                    className="w-full rounded-2xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff940e]"
                  >
                    <option value="">Todos</option>
                    {linkContentOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">utm_id</label>
                  <select
                    value={linkFilters.utmId}
                    onChange={(event) => setLinkFilters((current) => ({ ...current, utmId: event.target.value }))}
                    className="w-full rounded-2xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff940e]"
                  >
                    <option value="">Todos</option>
                    {linkUtmIdOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Canal GA4</label>
                  <select
                    value={linkFilters.channel}
                    onChange={(event) => setLinkFilters((current) => ({ ...current, channel: event.target.value }))}
                    className="w-full rounded-2xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff940e]"
                  >
                    <option value="">Todos</option>
                    {linkChannelOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Bitly</label>
                  <select
                    value={linkFilters.bitly}
                    onChange={(event) => setLinkFilters((current) => ({ ...current, bitly: event.target.value }))}
                    className="w-full rounded-2xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff940e]"
                  >
                    <option value="">Todos</option>
                    <option value="with">Com bit.ly</option>
                    <option value="without">Sem bit.ly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Criado de</label>
                  <input
                    type="date"
                    value={linkFilters.dateFrom}
                    onChange={(event) => setLinkFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                    className="w-full rounded-2xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff940e]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Criado até</label>
                  <input
                    type="date"
                    value={linkFilters.dateTo}
                    onChange={(event) => setLinkFilters((current) => ({ ...current, dateTo: event.target.value }))}
                    className="w-full rounded-2xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff940e]"
                  />
                </div>
              </div>
              {hasLinkFilters && (
                <button
                  onClick={() => setLinkFilters({ search: '', campaign: '', content: '', utmId: '', channel: '', dateFrom: '', dateTo: '', bitly: '' })}
                  className="mt-3 text-sm font-medium text-[#b42318]"
                >
                  Limpar filtros
                </button>
              )}
            </div>
            <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-2">
              {filteredLinks.length === 0 && (
                <div className="rounded-2xl border border-[#c1d6e9] bg-white p-4 text-sm text-gray-600">
                  Nenhum link encontrado com os filtros atuais.
                </div>
              )}
              {filteredLinks.map((link) => (
                <div key={link.id} className="rounded-2xl border border-[#c1d6e9] bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{link.internal_name || 'sem nome interno'}</p>
                      <p className="text-sm text-gray-600">utm_campaign: {link.utm_campaign || 'sem campanha'}</p>
                      <p className="text-sm text-gray-600">utm_content: {link.utm_content || 'sem conteúdo'}</p>
                      <p className="text-sm text-gray-600">utm_id: {link.utm_id || 'sem utm_id'}</p>
                      <p className="text-sm text-gray-600">Canal GA4: {getLinkChannelLabel(link)}</p>
                      <p className="text-sm text-gray-600">Nome interno: {link.internal_name || 'sem nome interno'}</p>
                      <p className="mt-1 text-sm text-gray-600">Tipo de ação: {link.action_type || 'sem ação'}</p>
                      <p className="mt-2 break-all text-sm text-gray-700">{link.final_url}</p>
                      {link.bitly_url ? (
                        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                          <p className="font-semibold text-emerald-800">Bitly criado</p>
                          <a href={link.bitly_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-emerald-700 underline">
                            {link.bitly_url}
                          </a>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-2xl border border-[#c1d6e9] bg-[#f6f9fc] px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">Você pode encurtar o link se precisar, ou parar por aqui.</p>
                          <p className="mt-1 text-xs leading-relaxed text-gray-600">
                            Encurte apenas para ações offline ou situações parecidas em que um link extenso com UTMs não seja adequado, como QR code, folder, evento ou material impresso.
                          </p>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <input
                              value={bitlyForms[link.id] ?? suggestBitlyBackHalf(link)}
                              onChange={(event) => setBitlyForms((current) => ({ ...current, [link.id]: normalizeBitlyBackHalf(event.target.value) }))}
                              className="min-w-0 flex-1 rounded-2xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff940e]"
                              placeholder="nome-do-link"
                            />
                            <button
                              onClick={() => handleCreateBitly(link)}
                              disabled={creatingBitlyId === link.id}
                              className="rounded-2xl bg-[linear-gradient(135deg,#ff940e_0%,#ff0e03_100%)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {creatingBitlyId === link.id ? 'Gerando...' : 'Gerar bit.ly'}
                            </button>
                          </div>
                          {link.bitly_error && <p className="mt-2 text-xs text-[#b42318]">{link.bitly_error}</p>}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleDeleteLink(link.id)} className="text-sm text-[#b42318]">
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {activeSection === 'documents' && (
          <div className={`grid gap-6 ${canManageDocuments ? 'xl:grid-cols-[0.85fr_1.15fr]' : ''}`}>
            {canManageDocuments && (
              <Panel title="Novo documento" subtitle="Salve URLs de planilhas modelo, bases de referência e arquivos de apoio.">
                <form onSubmit={handleCreateDocument} className="space-y-4">
                  <Input label="Nome do documento" value={documentForm.title} onChange={(title) => setDocumentForm((current) => ({ ...current, title }))} />
                  <Input label="URL da planilha ou modelo" type="url" value={documentForm.url} onChange={(url) => setDocumentForm((current) => ({ ...current, url }))} />
                  <Input label="Categoria" value={documentForm.category} onChange={(category) => setDocumentForm((current) => ({ ...current, category }))} />
                  <TextArea label="Observações" value={documentForm.description} onChange={(description) => setDocumentForm((current) => ({ ...current, description }))} />
                  <button className="inline-flex items-center rounded-2xl bg-[linear-gradient(135deg,#ff940e_0%,#ff0e03_100%)] px-5 py-3 font-semibold text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar documento
                  </button>
                </form>
              </Panel>
            )}

            <Panel title="Documentos cadastrados" subtitle="URLs úteis para acessar modelos de planilhas e materiais de referência.">
              <div className="space-y-3">
                {documents.length === 0 && (
                  <div className="rounded-2xl border border-[#c1d6e9] bg-white p-4 text-sm text-gray-600">
                    Nenhum documento cadastrado ainda.
                  </div>
                )}
                {documents.map((document) => (
                  <div key={document.id} className="rounded-2xl border border-[#c1d6e9] bg-white p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{document.title}</p>
                        {document.category && <p className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-500">{document.category}</p>}
                        {document.description && <p className="mt-2 text-sm text-gray-600">{document.description}</p>}
                        <a href={document.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full items-center gap-2 break-all text-sm font-medium text-[#0066cc] underline">
                          <ExternalLink className="h-4 w-4 flex-shrink-0" />
                          {document.url}
                        </a>
                        <p className="mt-2 text-xs text-gray-500">
                          Adicionado por {document.created_by_name || 'usuário'} em {new Date(document.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {canManageDocuments && (
                        <button onClick={() => handleDeleteDocument(document.id)} className="text-sm text-[#b42318]">
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {activeSection === 'users' && user.isAdmin && (
          <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
            <Panel title="Novo usuário" subtitle="Admin da instalação controla acessos próprios do cliente.">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <Input label="Nome" value={userForm.name} onChange={(value) => setUserForm((current) => ({ ...current, name: value }))} />
                <Input label="Email" type="email" value={userForm.email} onChange={(value) => setUserForm((current) => ({ ...current, email: value }))} />
                <Input label="Senha inicial" type="password" value={userForm.password} onChange={(value) => setUserForm((current) => ({ ...current, password: value }))} />
                <Select
                  label="Perfil"
                  value={userForm.role}
                  onChange={(value) => setUserForm((current) => ({ ...current, role: value as UserRecord['role'] }))}
                  options={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'editor', label: 'Editor' },
                    { value: 'viewer', label: 'Viewer' }
                  ]}
                />
                <button className="inline-flex items-center rounded-2xl bg-[linear-gradient(135deg,#ff940e_0%,#ff0e03_100%)] px-5 py-3 font-semibold text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar usuário
                </button>
              </form>
            </Panel>

            <Panel title="Usuários da instalação" subtitle="Perfis e status de acesso do tenant atual.">
              <div className="space-y-3">
                {users.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[#c1d6e9] bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.email}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-500">{item.role}</p>
                      </div>
                      <div className="text-right">
                        <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}>
                          {item.status}
                        </span>
                        <div className="mt-3">
                          <button onClick={() => handleToggleUserStatus(item)} className="text-sm text-[#9a4a00]">
                            {item.status === 'active' ? 'Desativar' : 'Reativar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {activeSection === 'settings' && user.isAdmin && (
          <div className="w-full space-y-6">
            <Panel title="Marca do topo" subtitle="Troque a logo exibida no topo do sistema. Use imagem quadrada, preferencialmente 512x512 ou 1024x1024. Ela será exibida em 56x56 px.">
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <img src={topLogoUrl} alt="Logo atual" className="h-14 w-14 rounded-2xl object-contain" />
                  <div>
                    <p className="font-semibold text-gray-900">Logo atual</p>
                    <p className="text-sm text-gray-600">Exibição fixa: {settings.brand.topLogoSize}px x {settings.brand.topLogoSize}px</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-2xl border border-[#c1d6e9] bg-white px-4 py-2 text-sm font-medium text-gray-700">
                    Subir logo
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="sr-only" />
                  </label>
                  <button type="button" onClick={handleResetLogo} className="rounded-2xl border border-[#ffd1ce] bg-white px-4 py-2 text-sm font-medium text-[#b42318]">
                    Restaurar padrão
                  </button>
                </div>
                <form onSubmit={handleUpdateBrand} className="space-y-3 border-t border-[#c1d6e9]/70 pt-5">
                  <Input label="Nome do sistema" value={brandForm.appName} onChange={(appName) => setBrandForm({ appName })} />
                  <button className="inline-flex items-center rounded-2xl bg-[linear-gradient(135deg,#ff940e_0%,#ff0e03_100%)] px-5 py-3 font-semibold text-white">
                    Salvar nome
                  </button>
                </form>
              </div>
            </Panel>

            <Panel title="Novo item de seleção" subtitle="Crie valores usados nos campos de seleção do sistema.">
              <form onSubmit={handleCreateOption} className="space-y-4">
                <Select
                  label="Campo"
                  value={optionForm.category}
                  onChange={(value) => setOptionForm((current) => ({ ...current, category: value as SelectOptionCategory }))}
                  options={optionCategories}
                />
                <Input
                  label="Nome exibido"
                  value={optionForm.label}
                  onChange={(label) => setOptionForm((current) => ({
                    ...current,
                    label,
                    value: normalizeSelectOptionValue(label)
                  }))}
                />
                <div className="adrock-form-shell">
                  <label className="adrock-field-label mb-1 block text-sm font-medium">Valor técnico</label>
                  <input
                    type="text"
                    value={optionForm.value}
                    readOnly
                    className="w-full bg-[#f6f9fc] px-3 py-2 text-gray-600"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-gray-600">
                    Gerado automaticamente a partir do nome exibido. Esse é o valor salvo no link e usado em UTMs, filtros e exportações.
                  </p>
                </div>
                <button className="inline-flex items-center rounded-2xl bg-[linear-gradient(135deg,#ff940e_0%,#ff0e03_100%)] px-5 py-3 font-semibold text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar item
                </button>
              </form>
            </Panel>

            <Panel title="Itens cadastrados" subtitle="Edite, ative, desative ou exclua valores de selects.">
              <div className="max-h-[720px] space-y-4 overflow-y-auto pr-2">
                {optionCategories.map((category) => (
                  <div key={category.value} className="rounded-2xl border border-[#c1d6e9] bg-white p-4">
                    <h3 className="font-semibold text-gray-900">{category.label}</h3>
                    <div className="mt-3 space-y-3">
                      {settings.options.filter((option) => option.category === category.value).map((option) => {
                        const edit = optionEdits[option.id] || option;
                        return (
                          <div key={option.id} className="space-y-3 rounded-2xl bg-[#f8fbff] p-4">
                            <Input label="Valor" value={edit.value} onChange={(value) => setOptionEdits((current) => ({ ...current, [option.id]: { ...edit, value } }))} />
                            <Input label="Nome" value={edit.label} onChange={(label) => setOptionEdits((current) => ({ ...current, [option.id]: { ...edit, label } }))} />
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button type="button" onClick={() => handleUpdateOption(edit)} className="rounded-xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm text-gray-700">Salvar</button>
                              <button type="button" onClick={() => handleUpdateOption({ ...edit, isActive: !edit.isActive })} className="rounded-xl border border-[#c1d6e9] bg-white px-3 py-2 text-sm text-gray-700">
                                {edit.isActive ? 'Desativar' : 'Ativar'}
                              </button>
                              <button type="button" onClick={() => handleDeleteOption(option.id)} className="rounded-xl border border-[#ffd1ce] bg-white px-3 py-2 text-sm text-[#b42318]">Excluir</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Canais GA4 oficiais" subtitle="Lista somente leitura baseada no Default channel group oficial do Google Analytics 4.">
              <div className="max-h-[720px] space-y-3 overflow-y-auto pr-2">
                {settings.channelPresets.filter((preset) => preset.isActive).map((preset) => {
                  return (
                    <div key={preset.id} className="rounded-2xl border border-[#c1d6e9] bg-white p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{preset.label}</p>
                          <p className="mt-1 text-sm text-gray-600">{preset.description}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                          Oficial GA4
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-2xl bg-[#f8fbff] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Sources recomendadas</p>
                          <p className="mt-2 text-sm text-gray-800">{preset.sources.join(', ')}</p>
                        </div>
                        <div className="rounded-2xl bg-[#f8fbff] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Mediums permitidos</p>
                          <p className="mt-2 text-sm text-gray-800">{preset.mediums.join(', ')}</p>
                        </div>
                        <div className="rounded-2xl bg-[#f8fbff] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Source padrão</p>
                          <p className="mt-2 text-sm font-semibold text-gray-900">{preset.defaultSource}</p>
                        </div>
                        <div className="rounded-2xl bg-[#f8fbff] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Medium padrão</p>
                          <p className="mt-2 text-sm font-semibold text-gray-900">{preset.defaultMedium}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}

        {activeSection === 'audit' && user.isAdmin && (
          <Panel title="Auditoria" subtitle="Últimos eventos de segurança e alterações registradas na instalação.">
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-[#c1d6e9] bg-white p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{log.action}</p>
                      <p className="text-sm text-gray-600">
                        {log.actor_name || log.actor_email || 'Sistema'} · {log.entity_type}
                        {log.entity_id ? ` · ${log.entity_id}` : ''}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{log.ip_address || 'IP indisponível'}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </main>
    </div>
  );
}

function AuthShell({
  appName,
  topLogoUrl,
  title,
  subtitle,
  children
}: {
  appName: string;
  topLogoUrl: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-[2rem] bg-adrock-surface p-8">
        <div className="flex items-center gap-3">
          <img src={topLogoUrl} alt={appName} className="h-14 w-14 rounded-2xl object-contain" />
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ff940e]">{appName}</p>
        </div>
        <h1 className="mt-4 text-3xl font-black text-gray-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{subtitle}</p>
        <div className="mt-8 adrock-form-shell">{children}</div>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value
}: {
  icon: typeof Link2;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[#c1d6e9] bg-white/80 p-4">
      <Icon className="h-5 w-5 text-[#ffb85c]" />
      <p className="mt-3 text-xs uppercase tracking-[0.22em] text-gray-500">{title}</p>
      <p className="mt-2 text-xl font-bold text-gray-950">{value}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full rounded-[1.75rem] border border-black/5 bg-adrock-surface p-5">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="adrock-form-shell">
      <label className="adrock-field-label mb-1 block text-sm font-medium">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-3 py-2" />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="adrock-form-shell">
      <label className="adrock-field-label mb-1 block text-sm font-medium">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-3 py-2">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="adrock-form-shell">
      <label className="adrock-field-label mb-1 block text-sm font-medium">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full px-3 py-2" />
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-black/5 py-2 text-sm last:border-b-0">
      <span className="text-gray-600">{label}</span>
      <strong className="text-gray-900">{value}</strong>
    </div>
  );
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function normalizeBrand(brand: Partial<SettingsRecord['brand']>): SettingsRecord['brand'] {
  return {
    appName: brand.appName || DEFAULT_BRAND.appName,
    topLogoUrl: brand.topLogoUrl || DEFAULT_BRAND.topLogoUrl,
    topLogoSize: brand.topLogoSize || DEFAULT_BRAND.topLogoSize
  };
}

function normalizeSelectOptionValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function suggestBitlyBackHalf(link: LinkRecord) {
  return normalizeBitlyBackHalf(link.utm_campaign || 'link');
}

function normalizeBitlyBackHalf(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export default App;

create table if not exists users (
  id uuid primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists utm_campaigns (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  tenant_label text not null,
  client_name text,
  type text not null check (type in ('pontual', 'campanha', 'grupo_de_acoes')),
  main_channel text not null,
  default_source text,
  default_medium text,
  starts_at date,
  ends_at date,
  status text not null check (status in ('rascunho', 'ativo', 'encerrado')),
  description text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table utm_campaigns add column if not exists client_name text;
alter table utm_campaigns drop constraint if exists utm_campaigns_slug_key;
create unique index if not exists utm_campaigns_client_slug_idx on utm_campaigns (coalesce(client_name, ''), slug);

create table if not exists utm_links (
  id uuid primary key,
  campaign_id uuid references utm_campaigns(id),
  base_url text not null,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  utm_term text,
  utm_content text,
  utm_id text,
  final_url text not null,
  internal_name text,
  action_type text,
  destination_type text,
  ad_group_name text,
  ad_type text,
  bitly_url text,
  bitly_id text,
  bitly_custom_back_half text,
  bitly_domain text,
  bitly_created_at timestamptz,
  bitly_error text,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_validated_at timestamptz
);

alter table utm_links add column if not exists ad_group_name text;
alter table utm_links add column if not exists ad_type text;
alter table utm_links add column if not exists bitly_url text;
alter table utm_links add column if not exists bitly_id text;
alter table utm_links add column if not exists bitly_custom_back_half text;
alter table utm_links add column if not exists bitly_domain text;
alter table utm_links add column if not exists bitly_created_at timestamptz;
alter table utm_links add column if not exists bitly_error text;

create table if not exists audit_logs (
  id uuid primary key,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on audit_logs (created_at desc);
create index if not exists audit_logs_actor_user_id_idx on audit_logs (actor_user_id);
create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id);

create table if not exists document_links (
  id uuid primary key,
  title text not null,
  url text not null,
  description text,
  category text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_links_created_at_idx on document_links (created_at desc);
create index if not exists document_links_category_idx on document_links (category, title);

create table if not exists select_options (
  id uuid primary key,
  category text not null,
  value text not null,
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, value)
);

create index if not exists select_options_category_idx on select_options (category, sort_order, label);

create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists utm_channel_presets (
  id text primary key,
  label text not null,
  description text not null,
  mediums text[] not null,
  sources text[] not null,
  default_source text not null,
  default_medium text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into select_options (id, category, value, label, sort_order)
values
  ('00000000-0000-4000-8000-000000000101', 'action_type', 'post_patrocinado', 'post_patrocinado', 10),
  ('00000000-0000-4000-8000-000000000102', 'action_type', 'banner_portal', 'banner_portal', 20),
  ('00000000-0000-4000-8000-000000000103', 'action_type', 'newsletter', 'newsletter', 30),
  ('00000000-0000-4000-8000-000000000104', 'action_type', 'email_fluxo', 'email_fluxo', 40),
  ('00000000-0000-4000-8000-000000000105', 'action_type', 'paid_social', 'paid_social', 50),
  ('00000000-0000-4000-8000-000000000106', 'action_type', 'paid_search', 'paid_search', 60),
  ('00000000-0000-4000-8000-000000000107', 'action_type', 'parceria', 'parceria', 70),
  ('00000000-0000-4000-8000-000000000201', 'destination_type', 'lp', 'lp', 10),
  ('00000000-0000-4000-8000-000000000202', 'destination_type', 'site', 'site', 20),
  ('00000000-0000-4000-8000-000000000203', 'destination_type', 'blog', 'blog', 30),
  ('00000000-0000-4000-8000-000000000204', 'destination_type', 'whatsapp', 'whatsapp', 40),
  ('00000000-0000-4000-8000-000000000205', 'destination_type', 'landing_page', 'Landing page', 50),
  ('00000000-0000-4000-8000-000000000301', 'campaign_type', 'campanha', 'Campanha', 10),
  ('00000000-0000-4000-8000-000000000302', 'campaign_type', 'grupo_de_acoes', 'Grupo de ações', 20),
  ('00000000-0000-4000-8000-000000000303', 'campaign_type', 'pontual', 'Pontual', 30),
  ('00000000-0000-4000-8000-000000000401', 'campaign_status', 'rascunho', 'Rascunho', 10),
  ('00000000-0000-4000-8000-000000000402', 'campaign_status', 'ativo', 'Ativo', 20),
  ('00000000-0000-4000-8000-000000000403', 'campaign_status', 'encerrado', 'Encerrado', 30),
  ('00000000-0000-4000-8000-000000000450', 'client_name', 'porvir', 'Porvir.org', 10),
  ('00000000-0000-4000-8000-000000000501', 'ad_type', 'text_ad', 'Anúncio de texto', 10),
  ('00000000-0000-4000-8000-000000000502', 'ad_type', 'image_ad', 'Image ad', 20),
  ('00000000-0000-4000-8000-000000000503', 'ad_type', 'story_ad', 'Story ad', 30),
  ('00000000-0000-4000-8000-000000000504', 'ad_type', 'lead_ad', 'Lead ad', 40),
  ('00000000-0000-4000-8000-000000000505', 'ad_type', 'video_ad', 'Video ad', 50),
  ('00000000-0000-4000-8000-000000000506', 'ad_type', 'display_ad', 'Display ad', 60),
  ('00000000-0000-4000-8000-000000000507', 'ad_type', 'shopping_ad', 'Shopping ad', 70),
  ('00000000-0000-4000-8000-000000000508', 'ad_type', 'infografico', 'Infográfico', 80),
  ('00000000-0000-4000-8000-000000000509', 'ad_type', 'materia', 'Matéria', 90),
  ('00000000-0000-4000-8000-000000000510', 'ad_type', 'ebook', 'E-book', 100),
  ('00000000-0000-4000-8000-000000000511', 'ad_type', 'webstory', 'WebStory', 110),
  ('00000000-0000-4000-8000-000000000512', 'ad_type', 'podcast', 'Podcast', 120),
  ('00000000-0000-4000-8000-000000000513', 'ad_type', 'jogo', 'Jogo', 130),
  ('00000000-0000-4000-8000-000000000514', 'ad_type', 'webinario', 'Webinário', 140),
  ('00000000-0000-4000-8000-000000000515', 'ad_type', 'whatsapp_canal', 'Whatsapp canal', 150),
  ('00000000-0000-4000-8000-000000000516', 'ad_type', 'whatsapp_comunidade_socioemocional', 'Whatsapp comunidade socioemocional', 160),
  ('00000000-0000-4000-8000-000000000517', 'ad_type', 'whatsapp_comunidade_antirracista', 'Whatsapp comunidade antirracista', 170),
  ('00000000-0000-4000-8000-000000000518', 'ad_type', 'whatsapp_comunidade_tecnologia', 'Whatsapp comunidade tecnologia', 180),
  ('00000000-0000-4000-8000-000000000519', 'ad_type', 'whatsapp_comunidade_metodologias_ativas', 'Whatsapp comunidade metodologias ativas', 190),
  ('00000000-0000-4000-8000-000000000520', 'ad_type', 'newsletter_semanal', 'Newsletter Semanal', 200),
  ('00000000-0000-4000-8000-000000000521', 'ad_type', 'newsletter_gestao', 'Newsletter Gestão', 210),
  ('00000000-0000-4000-8000-000000000522', 'ad_type', 'newsletter_comercial', 'Newsletter Comercial', 220),
  ('00000000-0000-4000-8000-000000000523', 'ad_type', 'instagram', 'Instagram', 230),
  ('00000000-0000-4000-8000-000000000524', 'ad_type', 'facebook', 'Facebook', 240),
  ('00000000-0000-4000-8000-000000000525', 'ad_type', 'linkedin', 'LinkedIn', 250),
  ('00000000-0000-4000-8000-000000000526', 'ad_type', 'video', 'Vídeo', 260),
  ('00000000-0000-4000-8000-000000000527', 'ad_type', 'landing_page', 'Landing page', 270),
  ('00000000-0000-4000-8000-000000000901', 'utm_term', 'ec_canal', 'ec_canal', 10),
  ('00000000-0000-4000-8000-000000000902', 'utm_term', 'ec_relacionamento', 'ec_relacionamento', 20),
  ('00000000-0000-4000-8000-000000000903', 'utm_term', 'ec_grupo_ea', 'ec_grupo_ea', 30),
  ('00000000-0000-4000-8000-000000000904', 'utm_term', 'ec_facebook', 'ec_facebook', 40),
  ('00000000-0000-4000-8000-000000000905', 'utm_term', 'ec_grupo_es', 'ec_grupo_es', 50),
  ('00000000-0000-4000-8000-000000000906', 'utm_term', 'ec_grupo_crm', 'ec_grupo_crm', 60),
  ('00000000-0000-4000-8000-000000000907', 'utm_term', 'newsletter_premio', 'newsletter_premio', 70),
  ('00000000-0000-4000-8000-000000000908', 'utm_term', 'ec_aquisicao', 'ec_aquisicao', 80),
  ('00000000-0000-4000-8000-000000000909', 'utm_term', 'email_58_trap_texto_d1', 'email_58_trap_texto_d1', 90),
  ('00000000-0000-4000-8000-000000000910', 'utm_term', 'email_58_trap_texto_d2', 'email_58_trap_texto_d2', 100),
  ('00000000-0000-4000-8000-000000000911', 'utm_term', 'coluna_debora_garofalo', 'coluna_debora_garofalo', 110),
  ('00000000-0000-4000-8000-000000000912', 'utm_term', 'abertura_inscricoes', 'abertura_inscricoes', 120),
  ('00000000-0000-4000-8000-000000000913', 'utm_term', 'agosto_datas', 'agosto_datas', 130),
  ('00000000-0000-4000-8000-000000000914', 'utm_term', 'alfabetizacao_algoritmica', 'alfabetizacao_algoritmica', 140),
  ('00000000-0000-4000-8000-000000000915', 'utm_term', 'atualidades_curriculo', 'atualidades_curriculo', 150),
  ('00000000-0000-4000-8000-000000000916', 'utm_term', 'banner_premio_site', 'banner_premio_site', 160),
  ('00000000-0000-4000-8000-000000000917', 'utm_term', 'bncc_computacao1', 'bncc_computacao1', 170),
  ('00000000-0000-4000-8000-000000000918', 'utm_term', 'dicas_escola', 'dicas_escola', 180),
  ('00000000-0000-4000-8000-000000000919', 'utm_term', 'entrevista_gustavo_estanislau', 'entrevista_gustavo_estanislau', 190),
  ('00000000-0000-4000-8000-000000000920', 'utm_term', 'formulario_premio', 'formulario_premio', 200),
  ('00000000-0000-4000-8000-000000000921', 'utm_term', 'site_efemerides_agosto', 'site_efemerides_agosto', 210),
  ('00000000-0000-4000-8000-000000000922', 'utm_term', 'site_porvir', 'site_porvir', 220),
  ('00000000-0000-4000-8000-000000000923', 'utm_term', 'stories_premio', 'stories_premio', 230),
  ('00000000-0000-4000-8000-000000000701', 'utm_content', 'blog', 'Blog', 10),
  ('00000000-0000-4000-8000-000000000702', 'utm_content', 'materia', 'Matéria', 20),
  ('00000000-0000-4000-8000-000000000703', 'utm_content', 'reportagem', 'Reportagem', 30),
  ('00000000-0000-4000-8000-000000000704', 'utm_content', 'artigo', 'Artigo', 40),
  ('00000000-0000-4000-8000-000000000705', 'utm_content', 'agenda', 'Agenda', 50),
  ('00000000-0000-4000-8000-000000000706', 'utm_content', 'gestao', 'Gestão', 60),
  ('00000000-0000-4000-8000-000000000707', 'utm_content', 'biblioteca', 'Biblioteca', 70),
  ('00000000-0000-4000-8000-000000000708', 'utm_content', 'glossario', 'Glossário', 80),
  ('00000000-0000-4000-8000-000000000709', 'utm_content', 'festival', 'Festival', 90),
  ('00000000-0000-4000-8000-000000000710', 'utm_content', 'premio', 'Prêmio', 100),
  ('00000000-0000-4000-8000-000000000711', 'utm_content', 'video', 'Vídeo', 110),
  ('00000000-0000-4000-8000-000000000712', 'utm_content', 'link_bio', 'Link da bio', 120),
  ('00000000-0000-4000-8000-000000000713', 'utm_content', 'stories', 'Stories', 130),
  ('00000000-0000-4000-8000-000000000714', 'utm_content', 'reels', 'Reels', 140),
  ('00000000-0000-4000-8000-000000000715', 'utm_content', 'manychat', 'Manychat', 150),
  ('00000000-0000-4000-8000-000000000716', 'utm_content', 'timeline', 'Timeline', 160),
  ('00000000-0000-4000-8000-000000000717', 'utm_content', 'botao', 'Botão', 170),
  ('00000000-0000-4000-8000-000000000718', 'utm_content', 'feed', 'Feed', 180),
  ('00000000-0000-4000-8000-000000000719', 'utm_content', 'texto_abertura', 'Texto abertura', 190),
  ('00000000-0000-4000-8000-000000000720', 'utm_content', 'destaque1', 'Destaque 1', 200),
  ('00000000-0000-4000-8000-000000000721', 'utm_content', 'destaque2', 'Destaque 2', 210),
  ('00000000-0000-4000-8000-000000000722', 'utm_content', 'miniatura1', 'Miniatura 1', 220),
  ('00000000-0000-4000-8000-000000000723', 'utm_content', 'miniatura2', 'Miniatura 2', 230),
  ('00000000-0000-4000-8000-000000000724', 'utm_content', 'miniatura3', 'Miniatura 3', 240),
  ('00000000-0000-4000-8000-000000000725', 'utm_content', 'aspas', 'Aspas', 250),
  ('00000000-0000-4000-8000-000000000726', 'utm_content', 'dica_leitura1', 'Dica leitura 1', 260),
  ('00000000-0000-4000-8000-000000000727', 'utm_content', 'dica_leitura2', 'Dica leitura 2', 270),
  ('00000000-0000-4000-8000-000000000728', 'utm_content', 'story1', 'Story 1', 280),
  ('00000000-0000-4000-8000-000000000729', 'utm_content', 'story2', 'Story 2', 290),
  ('00000000-0000-4000-8000-000000000730', 'utm_content', 'story3', 'Story 3', 300),
  ('00000000-0000-4000-8000-000000000731', 'utm_content', 'banner1', 'Banner 1', 310),
  ('00000000-0000-4000-8000-000000000732', 'utm_content', 'banner2', 'Banner 2', 320),
  ('00000000-0000-4000-8000-000000000733', 'utm_content', 'banner3', 'Banner 3', 330),
  ('00000000-0000-4000-8000-000000000734', 'utm_content', 'banner_parceiro', 'Banner parceiro', 340),
  ('00000000-0000-4000-8000-000000000735', 'utm_content', 'banner_abertura', 'Banner abertura', 350),
  ('00000000-0000-4000-8000-000000000736', 'utm_content', 'botao1', 'Botão 1', 360),
  ('00000000-0000-4000-8000-000000000737', 'utm_content', 'botao2', 'Botão 2', 370),
  ('00000000-0000-4000-8000-000000000738', 'utm_content', 'canal', 'Canal', 380),
  ('00000000-0000-4000-8000-000000000739', 'utm_content', 'comunidade_socioemocional', 'Comunidade socioemocional', 390),
  ('00000000-0000-4000-8000-000000000740', 'utm_content', 'comunidade_antirracista', 'Comunidade antirracista', 400),
  ('00000000-0000-4000-8000-000000000741', 'utm_content', 'comunidade_tecnologia', 'Comunidade tecnologia', 410),
  ('00000000-0000-4000-8000-000000000742', 'utm_content', 'comunidade_metodologias_ativas', 'Comunidade metodologias ativas', 420),
  ('00000000-0000-4000-8000-000000000601', 'utm_id', 'curso_ed_antirracista_fundamentos', 'curso_ed_antirracista_fundamentos', 10),
  ('00000000-0000-4000-8000-000000000602', 'utm_id', 'curso_ed_antirracista_praticas', 'curso_ed_antirracista_praticas', 20),
  ('00000000-0000-4000-8000-000000000603', 'utm_id', 'material_rap_feminino', 'material_rap_feminino', 30),
  ('00000000-0000-4000-8000-000000000604', 'utm_id', 'curso_comp_digitais_lp_em', 'curso_comp_digitais_lp_em', 40),
  ('00000000-0000-4000-8000-000000000605', 'utm_id', 'lp_ebook_enem', 'lp_ebook_enem', 50),
  ('00000000-0000-4000-8000-000000000801', 'utm_id', 'texto_01', 'Texto 01', 60),
  ('00000000-0000-4000-8000-000000000802', 'utm_id', 'texto_02', 'Texto 02', 70),
  ('00000000-0000-4000-8000-000000000803', 'utm_id', 'img_01', 'Imagem 01', 80),
  ('00000000-0000-4000-8000-000000000804', 'utm_id', 'img_02', 'Imagem 02', 90),
  ('00000000-0000-4000-8000-000000000805', 'utm_id', 'botao_01', 'Botão 01', 100),
  ('00000000-0000-4000-8000-000000000806', 'utm_id', 'botao_02', 'Botão 02', 110),
  ('00000000-0000-4000-8000-000000000807', 'utm_id', 'banner_01', 'Banner 01', 120),
  ('00000000-0000-4000-8000-000000000808', 'utm_id', 'banner_02', 'Banner 02', 130),
  ('00000000-0000-4000-8000-000000000809', 'utm_id', 'catalogo', 'Catálogo', 140),
  ('00000000-0000-4000-8000-000000000810', 'utm_id', 'canal', 'Canal', 150)
on conflict (category, value) do nothing;

update select_options
set is_active = false,
    updated_at = now()
where category = 'action_type'
  and value in (
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
    'linkedin'
  );

update select_options
set is_active = false,
    updated_at = now()
where category = 'campaign_type'
  and value = 'grupo_de_acoes';

insert into utm_channel_presets (id, label, description, mediums, sources, default_source, default_medium, sort_order)
values
  ('affiliates', 'Affiliates', 'Canal oficial do GA4 para tráfego por links em sites de afiliados.', array['affiliate'], array['affiliate', 'affiliate_network', 'partner'], 'affiliate', 'affiliate', 10),
  ('ai-assistants', 'AI Assistants', 'Canal oficial do GA4 para tráfego vindo de assistentes de IA, usando medium ai-assistant.', array['ai-assistant'], array['chatgpt', 'gemini', 'deepseek', 'copilot', 'grok'], 'chatgpt', 'ai-assistant', 20),
  ('audio', 'Audio', 'Canal oficial do GA4 para anúncios em plataformas de áudio, como podcasts.', array['audio'], array['spotify', 'podcast', 'audio'], 'spotify', 'audio', 30),
  ('cross-network', 'Cross-network', 'Canal oficial do GA4 para campanhas que rodam em várias redes, como Performance Max e Demand Gen.', array['cross-network'], array['google'], 'google', 'cross-network', 40),
  ('direct', 'Direct', 'Canal oficial do GA4 para acesso direto. Em links UTM, normalmente não deve ser marcado manualmente.', array['none', 'not_set'], array['direct'], 'direct', 'none', 50),
  ('display', 'Display', 'Canal oficial do GA4 para display ads, banners, interstitials e CPM.', array['display', 'banner', 'expandable', 'interstitial', 'cpm'], array['google', 'dv360', 'programmatic'], 'google', 'display', 60),
  ('email', 'Email', 'Canal oficial do GA4 para tráfego identificado por source ou medium de email.', array['email', 'e-mail', 'e_mail'], array['email', 'e-mail', 'e_mail', 'newsletter'], 'email', 'email', 70),
  ('mobile-push-notifications', 'Mobile Push Notifications', 'Canal oficial do GA4 para links de notificações push/mobile.', array['push', 'mobile_push', 'notification'], array['firebase', 'push', 'mobile'], 'firebase', 'push', 80),
  ('organic-search', 'Organic Search', 'Canal oficial do GA4 para tráfego de busca orgânica.', array['organic'], array['google', 'bing', 'yahoo', 'duckduckgo', 'baidu', 'yandex'], 'google', 'organic', 90),
  ('organic-shopping', 'Organic Shopping', 'Canal oficial do GA4 para tráfego orgânico vindo de sites de shopping ou campanhas com shopping no nome.', array['organic'], array['shopping', 'google_shopping', 'amazon', 'ebay'], 'google_shopping', 'organic', 100),
  ('organic-social', 'Organic Social', 'Canal oficial do GA4 para tráfego orgânico de redes sociais.', array['social_media'], array['facebook', 'instagram', 'linkedin', 'tiktok', 'pinterest', 'x', 'twitter', 'reddit', 'whatsapp'], 'instagram', 'social_media', 110),
  ('organic-video', 'Organic Video', 'Canal oficial do GA4 para tráfego orgânico vindo de sites de vídeo.', array['video', 'organic_video'], array['youtube', 'tiktok', 'vimeo'], 'youtube', 'video', 120),
  ('paid-other', 'Paid Other', 'Canal oficial do GA4 para tráfego pago que não se encaixa em Search, Social, Shopping ou Video.', array['cp', 'cpc', 'ppc', 'retargeting', 'paid'], array['paid', 'programmatic', 'partner'], 'paid', 'paid', 130),
  ('paid-search', 'Paid Search', 'Canal oficial do GA4 para anúncios em mecanismos de busca.', array['cpc', 'ppc', 'paidsearch', 'paid_search', 'retargeting'], array['google', 'bing', 'yahoo', 'baidu', 'yandex'], 'google', 'cpc', 140),
  ('paid-shopping', 'Paid Shopping', 'Canal oficial do GA4 para anúncios pagos em sites de shopping ou campanhas de shopping.', array['cpc', 'ppc', 'paidshopping', 'paid_shopping', 'retargeting'], array['google_shopping', 'amazon', 'ebay', 'shopping'], 'google_shopping', 'cpc', 150),
  ('paid-social', 'Paid Social', 'Canal oficial do GA4 para anúncios em redes sociais.', array['cpc', 'ppc', 'paid_social', 'paidsocial', 'retargeting', 'paid'], array['facebook', 'instagram', 'linkedin', 'tiktok', 'pinterest', 'x', 'twitter', 'reddit', 'whatsapp'], 'facebook', 'cpc', 160),
  ('paid-video', 'Paid Video', 'Canal oficial do GA4 para anúncios pagos em sites de vídeo.', array['cpc', 'ppc', 'paidvideo', 'paid_video', 'retargeting', 'paid'], array['youtube', 'tiktok', 'vimeo'], 'youtube', 'cpc', 170),
  ('referral', 'Referral', 'Canal oficial do GA4 para links não pagos em outros sites ou apps.', array['referral', 'app', 'link'], array['partner_site', 'portal', 'blog'], 'partner_site', 'referral', 180),
  ('sms', 'SMS', 'Canal oficial do GA4 para links enviados por SMS.', array['sms'], array['sms'], 'sms', 'sms', 190)
on conflict (id) do update
set label = excluded.label,
    description = excluded.description,
    mediums = excluded.mediums,
    sources = excluded.sources,
    default_source = excluded.default_source,
    default_medium = excluded.default_medium,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

update utm_channel_presets
set is_active = false,
    updated_at = now()
where id not in (
  'affiliates',
  'ai-assistants',
  'audio',
  'cross-network',
  'direct',
  'display',
  'email',
  'mobile-push-notifications',
  'organic-search',
  'organic-shopping',
  'organic-social',
  'organic-video',
  'paid-other',
  'paid-search',
  'paid-shopping',
  'paid-social',
  'paid-video',
  'referral',
  'sms'
);

insert into app_settings (key, value)
values ('top_logo_url', 'adrock-logo.png')
on conflict (key) do nothing;

insert into app_settings (key, value)
values ('app_name', 'Ad Rock UTM Builder')
on conflict (key) do nothing;

insert into app_settings (key, value)
values ('slack_integration_enabled', 'false')
on conflict (key) do nothing;

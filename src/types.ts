export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  isAdmin: boolean;
}

export interface HealthRecord {
  status: string;
  database: string;
  backup?: {
    status: 'ok' | 'pending' | 'unavailable';
    lastBackupAt: string | null;
    file: string | null;
  };
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface CampaignRecord {
  id: string;
  name: string;
  slug: string;
  tenant_label: string;
  client_name: string | null;
  type: 'pontual' | 'campanha' | 'grupo_de_acoes';
  main_channel: string;
  default_source: string | null;
  default_medium: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: 'rascunho' | 'ativo' | 'encerrado';
  description: string | null;
  created_at: string;
  updated_at: string;
  links_count?: number;
}

export interface LinkRecord {
  id: string;
  campaign_id: string | null;
  campaign_name?: string | null;
  campaign_client_name?: string | null;
  base_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string | null;
  utm_content: string | null;
  utm_id: string | null;
  final_url: string;
  internal_name: string | null;
  action_type: string | null;
  destination_type: string | null;
  ad_group_name: string | null;
  ad_type: string | null;
  bitly_url: string | null;
  bitly_id: string | null;
  bitly_custom_back_half: string | null;
  bitly_domain: string | null;
  bitly_created_at: string | null;
  bitly_error: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_validated_at: string | null;
}

export interface CreateBitlyResponse {
  success: boolean;
  bitlyUrl: string;
  bitlyId: string;
  customBackHalf: string;
  domain: string;
  createdAt: string;
}

export interface DocumentLinkRecord {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  created_by: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveLinkPayload {
  campaignId?: string | null;
  baseUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm?: string;
  utmContent?: string;
  utmId?: string;
  finalUrl: string;
  internalName: string;
  actionType?: string;
  destinationType?: string;
  adGroupName?: string;
  adType?: string;
  notes?: string;
}

export interface UpdateLinkPayload extends SaveLinkPayload {
  syncBitlyDestination?: boolean;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
}

export type SelectOptionCategory = 'action_type' | 'destination_type' | 'campaign_type' | 'campaign_status' | 'client_name' | 'ad_type' | 'utm_content' | 'utm_term' | 'utm_id';

export interface SelectOptionRecord {
  id: string;
  category: SelectOptionCategory;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ChannelPresetRecord {
  id: string;
  label: string;
  description: string;
  mediums: string[];
  sources: string[];
  defaultSource: string;
  defaultMedium: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SettingsRecord {
  options: SelectOptionRecord[];
  channelPresets: ChannelPresetRecord[];
  brand: {
    appName: string;
    topLogoUrl: string;
    topLogoSize: number;
    funGifUrl: string;
    funGifSize: number;
  };
}

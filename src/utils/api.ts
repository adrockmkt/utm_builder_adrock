import type { AuditLogRecord, AuthUser, CampaignRecord, CreateBitlyResponse, DocumentLinkRecord, LinkRecord, SaveLinkPayload, SelectOptionCategory, SelectOptionRecord, SettingsRecord, UserRecord } from '../types';

const TOKEN_KEY = 'adrock_utm_builder_token';
const API_BASE_PATH = normalizeApiBasePath(import.meta.env.VITE_API_BASE_PATH || '/api');

function normalizeApiBasePath(path: string) {
  if (!path || path === '/') {
    return '';
  }

  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function apiPath(path: string) {
  return `${API_BASE_PATH}${path}`;
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (!token) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(apiPath(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || `Erro HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function apiDownload(path: string): Promise<Blob> {
  const token = getStoredToken();
  const response = await fetch(apiPath(path), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status}`);
  }

  return response.blob();
}

export const api = {
  getSetupStatus: () => apiFetch<{ setupRequired: boolean }>('/auth/setup-status'),
  setupAdmin: (payload: { name: string; email: string; password: string }) =>
    apiFetch<{ message: string }>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  login: (payload: { email: string; password: string }) =>
    apiFetch<{ token: string; expiresAt: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  me: () => apiFetch<{ user: AuthUser }>('/auth/me'),
  logout: () =>
    apiFetch<{ success: boolean }>('/auth/logout', {
      method: 'POST'
    }),
  health: () => apiFetch<{ status: string; database: string }>('/health'),
  listUsers: () => apiFetch<UserRecord[]>('/users'),
  createUser: (payload: { name: string; email: string; password: string; role: UserRecord['role'] }) =>
    apiFetch<{ id: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateUser: (id: string, payload: Partial<Pick<UserRecord, 'name' | 'role' | 'status'>>) =>
    apiFetch<{ success: boolean }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  resetUserPassword: (id: string, password: string) =>
    apiFetch<{ success: boolean }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password })
    }),
  listCampaigns: () => apiFetch<CampaignRecord[]>('/utm-campaigns'),
  createCampaign: (payload: {
    name: string;
    type: CampaignRecord['type'];
    mainChannel: string;
    defaultSource?: string;
    defaultMedium?: string;
    startsAt?: string;
    endsAt?: string;
    status: CampaignRecord['status'];
    description?: string;
  }) =>
    apiFetch<{ id: string }>('/utm-campaigns', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  deleteCampaign: (id: string) =>
    apiFetch<{ success: boolean }>(`/utm-campaigns/${id}`, {
      method: 'DELETE'
    }),
  listLinks: () => apiFetch<LinkRecord[]>('/utm-links'),
  createLink: (payload: SaveLinkPayload) =>
    apiFetch<{ id: string }>('/utm-links', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  createBitlyLink: (id: string, customBackHalf: string) =>
    apiFetch<CreateBitlyResponse>(`/utm-links/${id}/bitly`, {
      method: 'POST',
      body: JSON.stringify({ customBackHalf })
    }),
  deleteLink: (id: string) =>
    apiFetch<{ success: boolean }>(`/utm-links/${id}`, {
      method: 'DELETE'
    }),
  listDocuments: () => apiFetch<DocumentLinkRecord[]>('/documents'),
  createDocument: (payload: { title: string; url: string; description?: string; category?: string }) =>
    apiFetch<{ id: string }>('/documents', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  deleteDocument: (id: string) =>
    apiFetch<{ success: boolean }>(`/documents/${id}`, {
      method: 'DELETE'
    }),
  listAuditLogs: () => apiFetch<AuditLogRecord[]>('/audit-logs'),
  getPublicBrand: () => apiFetch<SettingsRecord['brand']>('/settings/public-brand'),
  getSettings: () => apiFetch<SettingsRecord>('/settings'),
  createSelectOption: (payload: {
    category: SelectOptionCategory;
    value: string;
    label: string;
    sortOrder?: number;
    isActive?: boolean;
  }) =>
    apiFetch<{ id: string }>('/settings/options', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateSelectOption: (id: string, payload: Partial<Pick<SelectOptionRecord, 'value' | 'label' | 'sortOrder' | 'isActive'>>) =>
    apiFetch<{ success: boolean }>(`/settings/options/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  deleteSelectOption: (id: string) =>
    apiFetch<{ success: boolean }>(`/settings/options/${id}`, {
      method: 'DELETE'
    }),
  updateBrandLogo: (dataUrl: string) =>
    apiFetch<{ success: boolean }>('/settings/brand-logo', {
      method: 'PUT',
      body: JSON.stringify({ dataUrl })
    }),
  updateBrand: (payload: { appName: string }) =>
    apiFetch<{ success: boolean }>('/settings/brand', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
  resetBrandLogo: () =>
    apiFetch<{ success: boolean }>('/settings/brand-logo', {
      method: 'DELETE'
    }),
  downloadLinksCsv: () => apiDownload('/exports/utm-links.csv'),
  downloadCampaignsCsv: () => apiDownload('/exports/utm-campaigns.csv')
};

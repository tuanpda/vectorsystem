import { clearSession, getToken } from '../auth/storage';
import { vi } from '../lib/vi';

const API_BASE = '/api/v1';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
};
export interface Document {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: string;
  chunkCount: number;
  indexPromptTokens: number | null;
  indexEstimatedUsd: number | null;
  errorMessage: string | null;
  indexedAt: string | null;
  createdAt: string;
  updatedAt: string;
  parsedArtifact?: {
    markdownKey: string | null;
    contentListKey: string | null;
  } | null;
}

export interface HealthResponse {
  status: string;
  checks: {
    database: string;
    mineru: string;
    mineruApiUrl: string;
  };
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (extra) {
    const h = new Headers(extra);
    h.forEach((v, k) => {
      headers[k] = v;
    });
  }
  return headers;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  options?: { skipAuthRedirect?: boolean },
): Promise<T> {
  const headers = authHeaders(init?.headers);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (res.status === 401 && !options?.skipAuthRedirect) {
    clearSession();
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/admin/login';
    }
    throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
  }
  if (!res.ok) {
    const msg =
      (data as { message?: string })?.message ||
      (data as { error?: string })?.error ||
      res.statusText;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
  }
  return data as T;
}

export function isApiConnectionError(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  const m = err.message.toLowerCase();
  return m.includes('fetch') || m.includes('network');
}

export const API_OFFLINE_MSG = vi.common.apiOffline;

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: AuthUser }>(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
      { skipAuthRedirect: true },
    ),

  me: () => request<AuthUser>('/auth/me'),

  health: () => request<HealthResponse>('/health'),

  dashboardStats: () =>
    request<{
      documents: {
        total: number;
        readyForRag: number;
        failed: number;
        byStatus: Record<string, number>;
      };
      chunks: { total: number };
      embedding: { provider: string; model: string; dimensions: number };
      openaiUsage: import('../components/OpenAiUsageCard').OpenAiUsageSummary | null;
      system: HealthResponse & { checks: { redisUrl?: string } };
    }>('/dashboard/stats'),

  openaiUsage: () =>
    request<import('../components/OpenAiUsageCard').OpenAiUsageSummary>(
      '/usage/openai',
    ),

  listDocuments: (params?: {
    status?: string;
    q?: string;
    skip?: number;
    take?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.q?.trim()) sp.set('q', params.q.trim());
    if (params?.skip != null && params.skip > 0) {
      sp.set('skip', String(params.skip));
    }
    sp.set('take', String(params?.take ?? 20));
    const qs = sp.toString();
    return request<{ total: number; items: Document[] }>(
      `/documents?${qs}`,
    );
  },

  getDocument: (id: string) => request<Document>(`/documents/${id}`),

  upload: (file: File, title?: string, language = 'vi') => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    form.append('language', language);
    return request<Document>('/documents', { method: 'POST', body: form });
  },

  parse: (id: string) =>
    request<{ documentId: string; message: string }>(`/documents/${id}/parse`, {
      method: 'POST',
    }),

  index: (id: string) =>
    request<{ documentId: string; message: string }>(`/documents/${id}/index`, {
      method: 'POST',
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/documents/${id}`, { method: 'DELETE' }),

  getMarkdown: (id: string) =>
    request<{ content: string }>(`/documents/${id}/markdown`),

  listChunks: (id: string, take = 100) =>
    request<{
      total: number;
      items: Array<{
        id: string;
        chunkIndex: number;
        blockType: string;
        content: string;
        pageIdx: number | null;
        headingPath: string | null;
        tokenCount: number | null;
      }>;
    }>(`/documents/${id}/chunks?take=${take}`),

  listUsers: () =>
    request<
      Array<{
        id: string;
        email: string;
        displayName: string | null;
        role: string;
        createdAt: string;
        updatedAt?: string;
      }>
    >('/users'),

  createUser: (email: string, password: string, displayName?: string) =>
    request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    }),

  updateUser: (
    id: string,
    data: { password?: string; displayName?: string },
  ) =>
    request(`/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  deleteUser: (id: string) =>
    request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' }),

  listApiKeys: () =>
    request<
      Array<{
        id: string;
        name: string;
        tenantId: string;
        keyPrefix: string;
        scopes: string[];
        createdAt: string;
        creator: { email: string; displayName: string | null } | null;
      }>
    >('/api-keys'),

  createApiKey: (name: string, tenantId?: string) =>
    request<{
      id: string;
      name: string;
      tenantId: string;
      keyPrefix: string;
      scopes: string[];
      createdAt: string;
      secret: string;
    }>('/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, tenantId }),
    }),

  revokeApiKey: (id: string) =>
    request<{ ok: boolean }>(`/api-keys/${id}`, { method: 'DELETE' }),

  ragQuery: (question: string, documentIds?: string[], topK = 8) =>
    request<{
      question: string;
      contexts: Array<{
        score: number;
        text: string;
        blockType: string;
        citation: { document: string | null; page: number | null };
        documentTitle: string | null;
      }>;
    }>('/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, documentIds, topK }),
    }),
};

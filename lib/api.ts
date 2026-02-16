import type { ThriftbotItem } from './types';

const DEFAULT_URL = 'https://thriftbot.smelltherosessecondhand.com';

async function getBaseUrl(): Promise<string> {
  const result = await storage.getItem<string>('local:thriftbotUrl');
  return result || DEFAULT_URL;
}

async function getApiToken(): Promise<string | null> {
  return storage.getItem<string>('local:apiToken');
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = await getBaseUrl();
  const token = await getApiToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}

export async function fetchVendooReadyItems(): Promise<ThriftbotItem[]> {
  const res = await apiFetch('/api/v1/items?scope=vendoo_ready');

  if (res.status === 401) {
    throw new Error('unauthorized');
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.items;
}

export async function markAsListed(itemId: number): Promise<void> {
  const res = await apiFetch(`/api/v1/items/${itemId}/mark_listed`, {
    method: 'PATCH',
  });

  if (!res.ok) {
    throw new Error(`Failed to mark item ${itemId} as listed: ${res.status}`);
  }
}

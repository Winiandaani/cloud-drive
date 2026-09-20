import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path: string) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body: unknown) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
export async function apiUploadFile(file: File, folderId: string | null) {
  const { supabase } = await import('./supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folderId', folderId ?? 'null');

  const res = await fetch(`${API_URL}/api/files/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}
export async function apiDelete(path: string) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}
export async function apiGetShares(resourceType: string, resourceId: string) {
  return apiGet(`/api/shares/${resourceType}/${resourceId}`);
}

export async function apiCreateShare(resourceType: string, resourceId: string, granteeEmail: string, role: string) {
  return apiPost('/api/shares', { resourceType, resourceId, granteeEmail, role });
}
export async function apiCreateLink(resourceType: string, resourceId: string, expiresAt?: string, password?: string) {
  return apiPost('/api/link-shares', { resourceType, resourceId, expiresAt, password });
}
export async function apiSearch(query: string) {
  return apiGet(`/api/search?q=${encodeURIComponent(query)}`);
}
export async function apiToggleStar(resourceType: string, resourceId: string, starred: boolean) {
  if (starred) {
    return apiPost('/api/stars', { resourceType, resourceId });
  } else {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_URL}/api/stars`, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceType, resourceId }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
  }
}

export async function apiGetStarred() {
  return apiGet('/api/stars');
}
export async function apiGetTrash() {
  return apiGet('/api/trash');
}

export async function apiRestoreItem(resourceType: string, resourceId: string) {
  return apiPost('/api/trash/restore', { resourceType, resourceId });
}

export async function apiPermanentDelete(resourceType: string, resourceId: string) {
  return apiDelete(`/api/trash/${resourceType}/${resourceId}`);
}
export async function apiGetSharedWithMe() {
  return apiGet('/api/shared-with-me');
}
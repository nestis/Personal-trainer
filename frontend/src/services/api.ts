import { Session } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listSessions(startDate?: string, endDate?: string): Promise<Session[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();
    return request(`/sessions${query ? `?${query}` : ''}`);
  },

  getSession(id: string): Promise<Session> {
    return request(`/sessions/${id}`);
  },

  createSession(data: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Session> {
    return request('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSession(id: string, data: Partial<Session>): Promise<Session> {
    return request(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteSession(id: string): Promise<void> {
    return request(`/sessions/${id}`, { method: 'DELETE' });
  },
};

import { Session, StrengthPR, WodRecord, ManualRecord, ManualStrengthPR, ManualWodRecord, HrvRecord, AggregatedExercise } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('jwt_token');
}

function setToken(token: string): void {
  localStorage.setItem('jwt_token', token);
}

function clearToken(): void {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('username');
}

function getUsername(): string | null {
  return localStorage.getItem('username');
}

function setUsername(username: string): void {
  localStorage.setItem('username', username);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; userId: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    setToken(data.token);
    setUsername(username.trim().toLowerCase());
    return data;
  },

  async register(username: string, password: string, inviteCode: string): Promise<{ token: string; userId: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, inviteCode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    setToken(data.token);
    setUsername(username.trim().toLowerCase());
    return data;
  },

  logout() {
    clearToken();
  },

  getToken,
  getUsername,

  // Sessions
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

  getStrengthPRs(): Promise<StrengthPR[]> {
    return request('/records/strength');
  },

  getAggregatedStrength(): Promise<AggregatedExercise[]> {
    return request('/records/strength/aggregated');
  },

  getWodRecords(): Promise<WodRecord[]> {
    return request('/records/wods');
  },

  // Manual records
  listManualRecords(type?: 'strength' | 'wod'): Promise<ManualRecord[]> {
    const query = type ? `?type=${type}` : '';
    return request(`/manual-records${query}`);
  },

  createManualStrengthPR(data: {
    exercise: string;
    reps: number;
    kilos: number;
    date: string;
    notes?: string;
  }): Promise<ManualStrengthPR> {
    return request('/manual-records/strength', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createManualWodRecord(data: {
    name: string;
    description?: string;
    timeSeconds?: number;
    totalReps?: number;
    avgHeartRate?: number;
    maxHeartRate?: number;
    date: string;
    notes?: string;
  }): Promise<ManualWodRecord> {
    return request('/manual-records/wod', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateManualWodRecord(id: string, data: {
    name?: string;
    description?: string;
    timeSeconds?: number;
    totalReps?: number;
    avgHeartRate?: number;
    maxHeartRate?: number;
    date?: string;
    notes?: string;
  }): Promise<ManualWodRecord> {
    return request(`/manual-records/wod/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteManualRecord(id: string): Promise<void> {
    return request(`/manual-records/${id}`, { method: 'DELETE' });
  },

  // HRV
  listHrvRecords(startDate?: string, endDate?: string): Promise<HrvRecord[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();
    return request(`/hrv${query ? `?${query}` : ''}`);
  },

  createHrvRecord(data: { date: string; min: number; max: number; avg: number; notes?: string }): Promise<HrvRecord> {
    return request('/hrv', { method: 'POST', body: JSON.stringify(data) });
  },

  updateHrvRecord(id: string, data: { date?: string; min?: number; max?: number; avg?: number; notes?: string }): Promise<HrvRecord> {
    return request(`/hrv/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteHrvRecord(id: string): Promise<void> {
    return request(`/hrv/${id}`, { method: 'DELETE' });
  },
};

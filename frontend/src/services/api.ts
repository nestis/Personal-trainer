import { Session, StrengthPR, WodRecord, ManualRecord, ManualStrengthPR, ManualWodRecord } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getPassword(): string | null {
  return localStorage.getItem('app_password');
}

function setPassword(password: string): void {
  localStorage.setItem('app_password', password);
}

function clearPassword(): void {
  localStorage.removeItem('app_password');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const password = getPassword();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  if (password) {
    headers['Authorization'] = `Bearer ${password}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearPassword();
    window.location.href = '/login';
    throw new Error('Invalid password');
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
  async verifyPassword(password: string): Promise<void> {
    setPassword(password);
    try {
      await request('/auth/verify', { method: 'POST' });
    } catch {
      clearPassword();
      throw new Error('Invalid password');
    }
  },

  setPassword,
  clearPassword,
  getPassword,

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
};

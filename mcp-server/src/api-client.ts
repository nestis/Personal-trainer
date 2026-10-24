interface Session {
  id: string;
  date: string;
  status: 'planned' | 'completed' | 'not_completed';
  strength: Exercise[];
  wod: WOD;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
}

interface ExerciseSet {
  setNumber: number;
  reps: number;
  kilos: number;
  completed: boolean;
}

interface WOD {
  name?: string;
  description: string;
  timeSeconds?: number;
  totalReps?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  rpe?: number;
  recoveryFromHeartRate?: number;
  recoveryToHeartRate?: number;
  recoveryHeartRate2min?: number; // the drop (From - To), computed by the backend
}

interface StrengthPR {
  exercise: string;
  reps: number;
  kilos: number;
  estimated1RM: number;
  date: string;
  sessionId: string;
}

interface WodRecord {
  name: string;
  bestTimeSeconds: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  date: string;
  sessionId: string;
  history: { timeSeconds: number; date: string; sessionId: string }[];
}

interface ManualRecord {
  id: string;
  type: 'strength' | 'wod';
  date: string;
  notes?: string;
  // strength fields
  exercise?: string;
  reps?: number;
  kilos?: number;
  estimated1RM?: number;
  // wod fields
  name?: string;
  description?: string;
  timeSeconds?: number;
  totalReps?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  rpe?: number;
  recoveryFromHeartRate?: number;
  recoveryToHeartRate?: number;
  recoveryHeartRate2min?: number; // the drop (From - To), computed by the backend
}

interface WodRecoveryPoint {
  date: string;
  source: 'session' | 'manual';
  name: string;
  sessionId?: string;
  recordId?: string;
  timeSeconds?: number;
  rpe?: number;
  fromHeartRate?: number;
  toHeartRate?: number;
  drop: number;
}

interface HrvRecord {
  id: string;
  date: string;
  min: number;
  max: number;
  avg: number;
  notes?: string;
  readings?: { time: string; value: number }[]; // the night's HRV readings (Apple Health import)
  restingHeartRate?: number;
  sleepMinutes?: number;
  sleepStages?: { deep: number; rem: number; core: number; awake: number };
  source?: 'apple-health';
  healthImportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class ApiClient {
  private baseUrl: string;
  private password: string;

  constructor(config: { API_URL: string; API_PASSWORD: string }) {
    this.baseUrl = config.API_URL.replace(/\/$/, '');
    this.password = config.API_PASSWORD;
  }

  private assertSafePathSegment(value: string): void {
    if (!value || /[\/\\\.#\?&]/.test(value) || value.includes('..')) {
      throw new Error('Invalid path parameter');
    }
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.password}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      throw new Error(`API request failed (${res.status})`);
    }

    // Successful deletes reply 204 with no body
    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
  }

  async listSessions(startDate?: string, endDate?: string): Promise<Session[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return this.request<Session[]>(`/api/sessions${qs ? `?${qs}` : ''}`);
  }

  async getSession(id: string): Promise<Session> {
    this.assertSafePathSegment(id);
    return this.request<Session>(`/api/sessions/${id}`);
  }

  async createSession(data: {
    date: string;
    strength: Exercise[];
    wod: WOD;
    notes?: string;
  }): Promise<Session> {
    return this.request<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSession(id: string, data: {
    date?: string;
    status?: 'planned' | 'completed' | 'not_completed';
    strength?: Exercise[];
    wod?: WOD;
    notes?: string;
  }): Promise<Session> {
    this.assertSafePathSegment(id);
    return this.request<Session>(`/api/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSession(id: string): Promise<void> {
    this.assertSafePathSegment(id);
    await this.request<void>(`/api/sessions/${id}`, { method: 'DELETE' });
  }

  async getStrengthPRs(): Promise<StrengthPR[]> {
    return this.request<StrengthPR[]>('/api/records/strength');
  }

  async getWodRecords(): Promise<WodRecord[]> {
    return this.request<WodRecord[]>('/api/records/wods');
  }

  async getWodRecovery(): Promise<WodRecoveryPoint[]> {
    return this.request<WodRecoveryPoint[]>('/api/records/wod-recovery');
  }

  async getManualRecords(type?: 'strength' | 'wod'): Promise<ManualRecord[]> {
    const qs = type ? `?type=${type}` : '';
    return this.request<ManualRecord[]>(`/api/manual-records${qs}`);
  }

  async createManualStrengthPR(data: {
    exercise: string;
    reps: number;
    kilos: number;
    date: string;
    notes?: string;
  }): Promise<ManualRecord> {
    return this.request<ManualRecord>('/api/manual-records/strength', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createManualWodRecord(data: {
    name: string;
    description?: string;
    timeSeconds?: number;
    totalReps?: number;
    avgHeartRate?: number;
    maxHeartRate?: number;
    rpe?: number;
    recoveryFromHeartRate?: number;
    recoveryToHeartRate?: number;
    date: string;
    notes?: string;
  }): Promise<ManualRecord> {
    return this.request<ManualRecord>('/api/manual-records/wod', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listHrvRecords(startDate?: string, endDate?: string): Promise<HrvRecord[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return this.request<HrvRecord[]>(`/api/hrv${qs ? `?${qs}` : ''}`);
  }

  async createHrvRecord(data: {
    date: string;
    min: number;
    max: number;
    avg: number;
    notes?: string;
  }): Promise<HrvRecord> {
    return this.request<HrvRecord>('/api/hrv', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHrvRecord(id: string, data: {
    date?: string;
    min?: number;
    max?: number;
    avg?: number;
    notes?: string;
  }): Promise<HrvRecord> {
    this.assertSafePathSegment(id);
    return this.request<HrvRecord>(`/api/hrv/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getTrainingSummary(weeks: number = 6): Promise<string> {
    const endDate = new Date().toISOString().split('T')[0];
    const start = new Date();
    start.setDate(start.getDate() - weeks * 7);
    const startDate = start.toISOString().split('T')[0];

    const [sessions, strengthPRs, wodRecords, recoveryPoints] = await Promise.all([
      this.listSessions(startDate, endDate),
      this.getStrengthPRs(),
      this.getWodRecords(),
      this.getWodRecovery().catch(() => [] as WodRecoveryPoint[]),
    ]);

    const completed = sessions.filter(s => s.status === 'completed');
    const planned = sessions.filter(s => s.status === 'planned');
    const notCompleted = sessions.filter(s => s.status === 'not_completed');

    // Sessions per week
    const weekBuckets = new Map<string, number>();
    for (const s of completed) {
      const d = new Date(s.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1); // Monday
      const key = weekStart.toISOString().split('T')[0];
      weekBuckets.set(key, (weekBuckets.get(key) || 0) + 1);
    }

    // Volume per exercise
    const exerciseVolume = new Map<string, { sets: number; totalReps: number; totalKg: number }>();
    for (const s of completed) {
      for (const ex of s.strength) {
        const name = ex.name.trim().toLowerCase();
        const existing = exerciseVolume.get(name) || { sets: 0, totalReps: 0, totalKg: 0 };
        for (const set of ex.sets) {
          if (set.completed) {
            existing.sets++;
            existing.totalReps += set.reps;
            existing.totalKg += set.reps * set.kilos;
          }
        }
        exerciseVolume.set(name, existing);
      }
    }

    // Build summary
    const lines: string[] = [];
    lines.push(`## Training Summary (last ${weeks} weeks)`);
    lines.push(`Period: ${startDate} to ${endDate}`);
    lines.push('');
    lines.push(`### Overview`);
    lines.push(`- Total sessions: ${sessions.length} (${completed.length} completed, ${planned.length} planned, ${notCompleted.length} not completed)`);

    const weekEntries = [...weekBuckets.entries()].sort();
    if (weekEntries.length > 0) {
      const avgPerWeek = completed.length / weeks;
      lines.push(`- Average sessions/week: ${avgPerWeek.toFixed(1)}`);
      lines.push('');
      lines.push('### Sessions per Week');
      for (const [week, count] of weekEntries) {
        lines.push(`- Week of ${week}: ${count} sessions`);
      }
    }

    if (exerciseVolume.size > 0) {
      lines.push('');
      lines.push('### Volume by Exercise');
      const sorted = [...exerciseVolume.entries()].sort((a, b) => b[1].totalKg - a[1].totalKg);
      for (const [name, vol] of sorted) {
        lines.push(`- **${name}**: ${vol.sets} sets, ${vol.totalReps} total reps, ${Math.round(vol.totalKg)}kg total volume`);
      }
    }

    if (strengthPRs.length > 0) {
      lines.push('');
      lines.push('### Current Strength PRs');
      const byExercise = new Map<string, typeof strengthPRs>();
      for (const pr of strengthPRs) {
        const key = pr.exercise.toLowerCase();
        if (!byExercise.has(key)) byExercise.set(key, []);
        byExercise.get(key)!.push(pr);
      }
      for (const [, prs] of [...byExercise.entries()].sort()) {
        const best = prs.reduce((a, b) => a.estimated1RM > b.estimated1RM ? a : b);
        lines.push(`- **${best.exercise}**: best est. 1RM ${best.estimated1RM}kg (${best.kilos}kg x ${best.reps} on ${best.date})`);
      }
    }

    if (wodRecords.length > 0) {
      lines.push('');
      lines.push('### WOD Records');
      for (const wod of wodRecords) {
        const mins = Math.floor(wod.bestTimeSeconds / 60);
        const secs = wod.bestTimeSeconds % 60;
        const time = `${mins}:${secs.toString().padStart(2, '0')}`;
        lines.push(`- **${wod.name}**: best ${time} on ${wod.date} (${wod.history.length} attempts)`);
      }
    }

    // WOD effort (RPE) and heart-rate recovery
    type WodEffort = { date: string; name: string; rpe?: number; from?: number; to?: number; drop?: number };
    const efforts = new Map<string, WodEffort>();
    for (const s of sessions) {
      const w = s.wod;
      if (!w || (w.rpe === undefined && w.recoveryHeartRate2min === undefined)) continue;
      efforts.set(`${s.date}|${(w.name || 'WOD').toLowerCase()}`, {
        date: s.date,
        name: w.name || 'WOD',
        rpe: w.rpe,
        from: w.recoveryFromHeartRate,
        to: w.recoveryToHeartRate,
        drop: w.recoveryHeartRate2min,
      });
    }
    for (const p of recoveryPoints) {
      if (p.date < startDate || p.date > endDate) continue;
      const key = `${p.date}|${p.name.toLowerCase()}`;
      if (!efforts.has(key)) {
        efforts.set(key, { date: p.date, name: p.name, rpe: p.rpe, from: p.fromHeartRate, to: p.toHeartRate, drop: p.drop });
      }
    }
    if (efforts.size > 0) {
      const list = [...efforts.values()].sort((a, b) => a.date.localeCompare(b.date));
      lines.push('');
      lines.push('### WOD Effort & Heart-Rate Recovery');
      lines.push('Recovery = heart rate at the end of the WOD (From) minus 2 minutes later (To); a bigger drop is better.');
      for (const e of list) {
        const parts: string[] = [];
        if (e.rpe !== undefined) parts.push(`RPE ${e.rpe}`);
        if (e.drop !== undefined) {
          const range = e.from !== undefined && e.to !== undefined ? ` (${e.from} → ${e.to})` : '';
          parts.push(`recovery -${e.drop} bpm${range}`);
        }
        lines.push(`- ${e.date} **${e.name}**: ${parts.join(', ')}`);
      }
      const drops = list.map(e => e.drop).filter((d): d is number => d !== undefined);
      const rpes = list.map(e => e.rpe).filter((r): r is number => r !== undefined);
      if (drops.length > 0) lines.push(`- Average recovery drop: ${(drops.reduce((a, b) => a + b, 0) / drops.length).toFixed(1)} bpm over ${drops.length} WOD(s)`);
      if (rpes.length > 0) lines.push(`- Average WOD RPE: ${(rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1)}`);
    }

    // Rest day analysis
    if (completed.length > 1) {
      const dates = completed.map(s => s.date).sort();
      let maxConsecutive = 1;
      let currentConsecutive = 1;
      const restDays: number[] = [];

      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentConsecutive++;
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
          currentConsecutive = 1;
          if (diffDays > 1) restDays.push(diffDays - 1);
        }
      }

      lines.push('');
      lines.push('### Rest Days & Consecutive Training');
      lines.push(`- Max consecutive training days: ${maxConsecutive}`);
      if (restDays.length > 0) {
        const avgRest = restDays.reduce((a, b) => a + b, 0) / restDays.length;
        lines.push(`- Average rest gap: ${avgRest.toFixed(1)} days`);
      }
    }

    return lines.join('\n');
  }
}

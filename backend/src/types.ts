export interface ExerciseSet {
  setNumber: number;
  reps: number;
  kilos: number;
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
}

export interface WOD {
  name?: string; // Named WODs (e.g., 'Fran', 'Murph') for time record tracking
  description: string;
  timeSeconds?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
}

export interface StrengthPR {
  exercise: string;
  reps: number;
  kilos: number;
  estimated1RM: number;
  date: string;
  sessionId: string;
}

export interface WodRecord {
  name: string;
  bestTimeSeconds: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  date: string;
  sessionId: string;
  history: {
    timeSeconds: number;
    date: string;
    sessionId: string;
  }[];
}

export type SessionStatus = 'planned' | 'completed';

export interface Session {
  id: string;
  date: string; // ISO date string
  status: SessionStatus;
  strength: Exercise[];
  wod: WOD;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  date: string;
  strength: Exercise[];
  wod: WOD;
  notes?: string;
}

export interface UpdateSessionInput {
  date?: string;
  status?: SessionStatus;
  strength?: Exercise[];
  wod?: WOD;
  notes?: string;
}

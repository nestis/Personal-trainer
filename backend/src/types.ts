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
  description: string;
  timeSeconds?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
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

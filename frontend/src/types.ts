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
  name?: string;
  description: string;
  timeSeconds?: number;
  totalReps?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  rpe?: number; // 1-10 in steps of 0.5
  recoveryHeartRate2min?: number; // bpm, 2 minutes after finishing
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
  date: string;
  status: SessionStatus;
  strength: Exercise[];
  wod: WOD;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManualStrengthPR {
  id: string;
  type: 'strength';
  exercise: string;
  reps: number;
  kilos: number;
  estimated1RM: number;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManualWodRecord {
  id: string;
  type: 'wod';
  name: string;
  description?: string;
  timeSeconds?: number;
  totalReps?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  rpe?: number;
  recoveryHeartRate2min?: number;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ManualRecord = ManualStrengthPR | ManualWodRecord;

export interface AggregatedExercise {
  exercise: string;
  estimated1RM: number;
  bestSet: { reps: number; kilos: number; date: string };
  history: { date: string; estimated1RM: number; reps: number; kilos: number }[];
}

export interface HrvRecord {
  id: string;
  date: string;
  min: number;
  max: number;
  avg: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}


export interface WodRecoveryPoint {
  date: string;
  source: 'session' | 'manual';
  name: string;
  sessionId?: string;
  recordId?: string;
  timeSeconds?: number;
  rpe?: number;
  maxHeartRate?: number;
  recoveryHeartRate2min: number;
  drop?: number; // max HR - HR after 2 min (bigger is better)
}

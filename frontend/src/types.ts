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
  recoveryFromHeartRate?: number; // bpm at the end of the WOD
  recoveryToHeartRate?: number; // bpm 2 minutes later
  recoveryHeartRate2min?: number; // the drop (from - to), computed by the backend
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

// planned = still to do, completed = done, not_completed = planned but not done
export type SessionStatus = 'planned' | 'completed' | 'not_completed';

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
  recoveryFromHeartRate?: number;
  recoveryToHeartRate?: number;
  recoveryHeartRate2min?: number; // the drop (from - to), computed by the backend
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ManualRecord = ManualStrengthPR | ManualWodRecord;

export interface AggregatedExercise {
  exercise: string;
  // The current max: best entry of the last 6 weeks, or the latest reading if there is none
  estimated1RM: number;
  bestSet: { reps: number; kilos: number; date: string };
  basis?: 'last6weeks' | 'latest';
  allTimeBest?: { estimated1RM: number; reps: number; kilos: number; date: string };
  history: { date: string; estimated1RM: number; reps: number; kilos: number }[];
}

export interface HrvRecord {
  id: string;
  date: string;
  min: number;
  max: number;
  avg: number;
  notes?: string;
  // Filled by the Apple Health import (iPhone Shortcut)
  readings?: { time: string; value: number }[];
  restingHeartRate?: number;
  sleepMinutes?: number;
  sleepStages?: { deep: number; rem: number; core: number; awake: number };
  source?: 'apple-health';
  healthImportedAt?: string;
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
  fromHeartRate?: number;
  toHeartRate?: number;
  drop: number; // from - to: how far the heart rate fell in 2 minutes (bigger is better)
}

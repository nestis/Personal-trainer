import { Session, StrengthPR, WodRecord, AggregatedExercise, ManualStrengthPR } from '../types';
import { listSessions } from './dynamodb';
import { listManualRecords } from './manualRecords';
import { estimate1RM } from '../utils/formulas';

export async function getAllRecords(
  userId: string,
  prefetchedSessions?: Session[]
): Promise<{ strengthPRs: StrengthPR[]; wodRecords: WodRecord[] }> {
  const sessions = prefetchedSessions ?? await listSessions(userId);
  const completedSessions = sessions.filter((s) => s.status === 'completed');

  const strengthPRs = computeStrengthPRs(completedSessions);
  const wodRecords = computeWodRecords(completedSessions);

  return { strengthPRs, wodRecords };
}

function computeStrengthPRs(completedSessions: Session[]): StrengthPR[] {
  // Map: "normalizedName|reps" -> best record
  const prMap = new Map<string, StrengthPR>();
  // Track the first-seen display name per normalized exercise name
  const displayNames = new Map<string, string>();

  for (const session of completedSessions) {
    for (const exercise of session.strength) {
      if (!exercise.name) continue;
      const normalizedName = exercise.name.trim().toLowerCase();

      // Keep the first-seen display name for consistent casing
      if (!displayNames.has(normalizedName)) {
        displayNames.set(normalizedName, exercise.name.trim());
      }
      const displayName = displayNames.get(normalizedName)!;

      for (const set of exercise.sets) {
        if (!set.completed || set.kilos <= 0) continue;

        const key = `${normalizedName}|${set.reps}`;
        const existing = prMap.get(key);

        if (!existing || set.kilos > existing.kilos) {
          prMap.set(key, {
            exercise: displayName,
            reps: set.reps,
            kilos: set.kilos,
            estimated1RM: estimate1RM(set.kilos, set.reps),
            date: session.date,
            sessionId: session.id,
          });
        }
      }
    }
  }

  const prs = Array.from(prMap.values());
  // Sort by exercise name, then by reps
  prs.sort((a, b) => {
    const nameCompare = a.exercise.toLowerCase().localeCompare(b.exercise.toLowerCase());
    if (nameCompare !== 0) return nameCompare;
    return a.reps - b.reps;
  });

  return prs;
}

function computeWodRecords(completedSessions: Session[]): WodRecord[] {
  // Map: normalized wod name -> all entries
  const wodMap = new Map<string, {
    name: string;
    entries: { timeSeconds: number; date: string; sessionId: string; avgHeartRate?: number; maxHeartRate?: number }[];
  }>();

  for (const session of completedSessions) {
    const wod = session.wod;
    if (!wod.name || !wod.timeSeconds) continue;

    const normalizedName = wod.name.trim().toLowerCase();
    const existing = wodMap.get(normalizedName) || { name: wod.name.trim(), entries: [] };

    existing.entries.push({
      timeSeconds: wod.timeSeconds,
      date: session.date,
      sessionId: session.id,
      avgHeartRate: wod.avgHeartRate,
      maxHeartRate: wod.maxHeartRate,
    });

    wodMap.set(normalizedName, existing);
  }

  const records: WodRecord[] = [];

  for (const { name, entries } of wodMap.values()) {
    // Sort entries by time ascending (best first)
    entries.sort((a, b) => a.timeSeconds - b.timeSeconds);
    const best = entries[0];

    records.push({
      name,
      bestTimeSeconds: best.timeSeconds,
      avgHeartRate: best.avgHeartRate,
      maxHeartRate: best.maxHeartRate,
      date: best.date,
      sessionId: best.sessionId,
      history: entries.map((e) => ({
        timeSeconds: e.timeSeconds,
        date: e.date,
        sessionId: e.sessionId,
      })),
    });
  }

  // Sort by WOD name
  records.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  return records;
}

export async function getStrengthPRs(userId: string, prefetchedSessions?: Session[]): Promise<StrengthPR[]> {
  const { strengthPRs } = await getAllRecords(userId, prefetchedSessions);
  return strengthPRs;
}

export async function getWodRecords(userId: string, prefetchedSessions?: Session[]): Promise<WodRecord[]> {
  const { wodRecords } = await getAllRecords(userId, prefetchedSessions);
  return wodRecords;
}

export async function getAggregatedStrength(userId: string): Promise<AggregatedExercise[]> {
  const [sessions, manualRecords] = await Promise.all([
    listSessions(userId),
    listManualRecords(userId, 'strength'),
  ]);

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const manualStrength = manualRecords.filter((r): r is ManualStrengthPR => r.type === 'strength');

  // Collect all entries per exercise (normalized name)
  const exerciseMap = new Map<string, {
    displayName: string;
    entries: { date: string; reps: number; kilos: number; estimated1RM: number }[];
  }>();

  for (const session of completedSessions) {
    for (const exercise of session.strength) {
      if (!exercise.name) continue;
      const normalizedName = exercise.name.trim().toLowerCase();

      if (!exerciseMap.has(normalizedName)) {
        exerciseMap.set(normalizedName, { displayName: exercise.name.trim(), entries: [] });
      }
      const group = exerciseMap.get(normalizedName)!;

      for (const set of exercise.sets) {
        if (!set.completed || set.kilos <= 0) continue;
        group.entries.push({
          date: session.date,
          reps: set.reps,
          kilos: set.kilos,
          estimated1RM: estimate1RM(set.kilos, set.reps),
        });
      }
    }
  }

  for (const manual of manualStrength) {
    const normalizedName = manual.exercise.trim().toLowerCase();

    if (!exerciseMap.has(normalizedName)) {
      exerciseMap.set(normalizedName, { displayName: manual.exercise.trim(), entries: [] });
    }
    const group = exerciseMap.get(normalizedName)!;

    group.entries.push({
      date: manual.date,
      reps: manual.reps,
      kilos: manual.kilos,
      estimated1RM: manual.estimated1RM,
    });
  }

  const result: AggregatedExercise[] = [];

  for (const { displayName, entries } of exerciseMap.values()) {
    if (entries.length === 0) continue;

    // Best entry by estimated 1RM
    const best = entries.reduce((a, b) => a.estimated1RM >= b.estimated1RM ? a : b);

    // Sort history by date ascending
    const history = [...entries].sort((a, b) => a.date.localeCompare(b.date));

    result.push({
      exercise: displayName,
      estimated1RM: best.estimated1RM,
      bestSet: { reps: best.reps, kilos: best.kilos, date: best.date },
      history,
    });
  }

  // Sort by exercise name
  result.sort((a, b) => a.exercise.toLowerCase().localeCompare(b.exercise.toLowerCase()));

  return result;
}

import { Session, StrengthPR, WodRecord } from '../types';
import { listSessions } from './dynamodb';

// Epley formula: 1RM = weight × (1 + reps / 30)
function estimate1RM(kilos: number, reps: number): number {
  if (reps === 1) return kilos;
  return Math.round(kilos * (1 + reps / 30) * 10) / 10;
}

export async function getStrengthPRs(): Promise<StrengthPR[]> {
  const sessions = await listSessions();
  const completedSessions = sessions.filter((s) => s.status === 'completed');

  // Map: "exercise|reps" -> best record
  const prMap = new Map<string, StrengthPR>();

  for (const session of completedSessions) {
    for (const exercise of session.strength) {
      if (!exercise.name) continue;
      const normalizedName = exercise.name.trim().toLowerCase();

      for (const set of exercise.sets) {
        if (!set.completed || set.kilos <= 0) continue;

        const key = `${normalizedName}|${set.reps}`;
        const existing = prMap.get(key);

        if (!existing || set.kilos > existing.kilos) {
          prMap.set(key, {
            exercise: exercise.name.trim(),
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

export async function getWodRecords(): Promise<WodRecord[]> {
  const sessions = await listSessions();
  const completedSessions = sessions.filter((s) => s.status === 'completed');

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

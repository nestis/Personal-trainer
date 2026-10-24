import { Session, StrengthPR, WodRecord, AggregatedExercise, ManualStrengthPR, WodRecoveryPoint } from '../types';
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

// "Latest readings" for the current max: the last 6 weeks
const RECENT_DAYS = 42;

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
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

  // Collect best set per exercise per session date (highest estimated 1RM wins)
  // e.g. 5x60, 5x70, 5x80 → keep 5x80; 5x60, 3x80 → keep whichever has higher 1RM
  const sessionBests = new Map<string, Map<string, { date: string; reps: number; kilos: number; estimated1RM: number }>>();

  for (const session of completedSessions) {
    for (const exercise of session.strength) {
      if (!exercise.name) continue;
      const normalizedName = exercise.name.trim().toLowerCase();

      if (!exerciseMap.has(normalizedName)) {
        exerciseMap.set(normalizedName, { displayName: exercise.name.trim(), entries: [] });
      }

      if (!sessionBests.has(normalizedName)) {
        sessionBests.set(normalizedName, new Map());
      }
      const dayMap = sessionBests.get(normalizedName)!;

      for (const set of exercise.sets) {
        if (!set.completed || set.kilos <= 0) continue;
        const est = estimate1RM(set.kilos, set.reps);
        const existing = dayMap.get(session.date);
        if (!existing || est > existing.estimated1RM) {
          dayMap.set(session.date, {
            date: session.date,
            reps: set.reps,
            kilos: set.kilos,
            estimated1RM: est,
          });
        }
      }
    }
  }

  // Add the best-per-day session entries
  for (const [normalizedName, dayMap] of sessionBests) {
    const group = exerciseMap.get(normalizedName)!;
    for (const entry of dayMap.values()) {
      group.entries.push(entry);
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
  const recentFrom = daysAgoISO(RECENT_DAYS);

  for (const { displayName, entries } of exerciseMap.values()) {
    if (entries.length === 0) continue;

    // Best entry ever, by estimated 1RM
    const allTime = entries.reduce((a, b) => (a.estimated1RM >= b.estimated1RM ? a : b));

    // Sort history by date ascending
    const history = [...entries].sort((a, b) => a.date.localeCompare(b.date));

    // Current max: best of the last 6 weeks; with no entry that recent, the latest reading
    const recent = entries.filter((e) => e.date >= recentFrom);
    let current: typeof allTime;
    let basis: AggregatedExercise['basis'];
    if (recent.length > 0) {
      current = recent.reduce((a, b) => (a.estimated1RM >= b.estimated1RM ? a : b));
      basis = 'last6weeks';
    } else {
      const latestDate = history[history.length - 1].date;
      current = history
        .filter((e) => e.date === latestDate)
        .reduce((a, b) => (a.estimated1RM >= b.estimated1RM ? a : b));
      basis = 'latest';
    }

    result.push({
      exercise: displayName,
      estimated1RM: current.estimated1RM,
      bestSet: { reps: current.reps, kilos: current.kilos, date: current.date },
      basis,
      allTimeBest: { estimated1RM: allTime.estimated1RM, reps: allTime.reps, kilos: allTime.kilos, date: allTime.date },
      history,
    });
  }

  // Sort by exercise name
  result.sort((a, b) => a.exercise.toLowerCase().localeCompare(b.exercise.toLowerCase()));

  return result;
}

/**
 * Every WOD with a measured heart-rate recovery, oldest first. The drop is the
 * stored recoveryHeartRate2min (from - to, computed when the WOD is saved).
 * Includes sessions (any status, since the WOD is often filled in before the
 * session is finished) and manual WOD records.
 */
export async function getWodRecovery(userId: string): Promise<WodRecoveryPoint[]> {
  const [sessions, manual] = await Promise.all([
    listSessions(userId),
    listManualRecords(userId, 'wod'),
  ]);

  const points: WodRecoveryPoint[] = [];

  for (const s of sessions) {
    const drop = s.wod?.recoveryHeartRate2min;
    if (drop === undefined) continue;
    points.push({
      date: s.date,
      source: 'session',
      name: s.wod.name?.trim() || 'WOD',
      sessionId: s.id,
      ...(s.wod.timeSeconds !== undefined && { timeSeconds: s.wod.timeSeconds }),
      ...(s.wod.rpe !== undefined && { rpe: s.wod.rpe }),
      ...(s.wod.recoveryFromHeartRate !== undefined && { fromHeartRate: s.wod.recoveryFromHeartRate }),
      ...(s.wod.recoveryToHeartRate !== undefined && { toHeartRate: s.wod.recoveryToHeartRate }),
      drop,
    });
  }

  for (const r of manual) {
    if (r.type !== 'wod' || r.recoveryHeartRate2min === undefined) continue;
    points.push({
      date: r.date,
      source: 'manual',
      name: r.name.trim() || 'WOD',
      recordId: r.id,
      ...(r.timeSeconds !== undefined && { timeSeconds: r.timeSeconds }),
      ...(r.rpe !== undefined && { rpe: r.rpe }),
      ...(r.recoveryFromHeartRate !== undefined && { fromHeartRate: r.recoveryFromHeartRate }),
      ...(r.recoveryToHeartRate !== undefined && { toHeartRate: r.recoveryToHeartRate }),
      drop: r.recoveryHeartRate2min,
    });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

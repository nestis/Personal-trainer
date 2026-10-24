import { HrvRecord, Session } from '../types';
import { createHrvRecord, listHrvRecords, saveHrvRecord } from './hrv';
import { getSession, listSessions, updateSession } from './dynamodb';
import {
  epochOf,
  localDateOf,
  parseNumber,
  parseSleepSamples,
  parseValueSamples,
  summarizeHrv,
  summarizeSleep,
  workoutHeartRate,
} from '../utils/healthSamples';

export class HealthImportError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Morning import: the night's HRV readings, resting heart rate and sleep.
 * Updates that day's HRV entry (keeping its notes) or creates it.
 */
export async function importDaily(userId: string, body: Record<string, unknown>) {
  const hrv = parseValueSamples(body.hrv);
  const sleep = parseSleepSamples(body.sleep);
  const hrvSummary = summarizeHrv(hrv.samples);
  const sleepSummary = summarizeSleep(sleep.intervals);

  const rhrRaw = parseNumber(body.restingHeartRate);
  const restingHeartRate = rhrRaw !== null && rhrRaw >= 25 && rhrRaw <= 200 ? Math.round(rhrRaw) : undefined;

  // The day is the wake-up day: explicit date, else the local date of the latest HRV reading or sleep end
  let date = typeof body.date === 'string' && DATE_RE.test(body.date) ? body.date : null;
  if (!date && hrv.samples.length) date = hrv.samples[hrv.samples.length - 1].localDate;
  if (!date && sleep.intervals.length) {
    date = [...sleep.intervals].sort((a, b) => b.end - a.end)[0].endLocalDate;
  }
  if (!date) date = new Date().toISOString().slice(0, 10);

  if (!hrvSummary && restingHeartRate === undefined && !sleepSummary) {
    throw new HealthImportError(422, 'Nothing to import: no HRV readings, resting heart rate or sleep found', {
      skippedLines: hrv.skipped + sleep.skipped,
    });
  }

  const extras: Partial<HrvRecord> = {
    ...(restingHeartRate !== undefined && { restingHeartRate }),
    ...(sleepSummary && sleepSummary),
    source: 'apple-health',
    healthImportedAt: new Date().toISOString(),
  };

  const sameDay = await listHrvRecords(userId, date, date);
  const existing = [...sameDay].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  let record: HrvRecord;
  let action: 'created' | 'updated';
  if (existing) {
    record = await saveHrvRecord(userId, {
      ...existing,
      ...(hrvSummary && hrvSummary),
      ...extras,
      updatedAt: new Date().toISOString(),
    });
    action = 'updated';
  } else if (hrvSummary) {
    const created = await createHrvRecord(userId, { date, min: hrvSummary.min, max: hrvSummary.max, avg: hrvSummary.avg });
    record = await saveHrvRecord(userId, { ...created, readings: hrvSummary.readings, ...extras });
    action = 'created';
  } else {
    throw new HealthImportError(422, `No HRV readings found and there is no HRV entry for ${date} yet to add resting heart rate or sleep to`);
  }

  return {
    action,
    date,
    hrv: hrvSummary ? { min: hrvSummary.min, avg: hrvSummary.avg, max: hrvSummary.max, readings: hrvSummary.readings.length } : null,
    restingHeartRate: restingHeartRate ?? null,
    sleep: sleepSummary,
    skippedLines: hrv.skipped + sleep.skipped,
    record,
  };
}

function wodHasContent(s: Session): boolean {
  const w = s.wod || ({} as Session['wod']);
  return Boolean(w.name || w.description);
}

/**
 * Post-workout import: heart-rate samples from the workout start until a few
 * minutes after it ended. Fills the WOD's avg / max heart rate and the
 * recovery pair (From / To, drop stored as recoveryHeartRate2min).
 */
export async function importWorkout(userId: string, body: Record<string, unknown>) {
  const startMs = epochOf(body.workoutStart);
  const endMs = epochOf(body.workoutEnd);
  if (startMs === null || endMs === null) {
    throw new HealthImportError(400, 'workoutStart and workoutEnd must be ISO 8601 dates, e.g. 2026-10-24T10:05:00+02:00');
  }
  if (endMs <= startMs || endMs - startMs > 6 * 3600_000) {
    throw new HealthImportError(400, 'workoutEnd must be after workoutStart and the workout at most 6 hours long');
  }

  const { samples, skipped } = parseValueSamples(body.heartRate);
  if (samples.length === 0) {
    throw new HealthImportError(422, 'No heart rate samples found', { skippedLines: skipped });
  }
  const hr = workoutHeartRate(samples, startMs, endMs);
  const inRange = (n: number | undefined) => n !== undefined && n >= 30 && n <= 250;

  // Find the session: an explicit id, else the workout day's session (one with a WOD first)
  let session: Session | null = null;
  const date = typeof body.date === 'string' && DATE_RE.test(body.date) ? body.date : localDateOf(body.workoutEnd)!;
  if (typeof body.sessionId === 'string' && body.sessionId) {
    session = await getSession(userId, body.sessionId);
  } else {
    const sessions = await listSessions(userId, date, date);
    session =
      [...sessions].sort(
        (a, b) => Number(wodHasContent(b)) - Number(wodHasContent(a)) || b.updatedAt.localeCompare(a.updatedAt)
      )[0] || null;
  }

  const computed = {
    avgHeartRate: hr.avgHeartRate ?? null,
    maxHeartRate: hr.maxHeartRate ?? null,
    recoveryFromHeartRate: hr.recoveryFromHeartRate ?? null,
    recoveryToHeartRate: hr.recoveryToHeartRate ?? null,
    drop:
      hr.recoveryFromHeartRate !== undefined && hr.recoveryToHeartRate !== undefined
        ? hr.recoveryFromHeartRate - hr.recoveryToHeartRate
        : null,
    samplesInWorkout: hr.samplesInWorkout,
    skippedLines: skipped,
    warnings: hr.warnings,
  };

  if (!session) {
    throw new HealthImportError(404, `No session found for ${date}. Create the session first, then run the shortcut again.`, computed);
  }

  const wod = { ...session.wod };
  if (inRange(hr.avgHeartRate)) wod.avgHeartRate = hr.avgHeartRate;
  if (inRange(hr.maxHeartRate)) wod.maxHeartRate = hr.maxHeartRate;
  if (inRange(hr.recoveryFromHeartRate) && inRange(hr.recoveryToHeartRate)) {
    wod.recoveryFromHeartRate = hr.recoveryFromHeartRate;
    wod.recoveryToHeartRate = hr.recoveryToHeartRate;
    wod.recoveryHeartRate2min = hr.recoveryFromHeartRate! - hr.recoveryToHeartRate!;
  }
  await updateSession(userId, session.id, { wod });

  return { sessionId: session.id, date: session.date, ...computed };
}

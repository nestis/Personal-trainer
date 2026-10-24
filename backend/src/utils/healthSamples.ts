/**
 * Parsing and summarising Apple Health samples sent by iPhone Shortcuts.
 *
 * Shortcuts cannot easily build JSON arrays, so samples arrive as text, one
 * sample per line, fields separated by ";" (also "|" or a tab):
 *   heart rate / HRV:  2026-10-24T05:40:00+02:00;51
 *   sleep:             2026-10-23T23:10:00+02:00;2026-10-24T00:05:00+02:00;Core
 * Arrays of objects ({ date, value } / { start, end, value }) are accepted too.
 * Dates must be ISO 8601 with their UTC offset; the offset keeps the local date
 * and time the watch recorded.
 */

export interface Sample {
  ms: number; // epoch milliseconds
  localDate: string; // YYYY-MM-DD as recorded (local time)
  localTime: string; // HH:MM as recorded (local time)
  value: number;
}

export interface SleepInterval {
  start: number;
  end: number;
  endLocalDate: string; // local date the interval ended (the wake-up day)
  stage: SleepStage;
}

export type SleepStage = 'deep' | 'rem' | 'core' | 'asleep' | 'awake' | 'inBed' | 'unknown';

const MAX_LINES = 5000;

function splitLine(line: string): string[] {
  return line.split(/[;|\t]/).map((p) => p.trim());
}

function parseIso(text: string): { ms: number; localDate: string; localTime: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(text);
  if (!m) return null;
  const ms = Date.parse(text.replace(' ', 'T'));
  if (Number.isNaN(ms)) return null;
  return { ms, localDate: m[1], localTime: `${m[2]}:${m[3]}` };
}

function parseNumber(text: unknown): number | null {
  if (typeof text === 'number') return Number.isFinite(text) ? text : null;
  if (typeof text !== 'string') return null;
  const m = /-?\d+(?:[.,]\d+)?/.exec(text);
  return m ? Number(m[0].replace(',', '.')) : null;
}

function toLines(input: unknown): unknown[] {
  if (Array.isArray(input)) return input.slice(0, MAX_LINES);
  if (typeof input === 'string') {
    return input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, MAX_LINES);
  }
  return [];
}

/** Value samples (heart rate, HRV). Returns the parsed samples (oldest first) and how many lines were skipped. */
export function parseValueSamples(input: unknown): { samples: Sample[]; skipped: number } {
  const samples: Sample[] = [];
  let skipped = 0;
  for (const line of toLines(input)) {
    let dateText: unknown;
    let valueText: unknown;
    if (typeof line === 'string') {
      [dateText, valueText] = splitLine(line);
    } else if (line && typeof line === 'object') {
      const o = line as Record<string, unknown>;
      dateText = o.date ?? o.startDate ?? o.start;
      valueText = o.value;
    }
    const when = typeof dateText === 'string' ? parseIso(dateText) : null;
    const value = parseNumber(valueText);
    if (!when || value === null || value <= 0) {
      skipped++;
      continue;
    }
    samples.push({ ...when, value });
  }
  samples.sort((a, b) => a.ms - b.ms);
  return { samples, skipped };
}

/** Maps a Health sleep value (English or Spanish) to a stage */
export function sleepStage(text: string): SleepStage {
  const t = text.toLowerCase();
  if (/awake|despiert/.test(t)) return 'awake';
  if (/in ?bed|en (la )?cama/.test(t)) return 'inBed';
  if (/deep|profund/.test(t)) return 'deep';
  if (/\brem\b/.test(t)) return 'rem';
  if (/core|light|ligero|b[aá]sico|n[uú]cleo|principal/.test(t)) return 'core';
  if (/asleep|sleep|dormid|sueño|sueno/.test(t)) return 'asleep';
  return 'unknown';
}

export function parseSleepSamples(input: unknown): { intervals: SleepInterval[]; skipped: number } {
  const intervals: SleepInterval[] = [];
  let skipped = 0;
  for (const line of toLines(input)) {
    let s: unknown, e: unknown, v: unknown;
    if (typeof line === 'string') {
      [s, e, v] = splitLine(line);
    } else if (line && typeof line === 'object') {
      const o = line as Record<string, unknown>;
      s = o.start ?? o.startDate;
      e = o.end ?? o.endDate;
      v = o.value ?? o.stage;
    }
    const start = typeof s === 'string' ? parseIso(s) : null;
    const end = typeof e === 'string' ? parseIso(e) : null;
    if (!start || !end || end.ms <= start.ms || end.ms - start.ms > 16 * 3600_000) {
      skipped++;
      continue;
    }
    intervals.push({ start: start.ms, end: end.ms, endLocalDate: end.localDate, stage: sleepStage(typeof v === 'string' ? v : '') });
  }
  return { intervals, skipped };
}

/** Total minutes covered by intervals, counting overlaps once (watch and phone often both record) */
function unionMinutes(list: { start: number; end: number }[]): number {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const { start, end } of sorted) {
    if (start > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = start;
      curEnd = end;
    } else if (end > curEnd) {
      curEnd = end;
    }
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return Math.round(total / 60000);
}

export interface SleepSummary {
  sleepMinutes: number;
  sleepStages: { deep: number; rem: number; core: number; awake: number };
}

export function summarizeSleep(intervals: SleepInterval[]): SleepSummary | null {
  const asleep = intervals.filter((i) => ['deep', 'rem', 'core', 'asleep'].includes(i.stage));
  if (asleep.length === 0) return null;
  const of = (stage: SleepStage) => unionMinutes(intervals.filter((i) => i.stage === stage));
  return {
    sleepMinutes: unionMinutes(asleep),
    sleepStages: { deep: of('deep'), rem: of('rem'), core: of('core'), awake: of('awake') },
  };
}

export interface HrvSummary {
  min: number;
  max: number;
  avg: number;
  readings: { time: string; value: number }[];
}

export function summarizeHrv(samples: Sample[]): HrvSummary | null {
  if (samples.length === 0) return null;
  const values = samples.map((s) => s.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    min: Math.round(Math.min(...values)),
    max: Math.round(Math.max(...values)),
    avg: Math.round(avg * 10) / 10,
    readings: samples.slice(-48).map((s) => ({ time: s.localTime, value: Math.round(s.value) })),
  };
}

export interface WorkoutHeartRate {
  avgHeartRate?: number;
  maxHeartRate?: number;
  recoveryFromHeartRate?: number;
  recoveryToHeartRate?: number;
  samplesInWorkout: number;
  warnings: string[];
}

/**
 * Average and max heart rate during the workout, plus the recovery pair:
 * From = heart rate when the workout ended, To = heart rate 2 minutes later.
 */
export function workoutHeartRate(samples: Sample[], startMs: number, endMs: number): WorkoutHeartRate {
  const warnings: string[] = [];
  const during = samples.filter((s) => s.ms >= startMs && s.ms <= endMs);
  const result: WorkoutHeartRate = { samplesInWorkout: during.length, warnings };

  if (during.length > 0) {
    const values = during.map((s) => s.value);
    result.avgHeartRate = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    result.maxHeartRate = Math.round(Math.max(...values));
  } else {
    warnings.push('No heart rate samples during the workout');
  }

  // From: last reading in the final 90 s of the workout, else the first one in the 30 s after it
  const beforeEnd = samples.filter((s) => s.ms <= endMs && s.ms >= endMs - 90_000);
  const afterEnd = samples.filter((s) => s.ms > endMs && s.ms <= endMs + 30_000);
  const from = beforeEnd.length ? beforeEnd[beforeEnd.length - 1] : afterEnd[0];

  // To: the reading closest to 2 minutes after the end (within 45 s)
  const target = endMs + 120_000;
  const near = samples
    .filter((s) => Math.abs(s.ms - target) <= 45_000)
    .sort((a, b) => Math.abs(a.ms - target) - Math.abs(b.ms - target));
  const to = near[0];

  if (from && to && to.ms > from.ms) {
    result.recoveryFromHeartRate = Math.round(from.value);
    result.recoveryToHeartRate = Math.round(to.value);
  } else if (!to) {
    warnings.push('No heart rate reading about 2 minutes after the workout ended; run the shortcut at least 3 minutes after ending the workout');
  } else {
    warnings.push('No heart rate reading at the end of the workout');
  }
  return result;
}

export function localDateOf(isoText: unknown): string | null {
  return typeof isoText === 'string' ? parseIso(isoText)?.localDate ?? null : null;
}

export function epochOf(isoText: unknown): number | null {
  return typeof isoText === 'string' ? parseIso(isoText)?.ms ?? null : null;
}

export { parseNumber };

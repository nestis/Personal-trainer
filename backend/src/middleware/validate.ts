import { Request, Response, NextFunction } from 'express';
import { recoveryDrop } from '../utils/formulas';

const MAX_STRING_LENGTH = 500;
const MAX_EXERCISES = 20;
const MAX_SETS_PER_EXERCISE = 20;

function isValidDateString(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isString(s: unknown, maxLen = MAX_STRING_LENGTH): s is string {
  return typeof s === 'string' && s.length > 0 && s.length <= maxLen;
}

// Free text that may be empty (notes, WOD description) but is length-capped
function isText(s: unknown, maxLen: number): s is string {
  return typeof s === 'string' && s.length <= maxLen;
}

function isPositiveNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function isNonNegativeNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

const MAX_HEART_RATE = 250;

const isBpm = (n: unknown): boolean =>
  typeof n === 'number' && Number.isInteger(n) && n >= 30 && n <= MAX_HEART_RATE;

/**
 * RPE: 1-10 in steps of 0.5. Recovery: "from" and "to" are heart rates (bpm);
 * the drop (recoveryHeartRate2min) is computed from them, but may also be sent
 * on its own (e.g. by older clients) as a whole number of bpm.
 */
export function wodExtrasError(rpe: unknown, recovery: unknown, from?: unknown, to?: unknown): string | null {
  if (rpe !== undefined) {
    if (typeof rpe !== 'number' || !Number.isFinite(rpe) || rpe < 1 || rpe > 10 || (rpe * 2) % 1 !== 0) {
      return 'rpe must be a number from 1 to 10 in steps of 0.5';
    }
  }
  if (from !== undefined && !isBpm(from)) {
    return `recoveryFromHeartRate must be a whole number of bpm (30-${MAX_HEART_RATE})`;
  }
  if (to !== undefined && !isBpm(to)) {
    return `recoveryToHeartRate must be a whole number of bpm (30-${MAX_HEART_RATE})`;
  }
  if (recovery !== undefined) {
    if (typeof recovery !== 'number' || !Number.isInteger(recovery) || Math.abs(recovery) > MAX_HEART_RATE) {
      return 'recoveryHeartRate2min must be a whole number of bpm (the drop in heart rate)';
    }
  }
  return null;
}

/** Returns the WOD with recoveryHeartRate2min = from - to when both are present */
export function withRecovery<T extends { recoveryFromHeartRate?: unknown; recoveryToHeartRate?: unknown }>(wod: T): T {
  const drop = recoveryDrop(wod.recoveryFromHeartRate, wod.recoveryToHeartRate);
  return drop === undefined ? wod : { ...wod, recoveryHeartRate2min: drop };
}

function validateExerciseSet(set: unknown): string | null {
  if (typeof set !== 'object' || set === null) return 'set must be an object';
  const s = set as Record<string, unknown>;
  if (typeof s.setNumber !== 'number') return 'setNumber must be a number';
  if (!isNonNegativeNumber(s.reps)) return 'reps must be a non-negative number';
  if (!isNonNegativeNumber(s.kilos)) return 'kilos must be a non-negative number';
  if (typeof s.completed !== 'boolean') return 'completed must be a boolean';
  return null;
}

function validateExercise(ex: unknown): string | null {
  if (typeof ex !== 'object' || ex === null) return 'exercise must be an object';
  const e = ex as Record<string, unknown>;
  if (!isString(e.id)) return 'exercise.id must be a non-empty string';
  if (!isString(e.name)) return 'exercise.name must be a non-empty string';
  if (!Array.isArray(e.sets)) return 'exercise.sets must be an array';
  if (e.sets.length > MAX_SETS_PER_EXERCISE) return `exercise.sets exceeds max of ${MAX_SETS_PER_EXERCISE}`;
  for (const set of e.sets) {
    const err = validateExerciseSet(set);
    if (err) return err;
  }
  return null;
}

function validateWod(wod: unknown): string | null {
  if (typeof wod !== 'object' || wod === null) return 'wod must be an object';
  const w = wod as Record<string, unknown>;
  if (!isText(w.description, 2000)) return 'wod.description must be a string (max 2000 chars)';
  if (w.name !== undefined && !isString(w.name)) return 'wod.name must be a string';
  if (w.timeSeconds !== undefined && !isPositiveNumber(w.timeSeconds)) return 'wod.timeSeconds must be positive';
  if (w.totalReps !== undefined && !isPositiveNumber(w.totalReps)) return 'wod.totalReps must be positive';
  if (w.avgHeartRate !== undefined && !isPositiveNumber(w.avgHeartRate)) return 'wod.avgHeartRate must be positive';
  if (w.maxHeartRate !== undefined && !isPositiveNumber(w.maxHeartRate)) return 'wod.maxHeartRate must be positive';
  const extras = wodExtrasError(w.rpe, w.recoveryHeartRate2min, w.recoveryFromHeartRate, w.recoveryToHeartRate);
  if (extras) return `wod.${extras}`;
  return null;
}

export function validateCreateSession(req: Request, res: Response, next: NextFunction): void {
  const { date, strength, wod, notes } = req.body;

  if (!isValidDateString(date)) {
    res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
    return;
  }
  if (!Array.isArray(strength)) {
    res.status(400).json({ error: 'strength must be an array' });
    return;
  }
  if (strength.length > MAX_EXERCISES) {
    res.status(400).json({ error: `strength exceeds max of ${MAX_EXERCISES} exercises` });
    return;
  }
  for (const ex of strength) {
    const err = validateExercise(ex);
    if (err) { res.status(400).json({ error: err }); return; }
  }

  const wodErr = validateWod(wod);
  if (wodErr) { res.status(400).json({ error: wodErr }); return; }

  if (notes !== undefined && !isText(notes, 2000)) {
    res.status(400).json({ error: 'notes must be a string (max 2000 chars)' });
    return;
  }

  // Strip body to only allowed fields
  req.body = { date, strength, wod: withRecovery(wod), ...(notes !== undefined && { notes }) };
  next();
}

export function validateUpdateSession(req: Request, res: Response, next: NextFunction): void {
  const { date, status, strength, wod, notes } = req.body;

  if (date !== undefined && !isValidDateString(date)) {
    res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
    return;
  }
  if (status !== undefined && status !== 'planned' && status !== 'completed' && status !== 'not_completed') {
    res.status(400).json({ error: 'status must be "planned", "completed" or "not_completed"' });
    return;
  }
  if (strength !== undefined) {
    if (!Array.isArray(strength) || strength.length > MAX_EXERCISES) {
      res.status(400).json({ error: 'strength must be an array with max 20 exercises' });
      return;
    }
    for (const ex of strength) {
      const err = validateExercise(ex);
      if (err) { res.status(400).json({ error: err }); return; }
    }
  }
  if (wod !== undefined) {
    const wodErr = validateWod(wod);
    if (wodErr) { res.status(400).json({ error: wodErr }); return; }
  }
  if (notes !== undefined && !isText(notes, 2000)) {
    res.status(400).json({ error: 'notes must be a string (max 2000 chars)' });
    return;
  }

  // Strip to allowed fields only
  req.body = {
    ...(date !== undefined && { date }),
    ...(status !== undefined && { status }),
    ...(strength !== undefined && { strength }),
    ...(wod !== undefined && { wod: withRecovery(wod) }),
    ...(notes !== undefined && { notes }),
  };
  next();
}

import { Request, Response, NextFunction } from 'express';

const MAX_STRING_LENGTH = 500;
const MAX_EXERCISES = 20;
const MAX_SETS_PER_EXERCISE = 20;

function isValidDateString(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isString(s: unknown, maxLen = MAX_STRING_LENGTH): s is string {
  return typeof s === 'string' && s.length > 0 && s.length <= maxLen;
}

function isPositiveNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function isNonNegativeNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
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
  if (!isString(w.description, 2000)) return 'wod.description must be a non-empty string (max 2000 chars)';
  if (w.name !== undefined && !isString(w.name)) return 'wod.name must be a string';
  if (w.timeSeconds !== undefined && !isPositiveNumber(w.timeSeconds)) return 'wod.timeSeconds must be positive';
  if (w.totalReps !== undefined && !isPositiveNumber(w.totalReps)) return 'wod.totalReps must be positive';
  if (w.avgHeartRate !== undefined && !isPositiveNumber(w.avgHeartRate)) return 'wod.avgHeartRate must be positive';
  if (w.maxHeartRate !== undefined && !isPositiveNumber(w.maxHeartRate)) return 'wod.maxHeartRate must be positive';
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

  if (notes !== undefined && !isString(notes, 2000)) {
    res.status(400).json({ error: 'notes must be a string (max 2000 chars)' });
    return;
  }

  // Strip body to only allowed fields
  req.body = { date, strength, wod, ...(notes !== undefined && { notes }) };
  next();
}

export function validateUpdateSession(req: Request, res: Response, next: NextFunction): void {
  const { date, status, strength, wod, notes } = req.body;

  if (date !== undefined && !isValidDateString(date)) {
    res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
    return;
  }
  if (status !== undefined && status !== 'planned' && status !== 'completed') {
    res.status(400).json({ error: 'status must be "planned" or "completed"' });
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
  if (notes !== undefined && !isString(notes, 2000)) {
    res.status(400).json({ error: 'notes must be a string (max 2000 chars)' });
    return;
  }

  // Strip to allowed fields only
  req.body = {
    ...(date !== undefined && { date }),
    ...(status !== undefined && { status }),
    ...(strength !== undefined && { strength }),
    ...(wod !== undefined && { wod }),
    ...(notes !== undefined && { notes }),
  };
  next();
}

import { Router, Request, Response } from 'express';
import { importDaily, importWorkout, HealthImportError } from '../services/health';

// Apple Health imports, called by iPhone Shortcuts (see docs/apple-health-shortcuts.md)
const router = Router();

function fail(res: Response, error: unknown, what: string) {
  if (error instanceof HealthImportError) {
    res.status(error.status).json({ error: error.message, ...(error.details ? { details: error.details } : {}) });
    return;
  }
  console.error(`Error importing ${what}:`, error);
  res.status(500).json({ error: `Failed to import ${what}` });
}

// Morning: the night's HRV readings, resting heart rate and sleep -> that day's HRV entry
router.post('/daily', async (req: Request, res: Response) => {
  try {
    res.json(await importDaily(req.userId!, req.body || {}));
  } catch (error) {
    fail(res, error, 'daily health data');
  }
});

// After a workout: heart rate samples -> the session's WOD avg / max HR and 2-minute recovery
router.post('/workout', async (req: Request, res: Response) => {
  try {
    res.json(await importWorkout(req.userId!, req.body || {}));
  } catch (error) {
    fail(res, error, 'workout heart rate');
  }
});

export default router;

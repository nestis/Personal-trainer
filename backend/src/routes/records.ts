import { Router, Request, Response } from 'express';
import { getStrengthPRs, getWodRecords, getAggregatedStrength, getWodRecovery } from '../services/records';

const router = Router();

// Get aggregated strength records (sessions + manual, grouped by exercise)
router.get('/strength/aggregated', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const data = await getAggregatedStrength(userId);
    res.json(data);
  } catch (error) {
    console.error('Error getting aggregated strength:', error);
    res.status(500).json({ error: 'Failed to get aggregated strength records' });
  }
});

// Get all strength personal records
router.get('/strength', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const prs = await getStrengthPRs(userId);
    res.json(prs);
  } catch (error) {
    console.error('Error getting strength PRs:', error);
    res.status(500).json({ error: 'Failed to get strength records' });
  }
});

// Get all WOD time records
router.get('/wods', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const records = await getWodRecords(userId);
    res.json(records);
  } catch (error) {
    console.error('Error getting WOD records:', error);
    res.status(500).json({ error: 'Failed to get WOD records' });
  }
});

// WODs with a measured 2-minute heart-rate recovery (sessions + manual), oldest first
router.get('/wod-recovery', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    res.json(await getWodRecovery(userId));
  } catch (error) {
    console.error('Error getting WOD recovery:', error);
    res.status(500).json({ error: 'Failed to get WOD recovery' });
  }
});

export default router;

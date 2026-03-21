import { Router, Request, Response } from 'express';
import { getStrengthPRs, getWodRecords } from '../services/records';

const router = Router();

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

export default router;

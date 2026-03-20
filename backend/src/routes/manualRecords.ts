import { Router, Request, Response } from 'express';
import {
  createManualStrengthPR,
  createManualWodRecord,
  deleteManualRecord,
  listManualRecords,
} from '../services/manualRecords';

const router = Router();

// List manual records (optional ?type=strength|wod)
router.get('/', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as 'strength' | 'wod' | undefined;
    const records = await listManualRecords(type);
    res.json(records);
  } catch (error) {
    console.error('Error listing manual records:', error);
    res.status(500).json({ error: 'Failed to list manual records' });
  }
});

// Create a manual strength PR
router.post('/strength', async (req: Request, res: Response) => {
  try {
    const { exercise, reps, kilos, date, notes } = req.body;
    if (!exercise || !reps || !kilos || !date) {
      res.status(400).json({ error: 'exercise, reps, kilos, and date are required' });
      return;
    }
    const record = await createManualStrengthPR({ exercise, reps, kilos, date, notes });
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating manual strength PR:', error);
    res.status(500).json({ error: 'Failed to create strength PR' });
  }
});

// Create a manual WOD record
router.post('/wod', async (req: Request, res: Response) => {
  try {
    const { name, description, timeSeconds, totalReps, avgHeartRate, maxHeartRate, date, notes } = req.body;
    if (!name || !timeSeconds || !date) {
      res.status(400).json({ error: 'name, timeSeconds, and date are required' });
      return;
    }
    const record = await createManualWodRecord({
      name, description, timeSeconds, totalReps, avgHeartRate, maxHeartRate, date, notes,
    });
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating manual WOD record:', error);
    res.status(500).json({ error: 'Failed to create WOD record' });
  }
});

// Delete a manual record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteManualRecord(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting manual record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

export default router;

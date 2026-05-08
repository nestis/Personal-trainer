import { Router, Request, Response } from 'express';
import {
  createHrvRecord,
  updateHrvRecord,
  deleteHrvRecord,
  listHrvRecords,
} from '../services/hrv';

const router = Router();

// List HRV records with optional date filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate } = req.query;
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (startDate && !dateRe.test(startDate as string)) {
      res.status(400).json({ error: 'startDate must be YYYY-MM-DD' });
      return;
    }
    if (endDate && !dateRe.test(endDate as string)) {
      res.status(400).json({ error: 'endDate must be YYYY-MM-DD' });
      return;
    }
    const records = await listHrvRecords(
      userId,
      startDate as string | undefined,
      endDate as string | undefined,
    );
    res.json(records);
  } catch (error) {
    console.error('Error listing HRV records:', error);
    res.status(500).json({ error: 'Failed to list HRV records' });
  }
});

// Create HRV record
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { date, min, max, avg, notes } = req.body;

    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
      return;
    }
    if (typeof min !== 'number' || min < 0) {
      res.status(400).json({ error: 'min must be a non-negative number' });
      return;
    }
    if (typeof max !== 'number' || max < 0) {
      res.status(400).json({ error: 'max must be a non-negative number' });
      return;
    }
    if (typeof avg !== 'number' || avg < 0) {
      res.status(400).json({ error: 'avg must be a non-negative number' });
      return;
    }
    if (min > max) {
      res.status(400).json({ error: 'min cannot be greater than max' });
      return;
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
      res.status(400).json({ error: 'notes must be a string (max 500 chars)' });
      return;
    }

    const record = await createHrvRecord(userId, { date, min, max, avg, notes });
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating HRV record:', error);
    res.status(500).json({ error: 'Failed to create HRV record' });
  }
});

// Update HRV record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { date, min, max, avg, notes } = req.body;

    if (date !== undefined && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
      return;
    }
    if (min !== undefined && (typeof min !== 'number' || min < 0)) {
      res.status(400).json({ error: 'min must be a non-negative number' });
      return;
    }
    if (max !== undefined && (typeof max !== 'number' || max < 0)) {
      res.status(400).json({ error: 'max must be a non-negative number' });
      return;
    }
    if (avg !== undefined && (typeof avg !== 'number' || avg < 0)) {
      res.status(400).json({ error: 'avg must be a non-negative number' });
      return;
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
      res.status(400).json({ error: 'notes must be a string (max 500 chars)' });
      return;
    }

    const updated = await updateHrvRecord(userId, req.params.id, {
      ...(date !== undefined && { date }),
      ...(min !== undefined && { min }),
      ...(max !== undefined && { max }),
      ...(avg !== undefined && { avg }),
      ...(notes !== undefined && { notes }),
    });
    if (!updated) {
      res.status(404).json({ error: 'HRV record not found' });
      return;
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating HRV record:', error);
    res.status(500).json({ error: 'Failed to update HRV record' });
  }
});

// Delete HRV record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const deleted = await deleteHrvRecord(userId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'HRV record not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting HRV record:', error);
    res.status(500).json({ error: 'Failed to delete HRV record' });
  }
});

export default router;

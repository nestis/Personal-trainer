import { Router, Request, Response } from 'express';
import {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  listSessions,
} from '../services/dynamodb';

const router = Router();

// List sessions with optional date filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { startDate, endDate } = req.query;
    const sessions = await listSessions(
      userId,
      startDate as string | undefined,
      endDate as string | undefined
    );
    res.json(sessions);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// Get a single session
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const session = await getSession(userId, req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Create a new session (planned)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { date, strength, wod } = req.body;
    if (!date || !strength || !wod) {
      res.status(400).json({ error: 'date, strength, and wod are required' });
      return;
    }
    const session = await createSession(userId, req.body);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update a session (modify plan or log actuals)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { date, status, strength, wod, notes } = req.body;
    const sanitizedInput = {
      ...(date !== undefined && { date }),
      ...(status !== undefined && { status }),
      ...(strength !== undefined && { strength }),
      ...(wod !== undefined && { wod }),
      ...(notes !== undefined && { notes }),
    };
    const session = await updateSession(userId, req.params.id, sanitizedInput);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete a session
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const deleted = await deleteSession(userId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;

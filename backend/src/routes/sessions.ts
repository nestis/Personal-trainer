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
    const { startDate, endDate } = req.query;
    const sessions = await listSessions(
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
    const session = await getSession(req.params.id);
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
    const session = await createSession(req.body);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update a session (modify plan or log actuals)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const session = await updateSession(req.params.id, req.body);
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
    const deleted = await deleteSession(req.params.id);
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

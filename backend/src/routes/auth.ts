import { Router, Request, Response } from 'express';
import { register, login } from '../services/users';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, inviteCode } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    const result = await register(username, password, inviteCode || '');
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    const result = await login(username, password);
    res.json(result);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

export default router;

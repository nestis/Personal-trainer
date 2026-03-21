import { Request, Response, NextFunction } from 'express';

const OWNER_USER_ID = 'owner';
const APP_PASSWORD = process.env.APP_PASSWORD || 'changeme';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function passwordAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: missing password' });
    return;
  }

  const password = header.slice(7);

  if (password !== APP_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized: invalid password' });
    return;
  }

  req.userId = OWNER_USER_ID;
  next();
}

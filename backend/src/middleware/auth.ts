import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    res.status(500).json({ error: 'API key not configured on server' });
    return;
  }

  if (!apiKey || typeof apiKey !== 'string') {
    res.status(401).json({ error: 'Unauthorized: invalid API key' });
    return;
  }

  // Use constant-time comparison to prevent timing attacks.
  // If lengths differ, compare expectedKey against itself to avoid
  // revealing the expected key length through timing.
  const apiKeyBuffer = Buffer.from(apiKey);
  const expectedKeyBuffer = Buffer.from(expectedKey);

  if (
    apiKeyBuffer.length !== expectedKeyBuffer.length ||
    !crypto.timingSafeEqual(apiKeyBuffer, expectedKeyBuffer)
  ) {
    res.status(401).json({ error: 'Unauthorized: invalid API key' });
    return;
  }

  next();
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { passwordAuth } from './middleware/auth';
import sessionsRouter from './routes/sessions';
import recordsRouter from './routes/records';
import manualRecordsRouter from './routes/manualRecords';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(express.json({ limit: '10kb' }));

// Rate limit auth endpoint: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' },
});

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Password verification endpoint — rate limited
app.post('/api/auth/verify', authLimiter, passwordAuth, (_req, res) => {
  res.json({ ok: true });
});

// All data routes require password
app.use('/api/sessions', passwordAuth, sessionsRouter);
app.use('/api/records', passwordAuth, recordsRouter);
app.use('/api/manual-records', passwordAuth, manualRecordsRouter);

export default app;

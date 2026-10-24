import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { passwordAuth } from './middleware/auth';
import sessionsRouter from './routes/sessions';
import recordsRouter from './routes/records';
import manualRecordsRouter from './routes/manualRecords';
import hrvRouter from './routes/hrv';
import healthRouter from './routes/health';

const app = express();

// Behind API Gateway / CloudFront — trust the immediate proxy
// so express-rate-limit uses X-Forwarded-For for client IP
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
// Apple Health imports carry many samples (a workout's heart rate can be ~30 KB),
// so they get a larger body limit; parsed here, the 10 KB parser below skips them
app.use('/api/health', express.json({ limit: '512kb' }));
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
app.use('/api/hrv', passwordAuth, hrvRouter);
app.use('/api/health', passwordAuth, healthRouter);

export default app;

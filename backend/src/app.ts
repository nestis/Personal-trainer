import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { jwtAuth } from './middleware/auth';
import authRouter from './routes/auth';
import sessionsRouter from './routes/sessions';
import recordsRouter from './routes/records';
import manualRecordsRouter from './routes/manualRecords';
import hrvRouter from './routes/hrv';

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
app.use(express.json({ limit: '10kb' }));

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

// Auth endpoints — rate limited, no JWT required
app.use('/api/auth', authLimiter, authRouter);

// All data routes require JWT
app.use('/api/sessions', jwtAuth, sessionsRouter);
app.use('/api/records', jwtAuth, recordsRouter);
app.use('/api/manual-records', jwtAuth, manualRecordsRouter);
app.use('/api/hrv', jwtAuth, hrvRouter);

export default app;

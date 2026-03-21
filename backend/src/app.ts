import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { passwordAuth } from './middleware/auth';
import sessionsRouter from './routes/sessions';
import recordsRouter from './routes/records';
import manualRecordsRouter from './routes/manualRecords';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(express.json({ limit: '100kb' }));

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Password verification endpoint
app.post('/api/auth/verify', passwordAuth, (_req, res) => {
  res.json({ ok: true });
});

// All data routes require password
app.use('/api/sessions', passwordAuth, sessionsRouter);
app.use('/api/records', passwordAuth, recordsRouter);
app.use('/api/manual-records', passwordAuth, manualRecordsRouter);

export default app;

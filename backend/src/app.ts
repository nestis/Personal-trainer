import express from 'express';
import cors from 'cors';
import { jwtAuth } from './middleware/auth';
import sessionsRouter from './routes/sessions';
import recordsRouter from './routes/records';
import manualRecordsRouter from './routes/manualRecords';
import authRouter from './routes/auth';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '100kb' }));

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no auth required)
app.use('/api/auth', authRouter);

// All data routes require JWT
app.use('/api/sessions', jwtAuth, sessionsRouter);
app.use('/api/records', jwtAuth, recordsRouter);
app.use('/api/manual-records', jwtAuth, manualRecordsRouter);

export default app;

import express from 'express';
import cors from 'cors';
import { apiKeyAuth } from './middleware/auth';
import sessionsRouter from './routes/sessions';
import recordsRouter from './routes/records';
import manualRecordsRouter from './routes/manualRecords';

const app = express();

// CORS: Using origin: true reflects the request origin back in the
// Access-Control-Allow-Origin header. This is acceptable for a single-user
// app behind CloudFront where the domain is dynamic.
app.use(cors({ origin: true }));
app.use(express.json({ limit: '100kb' }));

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// All routes require API key
app.use('/api/sessions', apiKeyAuth, sessionsRouter);
app.use('/api/records', apiKeyAuth, recordsRouter);
app.use('/api/manual-records', apiKeyAuth, manualRecordsRouter);

export default app;

import express from 'express';
import cors from 'cors';
import { apiKeyAuth } from './middleware/auth';
import sessionsRouter from './routes/sessions';
import recordsRouter from './routes/records';

const app = express();

app.use(cors());
app.use(express.json());

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// All routes require API key
app.use('/api/sessions', apiKeyAuth, sessionsRouter);
app.use('/api/records', apiKeyAuth, recordsRouter);

export default app;

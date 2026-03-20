import express from 'express';
import cors from 'cors';
import { apiKeyAuth } from './middleware/auth';
import sessionsRouter from './routes/sessions';

const app = express();

app.use(cors());
app.use(express.json());

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// All session routes require API key
app.use('/api/sessions', apiKeyAuth, sessionsRouter);

export default app;

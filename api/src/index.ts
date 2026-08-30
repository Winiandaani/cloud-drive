import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAuth, AuthedRequest } from './middleware/auth';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ userId: req.userId });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
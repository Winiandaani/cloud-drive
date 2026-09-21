import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAuth, AuthedRequest } from './middleware/auth';
import foldersRouter from './routes/folders';
import filesRouter from './routes/files';
import sharesRouter from './routes/shares';
import linkSharesRouter from './routes/linkShares';
import publicLinkRouter from './routes/publicLink';
import searchRouter from './routes/search';
import starsRouter from './routes/stars';
import trashRouter from './routes/trash';
import sharedWithMeRouter from './routes/sharedWithMe';
import recentRouter from './routes/recent';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/search', searchRouter);
app.use('/api/recent', recentRouter);
app.use('/api/shared-with-me', sharedWithMeRouter);
app.use('/api/stars', starsRouter);
app.use('/api/trash', trashRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ userId: req.userId });
});

app.use('/api/folders', foldersRouter);
app.use('/api/files', filesRouter);
app.use('/api/shares', sharesRouter);
app.use('/api/link-shares', linkSharesRouter);
app.use('/api/link', publicLinkRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
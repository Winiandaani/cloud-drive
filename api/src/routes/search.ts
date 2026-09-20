import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// GET /api/search?q=...
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const q = (req.query.q as string) || '';

  if (!q.trim()) {
    return res.json({ folders: [], files: [] });
  }

  const { data: folders, error: foldersError } = await supabaseAdmin
    .from('folders')
    .select('*')
    .eq('owner_id', req.userId)
    .eq('is_deleted', false)
    .ilike('name', `%${q}%`);

  if (foldersError) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: foldersError.message } });
  }

  const { data: files, error: filesError } = await supabaseAdmin
    .from('files')
    .select('*')
    .eq('owner_id', req.userId)
    .eq('is_deleted', false)
    .ilike('name', `%${q}%`);

  if (filesError) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: filesError.message } });
  }

  res.json({ folders, files });
});

export default router;
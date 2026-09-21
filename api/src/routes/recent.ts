import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// GET /api/recent — files sorted by upload date, newest first
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const { data: files, error } = await supabaseAdmin
    .from('files')
    .select('*')
    .eq('owner_id', req.userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.json({ files });
});

export default router;
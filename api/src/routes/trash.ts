import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// GET /api/trash — list deleted items
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const { data: folders, error: foldersError } = await supabaseAdmin
    .from('folders')
    .select('*')
    .eq('owner_id', req.userId)
    .eq('is_deleted', true);

  if (foldersError) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: foldersError.message } });
  }

  const { data: files, error: filesError } = await supabaseAdmin
    .from('files')
    .select('*')
    .eq('owner_id', req.userId)
    .eq('is_deleted', true);

  if (filesError) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: filesError.message } });
  }

  res.json({ folders, files });
});

// POST /api/trash/restore — restore a deleted item
router.post('/restore', requireAuth, async (req: AuthedRequest, res) => {
  const { resourceType, resourceId } = req.body;

  const table = resourceType === 'folder' ? 'folders' : 'files';

  const { error } = await supabaseAdmin
    .from(table)
    .update({ is_deleted: false })
    .eq('id', resourceId)
    .eq('owner_id', req.userId);

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.json({ restored: true });
});

// DELETE /api/trash/:resourceType/:resourceId — permanently delete
router.delete('/:resourceType/:resourceId', requireAuth, async (req: AuthedRequest, res) => {
  const { resourceType, resourceId } = req.params;
  const table = resourceType === 'folder' ? 'folders' : 'files';

  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq('id', resourceId)
    .eq('owner_id', req.userId)
    .eq('is_deleted', true); // safety: only permanently delete already-soft-deleted items

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.status(204).send();
});

export default router;
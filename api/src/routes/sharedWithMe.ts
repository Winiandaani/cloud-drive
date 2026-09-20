import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// GET /api/shared-with-me — list files/folders shared with the current user
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const { data: shareRows, error: sharesError } = await supabaseAdmin
    .from('shares')
    .select('*')
    .eq('grantee_user_id', req.userId);

  if (sharesError) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: sharesError.message } });
  }

  const fileIds = shareRows.filter((s) => s.resource_type === 'file').map((s) => s.resource_id);
  const folderIds = shareRows.filter((s) => s.resource_type === 'folder').map((s) => s.resource_id);

  const { data: files, error: filesError } = fileIds.length
    ? await supabaseAdmin.from('files').select('*').in('id', fileIds).eq('is_deleted', false)
    : { data: [], error: null };

  if (filesError) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: filesError.message } });
  }

  const { data: folders, error: foldersError } = folderIds.length
    ? await supabaseAdmin.from('folders').select('*').in('id', folderIds).eq('is_deleted', false)
    : { data: [], error: null };

  if (foldersError) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: foldersError.message } });
  }

  res.json({ files: files || [], folders: folders || [] });
});

export default router;
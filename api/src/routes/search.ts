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

  // Get IDs of resources shared with this user
  const { data: shareRows, error: sharesError } = await supabaseAdmin
    .from('shares')
    .select('resource_type, resource_id')
    .eq('grantee_user_id', req.userId);

  if (sharesError) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: sharesError.message } });
  }

  const sharedFolderIds = shareRows.filter((s) => s.resource_type === 'folder').map((s) => s.resource_id);
  const sharedFileIds = shareRows.filter((s) => s.resource_type === 'file').map((s) => s.resource_id);

  // Search own folders
  const { data: ownFolders, error: ownFoldersError } = await supabaseAdmin
    .from('folders')
    .select('*')
    .eq('owner_id', req.userId)
    .eq('is_deleted', false)
    .ilike('name', `%${q}%`);

  if (ownFoldersError) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: ownFoldersError.message } });
  }

  // Search shared folders
  const { data: sharedFoldersFound } = sharedFolderIds.length
    ? await supabaseAdmin
        .from('folders')
        .select('*')
        .in('id', sharedFolderIds)
        .eq('is_deleted', false)
        .ilike('name', `%${q}%`)
    : { data: [] };

  // Search own files
  const { data: ownFiles, error: ownFilesError } = await supabaseAdmin
    .from('files')
    .select('*')
    .eq('owner_id', req.userId)
    .eq('is_deleted', false)
    .ilike('name', `%${q}%`);

  if (ownFilesError) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: ownFilesError.message } });
  }

  // Search shared files
  const { data: sharedFilesFound } = sharedFileIds.length
    ? await supabaseAdmin
        .from('files')
        .select('*')
        .in('id', sharedFileIds)
        .eq('is_deleted', false)
        .ilike('name', `%${q}%`)
    : { data: [] };

  const folders = [...(ownFolders || []), ...(sharedFoldersFound || [])];
  const files = [...(ownFiles || []), ...(sharedFilesFound || [])];

  // Resolve folder names for each file's location
  const folderIds = [...new Set(files.map((f) => f.folder_id).filter(Boolean))];

  const { data: locationFolders } = folderIds.length
    ? await supabaseAdmin.from('folders').select('id, name').in('id', folderIds)
    : { data: [] };

  const folderNameMap = new Map((locationFolders || []).map((f) => [f.id, f.name]));

  const filesWithLocation = files.map((f) => ({
    ...f,
    folder_name: f.folder_id ? folderNameMap.get(f.folder_id) || null : null,
  }));

  res.json({ folders, files: filesWithLocation });
});

export default router;
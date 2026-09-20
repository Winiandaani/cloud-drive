import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const { resourceType, resourceId } = req.body;

  const { error } = await supabaseAdmin
    .from('stars')
    .insert({
      user_id: req.userId,
      resource_type: resourceType,
      resource_id: resourceId,
    });

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.status(201).json({ starred: true });
});

router.delete('/', requireAuth, async (req: AuthedRequest, res) => {
  const { resourceType, resourceId } = req.body;

  const { error } = await supabaseAdmin
    .from('stars')
    .delete()
    .eq('user_id', req.userId)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId);

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.status(204).send();
});

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { data: starRows, error: starsError } = await supabaseAdmin
      .from('stars')
      .select('*')
      .eq('user_id', req.userId);

    if (starsError) {
      console.error('STARS FETCH ERROR:', starsError);
      return res.status(500).json({ error: { code: 'DB_ERROR', message: starsError.message } });
    }

    const fileIds = starRows.filter((s) => s.resource_type === 'file').map((s) => s.resource_id);
    const folderIds = starRows.filter((s) => s.resource_type === 'folder').map((s) => s.resource_id);

    const { data: files, error: filesError } = fileIds.length
      ? await supabaseAdmin.from('files').select('*').in('id', fileIds).eq('is_deleted', false)
      : { data: [], error: null };

    if (filesError) {
      console.error('STARRED FILES FETCH ERROR:', filesError);
      return res.status(500).json({ error: { code: 'DB_ERROR', message: filesError.message } });
    }

    const { data: folders, error: foldersError } = folderIds.length
      ? await supabaseAdmin.from('folders').select('*').in('id', folderIds).eq('is_deleted', false)
      : { data: [], error: null };

    if (foldersError) {
      console.error('STARRED FOLDERS FETCH ERROR:', foldersError);
      return res.status(500).json({ error: { code: 'DB_ERROR', message: foldersError.message } });
    }

    res.json({ files: files || [], folders: folders || [] });
  } catch (err) {
    console.error('STARS ROUTE CRASHED:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: String(err) } });
  }
});

export default router;
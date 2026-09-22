import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// POST /api/folders — create a folder
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const { name, parentId } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name is required' } });
  }

  const { data, error } = await supabaseAdmin
    .from('folders')
    .insert({
      name,
      owner_id: req.userId,
      parent_id: parentId || null,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.status(201).json({ folder: data });
});

// GET /api/folders/:id — get folder contents (or root if id is "root")
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const parentId = id === 'root' ? null : id;

    let foldersQuery = supabaseAdmin
      .from('folders')
      .select('*')
      .eq('owner_id', req.userId)
      .eq('is_deleted', false);

    foldersQuery = parentId === null
      ? foldersQuery.is('parent_id', null)
      : foldersQuery.eq('parent_id', parentId);

    const { data: folders, error: foldersError } = await foldersQuery;

    if (foldersError) {
      console.error('FOLDERS FETCH ERROR:', foldersError);
      return res.status(500).json({ error: { code: 'DB_ERROR', message: foldersError.message } });
    }

    let filesQuery = supabaseAdmin
      .from('files')
      .select('*')
      .eq('owner_id', req.userId)
      .eq('is_deleted', false);

    filesQuery = parentId === null
      ? filesQuery.is('folder_id', null)
      : filesQuery.eq('folder_id', parentId);

    const { data: files, error: filesError } = await filesQuery;

    if (filesError) {
      console.error('FILES FETCH ERROR:', filesError);
      return res.status(500).json({ error: { code: 'DB_ERROR', message: filesError.message } });
    }

    res.json({ folders, files });
  } catch (err) {
    console.error('FOLDER ROUTE CRASHED:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: String(err) } });
  }
});

// PATCH /api/folders/:id — rename or move
router.patch('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { name, parentId } = req.body;

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (parentId !== undefined) updates.parent_id = parentId;

  const { data, error } = await supabaseAdmin
    .from('folders')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', req.userId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.json({ folder: data });
});

// DELETE /api/folders/:id — soft delete
router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('folders')
    .update({ is_deleted: true })
    .eq('id', id)
    .eq('owner_id', req.userId);

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.status(204).send();
});

export default router;
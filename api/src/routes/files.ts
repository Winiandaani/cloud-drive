import { Router } from 'express';
import multer from 'multer';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/files/upload
router.post('/upload', requireAuth, upload.single('file'), async (req: AuthedRequest, res) => {
  try {
    const file = req.file;
    const folderId = req.body.folderId === 'null' ? null : req.body.folderId;

    if (!file) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'No file provided' } });
    }

    const storageKey = `${req.userId}/${Date.now()}-${file.originalname}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('drive')
      .upload(storageKey, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      console.error('STORAGE UPLOAD ERROR:', uploadError);
      return res.status(500).json({ error: { code: 'STORAGE_ERROR', message: uploadError.message } });
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('files')
      .insert({
        name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
        storage_key: storageKey,
        owner_id: req.userId,
        folder_id: folderId,
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB INSERT ERROR:', dbError);
      return res.status(500).json({ error: { code: 'DB_ERROR', message: dbError.message } });
    }

    res.status(201).json({ file: data });
  } catch (err) {
    console.error('UPLOAD ROUTE CRASHED:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: String(err) } });
  }
});

router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;

  const { data: file, error } = await supabaseAdmin
    .from('files')
    .select('*')
    .eq('id', id)
    .eq('owner_id', req.userId)
    .single();

  if (error || !file) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found' } });
  }

  await supabaseAdmin
    .from('files')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', id);
  const { data: signedUrlData } = await supabaseAdmin.storage
    .from('drive')
    .createSignedUrl(file.storage_key, 60);

  res.json({ file, signedUrl: signedUrlData?.signedUrl });
});
// PATCH /api/files/:id — rename or move
router.patch('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { name, folderId } = req.body;

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (folderId !== undefined) updates.folder_id = folderId;

  const { data, error } = await supabaseAdmin
    .from('files')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', req.userId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.json({ file: data });
});

// DELETE /api/files/:id — soft delete
router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('files')
    .update({ is_deleted: true })
    .eq('id', id)
    .eq('owner_id', req.userId);

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.status(204).send();
});

export default router;
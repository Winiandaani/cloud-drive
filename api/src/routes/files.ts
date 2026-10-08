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
// POST /api/files/thumbnails — temporary image links for a list of file ids
router.post('/thumbnails', requireAuth, async (req: AuthedRequest, res) => {
  const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (ids.length === 0) return res.json({ urls: {} });

  const { data: rows, error } = await supabaseAdmin
    .from('files')
    .select('id, storage_key, mime_type, owner_id')
    .in('id', ids)
    .eq('is_deleted', false);

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  const { data: shareRows } = await supabaseAdmin
    .from('shares')
    .select('resource_id')
    .eq('resource_type', 'file')
    .eq('grantee_user_id', req.userId)
    .in('resource_id', ids);

  const sharedIds = new Set((shareRows || []).map((s) => s.resource_id));

  const allowed = (rows || []).filter(
    (r) => r.mime_type?.startsWith('image/') && (r.owner_id === req.userId || sharedIds.has(r.id))
  );

  if (allowed.length === 0) return res.json({ urls: {} });

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from('drive')
    .createSignedUrls(allowed.map((r) => r.storage_key), 3600);

  if (signError) {
    return res.status(500).json({ error: { code: 'STORAGE_ERROR', message: signError.message } });
  }

  const urls: Record<string, string> = {};
  for (const r of allowed) {
    const match = (signed || []).find((s) => s.path === r.storage_key);
    if (match?.signedUrl) urls[r.id] = match.signedUrl;
  }

  res.json({ urls });
});

export default router;
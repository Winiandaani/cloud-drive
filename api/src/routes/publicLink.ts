import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

router.get('/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.query;

  const { data: link, error } = await supabaseAdmin
    .from('link_shares')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !link) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Link not found' } });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return res.status(410).json({ error: { code: 'EXPIRED', message: 'This link has expired' } });
  }

  if (link.password_hash) {
    const providedPassword = typeof password === 'string' ? password : '';
    const matches = await bcrypt.compare(providedPassword, link.password_hash);
    if (!matches) {
      return res.status(401).json({ error: { code: 'WRONG_PASSWORD', message: 'Password required or incorrect' } });
    }
  }

  if (link.resource_type === 'file') {
    const { data: file, error: fileError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', link.resource_id)
      .single();

    if (fileError || !file) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    }

    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('drive')
      .createSignedUrl(file.storage_key, 60);

    return res.json({ file, signedUrl: signedUrlData?.signedUrl });
  }

  res.status(400).json({ error: { code: 'UNSUPPORTED', message: 'Folder links not yet supported' } });
});

export default router;
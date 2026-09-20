import { Router } from 'express';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const { resourceType, resourceId, expiresAt, password } = req.body;

  if (!resourceType || !resourceId) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing required fields' } });
  }

  const token = nanoid(24);
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  const { data, error } = await supabaseAdmin
    .from('link_shares')
    .insert({
      resource_type: resourceType,
      resource_id: resourceId,
      token,
      expires_at: expiresAt || null,
      password_hash: passwordHash,
      created_by: req.userId,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.status(201).json({ link: data });
});

router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('link_shares')
    .delete()
    .eq('id', id)
    .eq('created_by', req.userId);

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.status(204).send();
});

export default router;
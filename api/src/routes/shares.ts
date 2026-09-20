import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// POST /api/shares — grant access to a user by email
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const { resourceType, resourceId, granteeEmail, role } = req.body;

  if (!resourceType || !resourceId || !granteeEmail || !role) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing required fields' } });
  }

  // Look up the user by email
  const { data: granteeUser, error: userError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', granteeEmail)
    .single();

  if (userError || !granteeUser) {
    return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'No user with that email' } });
  }

  const { data, error } = await supabaseAdmin
    .from('shares')
    .insert({
      resource_type: resourceType,
      resource_id: resourceId,
      grantee_user_id: granteeUser.id,
      role,
      created_by: req.userId,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.status(201).json({ share: data });
});

// GET /api/shares/:resourceType/:resourceId — list who has access
router.get('/:resourceType/:resourceId', requireAuth, async (req: AuthedRequest, res) => {
  const { resourceType, resourceId } = req.params;

  const { data, error } = await supabaseAdmin
    .from('shares')
    .select('id, role, grantee_user_id, users:grantee_user_id (email, name)')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId);

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.json({ shares: data });
});

// DELETE /api/shares/:id — revoke access
router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('shares')
    .delete()
    .eq('id', id)
    .eq('created_by', req.userId);

  if (error) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }

  res.status(204).send();
});

export default router;
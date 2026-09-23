'use client';

import { useEffect, useState } from 'react';
import { apiCreateShare, apiGetShares, apiDelete, apiCreateLink } from '@/lib/api';

interface ShareDialogProps {
  resourceType: 'file' | 'folder';
  resourceId: string;
  resourceName: string;
  onClose: () => void;
}

interface Share {
  id: string;
  role: string;
  grantee_user_id: string;
  users: { email: string; name: string } | null;
}

export default function ShareDialog({ resourceType, resourceId, resourceName, onClose }: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shares, setShares] = useState<Share[]>([]);
  const [loadingShares, setLoadingShares] = useState(true);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);

  function loadShares() {
    setLoadingShares(true);
    apiGetShares(resourceType, resourceId)
      .then((data) => setShares(data.shares))
      .catch((err) => console.error('Failed to load shares:', err))
      .finally(() => setLoadingShares(false));
  }

  useEffect(() => {
    loadShares();
  }, [resourceType, resourceId]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await apiCreateShare(resourceType, resourceId, email, role);
      setEmail('');
      loadShares();
    } catch (err) {
      setError('Could not share — check the email is a registered user.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(shareId: string) {
    if (!confirm('Remove this person\'s access?')) return;

    try {
      await apiDelete(`/api/shares/${shareId}`);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch (err) {
      console.error('Failed to revoke share:', err);
      alert('Could not revoke access.');
    }
  }

  async function handleGetLink() {
    setCreatingLink(true);
    try {
      const data = await apiCreateLink(resourceType, resourceId);
      const url = `${window.location.origin}/l/${data.link.token}`;
      setLinkUrl(url);
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error('Failed to create link:', err);
      alert('Could not create link.');
    } finally {
      setCreatingLink(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold dark:text-white">Share &quot;{resourceName}&quot;</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">✕</button>
        </div>

        <form onSubmit={handleShare} className="space-y-3">
          {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="someone@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Sharing...' : 'Share'}
          </button>
        </form>

        <div className="mt-5 border-t border-gray-200 pt-4 dark:border-slate-700">
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">People with access</h3>

          {loadingShares ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : shares.length === 0 ? (
            <p className="text-sm text-gray-400">No one else has access yet.</p>
          ) : (
            <ul className="space-y-2">
              {shares.map((share) => (
                <li key={share.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-800 dark:text-slate-200">{share.users?.email ?? 'Unknown user'}</p>
                    <p className="text-xs text-gray-400 capitalize">{share.role}</p>
                  </div>
                  <button
                    onClick={() => handleRevoke(share.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-slate-700">
          <button
            onClick={handleGetLink}
            disabled={creatingLink}
            className="w-full rounded border border-gray-300 p-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {creatingLink ? 'Creating link...' : 'Get shareable link'}
          </button>
          {linkUrl && (
            <p className="mt-2 break-all rounded bg-gray-50 p-2 text-xs text-gray-600">
              Copied to clipboard: {linkUrl}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
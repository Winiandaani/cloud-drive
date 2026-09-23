'use client';

import { useState } from 'react';
import { apiCreateShare } from '@/lib/api';

interface BulkShareItem {
  id: string;
  type: 'file' | 'folder';
}

interface BulkShareDialogProps {
  items: BulkShareItem[];
  onClose: () => void;
}

export default function BulkShareDialog({ items, onClose }: BulkShareDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      for (const item of items) {
        await apiCreateShare(item.type, item.id, email, role);
      }
      setSuccess(true);
    } catch (err) {
      setError('Could not share — check the email is a registered user.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share {items.length} item{items.length > 1 ? 's' : ''}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleShare} className="space-y-3">
          {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
          {success && (
            <p className="rounded bg-green-50 p-2 text-sm text-green-600">
              Shared {items.length} item{items.length > 1 ? 's' : ''} successfully!
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2"
              placeholder="someone@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2"
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
            {submitting ? 'Sharing...' : `Share ${items.length} item${items.length > 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface FileData {
  name: string;
  mime_type: string;
  size_bytes: number;
}

export default function PublicLinkPage() {
  const params = useParams();
  const token = params.token as string;

  const [file, setFile] = useState<FileData | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  async function fetchLink(pw?: string) {
    setLoading(true);
    setError(null);

    try {
      const url = pw
        ? `${API_URL}/api/link/${token}?password=${encodeURIComponent(pw)}`
        : `${API_URL}/api/link/${token}`;

      const res = await fetch(url);
      const data = await res.json();

      if (res.status === 401) {
        setNeedsPassword(true);
        setError(pw ? 'Incorrect password.' : null);
        return;
      }

      if (!res.ok) {
        setError(data.error?.message || 'This link is invalid or has expired.');
        return;
      }

      setFile(data.file);
      setSignedUrl(data.signedUrl);
      setNeedsPassword(false);
    } catch (err) {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLink();
  }, [token]);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchLink(password);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow">
          <h1 className="text-lg font-semibold text-slate-900">Password required</h1>
          {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-300 p-2"
            placeholder="Enter password"
            autoFocus
          />
          <button className="w-full rounded bg-indigo-600 p-2 text-white hover:bg-indigo-700">
            Unlock
          </button>
        </form>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 font-bold text-xl">
          F
        </div>
        <h1 className="mb-1 text-lg font-semibold text-slate-900">{file?.name}</h1>
        <p className="mb-6 text-sm text-slate-400">
          {file ? `${(file.size_bytes / 1024).toFixed(1)} KB` : ''}
        </p>
        {signedUrl ? (
          
            <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-indigo-600 p-3 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Download
          </a>
        ) : null}
      </div>
    </div>
  );
}
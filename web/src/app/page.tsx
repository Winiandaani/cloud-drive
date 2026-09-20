'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import Sidebar from '@/components/Sidebar';
import ShareDialog from '@/components/ShareDialog';
import { apiGet, apiPost, apiUploadFile, apiDelete, apiSearch, apiToggleStar, apiGetStarred, apiGetTrash, apiRestoreItem, apiPermanentDelete, apiGetSharedWithMe } from '@/lib/api';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface FileItem {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
}

export default function HomePage() {
  const { user, loading } = useSession();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sharingFile, setSharingFile] = useState<FileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ folders: Folder[]; files: FileItem[] } | null>(null);
   const [searching, setSearching] = useState(false);
  const [activeView, setActiveView] = useState('drive');
  const [starredFolders, setStarredFolders] = useState<Folder[]>([]);
  const [starredFiles, setStarredFiles] = useState<FileItem[]>([]);
    const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [trashFolders, setTrashFolders] = useState<Folder[]>([]);
    const [trashFiles, setTrashFiles] = useState<FileItem[]>([]);
  const [sharedFolders, setSharedFolders] = useState<Folder[]>([]);
  const [sharedFiles, setSharedFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    if (!user) return;

     apiGet('/api/folders/root')
      .then((data) => {
        setFolders(data.folders);
        setFiles(data.files || []);
      })
      .catch((err) => console.error('Failed to load items:', err))
      .finally(() => setLoadingItems(false));

    apiGetStarred()
      .then((data) => {
        setStarredFolders(data.folders);
        setStarredFiles(data.files);
        const ids = new Set([...data.folders.map((f: Folder) => f.id), ...data.files.map((f: FileItem) => f.id)]);
        setStarredIds(ids);
      })
      .catch((err) => console.error('Failed to load starred items:', err));
  }, [user]);

     useEffect(() => {
    if (activeView !== 'trash') return;

    apiGetTrash()
      .then((data) => {
        setTrashFolders(data.folders);
        setTrashFiles(data.files);
      })
      .catch((err) => console.error('Failed to load trash:', err));
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'shared') return;

    apiGetSharedWithMe()
      .then((data) => {
        setSharedFolders(data.folders);
        setSharedFiles(data.files);
      })
      .catch((err) => console.error('Failed to load shared items:', err));
  }, [activeView]);
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    const timeout = setTimeout(() => {
      apiSearch(searchQuery)
        .then((data) => setSearchResults(data))
        .catch((err) => console.error('Search failed:', err))
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  async function handleNewFolder() {
    const name = prompt('Folder name:');
    if (!name) return;

    try {
      const data = await apiPost('/api/folders', { name, parentId: null });
      setFolders((prev) => [...prev, data.folder]);
    } catch (err) {
      console.error('Failed to create folder:', err);
      alert('Could not create folder.');
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await apiUploadFile(file, null);
      setFiles((prev) => [...prev, data.file]);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleFileClick(file: FileItem) {
    try {
      const data = await apiGet(`/api/files/${file.id}`);
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to get download link:', err);
      alert('Could not open file.');
    }
  }

  async function handleDeleteFile(e: React.MouseEvent, fileId: string) {
    e.stopPropagation();
    if (!confirm('Delete this file?')) return;

    try {
      await apiDelete(`/api/files/${fileId}`);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error('Failed to delete file:', err);
      alert('Could not delete file.');
    }
  }

     async function handleDeleteFolder(e: React.MouseEvent, folderId: string) {
    e.stopPropagation();
    if (!confirm('Delete this folder?')) return;

    try {
      await apiDelete(`/api/folders/${folderId}`);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
    } catch (err) {
      console.error('Failed to delete folder:', err);
      alert('Could not delete folder.');
    }
  }

    async function handleRestore(e: React.MouseEvent, type: 'file' | 'folder', id: string) {
    e.stopPropagation();
    try {
      await apiRestoreItem(type, id);

      if (type === 'file') {
        const restoredFile = trashFiles.find((f) => f.id === id);
        setTrashFiles((prev) => prev.filter((f) => f.id !== id));
        if (restoredFile) setFiles((prev) => [...prev, restoredFile]);
      } else {
        const restoredFolder = trashFolders.find((f) => f.id === id);
        setTrashFolders((prev) => prev.filter((f) => f.id !== id));
        if (restoredFolder) setFolders((prev) => [...prev, restoredFolder]);
      }
    } catch (err) {
      console.error('Failed to restore:', err);
      alert('Could not restore item.');
    }
  }

  async function handlePermanentDelete(e: React.MouseEvent, type: 'file' | 'folder', id: string) {
    e.stopPropagation();
    if (!confirm('Permanently delete this? This cannot be undone.')) return;

    try {
      await apiPermanentDelete(type, id);
      if (type === 'file') setTrashFiles((prev) => prev.filter((f) => f.id !== id));
      else setTrashFolders((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Failed to permanently delete:', err);
      alert('Could not delete item.');
    }
  }

    function handleShareClick(e: React.MouseEvent, file: FileItem) {
    e.stopPropagation();
    setSharingFile(file);
  }

  async function handleToggleStar(e: React.MouseEvent, item: FileItem | Folder, type: 'file' | 'folder') {
    e.stopPropagation();
    const isStarred = starredIds.has(item.id);

    try {
      await apiToggleStar(type, item.id, !isStarred);
      setStarredIds((prev) => {
        const next = new Set(prev);
        if (isStarred) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });

      if (isStarred) {
        if (type === 'file') setStarredFiles((prev) => prev.filter((f) => f.id !== item.id));
        else setStarredFolders((prev) => prev.filter((f) => f.id !== item.id));
      } else {
        if (type === 'file') setStarredFiles((prev) => [...prev, item as FileItem]);
        else setStarredFolders((prev) => [...prev, item as Folder]);
      }
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

      const isSearching = searchQuery.trim().length > 0;
  const isStarredView = activeView === 'starred' && !isSearching;
  const isTrashView = activeView === 'trash' && !isSearching;
  const isSharedView = activeView === 'shared' && !isSearching;

  const displayFolders = isSearching
    ? searchResults?.folders ?? []
    : isTrashView
    ? trashFolders
    : isStarredView
    ? starredFolders
    : isSharedView
    ? sharedFolders
    : folders;

  const displayFiles = isSearching
    ? searchResults?.files ?? []
    : isTrashView
    ? trashFiles
    : isStarredView
    ? starredFiles
    : isSharedView
    ? sharedFiles
    : files;

  return (
    <div className="flex h-screen">
    <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-8 py-4">
          <div className="flex gap-3">
            <button
              onClick={handleNewFolder}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              + New Folder
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelected}
              className="hidden"
            />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files and folders..."
            className="w-full max-w-xs min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

                   <p className="ml-auto shrink-0 text-sm font-medium text-slate-500">{user.email}</p>
        </div>
        <div className="flex-1 overflow-auto bg-slate-50/30 p-8">
          {isSearching && searching ? (
            <p className="text-slate-400">Searching...</p>
          ) : isSearching && displayFolders.length === 0 && displayFiles.length === 0 ? (
            <p className="text-slate-400">No results for &quot;{searchQuery}&quot;</p>
          ) : loadingItems ? (
            <p className="text-slate-400">Loading...</p>
          ) : displayFolders.length === 0 && displayFiles.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <p className="text-sm">
                {isTrashView
                  ? 'Trash is empty'
                  : isStarredView
                  ? 'No starred items yet'
                  : isSharedView
                  ? 'Nothing has been shared with you yet'
                  : 'No files yet - upload something to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                                         {displayFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                                                      <div className="absolute right-2 top-2 flex gap-1">
                    {isSharedView ? null : isTrashView ? (
                      <>
                        <button
                          onClick={(e) => handleRestore(e, 'folder', folder.id)}
                          className="hidden rounded-md bg-white px-2 py-1 text-xs font-medium text-green-600 shadow-sm hover:bg-green-50 group-hover:block"
                        >
                          Restore
                        </button>
                        <button
                          onClick={(e) => handlePermanentDelete(e, 'folder', folder.id)}
                          className="hidden rounded-md bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 group-hover:block"
                        >
                          Delete Forever
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleToggleStar(e, folder, 'folder')}
                          className={`text-xl leading-none ${
                            starredIds.has(folder.id) ? 'text-amber-500' : 'hidden text-slate-300 group-hover:block'
                          }`}
                        >
                          ★
                        </button>
                        <button
                          onClick={(e) => handleDeleteFolder(e, folder.id)}
                          className="hidden rounded-md bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 group-hover:block"
                        >
                          X
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 font-bold">
                    F
                  </div>
                  <span className="w-full truncate text-center text-sm font-medium text-slate-700">
                    {folder.name}
                  </span>
                </div>
              ))}
              {displayFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => !isTrashView && handleFileClick(file)}
                  className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                                                <div className="absolute right-2 top-2 flex gap-1">
                    {isSharedView ? null : isTrashView ? (    
                      <>
                        <button
                          onClick={(e) => handleRestore(e, 'file', file.id)}
                          className="hidden rounded-md bg-white px-2 py-1 text-xs font-medium text-green-600 shadow-sm hover:bg-green-50 group-hover:block"
                        >
                          Restore
                        </button>
                        <button
                          onClick={(e) => handlePermanentDelete(e, 'file', file.id)}
                          className="hidden rounded-md bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 group-hover:block"
                        >
                          Delete Forever
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleToggleStar(e, file, 'file')}
                          className={`text-xl leading-none ${
                            starredIds.has(file.id) ? 'text-amber-500' : 'hidden text-slate-300 group-hover:block'
                          }`}
                        >
                          ★
                        </button>
                        <button
                          onClick={(e) => handleShareClick(e, file)}
                          className="hidden rounded-md bg-white px-2 py-1 text-xs font-medium text-indigo-600 shadow-sm hover:bg-indigo-50 group-hover:block"
                        >
                          Share
                        </button>
                        <button
                          onClick={(e) => handleDeleteFile(e, file.id)}
                          className="hidden rounded-md bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 group-hover:block"
                        >
                          X
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 font-bold">
                    F
                  </div>
                  <span className="w-full truncate text-center text-sm font-medium text-slate-700">
                    {file.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {sharingFile && (
        <ShareDialog
          resourceType="file"
          resourceId={sharingFile.id}
          resourceName={sharingFile.name}
          onClose={() => setSharingFile(null)}
        />
      )}
    </div>
  );
}

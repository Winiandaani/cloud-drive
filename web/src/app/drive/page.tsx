'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import Sidebar from '@/components/Sidebar';
import ShareDialog from '@/components/ShareDialog';
import BulkShareDialog from '@/components/BulkShareDialog';
import { apiGet, apiPost, apiUploadFile, apiDelete, apiSearch, apiToggleStar, apiGetStarred, apiGetTrash, apiRestoreItem, apiPermanentDelete, apiGetSharedWithMe, apiGetRecent } from '@/lib/api';
import { getFileIcon } from '@/lib/fileIcons';

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
  created_at?: string;
  last_accessed_at?: string | null;
  folder_name?: string | null;
  folder_id?: string | null;
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
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSharing, setBulkSharing] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!user) return;

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
    if (!user) return;

    setLoadingItems(true);
    apiGet(`/api/folders/${currentFolderId}`)
      .then((data) => {
        setFolders(data.folders);
        setFiles(data.files || []);
      })
      .catch((err) => console.error('Failed to load items:', err))
      .finally(() => setLoadingItems(false));
  }, [user, currentFolderId]);

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
    if (activeView !== 'recent') return;

    apiGetRecent()
      .then((data) => setRecentFiles(data.files))
      .catch((err) => console.error('Failed to load recent files:', err));
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
      const parentId = currentFolderId === 'root' ? null : currentFolderId;
      const data = await apiPost('/api/folders', { name, parentId });
      setFolders((prev) => [...prev, data.folder]);
    } catch (err) {
      console.error('Failed to create folder:', err);
      alert('Could not create folder.');
    }
  }

  function handleFolderClick(folder: Folder) {
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  }
    function handleJumpToFolder(folderId: string, folderName: string) {
    setSearchQuery('');
    setFolderPath([{ id: folderId, name: folderName }]);
    setCurrentFolderId(folderId);
  }

    function handleGoToDrive() {
    setSearchQuery('');
    setActiveView('drive');
    setFolderPath([]);
    setCurrentFolderId('root');
  }
    function toggleSelect(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }
    function handleSelectAll() {
    const allIds = [...displayFolders.map((f) => f.id), ...displayFiles.map((f) => f.id)];
    setSelectedIds(new Set(allIds));
  }
    async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} item(s)?`)) return;

    const idsArray = Array.from(selectedIds);

    for (const id of idsArray) {
      const isFolder = folders.some((f) => f.id === id);
      try {
        if (isFolder) {
          await apiDelete(`/api/folders/${id}`);
          setFolders((prev) => prev.filter((f) => f.id !== id));
        } else {
          await apiDelete(`/api/files/${id}`);
          setFiles((prev) => prev.filter((f) => f.id !== id));
        }
      } catch (err) {
        console.error(`Failed to delete ${id}:`, err);
      }
    }

    clearSelection();
  }

  async function handleBulkStar() {
    const idsArray = Array.from(selectedIds);

    for (const id of idsArray) {
      const isFolder = folders.some((f) => f.id === id);
      const item = isFolder ? folders.find((f) => f.id === id) : files.find((f) => f.id === id);
      if (!item) continue;

      try {
        await apiToggleStar(isFolder ? 'folder' : 'file', id, true);
        setStarredIds((prev) => new Set(prev).add(id));
      } catch (err) {
        console.error(`Failed to star ${id}:`, err);
      }
    }

    clearSelection();
  }

  function handleBreadcrumbClick(index: number) {
    if (index === -1) {
      setFolderPath([]);
      setCurrentFolderId('root');
    } else {
      setFolderPath((prev) => prev.slice(0, index + 1));
      setCurrentFolderId(folderPath[index].id);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const folderId = currentFolderId === 'root' ? null : currentFolderId;
      const data = await apiUploadFile(file, folderId);
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
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
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
  const isRecentView = activeView === 'recent' && !isSearching;

  const displayFolders = isSearching || isRecentView
    ? []
    : isTrashView
    ? trashFolders
    : isStarredView
    ? starredFolders
    : isSharedView
    ? sharedFolders
    : folders;

  const displayFiles = isSearching
    ? searchResults?.files ?? []
    : isRecentView
    ? recentFiles
    : isTrashView
    ? trashFiles
    : isStarredView
    ? starredFiles
    : isSharedView
    ? sharedFiles
    : files;

  return (
    <div className="flex h-screen">
    <Sidebar
      activeView={activeView}
      onViewChange={setActiveView}
      mobileOpen={sidebarOpen}
      onMobileClose={() => setSidebarOpen(false)}
      onGoToDrive={handleGoToDrive}
    />
      <div className="flex flex-1 flex-col">
      {activeView === 'drive' && !isSearching && (
        <div className="flex items-center gap-1 border-b border-slate-100 bg-white px-4 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:px-8">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className={`hover:text-indigo-600 ${folderPath.length === 0 ? 'font-medium text-slate-900' : ''}`}
          >
            My Drive
          </button>
          {folderPath.map((crumb, index) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <span className="text-slate-300">/</span>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`hover:text-indigo-600 ${
                  index === folderPath.length - 1 ? 'font-medium text-slate-900' : ''
                }`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:gap-4 sm:px-8 sm:py-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:hidden"
            >
              ☰
            </button>
            <button
              onClick={handleNewFolder}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 sm:px-4 sm:text-sm"
            >
              + New Folder
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:px-4 sm:text-sm"
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
            className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 sm:max-w-xs sm:flex-1"
          />

          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:ml-auto sm:shrink-0 sm:text-sm">{user.email}</p>
        </div>
        <div className="flex-1 overflow-auto bg-slate-50/30 dark:bg-slate-950 p-8">
          {isSearching && searching ? (
            <p className="text-slate-400 dark:text-slate-500">Searching...</p>
          ) : isSearching && displayFolders.length === 0 && displayFiles.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500">No results for &quot;{searchQuery}&quot;</p>
          ) : loadingItems ? (
            <p className="text-slate-400 dark:text-slate-500">Loading...</p>
          ) : displayFolders.length === 0 && displayFiles.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400 dark:text-slate-500">
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
                  onClick={() => !isTrashView && !isSharedView && !isStarredView && handleFolderClick(folder)}
                  className={`group relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    selectedIds.has(folder.id)
                      ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-500/10'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  {activeView === 'drive' && !isSearching && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(folder.id)}
                      onClick={(e) => toggleSelect(e, folder.id)}
                      onChange={() => {}}
                      className={`absolute left-2 top-2 h-4 w-4 accent-indigo-600 dark:bg-slate-800 dark:border-slate-600 ${
                        selectedIds.has(folder.id) ? 'block' : 'hidden group-hover:block'
                      }`}
                    />
                  )}
                                                      <div className="absolute right-2 top-2 flex gap-1">
                    {isSharedView ? null : isTrashView ? (
                      <>
                        <button
                          onClick={(e) => handleRestore(e, 'folder', folder.id)}
                          className="flex rounded-md bg-white px-2 py-1 text-xs font-medium text-green-600 shadow-sm hover:bg-green-50 dark:bg-slate-800 dark:hover:bg-slate-700 sm:hidden sm:group-hover:flex"
                        >
                          Restore
                        </button>
                        <button
                          onClick={(e) => handlePermanentDelete(e, 'folder', folder.id)}
                          className="flex rounded-md bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-slate-700 sm:hidden sm:group-hover:flex"
                        >
                          Delete Forever
                        </button>
                      </>
                    ) : (
                      <>
                                                  <button
                            onClick={(e) => handleToggleStar(e, folder, 'folder')}
                            className={`text-xl leading-none ${
                              starredIds.has(folder.id) ? 'text-amber-500' : 'block text-slate-300 dark:text-slate-600 sm:hidden sm:group-hover:block'
                            }`}
                          >
                            ★
                          </button>
                        <button
                          onClick={(e) => handleDeleteFolder(e, folder.id)}
                          className="flex rounded-md bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-slate-700 sm:hidden sm:group-hover:flex"
                        >
                          X
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 font-bold dark:bg-amber-500/20 dark:text-amber-400">
                    F
                  </div>
                  <span className="w-full truncate text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                    {folder.name}
                  </span>
                </div>
              ))}
              {displayFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => !isTrashView && handleFileClick(file)}
                  className={`group relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    selectedIds.has(file.id)
                      ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-500/10'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  {activeView === 'drive' && !isSearching && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(file.id)}
                      onClick={(e) => toggleSelect(e, file.id)}
                      onChange={() => {}}
                      className={`absolute left-2 top-2 h-4 w-4 accent-indigo-600 dark:bg-slate-800 dark:border-slate-600 ${
                        selectedIds.has(file.id) ? 'block' : 'hidden group-hover:block'
                      }`}
                    />
                  )}
                                                <div className="absolute right-2 top-2 flex gap-1">
                    {isSharedView ? null : isTrashView ? (    
                      <>
                        <button
                          onClick={(e) => handleRestore(e, 'file', file.id)}
                          className="flex rounded-md bg-white px-2 py-1 text-xs font-medium text-green-600 shadow-sm hover:bg-green-50 dark:bg-slate-800 dark:hover:bg-slate-700 sm:hidden sm:group-hover:flex"
                        >
                          Restore
                        </button>
                        <button
                          onClick={(e) => handlePermanentDelete(e, 'file', file.id)}
                          className="flex rounded-md bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-slate-700 sm:hidden sm:group-hover:flex"
                        >
                          Delete Forever
                        </button>
                      </>
                    ) : (
                      <>
                                                  <button
                            onClick={(e) => handleToggleStar(e, file, 'file')}
                            className={`text-xl leading-none ${
                              starredIds.has(file.id) ? 'text-amber-500' : 'block text-slate-300 dark:text-slate-600 sm:hidden sm:group-hover:block'
                            }`}
                          >
                            ★
                          </button>
                        <button
                          onClick={(e) => handleShareClick(e, file)}
                          className="flex rounded-md bg-white px-2 py-1 text-xs font-medium text-indigo-600 shadow-sm hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 sm:hidden sm:group-hover:flex"
                        >
                          Share
                        </button>
                        <button
                          onClick={(e) => handleDeleteFile(e, file.id)}
                          className="flex rounded-md bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-slate-700 sm:hidden sm:group-hover:flex"
                        >
                          X
                        </button>
                      </>
                    )}
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold ${
                      getFileIcon(file.mime_type).bg
                    } ${getFileIcon(file.mime_type).text}`}
                  >
                    {getFileIcon(file.mime_type).label}
                  </div>
                  <span className="w-full truncate text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                    {file.name}
                  </span>
                  {isSearching && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {file.folder_name && file.folder_id ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJumpToFolder(file.folder_id!, file.folder_name!);
                          }}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          in {file.folder_name}
                        </button>
                      ) : (
                        'in My Drive'
                      )}
                    </span>
                  )}
                  {isRecentView && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {file.last_accessed_at
                        ? `Opened ${new Date(file.last_accessed_at).toLocaleDateString()}`
                        : `Uploaded ${new Date(file.created_at!).toLocaleDateString()}`}
                    </span>
                  )}
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
      {bulkSharing && (
        <BulkShareDialog
          items={Array.from(selectedIds).map((id) => ({
            id,
            type: folders.some((f) => f.id === id) ? 'folder' : 'file',
          }))}
          onClose={() => setBulkSharing(false)}
        />
      )}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleSelectAll}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Select All
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <button
            onClick={() => setBulkSharing(true)}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Share
          </button>
          <button
            onClick={handleBulkStar}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50"
          >
            Star
          </button>
          <button
            onClick={handleBulkDelete}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
          <button
            onClick={clearSelection}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

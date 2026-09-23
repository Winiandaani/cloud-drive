export function getFileIcon(mimeType: string | undefined): { label: string; bg: string; text: string } {
  if (!mimeType) return { label: 'F', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400' };

  if (mimeType.startsWith('image/')) {
    return { label: 'IMG', bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (mimeType.startsWith('video/')) {
    return { label: 'VID', bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' };
  }
  if (mimeType.startsWith('audio/')) {
    return { label: 'AUD', bg: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400' };
  }
  if (mimeType === 'application/pdf') {
    return { label: 'PDF', bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400' };
  }
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return { label: 'DOC', bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' };
  }
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return { label: 'XLS', bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-600 dark:text-green-400' };
  }
  if (
    mimeType === 'application/zip' ||
    mimeType === 'application/x-zip-compressed' ||
    mimeType === 'application/x-rar-compressed'
  ) {
    return { label: 'ZIP', bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' };
  }
  if (mimeType.startsWith('text/')) {
    return { label: 'TXT', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' };
  }

  return { label: 'FILE', bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' };
}
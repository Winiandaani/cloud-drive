'use client';

import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onGoToDrive: () => void;
}

const navItems = [
  { label: 'My Drive', key: 'drive' },
  { label: 'Shared', key: 'shared' },
  { label: 'Starred', key: 'starred' },
  { label: 'Recent', key: 'recent' },
  { label: 'Trash', key: 'trash' },
];

export default function Sidebar({ activeView, onViewChange, mobileOpen, onMobileClose, onGoToDrive }: SidebarProps) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function handleNavClick(key: string) {
    if (key === 'drive') {
      onGoToDrive();
    } else {
      onViewChange(key);
    }
    onMobileClose();
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 sm:hidden"
          onClick={onMobileClose}
        />
      )}

            <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-slate-50 p-5 shadow-xl transition-transform sm:relative sm:bg-slate-50/50 sm:shadow-none sm:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              CD
            </div>
            <h1 className="brand-title text-lg font-bold text-slate-900">Cloud Drive</h1>
          </div>
          <button onClick={onMobileClose} className="text-slate-400 sm:hidden">
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                activeView === item.key
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <span>Log out</span>
        </button>
      </aside>
    </>
  );
}
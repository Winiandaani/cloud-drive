const fs = require('fs');

const sidebarContent = `'use client';

import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { label: 'My Drive', key: 'drive' },
  { label: 'Shared', key: 'shared' },
  { label: 'Starred', key: 'starred' },
  { label: 'Recent', key: 'recent' },
  { label: 'Trash', key: 'trash' },
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-slate-50/50 p-5">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          C
        </div>
        <h1 className="text-lg font-bold text-slate-900">Cloud Drive</h1>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onViewChange(item.key)}
            className={\`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors \${
              activeView === item.key
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100'
            }\`}
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
  );
}
`;

fs.writeFileSync('src/components/Sidebar.tsx', sidebarContent, 'utf8');
console.log('Sidebar.tsx written. Length:', sidebarContent.length);
'use client';

import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  username?: string;
}

export default function Header({ title, username }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="md:hidden sticky top-0 z-40 bg-augusta-green text-white shadow-md">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
        <div className="flex items-center gap-3">
          {username && (
            <span className="text-sm text-white/70 hidden min-[400px]:inline">
              {username}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

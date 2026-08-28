'use client';

import { ReactNode } from 'react';

import { useAuth } from '@/hooks/use-auth';

import { SidebarNav } from './sidebar-nav';
import { TopNavbar } from './top-navbar';

export function AppShell({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="grid h-screen place-items-center bg-slate-950 text-slate-300">
        Loading Nexora Commerce...
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.08),_transparent_18%),linear-gradient(180deg,_#020617,_#0b1220_42%,_#0f172a)] text-slate-100">
      <div className="flex h-full overflow-hidden">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopNavbar />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="w-full px-6 py-6 xl:px-8 2xl:px-10">
              <div className="flex w-full flex-col gap-6">
              {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

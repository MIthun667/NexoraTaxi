'use client';

import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

import { useDemoContext } from '@/hooks/use-demo-context';
import { SearchInput } from '@/components/layout/search-input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { getNavigationTrail } from '@/lib/navigation';
import { NotificationBell } from './notification-bell';

export function TopNavbar() {
  const { user, logout } = useAuth();
  const activeContext = useDemoContext();
  const pathname = usePathname();
  const trail = getNavigationTrail(pathname);
  const pageTitle = trail[trail.length - 1] ?? 'Overview';

  return (
    <header className="sticky top-0 z-30 border-b border-white/6 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex h-14 w-full items-center gap-4 px-6 xl:px-8 2xl:px-10">
        <div className="min-w-[180px]">
          <p className="text-sm font-semibold text-slate-100">{pageTitle}</p>
        </div>
        <div className="hidden min-w-0 flex-1 lg:flex">
          <div className="w-full">
            <SearchInput />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <NotificationBell />
          {activeContext.canSelectScope ? (
            <label className="hidden xl:block">
              <span className="sr-only">Store selector</span>
              <select
                value={activeContext.selectedScope}
                onChange={(event) => activeContext.setSelectedScope(event.target.value)}
                className="h-9 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-sm text-slate-300 outline-none transition hover:bg-white/[0.05]"
              >
                {activeContext.scopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="hidden rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-400 xl:block">
              {activeContext.scopeLabel}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] text-xs font-semibold text-slate-100">
              {user?.firstName?.slice(0, 1)}
              {user?.lastName?.slice(0, 1)}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-slate-100">{user?.firstName}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 px-1.5 text-slate-300" onClick={logout}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { canAccessNavigationItem, navigation } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

export function SidebarNav() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const visibleNavigation = navigation
    .filter((item) => canAccessNavigationItem(item, hasPermission))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => canAccessNavigationItem(child, hasPermission)),
    }));
  const sections = ['Main', 'Actions', 'Commerce', 'System'] as const;

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-white/6 bg-slate-950/45 xl:flex">
      <div className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/[0.04] text-sm font-semibold text-slate-100 ring-1 ring-white/6">
            N
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Nexora Commerce</p>
            <p className="text-xs text-slate-500">Commerce</p>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <nav className="space-y-6">
          {sections.map((section) => {
            const items = visibleNavigation.filter((item) => item.section === section);

            if (!items.length) {
              return null;
            }

            return (
              <div key={section} className="space-y-2">
                <p className="px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  {section}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                      <div key={item.href} className="space-y-1">
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                            active
                              ? 'bg-white/[0.06] text-slate-100 ring-1 ring-white/8'
                              : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-100',
                          )}
                        >
                          <Icon className={cn('h-4 w-4', active ? 'text-slate-100' : 'text-slate-500')} />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                        {item.children?.length ? (
                          <div className="space-y-1 pl-9">
                            {item.children.map((child) => {
                              const childActive =
                                pathname === child.href || pathname.startsWith(`${child.href}/`);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                    'block rounded-lg px-3 py-2 text-sm transition',
                                    childActive
                                      ? 'bg-white/[0.05] text-slate-100'
                                      : 'text-slate-500 hover:bg-white/[0.03] hover:text-slate-300',
                                  )}
                                >
                                  {child.title}
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

import Link from 'next/link';

import { Card } from '@/components/ui/card';

type DetailItem = {
  label: string;
  value?: string | null;
  href?: string;
};

export function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <Card className="p-0">
      <div className="grid gap-px overflow-hidden rounded-2xl bg-white/10 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={`${item.label}-${item.value ?? 'empty'}`} className="bg-slate-950/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {item.label}
            </p>
            {item.href && item.value ? (
              <Link href={item.href as never} className="mt-2 block text-sm text-white hover:text-[var(--brand-400)]">
                {item.value}
              </Link>
            ) : (
              <p className="mt-2 text-sm text-white">{item.value ?? '-'}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

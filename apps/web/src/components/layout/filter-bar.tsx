import { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 bg-slate-950/40 p-4 md:flex-row md:items-center md:justify-between">
      {children}
    </Card>
  );
}

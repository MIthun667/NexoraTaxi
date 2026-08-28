'use client';

import { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function TableToolbar({
  searchValue,
  searchPlaceholder = 'Search records',
  onSearchChange,
  filters,
  onReset,
  actions,
}: {
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
  onReset?: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 lg:flex-row lg:items-center">
      <div className="flex-1">
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full"
        />
      </div>
      {filters ? <div className="flex flex-wrap items-center gap-3">{filters}</div> : null}
      <div className="flex items-center gap-2">
        {onReset ? (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        ) : null}
        {actions}
      </div>
    </div>
  );
}

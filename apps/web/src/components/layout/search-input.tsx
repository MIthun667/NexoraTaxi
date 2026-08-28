'use client';

import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search stores, products, customers, or signals',
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <Input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="h-9 border-white/8 bg-white/[0.03] pl-9 text-sm text-slate-200 placeholder:text-slate-500"
      />
    </div>
  );
}

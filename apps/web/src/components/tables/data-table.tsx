'use client';

import { ArrowDownUp } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ApiMeta } from '@/types/api';

type Column<T extends object> = {
  key: keyof T | string;
  title: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
};

export function DataTable<T extends object>({
  data,
  columns,
  meta,
  emptyState,
  rowActions,
  rowKey,
}: {
  data: T[];
  columns: Column<T>[];
  meta?: ApiMeta;
  emptyState?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  rowKey?: (row: T) => string | number;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!sortKey) {
      return data;
    }

    return [...data].sort((left, right) => {
      const leftValue = left[sortKey as keyof T];
      const rightValue = right[sortKey as keyof T];

      if (leftValue === rightValue) {
        return 0;
      }

      if (leftValue === undefined || leftValue === null) {
        return 1;
      }

      if (rightValue === undefined || rightValue === null) {
        return -1;
      }

      const compare = String(leftValue).localeCompare(String(rightValue));
      return sortDirection === 'asc' ? compare : -compare;
    });
  }, [data, sortDirection, sortKey]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/[0.03]">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500',
                    column.className,
                  )}
                >
                  {column.sortable ? (
                    <button
                      className="inline-flex items-center gap-2"
                      onClick={() => {
                        if (sortKey === String(column.key)) {
                          setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                          return;
                        }

                        setSortKey(String(column.key));
                        setSortDirection('asc');
                      }}
                    >
                      {column.title}
                      <ArrowDownUp className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    column.title
                  )}
                </th>
              ))}
              {rowActions ? (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (rowActions ? 1 : 0)}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  {emptyState ?? 'No records available.'}
                </td>
              </tr>
            ) : (
              sorted.map((row, index) => (
                <tr key={rowKey ? rowKey(row) : String(index)} className="transition hover:bg-white/[0.03]">
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-4 py-4 text-sm text-slate-200">
                      {column.render
                        ? column.render(row)
                        : String(row[column.key as keyof T] ?? '-')}
                    </td>
                  ))}
                  {rowActions ? (
                    <td className="px-4 py-4 text-right text-sm text-slate-200">
                      {rowActions(row)}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {meta ? (
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-slate-500">
          <span>
            Page {meta.page} of {meta.totalPages || 1}
          </span>
          <span>{meta.total} total records</span>
        </div>
      ) : null}
    </Card>
  );
}

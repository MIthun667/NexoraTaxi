'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ApiMeta } from '@/types/api';

export function PaginationControls({
  meta,
  onPageChange,
}: {
  meta?: ApiMeta;
  onPageChange?: (page: number) => void;
}) {
  if (!meta) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={meta.page <= 1}
        onClick={() => onPageChange?.(meta.page - 1)}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onPageChange?.(meta.page + 1)}
      >
        Next
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

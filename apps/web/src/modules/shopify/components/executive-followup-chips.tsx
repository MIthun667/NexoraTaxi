'use client';

import { Button } from '@/components/ui/button';

export function ExecutiveFollowupChips({
  items,
  onSelect,
}: {
  items: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Button
          key={item}
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => onSelect(item)}
        >
          {item}
        </Button>
      ))}
    </div>
  );
}

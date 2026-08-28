import { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Progress({
  value = 0,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { value?: number }) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-white/8', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full rounded-full bg-[var(--brand-500)] transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

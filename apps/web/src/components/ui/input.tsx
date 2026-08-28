import { forwardRef, InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-white/8 bg-slate-950/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-white/15 focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
